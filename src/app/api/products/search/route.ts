import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cachedQuery, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const locationId = searchParams.get('locationId') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Use cached query for fast product search
    const cacheKey = CACHE_KEYS.productSearch(query, locationId);
    const results = await cachedQuery(
      cacheKey,
      async () => {
        return await prisma.productVariant.findMany({
          where: {
            OR: [
              { sku: { contains: query, mode: 'insensitive' } },
              { colorName: { contains: query, mode: 'insensitive' } },
              {
                product: {
                  name: { contains: query, mode: 'insensitive' },
                },
              },
              {
                product: {
                  category: {
                    name: { contains: query, mode: 'insensitive' },
                  },
                },
              },
            ],
            isActive: true,
            product: {
              isActive: true,
            },
          },
          include: {
            product: {
              include: { category: true },
            },
            stocks: {
              where: { locationId },
              select: { quantity: true },
            },
          },
          take: limit,
        });
      },
      CACHE_TTL.SHORT // 1 minute cache for search results
    );

    // Transform to UI format
    const transformed = results.map((variant) => {
      const product = variant.product;
      const category = product.category;
      const availableQty = variant.stocks[0]?.quantity || 0;

      return {
        id: variant.id,
        sku: variant.sku,
        category: category?.name || '',
        categoryId: category?.id,
        product: product.name,
        productId: product.id,
        variantId: variant.id,
        colorName: variant.colorName,
        colorHex: variant.colorHex,
        available: availableQty,
        unit: variant.stockUnit,
        alternateUnit: variant.altUnit,
        conversionFactor: variant.saleToStockFactor,
        costPrice: variant.costPrice,
        // Formatted display
        display: `${category?.name || 'Uncategorized'} > ${product.name} > ${variant.colorName}`,
        groupKey: product.id, // Group by product
      };
    });

    // Group by product
    const grouped = transformed.reduce((acc, item) => {
      const key = item.groupKey;
      if (!acc[key]) {
        acc[key] = {
          category: item.category,
          categoryId: item.categoryId,
          product: item.product,
          productId: item.productId,
          variants: [],
        };
      }
      acc[key].variants.push(item);
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      results: transformed,
      grouped: Object.values(grouped),
    });
  } catch (error) {
    console.error('Product search error:', error);
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    );
  }
}

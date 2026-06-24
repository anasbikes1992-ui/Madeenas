import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Search across Category, Product, Variant, Color
    const results = await prisma.productColor.findMany({
      where: {
        OR: [
          {
            variant: {
              product: {
                name: { contains: query, mode: 'insensitive' },
              },
            },
          },
          {
            variant: {
              product: {
                category: {
                  name: { contains: query, mode: 'insensitive' },
                },
              },
            },
          },
          {
            variant: {
              code: { contains: query, mode: 'insensitive' },
            },
          },
          {
            variant: {
              design: { contains: query, mode: 'insensitive' },
            },
          },
          {
            color: {
              code: { contains: query, mode: 'insensitive' },
            },
          },
          {
            color: {
              name: { contains: query, mode: 'insensitive' },
            },
          },
          {
            sku: { contains: query, mode: 'insensitive' },
          },
        ],
        isActive: true,
        variant: {
          isActive: true,
          product: {
            isActive: true,
          },
        },
      },
      include: {
        variant: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
        color: true,
        stocks: {
          where: { locationId },
          select: { quantity: true },
        },
      },
      take: limit,
    });

    // Transform to UI format
    const transformed = results.map((pc) => {
      const product = pc.variant.product;
      const category = product.category;
      const variant = pc.variant;
      const color = pc.color;
      const availableQty = pc.stocks[0]?.quantity || 0;

      return {
        id: pc.id,
        sku: pc.sku,
        category: category.name,
        categoryId: category.id,
        product: product.name,
        productId: product.id,
        variant: variant.code,
        variantId: variant.id,
        design: variant.design,
        color: color.code,
        colorId: color.id,
        colorName: color.name,
        colorHex: color.hexValue,
        available: availableQty,
        unit: variant.unit || product.unit,
        alternateUnit: variant.alternateUnit || product.alternateUnit,
        conversionFactor: variant.conversionFactor || product.conversionFactor,
        costPrice: pc.costPrice || variant.costPrice || product.costPrice,
        // Formatted display
        display: `${category.name} > ${product.name} > ${color.code} > ${variant.code}`,
        groupKey: `${product.id}-${color.id}`, // Product + color grouping
      };
    });

    // Group by product + color with shades inside
    const grouped = transformed.reduce((acc, item) => {
      const key = item.groupKey;
      if (!acc[key]) {
        acc[key] = {
          category: item.category,
          categoryId: item.categoryId,
          product: item.product,
          productId: item.productId,
          color: item.color,
          colorId: item.colorId,
          colorName: item.colorName,
          colorHex: item.colorHex,
          shades: [],
        };
      }
      acc[key].shades.push(item);
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

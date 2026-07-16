import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/get-auth-user';

export const dynamic = 'force-dynamic';

interface ValidationItem {
  variantId: string;
  quantity: number;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items, locationId } = body as {
      items: ValidationItem[];
      locationId: string;
    };

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    // Validate all items in parallel
    const validations = await Promise.all(
      items.map(async (item) => {
        const stock = await prisma.stock.findUnique({
          where: {
            variantId_locationId: {
              variantId: item.variantId,
              locationId,
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
          },
        });

        const availableQty = stock?.quantity || 0;
        const isValid = availableQty >= item.quantity;

        return {
          variantId: item.variantId,
          requestedQty: item.quantity,
          availableQty,
          isValid,
          message: isValid
            ? 'Available'
            : `Insufficient stock. Only ${availableQty} available`,
          // Include product details for error messages
          product: stock
            ? {
                name: stock.variant.product.name,
                variant: stock.variant.sku,
                color: stock.variant.colorName,
                unit: stock.variant.stockUnit,
              }
            : null,
        };
      })
    );

    // Check if all are valid
    const allValid = validations.every((v) => v.isValid);
    const invalidCount = validations.filter((v) => !v.isValid).length;

    return NextResponse.json({
      validations,
      allValid,
      invalidCount,
      totalItems: items.length,
    });
  } catch (error) {
    console.error('Bulk validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate items' },
      { status: 500 }
    );
  }
}

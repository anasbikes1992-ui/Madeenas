import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface ValidationItem {
  productColorId: string;
  quantity: number;
}

export async function POST(request: NextRequest) {
  try {
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
        const stock = await prisma.stockVariant.findUnique({
          where: {
            productColorId_locationId: {
              productColorId: item.productColorId,
              locationId,
            },
          },
          include: {
            productColor: {
              include: {
                variant: {
                  include: {
                    product: {
                      include: { category: true },
                    },
                  },
                },
                color: true,
              },
            },
          },
        });

        const availableQty = stock?.quantity || 0;
        const isValid = availableQty >= item.quantity;

        return {
          productColorId: item.productColorId,
          requestedQty: item.quantity,
          availableQty,
          isValid,
          message: isValid
            ? 'Available'
            : `Insufficient stock. Only ${availableQty} available`,
          // Include product details for error messages
          product: stock
            ? {
                name: stock.productColor.variant.product.name,
                variant: stock.productColor.variant.code,
                color: stock.productColor.color.code,
                unit:
                  stock.productColor.variant.unit ||
                  stock.productColor.variant.product.unit,
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

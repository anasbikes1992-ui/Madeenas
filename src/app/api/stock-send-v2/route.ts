import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface CreateTransferItem {
  productColorId: string;
  quantityDispatched: number;
}

interface CreateTransferPayload {
  fromLocationId: string;
  toLocationId: string;
  referenceInvoice?: string;
  invoiceDate?: string;
  note?: string;
  items: CreateTransferItem[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateTransferPayload = await request.json();
    const {
      fromLocationId,
      toLocationId,
      referenceInvoice,
      invoiceDate,
      note,
      items,
    } = body;

    // Validation
    if (!fromLocationId || !toLocationId) {
      return NextResponse.json(
        { error: 'From and To locations are required' },
        { status: 400 }
      );
    }

    if (fromLocationId === toLocationId) {
      return NextResponse.json(
        { error: 'From and To locations must be different' },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }

    // Verify all items have valid stock
    for (const item of items) {
      const stock = await prisma.stockVariant.findUnique({
        where: {
          productColorId_locationId: {
            productColorId: item.productColorId,
            locationId: fromLocationId,
          },
        },
        include: {
          productColor: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
              color: true,
            },
          },
        },
      });

      if (!stock) {
        const productName = `Product Color ${item.productColorId}`;
        return NextResponse.json(
          { error: `No stock found for ${productName} at source location` },
          { status: 400 }
        );
      }

      if (stock.quantity < item.quantityDispatched) {
        const productName = stock.productColor.variant.product.name;
        const variantCode = stock.productColor.variant.code;
        const colorCode = stock.productColor.color.code;
        return NextResponse.json(
          {
            error: `Insufficient stock for ${productName} (${variantCode}) - ${colorCode}. Available: ${stock.quantity}, Requested: ${item.quantityDispatched}`,
          },
          { status: 400 }
        );
      }
    }

    // Generate transfer number
    const transferCount = await prisma.stockOutRequest.count();
    const transferNo = `TRF-${(transferCount + 1).toString().padStart(6, '0')}`;

    // Create transfer records (one per item)
    const createdLines = await Promise.all(
      items.map((item) =>
        prisma.stockOutRequest.create({
          data: {
            transferNo,
            status: 'DISPATCHED',
            fromLocationId,
            toLocationId,
            productColorId: item.productColorId,
            quantityRequested: item.quantityDispatched,
            quantityApproved: item.quantityDispatched,
            quantityDispatched: item.quantityDispatched,
            approvedById: session.user.id,
            dispatchedById: session.user.id,
            approvedAt: new Date(),
            dispatchedAt: new Date(),
            referenceInvoice,
            invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
            note,
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
            fromLocation: true,
            toLocation: true,
          },
        })
      )
    );

    // Deduct stock from source location
    await Promise.all(
      items.map((item) =>
        prisma.stockVariant.update({
          where: {
            productColorId_locationId: {
              productColorId: item.productColorId,
              locationId: fromLocationId,
            },
          },
          data: {
            quantity: {
              decrement: item.quantityDispatched,
            },
          },
        })
      )
    );

    // Update or create stock at destination (set to 0 initially, will be updated on acknowledgement)
    await Promise.all(
      items.map((item) =>
        prisma.stockVariant.upsert({
          where: {
            productColorId_locationId: {
              productColorId: item.productColorId,
              locationId: toLocationId,
            },
          },
          create: {
            productColorId: item.productColorId,
            locationId: toLocationId,
            quantity: 0,
          },
          update: {},
        })
      )
    );

    return NextResponse.json({
      message: 'Transfer created successfully',
      transferNo,
      lines: createdLines,
    });
  } catch (error) {
    console.error('Create transfer error:', error);
    return NextResponse.json(
      { error: 'Failed to create transfer' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const locationId = searchParams.get('locationId');

    const where: any = {};
    
    // Filter by location if provided
    if (locationId) {
      where.OR = [
        { fromLocationId: locationId },
        { toLocationId: locationId },
      ];
    }

    const requests = await prisma.stockOutRequest.findMany({
      where,
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
        fromLocation: true,
        toLocation: true,
        approvedBy: { select: { name: true, email: true } },
        dispatchedBy: { select: { name: true, email: true } },
        receivedBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Fetch transfers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
}

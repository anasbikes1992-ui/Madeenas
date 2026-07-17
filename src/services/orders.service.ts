/**
 * Customer Order Service
 * Handles customer order creation, approval workflow, and fulfillment.
 */

import { prisma } from '@/lib/db';
import { createSaleInTx, SALE_TX_OPTIONS } from '@/services/sales.service';
import { computeSaleTotals } from '@/lib/money';
import { nextDocNumber } from '@/lib/doc-number';
import { getVatRate } from '@/lib/settings';
import { num } from '@/lib/money';
import type { Prisma, OrderStatus } from '@prisma/client';
import type { CreateOrder } from '@/lib/validation';

type CreateOrderFromCartInput = Omit<CreateOrder, 'items'> & {
  items?: CreateOrder['items']
}

// =============================================================================
// TYPES
// =============================================================================

const orderInclude = {
  items: {
    include: {
      variant: { include: { product: true } },
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.CustomerOrderInclude;

export type CustomerOrderWithDetails = Prisma.CustomerOrderGetPayload<{
  include: typeof orderInclude;
}>;

// =============================================================================
// CREATE ORDER FROM CART
// =============================================================================

/**
 * Turn a signed-in customer's cart into an order.
 *
 * `userId` is a User id. `Cart.customerId` also stores a User id (it has no
 * relation), but `CustomerOrder.customerId` is a foreign key to the **Customer**
 * table — a different entity. Passing the User id straight through violated
 * that constraint, so checkout failed for every customer. The User's Customer
 * record is resolved (and created if missing) before the order is written.
 */
export async function createOrderFromCart(
  userId: string,
  data: CreateOrderFromCartInput,
  taxRateOverride?: number
) {
  const taxRate = taxRateOverride ?? (await getVatRate());

  const cart = await prisma.cart.findUnique({
    where: { customerId: userId },
    include: {
      items: {
        include: {
          variant: true,
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new Error('Cart is empty');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    throw new Error('User not found');
  }

  const orderItems = data.items ?? cart.items.map((item) => ({
    variantId: item.variantId,
    quantity: num(item.quantity),
    unitPrice: num(item.unitPrice),
  }));

  const totals = computeSaleTotals(
    orderItems.map((item) => ({ unitPrice: item.unitPrice, quantity: item.quantity })),
    taxRate
  );

  const order = await prisma.$transaction(async (tx) => {
    // Orders link to a Customer, so ensure this user has one. Match on phone
    // (unique) when given, otherwise on email.
    const phone = data.phoneNumber?.trim() || null;
    let customer = phone
      ? await tx.customer.findUnique({ where: { phone } })
      : await tx.customer.findFirst({ where: { email: user.email } });

    if (!customer) {
      customer = await tx.customer.create({
        data: {
          name: user.name,
          email: user.email,
          phone,
          address: data.shippingAddress,
        },
      });
    }

    const newOrder = await tx.customerOrder.create({
      data: {
        orderNumber: await nextDocNumber(tx, 'order'),
        customerId: customer.id,
        customerName: user.name,
        orderedBy: user.id,
        shippingAddress: data.shippingAddress,
        customerPhone: data.phoneNumber,
        subTotal: totals.subTotal,
        taxRate: totals.taxRate,
        taxAmount: totals.taxAmount,
        grandTotal: totals.grandTotal,
        note: data.note,
        items: {
          create: orderItems.map((item, index) => ({
            variantId: item.variantId,
            // Sell in the variant's own unit rather than assuming metres.
            saleUnit:
              cart.items.find((c) => c.variantId === item.variantId)?.variant.saleUnit ?? 'unit',
            quantity: item.quantity,
            unitPrice: totals.items[index].unitPrice,
            subTotal: totals.items[index].subTotal,
            total: totals.items[index].total,
          })),
        },
      },
      include: orderInclude,
    });

    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_CUSTOMER_ORDER',
        entity: 'CustomerOrder',
        entityId: newOrder.id,
        details: JSON.stringify({
          orderNumber: newOrder.orderNumber,
          grandTotal: newOrder.grandTotal.toString(),
          itemCount: orderItems.length,
        }),
      },
    });

    return newOrder;
  });

  return order;
}

// =============================================================================
// LIST ORDERS
// =============================================================================

export interface ListOrdersParams {
  customerId?: string;
  status?: OrderStatus;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
}

export async function listOrders(params: ListOrdersParams) {
  const { customerId, status, startDate, endDate, page, limit } = params;
  
  const where: Prisma.CustomerOrderWhereInput = {};
  
  if (customerId) {
    where.customerId = customerId;
  }
  
  if (status) {
    where.status = status;
  }
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }
  
  const [orders, total] = await Promise.all([
    prisma.customerOrder.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customerOrder.count({ where }),
  ]);
  
  return {
    orders,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getOrderById(id: string): Promise<CustomerOrderWithDetails | null> {
  return prisma.customerOrder.findUnique({
    where: { id },
    include: orderInclude,
  });
}

export async function getOrderByNumber(orderNumber: string): Promise<CustomerOrderWithDetails | null> {
  return prisma.customerOrder.findUnique({
    where: { orderNumber },
    include: orderInclude,
  });
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  userId: string,
  note?: string
) {
  const order = await prisma.customerOrder.findUnique({
    where: { id: orderId },
  });
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  validateStatusTransition(order.status, status);
  
  const updatedOrder = await prisma.$transaction(async (tx) => {
    const updated = await tx.customerOrder.update({
      where: { id: orderId },
      data: {
        status,
        ...(note && { note: `${order.note ? order.note + '\n' : ''}${note}` }),
      },
      include: orderInclude,
    });
    
    await tx.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_ORDER_STATUS',
        entity: 'CustomerOrder',
        entityId: orderId,
        details: JSON.stringify({
          oldStatus: order.status,
          newStatus: status,
          note,
        }),
      },
    });
    
    return updated;
  });
  
  return updatedOrder;
}

function validateStatusTransition(current: OrderStatus, next: OrderStatus): void {
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ['APPROVED', 'CANCELLED'],
    APPROVED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED', 'CANCELLED'],
    DELIVERED: ['READY'],
    CANCELLED: [],
    READY: [],
  };
  
  const allowed = validTransitions[current];
  
  if (!allowed.includes(next)) {
    throw new Error(`Cannot transition from ${current} to ${next}`);
  }
}

export async function approveOrder(orderId: string, approvedBy: string, note?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.customerOrder.update({
      where: { id: orderId },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
        ...(note && { note: `${note}` }),
      },
      include: orderInclude,
    });
    
    await tx.auditLog.create({
      data: {
        userId: approvedBy,
        action: 'APPROVE_ORDER',
        entity: 'CustomerOrder',
        entityId: orderId,
        details: JSON.stringify({
          orderNumber: order.orderNumber,
          note,
        }),
      },
    });
    
    return order;
  });
}

export async function fulfillOrder(
  orderId: string,
  fulfilledBy: string,
  locationId: string
) {
  const order = await prisma.customerOrder.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  if (order.status !== 'APPROVED' && order.status !== 'PROCESSING') {
    throw new Error('Order must be approved before fulfillment');
  }

  return prisma.$transaction(async (tx) => {
    // Guarded transition: only one fulfilment can claim the order, so stock
    // can never be deducted twice by concurrent requests.
    const claimed = await tx.customerOrder.updateMany({
      where: { id: orderId, status: { in: ['APPROVED', 'PROCESSING'] } },
      data: {
        status: 'SHIPPED',
        fulfilledBy,
        fulfilledAt: new Date(),
      },
    });
    if (claimed.count === 0) {
      throw new Error('Order must be approved before fulfillment');
    }

    // Pricing, stock guards, receipt numbering, profit capture, and the credit
    // ledger all come from the single sale engine.
    const sale = await createSaleInTx(tx, {
      locationId,
      soldById: fulfilledBy,
      items: order.items.map((item) => ({
        variantId: item.variantId,
        saleQty: num(item.quantity),
        saleUnit: item.saleUnit || undefined,
        unitPriceOverride: num(item.unitPrice),
      })),
      paymentMode: 'CREDIT',
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      note: `Fulfilled from order ${order.orderNumber}`,
    });

    const updatedOrder = await tx.customerOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: orderInclude,
    });
    
    await tx.auditLog.create({
      data: {
        userId: fulfilledBy,
        action: 'FULFILL_ORDER',
        entity: 'CustomerOrder',
        entityId: orderId,
        details: JSON.stringify({
          orderNumber: order.orderNumber,
          receiptNo: sale.receiptNo,
        }),
      },
    });
    
    return {
      order: updatedOrder,
      sale,
    };
  }, SALE_TX_OPTIONS);
}

export async function cancelOrder(orderId: string, cancelledBy: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.customerOrder.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        note: `Cancelled: ${reason}`,
      },
      include: orderInclude,
    });
    
    await tx.auditLog.create({
      data: {
        userId: cancelledBy,
        action: 'CANCEL_ORDER',
        entity: 'CustomerOrder',
        entityId: orderId,
        details: JSON.stringify({
          orderNumber: order.orderNumber,
          reason,
        }),
      },
    });
    
    return order;
  });
}

/**
 * Customer Order Service
 * Handles customer order creation, approval workflow, and fulfillment.
 */

import { prisma } from '@/lib/db';
import { prepareSaleData, validateTaxCalculation } from '@/lib/tax';
import { createSaleInTx, SALE_TX_OPTIONS } from '@/services/sales.service';
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
// ORDER NUMBER GENERATION
// =============================================================================

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}`;
  
  const lastOrder = await prisma.customerOrder.findFirst({
    where: {
      orderNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      orderNumber: 'desc',
    },
  });
  
  let sequence = 1;
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2], 10);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }
  
  return `${prefix}-${sequence.toString().padStart(4, '0')}`;
}

// =============================================================================
// CREATE ORDER FROM CART
// =============================================================================

export async function createOrderFromCart(
  customerId: string,
  data: CreateOrderFromCartInput,
  taxRate = 18
) {
  const cart = await prisma.cart.findUnique({
    where: { customerId },
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
  
  const orderItems = data.items ?? cart.items.map((item: any) => ({
    variantId: item.variantId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }));
  
  const orderData = prepareSaleData(
    orderItems.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    taxRate
  );
  
  validateTaxCalculation({
    subTotal: orderData.subTotal,
    taxRate: orderData.taxRate,
    taxAmount: orderData.taxAmount,
    grandTotal: orderData.grandTotal,
  });
  
  const orderNumber = await generateOrderNumber();
  
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.customerOrder.create({
      data: {
        orderNumber,
        customerId,
        shippingAddress: data.shippingAddress,
        customerPhone: data.phoneNumber,
        subTotal: orderData.subTotal,
        taxRate: orderData.taxRate,
        taxAmount: orderData.taxAmount,
        grandTotal: orderData.grandTotal,
        note: data.note,
        items: {
          create: orderItems.map((item, index) => ({
            variantId: item.variantId,
            saleUnit: 'meters',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subTotal: orderData.items[index].subTotal,
            total: orderData.items[index].total,
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
        userId: customerId,
        action: 'CREATE_CUSTOMER_ORDER',
        entity: 'CustomerOrder',
        entityId: newOrder.id,
        details: JSON.stringify({
          orderNumber: newOrder.orderNumber,
          grandTotal: newOrder.grandTotal,
          itemCount: orderItems.length,
        }),
      },
    });
    
    return newOrder;
  });
  
  return order;
}

export async function createOrder(
  customerId: string,
  data: CreateOrder,
  taxRate = 18
) {
  if (!data.items || data.items.length === 0) {
    throw new Error('Order must have at least one item');
  }
  
  const orderData = prepareSaleData(
    data.items.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    taxRate
  );
  
  const orderNumber = await generateOrderNumber();
  
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.customerOrder.create({
      data: {
        orderNumber,
        customerId,
        shippingAddress: data.shippingAddress,
        customerPhone: data.phoneNumber,
        subTotal: orderData.subTotal,
        taxRate: orderData.taxRate,
        taxAmount: orderData.taxAmount,
        grandTotal: orderData.grandTotal,
        note: data.note,
        items: {
          create: data.items.map((item: any, index: number) => ({
            variantId: item.variantId,
            saleUnit: 'meters',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subTotal: orderData.items[index].subTotal,
            total: orderData.items[index].total,
          })),
        },
      },
      include: orderInclude,
    });
    
    await tx.auditLog.create({
      data: {
        userId: customerId,
        action: 'CREATE_CUSTOMER_ORDER',
        entity: 'CustomerOrder',
        entityId: newOrder.id,
        details: JSON.stringify({
          orderNumber: newOrder.orderNumber,
          grandTotal: newOrder.grandTotal,
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

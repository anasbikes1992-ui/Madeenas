/**
 * Customer Order Service (Enhanced with Multi-Product Support & VAT)
 * 
 * Handles customer order creation, approval workflow, and fulfillment.
 */

import { prisma } from '@/lib/db';
import { prepareSaleData, validateTaxCalculation } from '@/lib/tax';
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
      product: {
        include: {
          category: true,
        },
      },
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  sale: true,
} satisfies Prisma.CustomerOrderInclude;

export type CustomerOrderWithDetails = Prisma.CustomerOrderGetPayload<{
  include: typeof orderInclude;
}>;

// =============================================================================
// ORDER NUMBER GENERATION
// =============================================================================

/**
 * Generate a unique order number
 * Format: ORD-YYYY-XXXX (e.g., ORD-2026-0001)
 */
async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}`;
  
  // Find the last order number for this year
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

/**
 * Create a customer order from the shopping cart
 */
export async function createOrderFromCart(
  customerId: string,
  data: CreateOrderFromCartInput,
  taxRate = 18
) {
  // Get customer's cart
  const cart = await prisma.cart.findUnique({
    where: { customerId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });
  
  if (!cart || cart.items.length === 0) {
    throw new Error('Cart is empty');
  }
  
  // Use cart items if no items provided
  const orderItems = data.items ?? cart.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }));
  
  // Calculate tax
  const orderData = prepareSaleData(
    orderItems.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    taxRate
  );
  
  // Validate calculation
  validateTaxCalculation({
    subTotal: orderData.subTotal,
    taxRate: orderData.taxRate,
    taxAmount: orderData.taxAmount,
    grandTotal: orderData.grandTotal,
  });
  
  // Generate order number
  const orderNumber = await generateOrderNumber();
  
  // Create order
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.customerOrder.create({
      data: {
        orderNumber,
        customerId,
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress ?? data.shippingAddress,
        phoneNumber: data.phoneNumber,
        subTotal: orderData.subTotal,
        taxRate: orderData.taxRate,
        taxAmount: orderData.taxAmount,
        grandTotal: orderData.grandTotal,
        note: data.note,
        items: {
          create: orderItems.map((item, index) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subTotal: orderData.items[index].subTotal,
            taxRate: orderData.items[index].taxRate,
            taxAmount: orderData.items[index].taxAmount,
            total: orderData.items[index].total,
          })),
        },
      },
      include: orderInclude,
    });
    
    // Clear the cart
    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
    
    // Create audit log
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

/**
 * Create a customer order directly (without cart)
 */
export async function createOrder(
  customerId: string,
  data: CreateOrder,
  taxRate = 18
) {
  if (!data.items || data.items.length === 0) {
    throw new Error('Order must have at least one item');
  }
  
  // Calculate tax
  const orderData = prepareSaleData(
    data.items.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    taxRate
  );
  
  // Generate order number
  const orderNumber = await generateOrderNumber();
  
  // Create order
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.customerOrder.create({
      data: {
        orderNumber,
        customerId,
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress ?? data.shippingAddress,
        phoneNumber: data.phoneNumber,
        subTotal: orderData.subTotal,
        taxRate: orderData.taxRate,
        taxAmount: orderData.taxAmount,
        grandTotal: orderData.grandTotal,
        note: data.note,
        items: {
          create: data.items.map((item, index) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subTotal: orderData.items[index].subTotal,
            taxRate: orderData.items[index].taxRate,
            taxAmount: orderData.items[index].taxAmount,
            total: orderData.items[index].total,
          })),
        },
      },
      include: orderInclude,
    });
    
    // Create audit log
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

/**
 * List customer orders with filters
 */
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

// =============================================================================
// GET ORDER BY ID
// =============================================================================

/**
 * Get a customer order by ID
 */
export async function getOrderById(id: string): Promise<CustomerOrderWithDetails | null> {
  return prisma.customerOrder.findUnique({
    where: { id },
    include: orderInclude,
  });
}

/**
 * Get an order by order number
 */
export async function getOrderByNumber(orderNumber: string): Promise<CustomerOrderWithDetails | null> {
  return prisma.customerOrder.findUnique({
    where: { orderNumber },
    include: orderInclude,
  });
}

// =============================================================================
// UPDATE ORDER STATUS
// =============================================================================

/**
 * Update the status of an order
 */
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
  
  // Validate status transition
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
    
    // Create audit log
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

/**
 * Validate that a status transition is allowed
 */
function validateStatusTransition(current: OrderStatus, next: OrderStatus): void {
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ['APPROVED', 'CANCELLED'],
    APPROVED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED', 'CANCELLED'],
    DELIVERED: ['REFUNDED'],
    CANCELLED: [],
    REFUNDED: [],
  };
  
  const allowed = validTransitions[current];
  
  if (!allowed.includes(next)) {
    throw new Error(`Cannot transition from ${current} to ${next}`);
  }
}

// =============================================================================
// APPROVE ORDER
// =============================================================================

/**
 * Approve a customer order
 */
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

// =============================================================================
// FULFILL ORDER (Convert to Sale)
// =============================================================================

/**
 * Fulfill an order by converting it to a sale
 */
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
  
  // Generate receipt number for the sale
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `RCP-${dateStr}`;
  
  const lastSale = await prisma.sale.findFirst({
    where: { receiptNo: { startsWith: prefix } },
    orderBy: { receiptNo: 'desc' },
  });
  
  let sequence = 1;
  if (lastSale) {
    const lastSequence = parseInt(lastSale.receiptNo.split('-')[2], 10);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }
  
  const receiptNo = `${prefix}-${sequence.toString().padStart(4, '0')}`;
  
  // Create sale and update stock in a transaction
  return prisma.$transaction(async (tx) => {
    // Create sale
    const sale = await tx.sale.create({
      data: {
        receiptNo,
        locationId,
        soldById: fulfilledBy,
        customerId: order.customerId,
        subTotal: order.subTotal,
        taxRate: order.taxRate,
        taxAmount: order.taxAmount,
        grandTotal: order.grandTotal,
        totalAmount: order.grandTotal,
        paymentMode: 'CREDIT', // Orders are typically on credit
        note: `Fulfilled from order ${order.orderNumber}`,
        items: {
          create: order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subTotal: item.subTotal,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            total: item.total,
          })),
        },
      },
    });
    
    // Update stock for each item
    for (const item of order.items) {
      const stock = await tx.stock.findUnique({
        where: {
          productId_locationId: {
            productId: item.productId,
            locationId,
          },
        },
      });
      
      if (!stock || stock.quantity < item.quantity) {
        throw new Error(
          `Insufficient stock for product ${item.productId}. Required: ${item.quantity}, Available: ${stock?.quantity ?? 0}`
        );
      }
      
      await tx.stock.update({
        where: {
          productId_locationId: {
            productId: item.productId,
            locationId,
          },
        },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });
    }
    
    // Update order
    const updatedOrder = await tx.customerOrder.update({
      where: { id: orderId },
      data: {
        status: 'SHIPPED',
        saleId: sale.id,
        fulfilledBy,
        fulfilledAt: new Date(),
      },
      include: orderInclude,
    });
    
    // Create audit log
    await tx.auditLog.create({
      data: {
        userId: fulfilledBy,
        action: 'FULFILL_ORDER',
        entity: 'CustomerOrder',
        entityId: orderId,
        details: JSON.stringify({
          orderNumber: order.orderNumber,
          receiptNo: sale.receiptNo,
          saleId: sale.id,
        }),
      },
    });
    
    return {
      order: updatedOrder,
      sale,
    };
  });
}

// =============================================================================
// CANCEL ORDER
// =============================================================================

/**
 * Cancel a customer order
 */
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

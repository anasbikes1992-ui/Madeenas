/**
 * Cart Service for Customer Portal
 *
 * Manages shopping cart operations for customers.
 */

import { prisma } from '@/lib/db';
import { calculateLineItemTax, calculateMultipleItemsTax } from '@/lib/tax';
import { retailPriceFor } from '@/lib/pricing';
import { getVatRate } from '@/lib/settings';
import { num } from '@/lib/money';
import type { Prisma } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

export type CartWithDetails = Prisma.CartGetPayload<{
  include: typeof cartInclude;
}>;

// =============================================================================
// GET OR CREATE CART
// =============================================================================

export async function getOrCreateCart(customerId: string): Promise<CartWithDetails> {
  let cart = await prisma.cart.findUnique({
    where: { customerId },
    include: cartInclude,
  });
  
  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        customerId,
      },
      include: cartInclude,
    });
  }
  
  return cart;
}

export async function getCartWithTotals(customerId: string, taxRateOverride?: number) {
  const cart = await getOrCreateCart(customerId);
  const taxRate = taxRateOverride ?? (await getVatRate());

  const items = cart.items.map((item) => ({
    ...item,
    ...calculateLineItemTax(num(item.quantity), num(item.unitPrice), taxRate),
  }));

  const totals = calculateMultipleItemsTax(
    items.map((item) => ({
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })),
    taxRate
  );
  const { items: _lineItems, ...totalsWithoutItems } = totals
  
  return {
    ...cart,
    items,
    ...totalsWithoutItems,
  };
}

// =============================================================================
// ADD TO CART
// =============================================================================

export interface AddToCartParams {
  customerId: string;
  variantId: string;
  quantity: number;
}

export async function addToCart(params: AddToCartParams) {
  const { customerId, variantId, quantity } = params;
  
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than 0');
  }
  
  const cart = await getOrCreateCart(customerId);
  
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      saleUnit: true,
      costPrice: true,
      isActive: true,
      product: { select: { isActive: true } },
    },
  });
  
  if (!variant) {
    throw new Error('Product variant not found');
  }
  
  if (!variant.isActive || !variant.product.isActive) {
    throw new Error('Product variant is not available');
  }
  
  if (!variant.costPrice) {
    throw new Error('Product variant does not have a price set');
  }
  
  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cartId_variantId: {
        cartId: cart.id,
        variantId,
      },
    },
  });
  
  const retailPrice = await retailPriceFor(variant.costPrice);
  if (retailPrice === null) {
    throw new Error('Product variant does not have a price set');
  }

  if (existingItem) {
    await prisma.cartItem.update({
      where: {
        id: existingItem.id,
      },
      data: {
        quantity: { increment: quantity },
        unitPrice: retailPrice,
      },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        variantId,
        saleUnit: variant.saleUnit,
        quantity,
        unitPrice: retailPrice,
      },
    });
  }
  
  return getCartWithTotals(customerId);
}

// =============================================================================
// UPDATE CART ITEM
// =============================================================================

export interface UpdateCartItemParams {
  customerId: string;
  cartItemId: string;
  quantity: number;
}

export async function updateCartItem(params: UpdateCartItemParams) {
  const { customerId, cartItemId, quantity } = params;
  
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than 0');
  }
  
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: {
      cart: true,
    },
  });
  
  if (!cartItem) {
    throw new Error('Cart item not found');
  }
  
  if (cartItem.cart.customerId !== customerId) {
    throw new Error('Unauthorized');
  }
  
  await prisma.cartItem.update({
    where: { id: cartItemId },
    data: { quantity },
  });
  
  return getCartWithTotals(customerId);
}

// =============================================================================
// REMOVE FROM CART
// =============================================================================

export interface RemoveFromCartParams {
  customerId: string;
  cartItemId: string;
}

export async function removeFromCart(params: RemoveFromCartParams) {
  const { customerId, cartItemId } = params;
  
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: {
      cart: true,
    },
  });
  
  if (!cartItem) {
    throw new Error('Cart item not found');
  }
  
  if (cartItem.cart.customerId !== customerId) {
    throw new Error('Unauthorized');
  }
  
  await prisma.cartItem.delete({
    where: { id: cartItemId },
  });
  
  return getCartWithTotals(customerId);
}

// =============================================================================
// CLEAR CART
// =============================================================================

export async function clearCart(customerId: string) {
  const cart = await prisma.cart.findUnique({
    where: { customerId },
  });
  
  if (!cart) {
    return null;
  }
  
  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });
  
  return getCartWithTotals(customerId);
}

// =============================================================================
// VALIDATE CART STOCK
// =============================================================================

export interface StockValidationResult {
  valid: boolean;
  errors: Array<{
    variantId: string;
    productName: string;
    requested: number;
    available: number;
  }>;
}

export async function validateCartStock(
  customerId: string,
  locationId: string
): Promise<StockValidationResult> {
  const cart = await getOrCreateCart(customerId);
  
  const errors: StockValidationResult['errors'] = [];
  
  for (const item of cart.items) {
    const stock = await prisma.stock.findUnique({
      where: {
        variantId_locationId: {
          variantId: item.variantId,
          locationId,
        },
      },
    });
    
    const available = num(stock?.quantity);
    const requested = num(item.quantity);

    if (available < requested) {
      errors.push({
        variantId: item.variantId,
        productName: item.variant.product.name,
        requested,
        available,
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// SYNC CART (for offline support)
// =============================================================================

export interface SyncCartItem {
  variantId: string;
  quantity: number;
}

export async function syncCart(customerId: string, items: SyncCartItem[]) {
  const cart = await getOrCreateCart(customerId);
  
  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });
  
  for (const item of items) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: item.variantId },
      select: {
        costPrice: true, 
        saleUnit: true,
        product: { select: { isActive: true } },
        isActive: true,
      },
    });
    
    if (variant && variant.isActive && variant.product.isActive) {
      const unitPrice = await retailPriceFor(variant.costPrice);
      if (unitPrice === null) continue;
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId: item.variantId,
          saleUnit: variant.saleUnit,
          quantity: item.quantity,
          unitPrice,
        },
      });
    }
  }
  
  return getCartWithTotals(customerId);
}

// =============================================================================
// GET CART ITEM COUNT
// =============================================================================

export async function getCartItemCount(customerId: string): Promise<number> {
  const cart = await prisma.cart.findUnique({
    where: { customerId },
    include: {
      items: true,
    },
  });
  
  if (!cart) {
    return 0;
  }
  
  return cart.items.reduce((sum, item) => sum + num(item.quantity), 0);
}

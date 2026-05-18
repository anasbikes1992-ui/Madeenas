/**
 * Cart Service for Customer Portal
 * 
 * Manages shopping cart operations for customers.
 */

import { prisma } from '@/lib/db';
import { calculateLineItemTax, calculateMultipleItemsTax } from '@/lib/tax';
import type { Prisma } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

const cartInclude = {
  items: {
    include: {
      product: {
        include: {
          category: true,
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

/**
 * Get the customer's cart, creating one if it doesn't exist
 */
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

/**
 * Get cart with calculated totals
 */
export async function getCartWithTotals(customerId: string, taxRate = 18) {
  const cart = await getOrCreateCart(customerId);
  
  // Calculate totals
  const items = cart.items.map((item) => ({
    ...item,
    ...calculateLineItemTax(item.quantity, item.unitPrice, taxRate),
  }));
  
  const totals = calculateMultipleItemsTax(
    items.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
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
  productId: string;
  quantity: number;
}

/**
 * Add a product to the cart or update quantity if it already exists
 */
export async function addToCart(params: AddToCartParams) {
  const { customerId, productId, quantity } = params;
  
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than 0');
  }
  
  // Get or create cart
  const cart = await getOrCreateCart(customerId);
  
  // Check product exists and get current price
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      costPrice: true,
      isActive: true,
    },
  });
  
  if (!product) {
    throw new Error('Product not found');
  }
  
  if (!product.isActive) {
    throw new Error('Product is not available');
  }
  
  if (!product.costPrice) {
    throw new Error('Product does not have a price set');
  }
  
  // Check if item already exists in cart
  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId,
      },
    },
  });
  
  if (existingItem) {
    // Update quantity
    await prisma.cartItem.update({
      where: {
        id: existingItem.id,
      },
      data: {
        quantity: existingItem.quantity + quantity,
        unitPrice: product.costPrice, // Update to current price
      },
    });
  } else {
    // Create new cart item
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity,
        unitPrice: product.costPrice,
      },
    });
  }
  
  // Return updated cart with totals
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

/**
 * Update the quantity of a cart item
 */
export async function updateCartItem(params: UpdateCartItemParams) {
  const { customerId, cartItemId, quantity } = params;
  
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than 0');
  }
  
  // Verify cart item belongs to customer
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
  
  // Update quantity
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

/**
 * Remove an item from the cart
 */
export async function removeFromCart(params: RemoveFromCartParams) {
  const { customerId, cartItemId } = params;
  
  // Verify cart item belongs to customer
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
  
  // Delete cart item
  await prisma.cartItem.delete({
    where: { id: cartItemId },
  });
  
  return getCartWithTotals(customerId);
}

// =============================================================================
// CLEAR CART
// =============================================================================

/**
 * Clear all items from the cart
 */
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
    productId: string;
    productName: string;
    requested: number;
    available: number;
  }>;
}

/**
 * Validate that all cart items have sufficient stock at a location
 */
export async function validateCartStock(
  customerId: string,
  locationId: string
): Promise<StockValidationResult> {
  const cart = await getOrCreateCart(customerId);
  
  const errors: StockValidationResult['errors'] = [];
  
  for (const item of cart.items) {
    const stock = await prisma.stock.findUnique({
      where: {
        productId_locationId: {
          productId: item.productId,
          locationId,
        },
      },
    });
    
    const available = stock?.quantity ?? 0;
    
    if (available < item.quantity) {
      errors.push({
        productId: item.productId,
        productName: item.product.name,
        requested: item.quantity,
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
  productId: string;
  quantity: number;
}

/**
 * Sync cart from localStorage or offline storage
 * Replaces the entire cart with the provided items
 */
export async function syncCart(customerId: string, items: SyncCartItem[]) {
  const cart = await getOrCreateCart(customerId);
  
  // Clear existing items
  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });
  
  // Add new items
  for (const item of items) {
    // Get current price
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: {
        costPrice: true,
        isActive: true,
      },
    });
    
    if (product && product.isActive && product.costPrice) {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.costPrice,
        },
      });
    }
  }
  
  return getCartWithTotals(customerId);
}

// =============================================================================
// GET CART ITEM COUNT
// =============================================================================

/**
 * Get the total number of items in the cart
 */
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
  
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Shopping Cart API Routes
 * 
 * Example implementation showing how to use cart service in Next.js API routes
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import {
  getCartWithTotals,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  validateCartStock,
} from '@/services/cart.service';
import {
  addToCartSchema,
  updateCartItemSchema,
  removeFromCartSchema,
} from '@/lib/validation';

// =============================================================================
// GET /api/cart - Get customer's cart with totals
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (session.user.role !== 'CUSTOMER') {
      return Response.json(
        { success: false, error: 'Only customers can access cart' },
        { status: 403 }
      );
    }
    
    const cart = await getCartWithTotals(session.user.id);
    
    return Response.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error('Get cart error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get cart',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/cart/add - Add item to cart
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'CUSTOMER') {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const data = addToCartSchema.parse(body);
    
    const cart = await addToCart({
      customerId: session.user.id,
      productId: data.productId,
      quantity: data.quantity,
    });
    
    return Response.json({
      success: true,
      data: cart,
      message: 'Item added to cart',
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    
    if (error.name === 'ZodError') {
      return Response.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add to cart',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT /api/cart/items/[id] - Update cart item quantity
// =============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'CUSTOMER') {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const data = updateCartItemSchema.parse(body);
    
    const cart = await updateCartItem({
      customerId: session.user.id,
      cartItemId: params.id,
      quantity: data.quantity,
    });
    
    return Response.json({
      success: true,
      data: cart,
      message: 'Cart updated',
    });
  } catch (error) {
    console.error('Update cart error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update cart',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/cart/items/[id] - Remove item from cart
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'CUSTOMER') {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const cart = await removeFromCart({
      customerId: session.user.id,
      cartItemId: params.id,
    });
    
    return Response.json({
      success: true,
      data: cart,
      message: 'Item removed from cart',
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove item',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/cart - Clear entire cart
// =============================================================================

export async function DELETE_CART(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'CUSTOMER') {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const cart = await clearCart(session.user.id);
    
    return Response.json({
      success: true,
      data: cart,
      message: 'Cart cleared',
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear cart',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/cart/validate - Validate cart stock before checkout
// =============================================================================

export async function VALIDATE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'CUSTOMER') {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { locationId } = await request.json();
    
    if (!locationId) {
      return Response.json(
        { success: false, error: 'locationId is required' },
        { status: 400 }
      );
    }
    
    const validation = await validateCartStock(session.user.id, locationId);
    
    if (!validation.valid) {
      return Response.json(
        {
          success: false,
          error: 'Some items are out of stock',
          data: validation,
        },
        { status: 400 }
      );
    }
    
    return Response.json({
      success: true,
      message: 'Cart is valid',
      data: validation,
    });
  } catch (error) {
    console.error('Validate cart error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      },
      { status: 500 }
    );
  }
}

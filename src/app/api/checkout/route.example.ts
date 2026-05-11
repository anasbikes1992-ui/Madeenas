/**
 * Checkout API Route
 * 
 * Example implementation for converting cart to customer order
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { createOrderFromCart } from '@/services/orders.service';
import { validateCartStock } from '@/services/cart.service';
import { checkoutSchema } from '@/lib/validation';

// =============================================================================
// POST /api/checkout - Create order from cart
// =============================================================================

export async function POST(request: NextRequest) {
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
        { success: false, error: 'Only customers can place orders' },
        { status: 403 }
      );
    }
    
    // Parse and validate checkout data
    const body = await request.json();
    const data = checkoutSchema.parse(body);
    
    // Validate stock availability before creating order
    if (data.locationId) {
      const stockValidation = await validateCartStock(
        session.user.id,
        data.locationId
      );
      
      if (!stockValidation.valid) {
        return Response.json(
          {
            success: false,
            error: 'Some items are out of stock',
            data: {
              outOfStock: stockValidation.errors,
            },
          },
          { status: 400 }
        );
      }
    }
    
    // Create order from cart
    const order = await createOrderFromCart(
      session.user.id,
      {
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress,
        phoneNumber: data.phoneNumber,
        note: data.note,
        items: data.items, // Optional: override cart items
      },
      data.taxRate ?? 18
    );
    
    // TODO: Send notification to admin
    // TODO: Send confirmation email to customer
    
    return Response.json({
      success: true,
      data: order,
      message: 'Order placed successfully',
    });
  } catch (error) {
    console.error('Checkout error:', error);
    
    if (error.name === 'ZodError') {
      return Response.json(
        {
          success: false,
          error: 'Invalid checkout data',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Checkout failed',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// Example Client-Side Usage
// =============================================================================

/*
// In your React component or form handler:

async function handleCheckout(formData) {
  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shippingAddress: formData.address,
        phoneNumber: formData.phone,
        billingAddress: formData.billingAddress, // Optional
        note: formData.specialInstructions, // Optional
        locationId: 'selected-location-id', // For stock validation
      }),
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Order created successfully
      console.log('Order number:', result.data.orderNumber);
      
      // Redirect to order confirmation page
      router.push(`/customer/orders/${result.data.id}`);
    } else {
      // Handle errors
      if (result.data?.outOfStock) {
        // Show out-of-stock items to user
        showOutOfStockError(result.data.outOfStock);
      } else {
        showError(result.error);
      }
    }
  } catch (error) {
    console.error('Checkout failed:', error);
    showError('Failed to place order. Please try again.');
  }
}
*/

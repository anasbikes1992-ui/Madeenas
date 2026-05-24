import { NextResponse } from 'next/server'

const baseUrl = process.env.NEXTAUTH_URL || 'https://madeenas.vercel.app'

const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Madeena Textile Stock API',
    version: '2.0.0',
    description:
      'API for Sri Lankan textile trading workflows including storefront browsing, cart checkout, customer orders, sales, and VAT-aware invoicing.',
  },
  servers: [
    {
      url: `${baseUrl}/api`,
      description: 'Primary API server',
    },
  ],
  tags: [
    { name: 'Storefront' },
    { name: 'Cart' },
    { name: 'Orders' },
    { name: 'Sales' },
  ],
  paths: {
    '/gallery': {
      get: {
        tags: ['Storefront'],
        summary: 'List storefront products',
        description: 'Returns active catalog products, category details, image data, and live stock totals for customer browsing.',
        responses: {
          '200': { description: 'Gallery products returned successfully' },
        },
      },
      post: {
        tags: ['Storefront'],
        summary: 'Create gallery order request',
        description: 'Creates a customer order request from the public gallery flow.',
        responses: {
          '201': { description: 'Customer order request created' },
          '400': { description: 'Invalid request payload' },
        },
      },
    },
    '/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Get current customer cart',
        responses: {
          '200': { description: 'Cart returned successfully' },
          '401': { description: 'Authentication required' },
        },
      },
      post: {
        tags: ['Cart'],
        summary: 'Add item to cart',
        responses: {
          '200': { description: 'Item added to cart' },
          '400': { description: 'Invalid request payload' },
        },
      },
    },
    '/checkout': {
      post: {
        tags: ['Orders'],
        summary: 'Create order from cart',
        description: 'Converts the authenticated customer cart into a VAT-aware customer order.',
        responses: {
          '200': { description: 'Order created successfully' },
          '400': { description: 'Checkout validation failed' },
          '401': { description: 'Authentication required' },
        },
      },
    },
    '/customer-orders': {
      get: {
        tags: ['Orders'],
        summary: 'List customer orders',
        description: 'Returns customer orders for the current user or operational list views for authorized staff.',
        responses: {
          '200': { description: 'Customer orders returned successfully' },
          '401': { description: 'Authentication required' },
        },
      },
    },
    '/customer-orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get customer order by id',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Customer order returned successfully' },
          '404': { description: 'Order not found' },
        },
      },
      patch: {
        tags: ['Orders'],
        summary: 'Update customer order status',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Customer order updated successfully' },
          '400': { description: 'Invalid update payload' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/customer-orders/{id}/fulfill': {
      post: {
        tags: ['Orders'],
        summary: 'Fulfill customer order into sale',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Order fulfilled successfully' },
          '400': { description: 'Fulfillment failed' },
        },
      },
    },
    '/sales': {
      get: {
        tags: ['Sales'],
        summary: 'List sales receipts',
        description: 'Returns sales history with receipt, location, customer, payment, and item data.',
        responses: {
          '200': { description: 'Sales returned successfully' },
          '403': { description: 'Forbidden' },
        },
      },
      post: {
        tags: ['Sales'],
        summary: 'Create counter sale',
        description: 'Creates a point-of-sale transaction, applies VAT, and deducts inventory stock in a single transaction.',
        responses: {
          '201': { description: 'Sale created successfully' },
          '400': { description: 'Sale validation failed' },
        },
      },
    },
  },
}

export function GET() {
  return NextResponse.json(openApiDocument)
}

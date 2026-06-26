/**
 * Zod Validation Schemas
 * 
 * Type-safe validation schemas for all API endpoints and forms.
 * These schemas ensure data integrity throughout the application.
 */

import { z } from 'zod';

// =============================================================================
// SHARED / COMMON SCHEMAS
// =============================================================================

export const idSchema = z.string().cuid();

export const emailSchema = z.string().email('Invalid email address');

export const phoneSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number must be at most 15 digits')
  .regex(/^\+?[0-9\s-]+$/, 'Invalid phone number format');

export const passwordSchema = z
  .string()
  .min(7, 'Password must be at least 7 characters')
  .max(100, 'Password is too long');

export const positiveNumberSchema = z
  .number()
  .positive('Must be a positive number');

export const nonNegativeNumberSchema = z
  .number()
  .nonnegative('Must be a non-negative number');

export const taxRateSchema = z
  .number()
  .min(0, 'Tax rate cannot be negative')
  .max(100, 'Tax rate cannot exceed 100%')
  .default(18);

// =============================================================================
// USER & AUTHENTICATION SCHEMAS
// =============================================================================

export const userRoleSchema = z.enum([
  'ADMIN',
  'STORE_KEEPER',
  'FINANCE',
  'CUSTOMER',
]);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const customerSignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema.optional(),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const userCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  password: passwordSchema,
  role: userRoleSchema.default('STORE_KEEPER'),
  locationId: idSchema.optional(),
});

export const userUpdateSchema = userCreateSchema.partial().extend({
  id: idSchema,
});

// =============================================================================
// PRODUCT SCHEMAS
// =============================================================================

export const productCreateSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  design: z.string().min(1, 'Design is required'),
  color: z.string().min(1, 'Color is required'),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color hex code')
    .default('#000000'),
  sku: z.string().min(1, 'SKU is required'),
  categoryId: idSchema,
  unit: z.string().default('meters'),
  description: z.string().optional(),
  images: z.array(z.string().url()).default([]),
  barcodeType: z.string().default('CODE128'),
  lowStockAt: nonNegativeNumberSchema.default(10),
  costPrice: positiveNumberSchema.optional(),
});

export const productUpdateSchema = productCreateSchema.partial().extend({
  id: idSchema,
});

// =============================================================================
// CART SCHEMAS
// =============================================================================

export const addToCartSchema = z.object({
  variantId: idSchema,
  quantity: positiveNumberSchema,
});

export const updateCartItemSchema = z.object({
  cartItemId: idSchema,
  quantity: positiveNumberSchema,
});

export const removeFromCartSchema = z.object({
  cartItemId: idSchema,
});

// =============================================================================
// ORDER SCHEMAS
// =============================================================================

export const orderStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'PROCESSING',
  'READY',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]);

export const orderItemSchema = z.object({
  variantId: idSchema,
  quantity: positiveNumberSchema,
  unitPrice: positiveNumberSchema,
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
  shippingAddress: z.string().min(10, 'Shipping address is required'),
  phoneNumber: phoneSchema,
  note: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  orderId: idSchema,
  status: orderStatusSchema,
  note: z.string().optional(),
});

export const approveOrderSchema = z.object({
  orderId: idSchema,
  approvedBy: idSchema,
  note: z.string().optional(),
});

// =============================================================================
// SALE SCHEMAS (WITH VAT)
// =============================================================================

export const saleItemInputSchema = z.object({
  variantId: idSchema,
  quantity: positiveNumberSchema,
  unitPrice: positiveNumberSchema,
  taxRate: taxRateSchema.optional(),
});

export const createSaleSchema = z.object({
  locationId: idSchema,
  customerId: idSchema.optional(),
  customerName: z.string().optional(),
  customerPhone: phoneSchema.optional(),
  items: z
    .array(saleItemInputSchema)
    .min(1, 'Sale must have at least one item'),
  paymentMode: z
    .enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT'])
    .default('CASH'),
  taxRate: taxRateSchema.optional(),
  note: z.string().optional(),
});

export const saleItemSchema = z.object({
  id: idSchema,
  variantId: idSchema,
  quantity: positiveNumberSchema,
  unitPrice: positiveNumberSchema,
  subTotal: nonNegativeNumberSchema,
  taxRate: taxRateSchema,
  taxAmount: nonNegativeNumberSchema,
  total: nonNegativeNumberSchema,
});

export const saleSchema = z.object({
  id: idSchema,
  receiptNo: z.string(),
  locationId: idSchema,
  soldById: idSchema,
  customerId: idSchema.optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  subTotal: nonNegativeNumberSchema,
  taxRate: taxRateSchema,
  taxAmount: nonNegativeNumberSchema,
  grandTotal: nonNegativeNumberSchema,
  totalAmount: nonNegativeNumberSchema,
  paymentMode: z.string(),
  note: z.string().optional(),
  createdAt: z.date(),
  items: z.array(saleItemSchema).optional(),
});

// =============================================================================
// STOCK SCHEMAS
// =============================================================================

export const stockInSchema = z.object({
  variantId: idSchema,
  locationId: idSchema,
  quantity: positiveNumberSchema,
  batchNumber: z.string().optional(),
  supplierId: idSchema.optional(),
  costPrice: positiveNumberSchema.optional(),
  note: z.string().optional(),
});

export const stockOutRequestSchema = z.object({
  variantId: idSchema,
  fromLocationId: idSchema,
  toLocationId: idSchema.optional(),
  quantityRequested: positiveNumberSchema,
  referenceInvoice: z.string().optional(),
  invoiceDate: z.date().optional(),
  note: z.string().optional(),
});

export const approveStockOutSchema = z.object({
  requestId: idSchema,
  quantityApproved: positiveNumberSchema,
  note: z.string().optional(),
});

// =============================================================================
// CUSTOMER SCHEMAS
// =============================================================================

export const customerCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  isCreditEligible: z.boolean().default(false),
});

export const customerUpdateSchema = customerCreateSchema.partial().extend({
  id: idSchema,
});

// =============================================================================
// CHECKOUT SCHEMA (COMPREHENSIVE)
// =============================================================================

export const checkoutSchema = z.object({
  // Cart items to checkout (if not using existing cart)
  items: z
    .array(
      z.object({
        variantId: idSchema,
        quantity: positiveNumberSchema,
      })
    )
    .optional(),
  
  // Customer information
  shippingAddress: z.string().min(10, 'Shipping address is required'),
  billingAddress: z.string().optional(),
  phoneNumber: phoneSchema,
  
  // Payment & Tax
  taxRate: taxRateSchema.optional(),
  
  // Additional notes
  note: z.string().max(500, 'Note is too long').optional(),
}).refine(
  (data) => {
    // If billingAddress is not provided, it defaults to shippingAddress
    return true;
  },
  {
    message: 'Invalid checkout data',
  }
);

// =============================================================================
// REPORT SCHEMAS
// =============================================================================

export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((data) => data.startDate <= data.endDate, {
  message: 'Start date must be before or equal to end date',
  path: ['endDate'],
});

export const salesReportSchema = dateRangeSchema.extend({
  locationId: idSchema.optional(),
  categoryId: idSchema.optional(),
});

export const taxReportSchema = dateRangeSchema.extend({
  locationId: idSchema.optional(),
});

// =============================================================================
// API RESPONSE SCHEMAS
// =============================================================================

export const apiSuccessSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
  });

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.any().optional(),
});

export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
    }),
  });

// =============================================================================
// QUERY PARAMS SCHEMAS
// =============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const searchSchema = z.object({
  q: z.string().optional(),
  category: idSchema.optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const productSearchSchema = paginationSchema.merge(searchSchema);

// =============================================================================
// TYPE EXPORTS (Inferred from schemas)
// =============================================================================

export type UserRole = z.infer<typeof userRoleSchema>;
export type Login = z.infer<typeof loginSchema>;
export type CustomerSignup = z.infer<typeof customerSignupSchema>;
export type UserCreate = z.infer<typeof userCreateSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;

export type ProductCreate = z.infer<typeof productCreateSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;

export type AddToCart = z.infer<typeof addToCartSchema>;
export type UpdateCartItem = z.infer<typeof updateCartItemSchema>;
export type RemoveFromCart = z.infer<typeof removeFromCartSchema>;

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type CreateOrder = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatus = z.infer<typeof updateOrderStatusSchema>;
export type ApproveOrder = z.infer<typeof approveOrderSchema>;

export type SaleItemInput = z.infer<typeof saleItemInputSchema>;
export type CreateSale = z.infer<typeof createSaleSchema>;
export type SaleItem = z.infer<typeof saleItemSchema>;
export type Sale = z.infer<typeof saleSchema>;

export type StockIn = z.infer<typeof stockInSchema>;
export type StockOutRequest = z.infer<typeof stockOutRequestSchema>;
export type ApproveStockOut = z.infer<typeof approveStockOutSchema>;

export type CustomerCreate = z.infer<typeof customerCreateSchema>;
export type CustomerUpdate = z.infer<typeof customerUpdateSchema>;

export type Checkout = z.infer<typeof checkoutSchema>;

export type DateRange = z.infer<typeof dateRangeSchema>;
export type SalesReport = z.infer<typeof salesReportSchema>;
export type TaxReport = z.infer<typeof taxReportSchema>;

export type Pagination = z.infer<typeof paginationSchema>;
export type Search = z.infer<typeof searchSchema>;
export type ProductSearch = z.infer<typeof productSearchSchema>;

import { z } from 'zod'

const optionalTrimmedString = z
  .string()
  .trim()
  .max(255)
  .optional()
  .transform((value) => value || null)

const optionalEmail = z
  .union([z.string().trim().email('Invalid email address'), z.literal('')])
  .optional()
  .transform((value) => value || null)

const phoneNumberOrEmpty = z
  .union([
    z
      .string()
      .trim()
      .regex(/^\+?[1-9]\d{6,14}$/, 'Phone number must be in international format'),
    z.literal(''),
  ])
  .optional()
  .transform((value) => value || null)

export const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  design: z.string().min(2, 'Design is required'),
  sku: z.string().min(3, 'SKU is required'),
  color: z.string().min(1, 'Color name is required'),
  colorHex: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
  categoryId: z.string().min(1, 'Category is required'),
  unit: z.string().min(1, 'Unit is required'),
  alternateUnit: z.string().optional().nullable(),
  conversionFactor: z.coerce.number().positive('Conversion factor must be greater than 0').optional().nullable(),
  lowStockAt: z.coerce.number().min(0, 'Threshold cannot be negative'),
  costPrice: z.coerce.number().optional().nullable(),
  description: z.string().optional().nullable(),
})

export type ProductFormData = z.infer<typeof productSchema>

export const productCreateSchema = productSchema.extend({
  images: z.array(z.string()).optional(),
  barcodeType: z.string().trim().max(32).optional(),
})

export const productUpdateSchema = productCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export const customerOrderStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
])

export const customerOrderAdminUpdateSchema = z
  .object({
    status: customerOrderStatusSchema.optional(),
  })
  .refine((d) => d.status !== undefined, {
    message: 'Provide status',
    path: ['status'],
  })

const saleLineItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unitPrice: z.coerce.number().nonnegative(),
  subTotal: z.coerce.number().nonnegative(),
})

export const saleCheckoutSchema = z.object({
  locationId: z.string().optional().nullable(),
  items: z.array(saleLineItemSchema).min(1, 'At least one item is required'),
  totalAmount: z.coerce.number().nonnegative(),
  paymentMode: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT']).optional().default('CASH'),
  customerName: z.string().max(200).optional().nullable(),
  customerPhone: z.string().max(32).optional().nullable(),
  isCreditEligible: z.boolean().optional(),
  note: z.string().max(2000).optional().nullable(),
})

const stockInSingleSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  locationId: z.string().min(1, 'Location is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  batchNumber: z.string().optional(),
  supplierId: z.string().optional().nullable(),
  costPrice: z.coerce.number().optional().nullable(),
  note: z.string().optional(),
})

const stockOutSingleSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  fromLocationId: z.string().min(1, 'From location is required'),
  toLocationId: z.string().optional().nullable(),
  quantityRequested: z.coerce.number().positive('Quantity must be greater than 0'),
  note: z.string().optional(),
  referenceInvoice: z.string().trim().max(120).optional().nullable(),
  invoiceDate: z.string().trim().optional().nullable(),
})

const stockInItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  costPrice: z.coerce.number().optional().nullable(),
});

const stockInBatchSchema = z.object({
  locationId: z.string().min(1, 'Location is required'),
  batchNumber: z.string().optional(),
  supplierId: z.string().optional().nullable(),
  note: z.string().optional(),
  items: z.array(stockInItemSchema).min(1, 'Batch must contain at least 1 item line'),
});

export const stockInSchema = z.union([stockInSingleSchema, stockInBatchSchema]);

const stockOutItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantityRequested: z.coerce.number().positive('Quantity must be greater than 0'),
});

const stockOutBatchSchema = z.object({
  fromLocationId: z.string().min(1, 'From location is required'),
  toLocationId: z.string().optional().nullable(),
  note: z.string().optional(),
  referenceInvoice: z.string().trim().max(120).optional().nullable(),
  invoiceDate: z.string().trim().optional().nullable(),
  items: z.array(stockOutItemSchema).min(1, 'Batch must contain at least 1 item line'),
});

export const stockOutRequestSchema = z.union([stockOutSingleSchema, stockOutBatchSchema]);

const stockSendItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantityDispatched: z.coerce.number().positive('Quantity must be greater than 0'),
})

export const stockSendCreateSchema = z.object({
  fromLocationId: z.string().min(1, 'From location is required'),
  toLocationId: z.string().min(1, 'To location is required'),
  note: z.string().trim().max(500).optional().nullable(),
  referenceInvoice: z.string().trim().max(120).optional().nullable(),
  invoiceDate: z.string().trim().optional().nullable(),
  items: z.array(stockSendItemSchema).min(1, 'At least one line is required'),
})

export const stockSendAcknowledgeSchema = z.object({
  action: z.literal('acknowledge'),
  quantityReceived: z.coerce.number().positive('Received quantity must be greater than 0'),
  discrepancyReason: z.string().trim().max(500).optional().nullable(),
  acknowledgeNote: z.string().trim().max(500).optional().nullable(),
})

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100, 'Category name is too long'),
  slug: z
    .string()
    .trim()
    .min(1, 'Category slug is required')
    .max(100, 'Category slug is too long')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain lowercase letters, numbers, and hyphens only'),
  color: z.string().trim().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').default('#6366f1'),
  icon: z
    .string()
    .trim()
    .max(8, 'Icon must be short')
    .optional()
    .transform((value) => value || null),
})

export const supplierSchema = z.object({
  name: z.string().trim().min(1, 'Supplier name is required').max(120, 'Supplier name is too long'),
  contact: optionalTrimmedString,
  email: optionalEmail,
  phone: optionalTrimmedString,
  address: optionalTrimmedString,
  isActive: z.boolean().optional().default(true),
})

export const customerOrderSchema = z.object({
  productId: z.string().trim().min(1, 'Product is required'),
  customerName: z.string().trim().min(2, 'Customer name is required').max(120, 'Customer name is too long'),
  customerEmail: z.string().trim().email('Valid email is required'),
  customerPhone: phoneNumberOrEmpty,
  quantity: z.coerce.number().positive('Quantity must be greater than 0').max(100000, 'Quantity is too large'),
  colorPreference: optionalTrimmedString,
  note: z.string().trim().max(1000, 'Note is too long').optional().transform((value) => value || null),
  language: z.enum(['en', 'si', 'ta']).optional().default('en'),
})

/** Password for admin-created users: required, no defaults in API. */
export const adminCreateUserPasswordSchema = z
  .string()
  .min(7, 'Password must be at least 7 characters')
  .max(128, 'Password is too long')

export const customerSignupSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is required').max(120, 'Name is too long'),
    email: z.string().trim().email('Valid email is required'),
    phone: phoneNumberOrEmpty,
    password: z.string().min(7, 'Password must be at least 7 characters').max(100, 'Password is too long'),
    confirmPassword: z.string().min(7, 'Please confirm your password'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

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

export const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  design: z.string().min(2, 'Design is required'),
  sku: z.string().min(3, 'SKU is required'),
  color: z.string().min(1, 'Color name is required'),
  colorHex: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
  categoryId: z.string().min(1, 'Category is required'),
  unit: z.string().min(1, 'Unit is required'),
  lowStockAt: z.coerce.number().min(0, 'Threshold cannot be negative'),
  costPrice: z.coerce.number().optional().nullable(),
  description: z.string().optional().nullable(),
})

export type ProductFormData = z.infer<typeof productSchema>

export const stockInSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  locationId: z.string().min(1, 'Location is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  batchNumber: z.string().optional(),
  supplierId: z.string().optional().nullable(),
  costPrice: z.coerce.number().optional().nullable(),
  note: z.string().optional(),
})

export const stockOutRequestSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  fromLocationId: z.string().min(1, 'From location is required'),
  toLocationId: z.string().optional().nullable(),
  quantityRequested: z.coerce.number().positive('Quantity must be greater than 0'),
  note: z.string().optional(),
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

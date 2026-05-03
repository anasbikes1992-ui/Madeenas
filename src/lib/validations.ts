import { z } from 'zod'

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

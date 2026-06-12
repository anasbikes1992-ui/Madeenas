import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'
import { logActivity } from '@/lib/audit'
import { productUpdateSchema } from '@/lib/validations'

const MANAGE_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])
const DELETE_ROLES = new Set(['SUPER_ADMIN', 'ADMIN'])

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      stocks: { include: { location: { select: { id: true, name: true, code: true, type: true } } } },
    },
  })
  if (!product) return fail('Product not found', 404, 'NOT_FOUND')

  return ok({ product })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!MANAGE_ROLES.has(role)) return fail('Forbidden', 403, 'FORBIDDEN')

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail('Invalid JSON body', 400, 'BAD_REQUEST')
  }

  const parsed = productUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return fail('Invalid product', 400, 'VALIDATION', parsed.error.flatten().fieldErrors)
  }
  const d = parsed.data

  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) return fail('Product not found', 404, 'NOT_FOUND')

  if (d.categoryId !== undefined) {
    const category = await prisma.category.findUnique({ where: { id: d.categoryId } })
    if (!category) return fail('Category not found', 404, 'NOT_FOUND')
  }

  if (d.sku !== undefined && d.sku !== existing.sku) {
    const dupe = await prisma.product.findUnique({ where: { sku: d.sku } })
    if (dupe) return fail('A product with this SKU already exists', 409, 'DUPLICATE_SKU')
  }

  const data: Prisma.ProductUpdateInput = {}
  if (d.name !== undefined) data.name = d.name
  if (d.design !== undefined) data.design = d.design
  if (d.color !== undefined) data.color = d.color
  if (d.colorHex !== undefined) data.colorHex = d.colorHex
  if (d.sku !== undefined) data.sku = d.sku
  if (d.categoryId !== undefined) data.category = { connect: { id: d.categoryId } }
  if (d.unit !== undefined) data.unit = d.unit
  if (d.description !== undefined) data.description = d.description
  if (d.images !== undefined) data.images = JSON.stringify(d.images)
  if (d.barcodeType !== undefined) data.barcodeType = d.barcodeType
  if (d.lowStockAt !== undefined) data.lowStockAt = d.lowStockAt
  if (d.costPrice !== undefined) data.costPrice = d.costPrice
  if (d.isActive !== undefined) data.isActive = d.isActive

  if (Object.keys(data).length === 0) {
    return fail('No valid fields to update', 400, 'BAD_REQUEST')
  }

  const product = await prisma.product.update({
    where: { id },
    data,
    include: { category: true },
  })

  await logActivity({
    userId: user.sub!,
    action: 'UPDATE',
    entity: 'Product',
    entityId: product.id,
    details: `Updated product: ${product.name} via mobile`,
  })

  return ok({ product })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!DELETE_ROLES.has(role)) return fail('Forbidden', 403, 'FORBIDDEN')

  const { id } = await params

  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) return fail('Product not found', 404, 'NOT_FOUND')

  const product = await prisma.product.update({ where: { id }, data: { isActive: false } })

  await logActivity({
    userId: user.sub!,
    action: 'ARCHIVE',
    entity: 'Product',
    entityId: id,
    details: `Archived product: ${product.name} via mobile`,
  })

  return ok({ success: true })
}

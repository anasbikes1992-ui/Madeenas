import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logActivity } from '@/lib/audit'
import { logHistoryEvent } from '@/lib/history'
import { productUpdateSchema } from '@/lib/validations'
import { hasPermission } from '@/lib/permissions'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      stocks: { include: { location: true } },
      stockIns: { orderBy: { createdAt: 'desc' }, take: 10, include: { user: true, location: true } },
      stockOutRequests: { orderBy: { createdAt: 'desc' }, take: 10, include: { requestedByUser: true, fromLocation: true, toLocation: true } },
    },
  })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(product)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'products.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await request.json()
  const parsed = productUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid product', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const d = parsed.data
  const data: Prisma.ProductUpdateInput = {}
  if (d.name !== undefined) data.name = d.name
  if (d.design !== undefined) data.design = d.design
  if (d.color !== undefined) data.color = d.color
  if (d.colorHex !== undefined) data.colorHex = d.colorHex
  if (d.sku !== undefined) data.sku = d.sku
  if (d.categoryId !== undefined) data.category = { connect: { id: d.categoryId } }
  if (d.unit !== undefined) data.unit = d.unit
  if (d.alternateUnit !== undefined) data.alternateUnit = d.alternateUnit
  if (d.conversionFactor !== undefined) data.conversionFactor = d.conversionFactor
  if (d.description !== undefined) data.description = d.description
  if (d.images !== undefined) data.images = JSON.stringify(d.images)
  if (d.barcodeType !== undefined) data.barcodeType = d.barcodeType
  if (d.lowStockAt !== undefined) data.lowStockAt = d.lowStockAt
  if (d.costPrice !== undefined) data.costPrice = d.costPrice
  if (d.isActive !== undefined) data.isActive = d.isActive

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const product = await prisma.product.update({
    where: { id },
    data,
    include: { category: true },
  })

  await logActivity({
    userId: session.user.id,
    action: 'UPDATE',
    entity: 'Product',
    entityId: product.id,
    details: `Updated product details for: ${product.name}`
  })

  await logHistoryEvent({
    entityType: 'PRODUCT',
    entityId: product.id,
    eventType: 'PRODUCT_UPDATED',
    title: 'Product updated',
    details: `Updated ${product.name}`,
    payload: {
      unit: product.unit,
      alternateUnit: product.alternateUnit,
      conversionFactor: product.conversionFactor,
      isActive: product.isActive,
    },
    createdBy: session.user.id,
  })

  return NextResponse.json(product)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.user.role as string
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const product = await prisma.product.update({ where: { id }, data: { isActive: false } })

  await logActivity({
    userId: session.user.id,
    action: 'ARCHIVE',
    entity: 'Product',
    entityId: id,
    details: `Archived product: ${product.name}`
  })

  await logHistoryEvent({
    entityType: 'PRODUCT',
    entityId: id,
    eventType: 'PRODUCT_ARCHIVED',
    title: 'Product archived',
    details: `${product.name} archived`,
    createdBy: session.user.id,
  })

  return NextResponse.json({ success: true })
}

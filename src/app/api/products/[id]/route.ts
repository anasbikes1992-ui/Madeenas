import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logActivity } from '@/lib/audit'
import { productUpdateSchema } from '@/lib/validations'
import { hasPermission } from '@/lib/permissions'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: {
        include: {
          stocks: { include: { location: true } },
          stockIns: { orderBy: { createdAt: 'desc' }, take: 10, include: { user: true, location: true } },
          transferItems: { orderBy: { transfer: { createdAt: 'desc' } }, take: 10, include: { transfer: { include: { fromLocation: true, toLocation: true } } } },
        }
      }
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
  if (d.categoryId !== undefined) data.category = { connect: { id: d.categoryId } }
  if (d.description !== undefined) data.description = d.description
  if (d.images !== undefined) data.images = d.images // String[] in new schema
  if (d.isActive !== undefined) data.isActive = d.isActive

  // Handle variants if provided
  const rawBody = await request.clone().json().catch(() => ({}));
  const variants = rawBody.variants;
  
  if (variants && Array.isArray(variants)) {
    data.variants = {
      deleteMany: {
        id: { notIn: variants.filter((v: any) => v.id).map((v: any) => v.id) }
      },
      upsert: variants.map((v: any) => ({
        where: { id: v.id || 'new' },
        create: {
          sku: v.sku,
          colorName: v.colorName,
          colorHex: v.colorHex || '#6366f1',
          stockUnit: v.stockUnit,
          stockUnitLabel: v.stockUnitLabel,
          altUnit: v.altUnit || null,
          altUnitLabel: v.altUnitLabel || null,
          saleUnit: v.saleUnit,
          saleUnitLabel: v.saleUnitLabel,
          saleToStockFactor: Number(v.saleToStockFactor) || 1.0,
          costPrice: v.costPrice ? Number(v.costPrice) : null,
          salePrice: v.salePrice ? Number(v.salePrice) : null,
          lowStockAt: Number(v.lowStockAt) || 10,
        },
        update: {
          sku: v.sku,
          colorName: v.colorName,
          colorHex: v.colorHex || '#6366f1',
          stockUnit: v.stockUnit,
          stockUnitLabel: v.stockUnitLabel,
          altUnit: v.altUnit || null,
          altUnitLabel: v.altUnitLabel || null,
          saleUnit: v.saleUnit,
          saleUnitLabel: v.saleUnitLabel,
          saleToStockFactor: Number(v.saleToStockFactor) || 1.0,
          costPrice: v.costPrice ? Number(v.costPrice) : null,
          salePrice: v.salePrice ? Number(v.salePrice) : null,
          lowStockAt: Number(v.lowStockAt) || 10,
        }
      }))
    };
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const product = await prisma.product.update({
    where: { id },
    data,
    include: { category: true, variants: true },
  })

  await logActivity({
    userId: session.user.id,
    action: 'UPDATE',
    entity: 'Product',
    entityId: product.id,
    details: `Updated product details for: ${product.name}`
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

  return NextResponse.json({ success: true })
}

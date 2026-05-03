import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logActivity } from '@/lib/audit'

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
  const body = await request.json()

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: body.name,
      design: body.design,
      color: body.color,
      colorHex: body.colorHex,
      sku: body.sku,
      categoryId: body.categoryId,
      unit: body.unit,
      description: body.description,
      images: JSON.stringify(body.images || []),
      barcodeType: body.barcodeType,
      lowStockAt: parseFloat(body.lowStockAt),
      costPrice: body.costPrice ? parseFloat(body.costPrice) : null,
      isActive: body.isActive,
    },
    include: { category: true },
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

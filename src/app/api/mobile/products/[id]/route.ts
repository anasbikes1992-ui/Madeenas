import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'
import { logActivity } from '@/lib/audit'

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
      variants: {
        where: { isActive: true },
        include: {
          stocks: { include: { location: { select: { id: true, name: true, code: true, type: true } } } },
        },
      },
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

  const b = body as {
    name?: string
    categoryId?: string
    description?: string
    images?: string[]
    isActive?: boolean
  }

  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) return fail('Product not found', 404, 'NOT_FOUND')

  if (b.categoryId !== undefined) {
    const category = await prisma.category.findUnique({ where: { id: b.categoryId } })
    if (!category) return fail('Category not found', 404, 'NOT_FOUND')
  }

  const data: Prisma.ProductUpdateInput = {}
  if (b.name !== undefined) data.name = b.name
  if (b.categoryId !== undefined) data.category = { connect: { id: b.categoryId } }
  if (b.description !== undefined) data.description = b.description
  if (b.images !== undefined) data.images = b.images
  if (b.isActive !== undefined) data.isActive = b.isActive

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

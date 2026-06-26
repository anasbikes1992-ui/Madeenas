import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'
import { logActivity } from '@/lib/audit'

const MANAGE_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])

export async function GET(request: NextRequest) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const category = searchParams.get('category') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))

  const where: Record<string, unknown> = { isActive: true }
  if (category) where.categoryId = category
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      {
        variants: {
          some: {
            OR: [
              { sku: { contains: search, mode: 'insensitive' } },
              { colorName: { contains: search, mode: 'insensitive' } },
            ],
            isActive: true,
          },
        },
      },
    ]
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          include: {
            stocks: {
              include: { location: { select: { id: true, name: true, code: true, type: true } } },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  return ok({ products, total, page, limit })
}

export async function POST(request: NextRequest) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!MANAGE_ROLES.has(role)) return fail('Forbidden', 403, 'FORBIDDEN')

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

  if (!b.name || typeof b.name !== 'string' || b.name.trim().length < 2) {
    return fail('Name must be at least 2 characters', 400, 'VALIDATION')
  }
  if (!b.categoryId || typeof b.categoryId !== 'string') {
    return fail('categoryId is required', 400, 'VALIDATION')
  }

  const category = await prisma.category.findUnique({ where: { id: b.categoryId } })
  if (!category) return fail('Category not found', 404, 'NOT_FOUND')

  const product = await prisma.product.create({
    data: {
      name: b.name.trim(),
      categoryId: b.categoryId,
      description: b.description ?? null,
      images: b.images ?? [],
      isActive: b.isActive ?? true,
    },
    include: { category: true },
  })

  await logActivity({
    userId: user.sub!,
    action: 'CREATE',
    entity: 'Product',
    entityId: product.id,
    details: `Created product: ${product.name} via mobile`,
  })

  return ok({ product }, 201)
}

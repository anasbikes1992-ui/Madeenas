import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'

const orderInclude = {
  product: { include: { category: true } },
  customer: { select: { id: true, name: true, email: true } },
} satisfies Prisma.CustomerOrderInclude

export async function listCustomerOrders(params: {
  status?: string | null
  page: number
  limit: number
}) {
  const { status, page, limit } = params
  const where: Prisma.CustomerOrderWhereInput = {}
  if (status) where.status = status

  const [orders, total] = await Promise.all([
    prisma.customerOrder.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customerOrder.count({ where }),
  ])
  return { orders, total }
}

export async function getCustomerOrderById(id: string) {
  return prisma.customerOrder.findUnique({
    where: { id },
    include: orderInclude,
  })
}

export async function updateCustomerOrder(
  id: string,
  data: { status?: string; quotedPrice?: number | null }
) {
  const patch: Prisma.CustomerOrderUpdateInput = {}
  if (data.status !== undefined) patch.status = data.status
  if (data.quotedPrice !== undefined) patch.quotedPrice = data.quotedPrice

  return prisma.customerOrder.update({
    where: { id },
    data: patch,
    include: orderInclude,
  })
}

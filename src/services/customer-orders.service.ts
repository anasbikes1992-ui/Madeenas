import { prisma } from '@/lib/db'
import type { Prisma, OrderStatus } from '@prisma/client'

const ORDER_STATUS_VALUES: OrderStatus[] = [
  'PENDING',
  'APPROVED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
]

const orderInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          unit: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  },
  customer: { select: { id: true, name: true, email: true } },
  sale: { select: { receiptNo: true, createdAt: true, totalAmount: true } },
} satisfies Prisma.CustomerOrderInclude

export async function listCustomerOrders(params: {
  status?: string | null
  page: number
  limit: number
}) {
  const { status, page, limit } = params
  const where: Prisma.CustomerOrderWhereInput = {}
  if (status && ORDER_STATUS_VALUES.includes(status as OrderStatus)) {
    where.status = status as OrderStatus
  }

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
  data: { status?: OrderStatus }
) {
  const patch: Prisma.CustomerOrderUpdateInput = {}
  if (data.status !== undefined) patch.status = data.status

  return prisma.customerOrder.update({
    where: { id },
    data: patch,
    include: orderInclude,
  })
}

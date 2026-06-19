import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

// Customer-facing categories — any authenticated user can read
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const categories = await prisma.category.findMany({
    where: {
      products: { some: { isActive: true } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      color: true,
      icon: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(categories)
}

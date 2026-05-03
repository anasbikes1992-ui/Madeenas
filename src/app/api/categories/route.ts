import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { products: true } },
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(categories)
}

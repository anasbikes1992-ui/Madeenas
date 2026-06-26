import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { products } = await req.json()

    if (!Array.isArray(products)) {
      return NextResponse.json({ error: 'Invalid products data' }, { status: 400 })
    }

    const results = await Promise.all(
      products.map(async (p) => {
        try {
          // Check if category exists or use a default one if needed
          // For now, assume categoryId is provided correctly or we skip
          if (!p.categoryId) return { name: p.name, status: 'Error', message: 'Category ID missing' }

          await prisma.product.create({
            data: {
              name: p.name,
              categoryId: p.categoryId,
              description: p.description || '',
              variants: {
                create: {
                  sku: p.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  colorName: p.color || 'Default',
                  colorHex: p.colorHex || '#FFFFFF',
                  stockUnit: p.unit || 'metres',
                  stockUnitLabel: p.unit || 'Metres',
                  saleUnit: p.unit || 'metres',
                  saleUnitLabel: p.unit || 'Metres',
                  saleToStockFactor: 1.0,
                  lowStockAt: parseFloat(p.lowStockAt) || 10,
                  costPrice: p.costPrice ? parseFloat(p.costPrice) : null,
                  salePrice: p.salePrice ? parseFloat(p.salePrice) : null,
                }
              }
            }
          })
          return { name: p.name, status: 'Success' }
        } catch (err: unknown) {
          return { name: p.name, status: 'Error', message: err instanceof Error ? err.message : String(err) }
        }
      })
    )

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Bulk import error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

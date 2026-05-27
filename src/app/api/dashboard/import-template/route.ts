import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER']

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!ADMIN_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const csvTemplate = [
    'name,design,sku,category,unit,color,colorHex,lowStockAt,costPrice,description,isActive',
    'Cotton Fabric,Plain,SKU-001,Fabrics,meters,White,#FFFFFF,10,150.00,High quality cotton fabric,true',
    'Silk Blend,Floral,SKU-002,Premium,meters,Blue,#0000FF,5,300.00,Premium silk blend,true',
  ].join('\n')

  const csvPayload = `\uFEFF${csvTemplate}`

  return new NextResponse(csvPayload, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="import-template.csv"',
    },
  })
}

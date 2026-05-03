import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('locationId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const role = session.user.role as string

  const where: any = {}
  if (locationId) where.locationId = locationId
  
  // Shop staff only see their own location's sales
  if (role === 'SHOP_STAFF' || role === 'STORE_KEEPER') {
    where.locationId = session.user.locationId
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        location: true,
        soldBy: { select: { name: true } },
        items: {
          include: { product: { select: { name: true, sku: true, unit: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sale.count({ where }),
  ])

  return NextResponse.json({ sales, total })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.user.role as string

  if (!['ADMIN', 'SUPER_ADMIN', 'SHOP_STAFF'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const locationId = session.user.locationId

  if (!locationId && !body.locationId) {
    return NextResponse.json({ error: 'Location required' }, { status: 400 })
  }

  const finalLocationId = locationId || body.locationId

  try {
    // Perform Sale creation and Stock deduction in a transaction
    const sale = await prisma.$transaction(async (tx) => {
      // 1. Verify stock availability
      for (const item of body.items) {
        const stock = await tx.stock.findUnique({
          where: { productId_locationId: { productId: item.productId, locationId: finalLocationId } }
        })

        if (!stock || stock.quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ID: ${item.productId}`)
        }
      }

      // 2. Handle Customer & Credit Eligibility
      let customerId = null
      if (body.customerPhone) {
        const customer = await tx.customer.upsert({
          where: { phone: body.customerPhone },
          update: { 
            name: body.customerName,
            isCreditEligible: body.isCreditEligible !== undefined ? body.isCreditEligible : undefined
          },
          create: { 
            name: body.customerName || 'Unknown',
            phone: body.customerPhone,
            isCreditEligible: body.isCreditEligible || false
          }
        })
        customerId = customer.id
        
        if (body.paymentMode === 'CREDIT' && !customer.isCreditEligible) {
          throw new Error(`Customer ${customer.name} is not eligible for credit.`)
        }
      } else if (body.paymentMode === 'CREDIT') {
        throw new Error('Customer phone number is required for credit sales.')
      }

      // 3. Create the Sale record
      const receiptNo = `REC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`
      
      const newSale = await tx.sale.create({
        data: {
          receiptNo,
          locationId: finalLocationId,
          soldById: session.user.id as string,
          customerId,
          customerName: body.customerName,
          customerPhone: body.customerPhone,
          totalAmount: body.totalAmount,
          paymentMode: body.paymentMode || 'CASH',
          note: body.note,
          items: {
            create: body.items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subTotal: item.subTotal
            }))
          }
        },
        include: { items: true }
      })

      // 4. Deduct stock and create audit logs
      for (const item of body.items) {
        await tx.stock.update({
          where: { productId_locationId: { productId: item.productId, locationId: finalLocationId } },
          data: { quantity: { decrement: item.quantity } }
        })

        await tx.auditLog.create({
          data: {
            userId: session.user.id as string,
            action: 'SALE_DEDUCTION',
            entity: 'Stock',
            entityId: item.productId,
            details: `Sold ${item.quantity} units in receipt ${receiptNo}`
          }
        })
      }

      return newSale
    })

    return NextResponse.json(sale, { status: 201 })
  } catch (error: any) {
    console.error('Sale transaction failed:', error)
    return NextResponse.json({ error: error.message || 'Sale transaction failed' }, { status: 400 })
  }
}

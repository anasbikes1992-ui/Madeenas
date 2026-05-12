import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { supplierSchema } from '@/lib/validations'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()

  try {
    const parsed = supplierSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid supplier data',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Supplier update failed:', error)
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    // Check if supplier is used in stock-ins
    const stockInCount = await prisma.stockIn.count({
      where: { supplierId: id },
    })

    if (stockInCount > 0) {
      // Soft delete - deactivate instead
      const updated = await prisma.supplier.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json(updated)
    }

    // Hard delete if not used
    await prisma.supplier.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Supplier deletion failed:', error)
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 })
  }
}

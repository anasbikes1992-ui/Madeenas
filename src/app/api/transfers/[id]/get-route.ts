import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const transfer = await prisma.stockTransfer.findUnique({
    where: { id },
    include: {
      fromLocation: true,
      toLocation: true,
      requestedByUser: { select: { id: true, name: true, role: true } },
      approvedByUser: { select: { id: true, name: true } },
      dispatchedByUser: { select: { id: true, name: true } },
      receivedByUser: { select: { id: true, name: true } },
      items: {
        include: {
          variant: {
            include: {
              product: { include: { category: true } }
            }
          }
        }
      }
    }
  })

  if (!transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
  return NextResponse.json(transfer)
}

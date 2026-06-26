import { prisma } from '@/lib/db'

type HistoryInput = {
  entityType: string
  entityId: string
  eventType: string
  title: string
  createdBy: string
  details?: string | null
  payload?: Record<string, unknown>
}

export async function logHistoryEvent(input: HistoryInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.createdBy,
        action: input.eventType,
        entity: input.entityType,
        entityId: input.entityId,
        details: input.details || input.title || '',
      },
    })
  } catch (error) {
    console.error('History Log Error:', error)
  }
}

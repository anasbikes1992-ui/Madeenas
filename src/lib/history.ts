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
  const auditLogModel = (prisma as { auditLog?: { create?: (args: unknown) => Promise<unknown> } }).auditLog

  try {
    if (!(prisma as { entityHistory?: { create?: unknown } }).entityHistory) {
      if (auditLogModel?.create) {
        await auditLogModel.create({
          data: {
            userId: input.createdBy,
            action: `HISTORY_FALLBACK:${input.eventType}`,
            entity: input.entityType,
            entityId: input.entityId,
            details: input.details || input.title,
          },
        })
      }
      return
    }

    await prisma.entityHistory.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        eventType: input.eventType,
        title: input.title,
        details: input.details ?? null,
        payloadJson: input.payload ? JSON.stringify(input.payload) : null,
        createdBy: input.createdBy,
      },
    })
  } catch (error) {
    console.error('History Log Error:', error)
    try {
      if (auditLogModel?.create) {
        await auditLogModel.create({
          data: {
            userId: input.createdBy,
            action: `HISTORY_ERROR:${input.eventType}`,
            entity: input.entityType,
            entityId: input.entityId,
            details: input.details || input.title,
          },
        })
      }
    } catch (auditError) {
      console.error('History fallback audit log failed:', auditError)
    }
  }
}

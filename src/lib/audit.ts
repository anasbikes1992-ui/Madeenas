import { prisma } from './db'

export async function logActivity({
  userId,
  action,
  entity,
  entityId,
  details
}: {
  userId: string
  action: string
  entity: string
  entityId?: string
  details?: string
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details
      }
    })
  } catch (error) {
    console.error('Audit Log Error:', error)
  }
}

export async function createNotification({
  userId,
  role,
  title,
  message,
  type = 'INFO',
  link
}: {
  userId?: string
  role?: string
  title: string
  message: string
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER'
  link?: string
}) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        role,
        title,
        message,
        type,
        link
      }
    })
  } catch (error) {
    console.error('Notification Error:', error)
  }
}

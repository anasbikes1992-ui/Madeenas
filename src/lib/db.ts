import { PrismaClient } from '@prisma/client'
import { env } from '@/lib/env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

void env.DATABASE_URL

const runtimeDatabaseUrl = env.DATABASE_URL || env.DIRECT_URL

if (!runtimeDatabaseUrl) {
  throw new Error('[db] Neither DATABASE_URL nor DIRECT_URL is configured')
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: runtimeDatabaseUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

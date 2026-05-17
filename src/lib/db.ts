import { PrismaClient } from '@prisma/client'
import { env } from '@/lib/env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

void env.DATABASE_URL

const isLocalRuntime = process.env.NODE_ENV !== 'production'
const pooledConnectionIsConstrained = /pgbouncer=true|connection_limit=1/i.test(env.DATABASE_URL ?? '')
const runtimeDatabaseUrl =
  isLocalRuntime && env.DIRECT_URL && pooledConnectionIsConstrained
    ? env.DIRECT_URL
    : env.DATABASE_URL || env.DIRECT_URL

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

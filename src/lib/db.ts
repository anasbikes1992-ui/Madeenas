import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || "postgresql://postgres.klklufcegyfgezvjmanr:MadeenasShazan2024@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1",
      },
    },
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

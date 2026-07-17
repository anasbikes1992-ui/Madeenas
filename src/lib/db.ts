import { PrismaClient, Prisma } from '@prisma/client'
import { env } from '@/lib/env'

void env.DATABASE_URL

/**
 * Money is stored as DECIMAL(12,2) and quantities as DECIMAL(12,3), so Prisma
 * hands back `Prisma.Decimal` instances. By default those serialize to JSON as
 * *strings* ("1250.50"), which would silently break every API consumer — the
 * mobile app parses numerics with `as num`, and the web dashboards do
 * arithmetic on them.
 *
 * Emitting numbers instead keeps every client working while the types stay
 * honest: a Decimal is still a Decimal in application code, so the compiler
 * forces money arithmetic through src/lib/money.ts rather than silently
 * allowing floating-point `+`/`*` on currency.
 *
 * Values at these scales are exactly representable as IEEE-754 doubles, so the
 * conversion is lossless.
 */
Prisma.Decimal.prototype.toJSON = function toJSON(this: Prisma.Decimal) {
  return this.toNumber() as unknown as string
}

const isLocalRuntime = process.env.NODE_ENV !== 'production'
const pooledConnectionIsConstrained = /pgbouncer=true|connection_limit=1/i.test(env.DATABASE_URL ?? '')
const runtimeDatabaseUrl =
  isLocalRuntime && env.DIRECT_URL && pooledConnectionIsConstrained
    ? env.DIRECT_URL
    : env.DATABASE_URL || env.DIRECT_URL

if (!runtimeDatabaseUrl) {
  throw new Error('[db] Neither DATABASE_URL nor DIRECT_URL is configured')
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
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

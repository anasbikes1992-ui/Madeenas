/**
 * Sequential document numbers (receipts, orders, returns, transfers, POs).
 *
 * Backed by Postgres sequences via `nextval`, which is atomic and — critically —
 * does NOT take a transaction-scoped lock. Concurrent sales therefore never
 * contend or deadlock on numbering, unlike the previous approaches:
 * `findFirst`-then-increment (racy, duplicate keys) and
 * `Date.now()+random` (collision-prone by construction).
 *
 * Numbers are globally monotonic rather than reset per day. Sequences are
 * non-transactional, so a rolled-back sale consumes its number and leaves a
 * gap — that is the standard, accepted trade-off for gap-free *uniqueness*
 * under concurrency, and monotonic invoice numbering is preferable for
 * accounting anyway.
 */
import { Prisma, PrismaClient } from '@prisma/client'

export type TxClient = Prisma.TransactionClient | PrismaClient

const SCOPES = {
  receipt: { prefix: 'RCP', sequence: 'receipt_number_seq' },
  order: { prefix: 'ORD', sequence: 'order_number_seq' },
  return: { prefix: 'RET', sequence: 'return_number_seq' },
  transfer: { prefix: 'TRF', sequence: 'transfer_number_seq' },
  po: { prefix: 'PO', sequence: 'po_number_seq' },
} as const

export type DocScope = keyof typeof SCOPES

/**
 * Allocate the next number for a scope, formatted `PREFIX-YYYYMMDD-NNNNNN`.
 * The date segment records when the document was raised; NNNNNN is the
 * sequence value.
 */
export async function nextDocNumber(tx: TxClient, scope: DocScope): Promise<string> {
  const { prefix, sequence } = SCOPES[scope]
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')

  // The sequence name comes from the SCOPES constant above, never from user
  // input, so interpolating it into the statement is safe.
  const rows = await tx.$queryRawUnsafe<Array<{ value: bigint }>>(
    `SELECT nextval('${sequence}') AS value`
  )
  const value = rows[0]?.value
  if (value === undefined || value === null) {
    throw new Error(`Failed to allocate document number for scope ${scope}`)
  }

  return `${prefix}-${dateStr}-${String(value).padStart(6, '0')}`
}

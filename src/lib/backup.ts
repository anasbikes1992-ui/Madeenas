import { gzipSync } from 'zlib'
import { prisma } from '@/lib/db'
import { env } from '@/lib/env'

type TableSnapshot = {
  table: string
  rowCount: number
  rows: unknown[]
}

export type BackupArtifact = {
  fileName: string
  generatedAt: string
  totalTables: number
  totalRows: number
  maxRowsPerTable: number
  sizeBytes: number
  gzSizeBytes: number
  json: string
  gzBase64: string
}

const TABLES = [
  'users',
  'categories',
  'products',
  'locations',
  'stocks',
  'stockIns',
  'stockOutRequests',
  'sales',
  'saleItems',
  'customers',
  'customerOrders',
] as const

export async function generateBackupArtifact(): Promise<BackupArtifact> {
  const maxRows = env.BACKUP_MAX_ROWS_PER_TABLE

  const snapshots: TableSnapshot[] = []

  const users = await prisma.user.findMany({ take: maxRows, orderBy: { createdAt: 'desc' } })
  snapshots.push({ table: 'users', rowCount: users.length, rows: users })

  const categories = await prisma.category.findMany({ take: maxRows, orderBy: { createdAt: 'desc' } })
  snapshots.push({ table: 'categories', rowCount: categories.length, rows: categories })

  const products = await prisma.product.findMany({ take: maxRows, orderBy: { createdAt: 'desc' } })
  snapshots.push({ table: 'products', rowCount: products.length, rows: products })

  const locations = await prisma.location.findMany({ take: maxRows, orderBy: { createdAt: 'desc' } })
  snapshots.push({ table: 'locations', rowCount: locations.length, rows: locations })

  const stocks = await prisma.stock.findMany({ take: maxRows, orderBy: { updatedAt: 'desc' } })
  snapshots.push({ table: 'stocks', rowCount: stocks.length, rows: stocks })

  const stockIns = await prisma.stockIn.findMany({ take: maxRows, orderBy: { createdAt: 'desc' } })
  snapshots.push({ table: 'stockIns', rowCount: stockIns.length, rows: stockIns })

  const stockOutRequests = await prisma.stockOutRequest.findMany({
    take: maxRows,
    orderBy: { createdAt: 'desc' },
  })
  snapshots.push({ table: 'stockOutRequests', rowCount: stockOutRequests.length, rows: stockOutRequests })

  const sales = await prisma.sale.findMany({ take: maxRows, orderBy: { createdAt: 'desc' } })
  snapshots.push({ table: 'sales', rowCount: sales.length, rows: sales })

  const saleItems = await prisma.saleItem.findMany({ take: maxRows })
  snapshots.push({ table: 'saleItems', rowCount: saleItems.length, rows: saleItems })

  const customers = await prisma.customer.findMany({ take: maxRows, orderBy: { createdAt: 'desc' } })
  snapshots.push({ table: 'customers', rowCount: customers.length, rows: customers })

  const customerOrders = await prisma.customerOrder.findMany({
    take: maxRows,
    orderBy: { createdAt: 'desc' },
  })
  snapshots.push({ table: 'customerOrders', rowCount: customerOrders.length, rows: customerOrders })

  const generatedAt = new Date().toISOString()
  const totalRows = snapshots.reduce((sum, table) => sum + table.rowCount, 0)
  const backupPayload = {
    version: '1.0',
    generatedAt,
    database: {
      provider: 'postgresql',
      app: env.NEXT_PUBLIC_APP_NAME ?? 'Nexus Inventorytile Stock',
    },
    notes: {
      strategy: 'logical-json-snapshot',
      maxRowsPerTable: maxRows,
      tableCount: TABLES.length,
    },
    tables: snapshots,
  }

  const json = JSON.stringify(backupPayload)
  const gzBuffer = gzipSync(Buffer.from(json, 'utf-8'))
  const fileName = `Nexus-backup-${generatedAt.replace(/[:.]/g, '-')}.json.gz`

  return {
    fileName,
    generatedAt,
    totalTables: TABLES.length,
    totalRows,
    maxRowsPerTable: maxRows,
    sizeBytes: Buffer.byteLength(json),
    gzSizeBytes: gzBuffer.length,
    json,
    gzBase64: gzBuffer.toString('base64'),
  }
}

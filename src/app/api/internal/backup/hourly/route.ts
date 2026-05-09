import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { env } from '@/lib/env'
import { generateBackupArtifact } from '@/lib/backup'
import { sendBackupEmail } from '@/lib/backup-email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return false
  }

  const secret = authHeader.slice(7).trim()
  if (!env.BACKUP_CRON_SECRET || !secret) {
    return false
  }

  const expected = Buffer.from(env.BACKUP_CRON_SECRET)
  const actual = Buffer.from(secret)
  if (expected.length !== actual.length) {
    return false
  }

  return timingSafeEqual(expected, actual)
}

async function runHourlyBackup(request: NextRequest) {
  if (!env.BACKUP_ENABLED) {
    return NextResponse.json({ success: false, message: 'Backup automation disabled' }, { status: 412 })
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const artifact = await generateBackupArtifact()
  const mailResult = await sendBackupEmail(artifact)

  return NextResponse.json({
    success: true,
    generatedAt: artifact.generatedAt,
    fileName: artifact.fileName,
    tables: artifact.totalTables,
    rows: artifact.totalRows,
    bytes: {
      raw: artifact.sizeBytes,
      compressed: artifact.gzSizeBytes,
    },
    mail: {
      sent: mailResult.ok,
      id: mailResult.id ?? null,
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    return await runHourlyBackup(request)
  } catch (error) {
    console.error('[backup-hourly] failed:', error)
    const message = error instanceof Error ? error.message : 'Backup job failed'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    return await runHourlyBackup(request)
  } catch (error) {
    console.error('[backup-hourly] failed:', error)
    const message = error instanceof Error ? error.message : 'Backup job failed'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

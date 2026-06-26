import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { generateBackupArtifact } from '@/lib/backup'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const format = new URL(request.url).searchParams.get('format') || 'json'

  try {
    const artifact = await generateBackupArtifact()

    if (format === 'download') {
      return new NextResponse(artifact.json, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${artifact.fileName}"`,
        }
      })
    }

    return NextResponse.json({
      success: true,
      fileName: artifact.fileName,
      generatedAt: artifact.generatedAt,
      totalTables: artifact.totalTables,
      totalRows: artifact.totalRows,
      sizeBytes: artifact.sizeBytes,
      preview: JSON.parse(artifact.json).tables?.map((t: any) => ({
        table: t.table,
        rowCount: t.rowCount
      }))
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Backup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

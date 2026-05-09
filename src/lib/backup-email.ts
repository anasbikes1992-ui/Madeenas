import { env } from '@/lib/env'
import type { BackupArtifact } from '@/lib/backup'

type EmailSendResult = {
  id?: string
  ok: boolean
}

function getAdminEmails() {
  const raw = env.BACKUP_ADMIN_EMAILS ?? ''
  return raw
    .split(',')
    .map((email) => email.trim())
    .filter((email) => email.length > 0)
}

export async function sendBackupEmail(artifact: BackupArtifact): Promise<EmailSendResult> {
  if (!env.BACKUP_ENABLED) {
    return { ok: false }
  }

  const to = getAdminEmails()
  if (to.length === 0) {
    throw new Error('BACKUP_ADMIN_EMAILS is empty')
  }

  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set')
  }

  if (!env.BACKUP_FROM_EMAIL) {
    throw new Error('BACKUP_FROM_EMAIL is not set')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.BACKUP_FROM_EMAIL,
      to,
      subject: `[${env.NEXT_PUBLIC_APP_NAME ?? 'Madeena'}] Hourly database backup ${artifact.generatedAt}`,
      text: [
        `Hourly backup completed at ${artifact.generatedAt}`,
        `Tables captured: ${artifact.totalTables}`,
        `Rows captured: ${artifact.totalRows}`,
        `Uncompressed size: ${artifact.sizeBytes} bytes`,
        `Compressed size: ${artifact.gzSizeBytes} bytes`,
        `Max rows per table: ${artifact.maxRowsPerTable}`,
      ].join('\n'),
      attachments: [
        {
          filename: artifact.fileName,
          content: artifact.gzBase64,
        },
      ],
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Resend email failed (${response.status}): ${detail}`)
  }

  const json = (await response.json()) as { id?: string }
  return { ok: true, id: json.id }
}

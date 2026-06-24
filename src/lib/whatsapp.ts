import { env } from '@/lib/env'
import { captureApiError } from '@/lib/logger'

type OrderNotificationPayload = {
  orderId: string
  productName: string
  quantity: number
  customerName: string
  customerEmail: string
  customerPhone: string | null
  colorPreference: string | null
  note: string | null
}

type NotificationTarget = 'admin' | 'shop' | 'customer'

type NotificationResult = {
  enabled: boolean
  attempted: number
  delivered: number
  skipped: string[]
  failures: string[]
}

type InvoiceNotificationPayload = {
  receiptNo: string
  customerName?: string | null
  customerPhone?: string | null
  grandTotal: number
  paymentMode: string
  createdAt: Date | string
  invoiceUrl?: string
}

function parseRecipients(value: string | undefined) {
  if (!value) return []

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function buildOrderMessage(target: NotificationTarget, payload: OrderNotificationPayload) {
  const customerLine = `${payload.customerName} (${payload.customerEmail}${payload.customerPhone ? `, ${payload.customerPhone}` : ''})`

  if (target === 'customer') {
    return [
      'Nexus Inventory confirmation',
      'Your order request has been received.',
      `Product: ${payload.productName}`,
      `Quantity: ${payload.quantity}`,
      `Order ID: ${payload.orderId}`,
      'Our team will contact you shortly.',
    ].join('\n')
  }

  return [
    'New customer order request',
    `Order ID: ${payload.orderId}`,
    `Product: ${payload.productName}`,
    `Quantity: ${payload.quantity}`,
    `Customer: ${customerLine}`,
    payload.colorPreference ? `Color preference: ${payload.colorPreference}` : null,
    payload.note ? `Note: ${payload.note}` : null,
    target === 'shop' ? 'Action: confirm shop or warehouse availability.' : 'Action: review and follow up with customer.',
  ]
    .filter(Boolean)
    .join('\n')
}

async function sendTextMessage(recipient: string, body: string, apiUrl: string, apiToken: string) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'text',
      text: { body },
    }),
    signal: AbortSignal.timeout(env.WHATSAPP_REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`WhatsApp API ${response.status}: ${message}`)
  }
}

export async function sendOrderWhatsAppNotifications(payload: OrderNotificationPayload): Promise<NotificationResult> {
  const result: NotificationResult = {
    enabled: env.WHATSAPP_ENABLED,
    attempted: 0,
    delivered: 0,
    skipped: [],
    failures: [],
  }

  if (!env.WHATSAPP_ENABLED) {
    result.skipped.push('WhatsApp integration disabled')
    return result
  }

  const apiUrl = env.WHATSAPP_API_URL
  const apiToken = env.WHATSAPP_API_TOKEN

  if (!apiUrl || !apiToken) {
    result.skipped.push('WhatsApp API credentials missing')
    return result
  }

  const recipients: Array<{ recipient: string; target: NotificationTarget }> = [
    ...parseRecipients(env.WHATSAPP_ADMIN_RECIPIENTS).map((recipient) => ({ recipient, target: 'admin' as const })),
    ...parseRecipients(env.WHATSAPP_SHOP_RECIPIENTS).map((recipient) => ({ recipient, target: 'shop' as const })),
  ]

  if (env.WHATSAPP_SEND_CUSTOMER && payload.customerPhone) {
    recipients.push({ recipient: payload.customerPhone, target: 'customer' })
  } else if (env.WHATSAPP_SEND_CUSTOMER) {
    result.skipped.push('Customer WhatsApp skipped because phone number is missing')
  }

  if (recipients.length === 0) {
    result.skipped.push('No WhatsApp recipients configured')
    return result
  }

  await Promise.all(
    recipients.map(async ({ recipient, target }) => {
      result.attempted += 1
      try {
        await sendTextMessage(recipient, buildOrderMessage(target, payload), apiUrl, apiToken)
        result.delivered += 1
      } catch (error) {
        console.error('WhatsApp notification failed:', {
          target,
          recipient,
          message: error instanceof Error ? error.message : 'Unknown error',
        })
        result.failures.push(`${target}:${recipient}`)
      }
    })
  )

  return result
}

function buildInvoiceMessage(payload: InvoiceNotificationPayload) {
  const issuedAt =
    payload.createdAt instanceof Date ? payload.createdAt.toISOString() : payload.createdAt

  return [
    'Nexus Inventory invoice',
    `Receipt: ${payload.receiptNo}`,
    `Customer: ${payload.customerName || 'Walk-in customer'}`,
    `Amount: LKR ${payload.grandTotal.toFixed(2)}`,
    `Payment: ${payload.paymentMode.replace(/_/g, ' ')}`,
    `Issued: ${issuedAt}`,
    payload.invoiceUrl ? `Invoice PDF: ${payload.invoiceUrl}` : null,
    'Thank you for shopping with us.',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function sendInvoiceWhatsAppNotification(
  payload: InvoiceNotificationPayload,
): Promise<NotificationResult> {
  const result: NotificationResult = {
    enabled: env.WHATSAPP_ENABLED && env.WHATSAPP_SEND_CUSTOMER,
    attempted: 0,
    delivered: 0,
    skipped: [],
    failures: [],
  }

  if (!env.WHATSAPP_ENABLED) {
    result.skipped.push('WhatsApp integration disabled')
    return result
  }

  if (!env.WHATSAPP_SEND_CUSTOMER) {
    result.skipped.push('Customer WhatsApp notifications disabled')
    return result
  }

  const recipient = payload.customerPhone?.trim()
  if (!recipient) {
    result.skipped.push('Customer phone is missing')
    return result
  }

  const apiUrl = env.WHATSAPP_API_URL
  const apiToken = env.WHATSAPP_API_TOKEN
  if (!apiUrl || !apiToken) {
    result.skipped.push('WhatsApp API credentials missing')
    return result
  }

  result.attempted = 1
  try {
    await sendTextMessage(recipient, buildInvoiceMessage(payload), apiUrl, apiToken)
    result.delivered = 1
  } catch (error) {
    captureApiError(error, {
      route: 'lib/whatsapp.sendInvoiceWhatsAppNotification',
      recipient,
      receiptNo: payload.receiptNo,
    })
    result.failures.push(`customer:${recipient}`)
  }

  return result
}
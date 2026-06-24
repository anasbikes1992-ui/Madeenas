/**
 * Centralized Notification Dispatcher Service
 * 
 * Handles all notification types across multiple channels:
 * - Email (via Resend)
 * - WhatsApp (via Business API)
 * - SMS (via Twilio)
 * - In-app notifications (database)
 * 
 * Features:
 * - Promise.allSettled for non-blocking multi-channel dispatch
 * - Graceful degradation if a channel fails
 * - Template-based messaging
 * - Event-driven architecture
 */

import { createNotification } from '@/lib/audit'
import { emailService } from './email.service'
import { whatsappService } from './whatsapp.service'
import { smsService } from './sms.service'
import { CustomerOrder, Sale, StockOutRequest, Return } from '@prisma/client'
import { prisma } from '@/lib/db'

// ============================================================================
// Types
// ============================================================================

export type OrderEvent =
  | 'ORDER_CREATED'
  | 'ORDER_APPROVED'
  | 'ORDER_FULFILLED'
  | 'ORDER_CANCELLED'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'

export type ReturnEvent = 'RETURN_INITIATED' | 'RETURN_APPROVED' | 'RETURN_REJECTED' | 'RETURN_REFUNDED'

export type StockEvent = 'STOCK_LOW' | 'STOCK_OUT' | 'STOCK_RECEIVED' | 'STOCK_DISPATCHED'

export type SaleEvent = 'SALE_COMPLETED' | 'SALE_REFUNDED'

interface NotificationChannels {
  email: boolean
  whatsapp: boolean
  sms: boolean
  inApp: boolean
}

interface NotificationResult {
  channel: string
  success: boolean
  error?: string
}

// ============================================================================
// Notification Dispatcher
// ============================================================================

/**
 * Dispatch order-related notifications across all channels
 */
export async function dispatchOrderNotification(
  event: OrderEvent,
  order: CustomerOrder & { customer: { name: string; email: string; phone?: string | null }; items: any[] },
  options: Partial<NotificationChannels> = {}
): Promise<NotificationResult[]> {
  const channels: NotificationChannels = {
    email: options.email ?? true,
    whatsapp: options.whatsapp ?? true,
    sms: options.sms ?? false, // Default off unless explicitly enabled
    inApp: options.inApp ?? true,
  }

  const tasks: Promise<NotificationResult>[] = []

  // Email to customer
  if (channels.email && order.customer.email) {
    tasks.push(
      sendOrderEmail(order.customer.email, event, order)
        .then(() => ({ channel: 'email', success: true }))
        .catch((error) => ({ channel: 'email', success: false, error: String(error) }))
    )
  }

  // Email to admin
  if (channels.email) {
    tasks.push(
      sendAdminOrderAlert(event, order)
        .then(() => ({ channel: 'admin_email', success: true }))
        .catch((error) => ({ channel: 'admin_email', success: false, error: String(error) }))
    )
  }

  // WhatsApp notification
  if (channels.whatsapp && order.customer.phone && isWhatsAppEnabled()) {
    tasks.push(
      sendOrderWhatsApp(order.customer.phone, event, order)
        .then(() => ({ channel: 'whatsapp', success: true }))
        .catch((error) => ({ channel: 'whatsapp', success: false, error: String(error) }))
    )
  }

  // SMS notification (if enabled and customer has phone)
  if (channels.sms && order.customer.phone) {
    tasks.push(
      sendOrderSMS(order.customer.phone, event, order)
        .then(() => ({ channel: 'sms', success: true }))
        .catch((error) => ({ channel: 'sms', success: false, error: String(error) }))
    )
  }

  // In-app notification
  if (channels.inApp) {
    tasks.push(
      createInAppNotification('order', order.customerId, event, order)
        .then(() => ({ channel: 'in_app', success: true }))
        .catch((error) => ({ channel: 'in_app', success: false, error: String(error) }))
    )
  }

  const results = await Promise.allSettled(tasks)

  return results.map((result) => (result.status === 'fulfilled' ? result.value : { channel: 'unknown', success: false }))
}

/**
 * Dispatch return-related notifications
 */
export async function dispatchReturnNotification(
  event: ReturnEvent,
  returnItem: Return & { customer: { name: string; email: string; phone?: string | null } },
  options: Partial<NotificationChannels> = {}
): Promise<NotificationResult[]> {
  const channels: NotificationChannels = {
    email: options.email ?? true,
    whatsapp: options.whatsapp ?? false,
    sms: options.sms ?? false,
    inApp: options.inApp ?? true,
  }

  const tasks: Promise<NotificationResult>[] = []

  if (channels.email && returnItem.customer.email) {
    tasks.push(
      sendReturnEmail(returnItem.customer.email, event, returnItem)
        .then(() => ({ channel: 'email', success: true }))
        .catch((error) => ({ channel: 'email', success: false, error: String(error) }))
    )
  }

  if (channels.inApp) {
    tasks.push(
      createInAppNotification('return', returnItem.customerId!, event, returnItem)
        .then(() => ({ channel: 'in_app', success: true }))
        .catch((error) => ({ channel: 'in_app', success: false, error: String(error) }))
    )
  }

  const results = await Promise.allSettled(tasks)
  return results.map((result) => (result.status === 'fulfilled' ? result.value : { channel: 'unknown', success: false }))
}

/**
 * Dispatch stock alert notifications (for admin/staff)
 */
export async function dispatchStockAlert(
  event: StockEvent,
  data: { productName: string; locationName: string; quantity: number; threshold?: number },
  recipientUserIds: string[]
): Promise<NotificationResult[]> {
  const tasks: Promise<NotificationResult>[] = []

  // In-app notifications for each recipient
  for (const userId of recipientUserIds) {
    tasks.push(
      createInAppNotification('stock', userId, event, data)
        .then(() => ({ channel: `in_app_${userId}`, success: true }))
        .catch((error) => ({ channel: `in_app_${userId}`, success: false, error: String(error) }))
    )
  }

  // Email to admin if critical
  if (event === 'STOCK_OUT') {
    tasks.push(
      sendAdminStockAlert(event, data)
        .then(() => ({ channel: 'admin_email', success: true }))
        .catch((error) => ({ channel: 'admin_email', success: false, error: String(error) }))
    )
  }

  const results = await Promise.allSettled(tasks)
  return results.map((result) => (result.status === 'fulfilled' ? result.value : { channel: 'unknown', success: false }))
}

// ============================================================================
// Email Templates
// ============================================================================

async function sendOrderEmail(to: string, event: OrderEvent, order: any): Promise<void> {
  const templates = {
    ORDER_CREATED: {
      subject: `Order Confirmation - #${order.orderNumber}`,
      html: generateOrderConfirmationEmail(order),
    },
    ORDER_APPROVED: {
      subject: `Order Approved - #${order.orderNumber}`,
      html: generateOrderApprovedEmail(order),
    },
    ORDER_FULFILLED: {
      subject: `Order Fulfilled - #${order.orderNumber}`,
      html: generateOrderFulfilledEmail(order),
    },
    ORDER_CANCELLED: {
      subject: `Order Cancelled - #${order.orderNumber}`,
      html: generateOrderCancelledEmail(order),
    },
    ORDER_SHIPPED: {
      subject: `Order Shipped - #${order.orderNumber}`,
      html: generateOrderShippedEmail(order),
    },
    ORDER_DELIVERED: {
      subject: `Order Delivered - #${order.orderNumber}`,
      html: generateOrderDeliveredEmail(order),
    },
  }

  const template = templates[event]
  await emailService.sendEmail(to, template.subject, template.html)
}

async function sendAdminOrderAlert(event: OrderEvent, order: any): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@madeena-textiles.com'

  const subject = `[Admin Alert] ${event.replace(/_/g, ' ')} - Order #${order.orderNumber}`
  const html = `
    <h2>Order ${event.replace(/_/g, ' ')}</h2>
    <p><strong>Order Number:</strong> ${order.orderNumber}</p>
    <p><strong>Customer:</strong> ${order.customer.name} (${order.customer.email})</p>
    <p><strong>Total:</strong> LKR ${order.grandTotal.toFixed(2)}</p>
    <p><strong>Items:</strong> ${order.items.length}</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/orders/${order.id}">View Order</a></p>
  `

  await emailService.sendEmail(adminEmail, subject, html)
}

async function sendReturnEmail(to: string, event: ReturnEvent, returnItem: any): Promise<void> {
  const templates = {
    RETURN_INITIATED: { subject: 'Return Request Received', html: generateReturnInitiatedEmail(returnItem) },
    RETURN_APPROVED: { subject: 'Return Request Approved', html: generateReturnApprovedEmail(returnItem) },
    RETURN_REJECTED: { subject: 'Return Request Rejected', html: generateReturnRejectedEmail(returnItem) },
    RETURN_REFUNDED: { subject: 'Refund Processed', html: generateReturnRefundedEmail(returnItem) },
  }

  const template = templates[event]
  await emailService.sendEmail(to, template.subject, template.html)
}

async function sendAdminStockAlert(event: StockEvent, data: any): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@madeena-textiles.com'
  const subject = `[Stock Alert] ${data.productName} - ${data.locationName}`
  const html = `
    <h2>Stock Alert: ${event.replace(/_/g, ' ')}</h2>
    <p><strong>Product:</strong> ${data.productName}</p>
    <p><strong>Location:</strong> ${data.locationName}</p>
    <p><strong>Current Quantity:</strong> ${data.quantity}</p>
    ${data.threshold ? `<p><strong>Threshold:</strong> ${data.threshold}</p>` : ''}
  `

  await emailService.sendEmail(adminEmail, subject, html)
}

// ============================================================================
// WhatsApp Templates
// ============================================================================

async function sendOrderWhatsApp(phone: string, event: OrderEvent, order: any): Promise<void> {
  const messages = {
    ORDER_CREATED: `Your order #${order.orderNumber} has been received! Total: LKR ${order.grandTotal.toFixed(2)}. We'll notify you when it's approved.`,
    ORDER_APPROVED: `Great news! Your order #${order.orderNumber} has been approved and is being prepared.`,
    ORDER_FULFILLED: `Your order #${order.orderNumber} is ready! Please visit our store to collect it.`,
    ORDER_CANCELLED: `Your order #${order.orderNumber} has been cancelled. If you have questions, please contact us.`,
    ORDER_SHIPPED: `Your order #${order.orderNumber} has been shipped and is on the way!`,
    ORDER_DELIVERED: `Your order #${order.orderNumber} has been delivered. Thank you for shopping with us!`,
  }

  await whatsappService.sendMessage({ to: phone, message: messages[event] })
}

// ============================================================================
// SMS Templates
// ============================================================================

async function sendOrderSMS(phone: string, event: OrderEvent, order: any): Promise<void> {
  const messages = {
    ORDER_CREATED: `Madeena: Order #${order.orderNumber} received. Total: LKR ${order.grandTotal.toFixed(2)}`,
    ORDER_APPROVED: `Madeena: Order #${order.orderNumber} approved`,
    ORDER_FULFILLED: `Madeena: Order #${order.orderNumber} ready for pickup`,
    ORDER_CANCELLED: `Madeena: Order #${order.orderNumber} cancelled`,
    ORDER_SHIPPED: `Madeena: Order #${order.orderNumber} shipped`,
    ORDER_DELIVERED: `Madeena: Order #${order.orderNumber} delivered`,
  }

  await smsService.sendSMS({ to: phone, message: messages[event] })
}

// ============================================================================
// In-App Notifications
// ============================================================================

async function createInAppNotification(
  type: 'order' | 'return' | 'stock',
  userId: string,
  event: string,
  data: any
): Promise<void> {
  const message = getInAppMessage(type, event, data)
  const notificationType = getNotificationType(event)
  const title = getNotificationTitle(type, event)

  await createNotification({
    type: notificationType,
    userId,
    title,
    message,
  })
}

function getNotificationType(event: string): 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER' {
  if (event.includes('CREATED') || event.includes('CONFIRMED')) return 'SUCCESS'
  if (event.includes('CANCELLED') || event.includes('REJECTED')) return 'DANGER'
  if (event.includes('PENDING') || event.includes('LOW_STOCK')) return 'WARNING'
  return 'INFO'
}

function getNotificationTitle(type: 'order' | 'return' | 'stock', event: string): string {
  if (type === 'order') return 'Order Update'
  if (type === 'return') return 'Return Update'
  if (type === 'stock') return 'Stock Alert'
  return 'Notification'
}

function getInAppMessage(type: 'order' | 'return' | 'stock', event: string, data: any): string {
  if (type === 'order') {
    const messages = {
      ORDER_CREATED: `Order #${data.orderNumber} created successfully`,
      ORDER_APPROVED: `Order #${data.orderNumber} has been approved`,
      ORDER_FULFILLED: `Order #${data.orderNumber} is ready`,
      ORDER_CANCELLED: `Order #${data.orderNumber} has been cancelled`,
      ORDER_SHIPPED: `Order #${data.orderNumber} shipped`,
      ORDER_DELIVERED: `Order #${data.orderNumber} delivered`,
    }
    return messages[event as OrderEvent] || event
  }

  if (type === 'return') {
    const messages = {
      RETURN_INITIATED: `Return request submitted`,
      RETURN_APPROVED: `Return request approved`,
      RETURN_REJECTED: `Return request rejected`,
      RETURN_REFUNDED: `Refund processed`,
    }
    return messages[event as ReturnEvent] || event
  }

  if (type === 'stock') {
    return `${data.productName} at ${data.locationName}: ${data.quantity} units`
  }

  return event
}

// ============================================================================
// Utilities
// ============================================================================

function isWhatsAppEnabled(): boolean {
  return process.env.WHATSAPP_ENABLED === 'true'
}

// ============================================================================
// HTML Email Templates
// ============================================================================

function generateOrderConfirmationEmail(order: any): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Order Confirmation</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="background: #0066cc; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0;">Order Confirmation</h1>
  </div>
  <div style="padding: 20px;">
    <p>Dear ${order.customer.name},</p>
    <p>Thank you for your order! We've received your order and will process it shortly.</p>
    
    <div style="background: #f4f4f4; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <h2 style="margin-top: 0;">Order #${order.orderNumber}</h2>
      <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
      <p><strong>Status:</strong> ${order.status}</p>
    </div>
    
    <h3>Order Items:</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background: #f4f4f4;">
          <th style="padding: 10px; text-align: left;">Item</th>
          <th style="padding: 10px; text-align: right;">Qty</th>
          <th style="padding: 10px; text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${order.items.map((item: any) => `
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px;">${item.product?.name || 'Item'}</td>
            <td style="padding: 10px; text-align: right;">${item.quantity}</td>
            <td style="padding: 10px; text-align: right;">LKR ${(item.subTotal + item.taxAmount).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding: 10px; text-align: right;"><strong>Subtotal:</strong></td>
          <td style="padding: 10px; text-align: right;"><strong>LKR ${order.subTotal.toFixed(2)}</strong></td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 10px; text-align: right;"><strong>Tax (18%):</strong></td>
          <td style="padding: 10px; text-align: right;"><strong>LKR ${order.taxAmount.toFixed(2)}</strong></td>
        </tr>
        <tr style="background: #f4f4f4;">
          <td colspan="2" style="padding: 10px; text-align: right;"><strong>Grand Total:</strong></td>
          <td style="padding: 10px; text-align: right;"><strong>LKR ${order.grandTotal.toFixed(2)}</strong></td>
        </tr>
      </tfoot>
    </table>
    
    <p style="margin-top: 30px;">We'll notify you when your order status changes.</p>
    <p>Thank you for choosing Madeena Textiles!</p>
  </div>
  <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666;">
    <p>Madeena Textiles | Sri Lanka</p>
  </div>
</body>
</html>
  `
}

function generateOrderApprovedEmail(order: any): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="background: #10b981; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0;">Order Approved!</h1>
  </div>
  <div style="padding: 20px;">
    <p>Dear ${order.customer.name},</p>
    <p>Great news! Your order #${order.orderNumber} has been approved and is now being prepared.</p>
    <p><strong>Grand Total:</strong> LKR ${order.grandTotal.toFixed(2)}</p>
    <p>We'll notify you when it's ready for pickup or dispatch.</p>
  </div>
</body>
</html>
  `
}

function generateOrderFulfilledEmail(order: any): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="background: #0066cc; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0;">Order Ready!</h1>
  </div>
  <div style="padding: 20px;">
    <p>Dear ${order.customer.name},</p>
    <p>Your order #${order.orderNumber} is ready!</p>
    <p><strong>Grand Total:</strong> LKR ${order.grandTotal.toFixed(2)}</p>
    <p>Please visit our store to collect your order.</p>
  </div>
</body>
</html>
  `
}

function generateOrderCancelledEmail(order: any): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0;">Order Cancelled</h1>
  </div>
  <div style="padding: 20px;">
    <p>Dear ${order.customer.name},</p>
    <p>Your order #${order.orderNumber} has been cancelled.</p>
    ${order.note ? `<p><strong>Reason:</strong> ${order.note}</p>` : ''}
    <p>If you have any questions, please contact us.</p>
  </div>
</body>
</html>
  `
}

function generateOrderShippedEmail(order: any): string {
  return generateOrderApprovedEmail(order) // Placeholder
}

function generateOrderDeliveredEmail(order: any): string {
  return generateOrderApprovedEmail(order) // Placeholder
}

function generateReturnInitiatedEmail(returnItem: any): string {
  return `<html><body><h1>Return Request Received</h1><p>Your return request has been submitted.</p></body></html>`
}

function generateReturnApprovedEmail(returnItem: any): string {
  return `<html><body><h1>Return Approved</h1><p>Your return has been approved.</p></body></html>`
}

function generateReturnRejectedEmail(returnItem: any): string {
  return `<html><body><h1>Return Rejected</h1><p>Your return request could not be approved.</p></body></html>`
}

function generateReturnRefundedEmail(returnItem: any): string {
  return `<html><body><h1>Refund Processed</h1><p>Your refund has been processed.</p></body></html>`
}

import Resend from 'resend'

// Email templates will be in /emails folder
interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
  }>
}

interface OrderConfirmationData {
  orderNumber: string
  customerName: string
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  total: number
  orderDate: Date
}

interface LowStockAlertData {
  productName: string
  currentStock: number
  minStock: number
  locationName: string
}

interface TransferApprovalData {
  transferId: string
  fromLocation: string
  toLocation: string
  items: Array<{
    productName: string
    quantity: number
  }>
  requestedBy: string
  requestDate: Date
}

interface InvoiceData {
  invoiceNumber: string
  customerName: string
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    total: number
  }>
  subtotal: number
  tax: number
  grandTotal: number
  invoiceDate: Date
}

export class EmailService {
  private resend: Resend | null = null
  private fromEmail: string
  private fromName: string

  constructor() {
    // Initialize Resend only if API key is provided
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey && apiKey !== 'your_resend_api_key_here') {
      this.resend = new Resend(apiKey)
    }
    
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@madeenas.com'
    this.fromName = process.env.EMAIL_FROM_NAME || 'Madeena Textiles'
  }

  private async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.resend) {
      console.warn('⚠️  Email service not configured. Set RESEND_API_KEY in environment.')
      return { success: false, error: 'Email service not configured' }
    }

    try {
      const result = await this.resend.emails.send({
        from: options.from || `${this.fromName} <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        reply_to: options.replyTo,
        attachments: options.attachments,
      })

      if ('id' in result) {
        console.log(`✅ Email sent successfully: ${result.id}`)
        return { success: true, messageId: result.id }
      }

      return { success: false, error: 'Unknown error' }
    } catch (error) {
      console.error('❌ Email send failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send order confirmation email to customer
   */
  async sendOrderConfirmation(to: string, data: OrderConfirmationData) {
    const html = this.generateOrderConfirmationHTML(data)
    
    return this.send({
      to,
      subject: `Order Confirmation #${data.orderNumber} - Madeena Textiles`,
      html,
    })
  }

  /**
   * Send low stock alert to admin/manager
   */
  async sendLowStockAlert(to: string | string[], data: LowStockAlertData) {
    const html = this.generateLowStockAlertHTML(data)
    
    return this.send({
      to,
      subject: `⚠️ Low Stock Alert: ${data.productName}`,
      html,
    })
  }

  /**
   * Send transfer approval request to manager
   */
  async sendTransferApprovalRequest(to: string, data: TransferApprovalData) {
    const html = this.generateTransferApprovalHTML(data)
    
    return this.send({
      to,
      subject: `Transfer Approval Required: ${data.fromLocation} → ${data.toLocation}`,
      html,
    })
  }

  /**
   * Send invoice to customer
   */
  async sendInvoice(to: string, data: InvoiceData, pdfBuffer?: Buffer) {
    const html = this.generateInvoiceHTML(data)
    
    const attachments = pdfBuffer ? [{
      filename: `invoice-${data.invoiceNumber}.pdf`,
      content: pdfBuffer,
    }] : undefined

    return this.send({
      to,
      subject: `Invoice #${data.invoiceNumber} - Madeena Textiles`,
      html,
      attachments,
    })
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(to: string, resetToken: string, userName: string) {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              
              <p>We received a request to reset your password for your Madeena Textiles account.</p>
              
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              
              <div class="warning">
                ⏰ This link will expire in 1 hour for security reasons.
              </div>
              
              <p>If you didn't request this password reset, please ignore this email or contact support if you're concerned about your account security.</p>
              
              <p>Best regards,<br>Madeena Textiles Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Madeena Textiles. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `

    return this.send({
      to,
      subject: '🔐 Password Reset Request - Madeena Textiles',
      html,
    })
  }

  /**
   * Send weekly summary report to managers
   */
  async sendWeeklySummary(to: string | string[], data: {
    weekStart: Date
    weekEnd: Date
    totalSales: number
    totalOrders: number
    topProducts: Array<{ name: string; quantity: number; revenue: number }>
    lowStockItems: number
  }) {
    const html = this.generateWeeklySummaryHTML(data)
    
    return this.send({
      to,
      subject: `📊 Weekly Summary: ${data.weekStart.toLocaleDateString()} - ${data.weekEnd.toLocaleDateString()}`,
      html,
    })
  }

  // HTML Template Generators

  private generateOrderConfirmationHTML(data: OrderConfirmationData): string {
    const itemsHTML = data.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">LKR ${item.price.toFixed(2)}</td>
      </tr>
    `).join('')

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .total { font-size: 18px; font-weight: bold; color: #1e3a8a; margin-top: 20px; text-align: right; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Order Confirmed!</h1>
              <p>Order #${data.orderNumber}</p>
            </div>
            <div class="content">
              <p>Dear ${data.customerName},</p>
              
              <p>Thank you for your order! We're pleased to confirm that we've received your order and it's being processed.</p>
              
              <h3>Order Details</h3>
              <table>
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 10px; text-align: left;">Item</th>
                    <th style="padding: 10px; text-align: center;">Quantity</th>
                    <th style="padding: 10px; text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                </tbody>
              </table>
              
              <div class="total">
                Total: LKR ${data.total.toFixed(2)}
              </div>
              
              <p style="margin-top: 30px;">We'll notify you when your order is ready for pickup or delivery.</p>
              
              <p>If you have any questions, please don't hesitate to contact us.</p>
              
              <p>Best regards,<br>Madeena Textiles Team</p>
            </div>
            <div class="footer">
              <p>Order Date: ${data.orderDate.toLocaleDateString()}</p>
              <p>© ${new Date().getFullYear()} Madeena Textiles. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  private generateLowStockAlertHTML(data: LowStockAlertData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #f59e0b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat { text-align: center; }
            .stat-value { font-size: 32px; font-weight: bold; color: #dc2626; }
            .stat-label { font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Low Stock Alert</h1>
            </div>
            <div class="content">
              <div class="alert-box">
                <h2 style="margin-top: 0;">Action Required!</h2>
                <p><strong>${data.productName}</strong> is running low at <strong>${data.locationName}</strong></p>
              </div>
              
              <div class="stats">
                <div class="stat">
                  <div class="stat-value">${data.currentStock}</div>
                  <div class="stat-label">Current Stock</div>
                </div>
                <div class="stat">
                  <div class="stat-value">${data.minStock}</div>
                  <div class="stat-label">Minimum Stock</div>
                </div>
              </div>
              
              <p><strong>Recommendation:</strong> Please reorder this product to avoid stockouts.</p>
              
              <p style="margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/inventory" 
                   style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">
                  View Inventory
                </a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  private generateTransferApprovalHTML(data: TransferApprovalData): string {
    const itemsHTML = data.items.map(item => `
      <li>${item.productName} - Quantity: ${item.quantity}</li>
    `).join('')

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .info-box { background: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .button-group { text-align: center; margin: 30px 0; }
            .button { display: inline-block; padding: 12px 30px; margin: 0 10px; text-decoration: none; border-radius: 6px; font-weight: bold; }
            .button-approve { background: #10b981; color: white; }
            .button-reject { background: #ef4444; color: white; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📦 Transfer Approval Required</h1>
            </div>
            <div class="content">
              <p>A stock transfer request requires your approval:</p>
              
              <div class="info-box">
                <p><strong>Transfer ID:</strong> ${data.transferId}</p>
                <p><strong>From:</strong> ${data.fromLocation}</p>
                <p><strong>To:</strong> ${data.toLocation}</p>
                <p><strong>Requested by:</strong> ${data.requestedBy}</p>
                <p><strong>Date:</strong> ${data.requestDate.toLocaleDateString()}</p>
              </div>
              
              <h3>Items to Transfer:</h3>
              <ul>
                ${itemsHTML}
              </ul>
              
              <div class="button-group">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/transfers/approve/${data.transferId}" class="button button-approve">
                  ✅ Approve
                </a>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/transfers/reject/${data.transferId}" class="button button-reject">
                  ❌ Reject
                </a>
              </div>
              
              <p style="text-align: center; color: #666; font-size: 14px;">
                Or review the full details in the dashboard
              </p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  private generateInvoiceHTML(data: InvoiceData): string {
    const itemsHTML = data.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">LKR ${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">LKR ${item.total.toFixed(2)}</td>
      </tr>
    `).join('')

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .totals { margin-top: 20px; text-align: right; }
            .totals div { padding: 8px 0; }
            .grand-total { font-size: 20px; font-weight: bold; color: #1e3a8a; border-top: 2px solid #1e3a8a; padding-top: 10px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>MADEENA TEXTILES</h1>
              <p>Tax Invoice</p>
            </div>
            <div class="content">
              <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                <div>
                  <p><strong>Bill To:</strong></p>
                  <p>${data.customerName}</p>
                </div>
                <div style="text-align: right;">
                  <p><strong>Invoice #:</strong> ${data.invoiceNumber}</p>
                  <p><strong>Date:</strong> ${data.invoiceDate.toLocaleDateString()}</p>
                </div>
              </div>
              
              <table>
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 10px; text-align: left;">Item</th>
                    <th style="padding: 10px; text-align: center;">Qty</th>
                    <th style="padding: 10px; text-align: right;">Unit Price</th>
                    <th style="padding: 10px; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                </tbody>
              </table>
              
              <div class="totals">
                <div>Subtotal: LKR ${data.subtotal.toFixed(2)}</div>
                <div>Tax (18%): LKR ${data.tax.toFixed(2)}</div>
                <div class="grand-total">Grand Total: LKR ${data.grandTotal.toFixed(2)}</div>
              </div>
              
              <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666; font-size: 14px;">
                Thank you for your business!
              </p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  private generateWeeklySummaryHTML(data: {
    weekStart: Date
    weekEnd: Date
    totalSales: number
    totalOrders: number
    topProducts: Array<{ name: string; quantity: number; revenue: number }>
    lowStockItems: number
  }): string {
    const topProductsHTML = data.topProducts.map((product, index) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${index + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${product.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${product.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">LKR ${product.revenue.toFixed(2)}</td>
      </tr>
    `).join('')

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
            .stat-card { background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; }
            .stat-value { font-size: 32px; font-weight: bold; color: #1e3a8a; }
            .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Weekly Business Summary</h1>
              <p>${data.weekStart.toLocaleDateString()} - ${data.weekEnd.toLocaleDateString()}</p>
            </div>
            <div class="content">
              <h2>Key Metrics</h2>
              
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-value">LKR ${data.totalSales.toFixed(0)}</div>
                  <div class="stat-label">Total Sales</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${data.totalOrders}</div>
                  <div class="stat-label">Total Orders</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${data.lowStockItems}</div>
                  <div class="stat-label">Low Stock Items</div>
                </div>
              </div>
              
              ${data.lowStockItems > 0 ? `
                <div class="alert">
                  ⚠️ <strong>Attention:</strong> You have ${data.lowStockItems} item(s) with low stock. Please review and reorder.
                </div>
              ` : ''}
              
              <h3>Top Performing Products</h3>
              <table>
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 10px; text-align: left;">#</th>
                    <th style="padding: 10px; text-align: left;">Product</th>
                    <th style="padding: 10px; text-align: center;">Units Sold</th>
                    <th style="padding: 10px; text-align: right;">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  ${topProductsHTML}
                </tbody>
              </table>
              
              <p style="margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                   style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">
                  View Full Dashboard
                </a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `
  }
}

// Export singleton instance
export const emailService = new EmailService()

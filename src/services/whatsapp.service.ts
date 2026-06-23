import twilio from 'twilio'

interface WhatsAppMessageOptions {
  to: string // Phone number in E.164 format (e.g., +94771234567)
  message: string
  mediaUrl?: string
}

interface WhatsAppTemplateOptions {
  to: string
  templateName: string
  languageCode?: string
  parameters?: string[]
}

export class WhatsAppService {
  private client: twilio.Twilio | null = null
  private fromNumber: string
  private isConfigured: boolean = false

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886' // Twilio Sandbox default

    if (
      accountSid && 
      authToken && 
      accountSid !== 'your_twilio_account_sid_here' &&
      authToken !== 'your_twilio_auth_token_here'
    ) {
      this.client = twilio(accountSid, authToken)
      this.isConfigured = true
    } else {
      console.warn('⚠️  WhatsApp service not configured. Set TWILIO credentials in environment.')
    }
  }

  /**
   * Send a simple WhatsApp message
   */
  async sendMessage(options: WhatsAppMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured || !this.client) {
      console.warn('⚠️  WhatsApp service not configured')
      return { success: false, error: 'WhatsApp service not configured' }
    }

    try {
      const formattedTo = options.to.startsWith('whatsapp:') ? options.to : `whatsapp:${options.to}`
      const formattedFrom = this.fromNumber.startsWith('whatsapp:') ? this.fromNumber : `whatsapp:${this.fromNumber}`

      const message = await this.client.messages.create({
        body: options.message,
        from: formattedFrom,
        to: formattedTo,
        ...(options.mediaUrl && { mediaUrl: [options.mediaUrl] }),
      })

      console.log(`✅ WhatsApp message sent: ${message.sid}`)
      return { success: true, messageId: message.sid }
    } catch (error) {
      console.error('❌ WhatsApp send failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send WhatsApp message using pre-approved template (for production)
   * Templates must be submitted and approved by Meta
   */
  async sendTemplate(options: WhatsAppTemplateOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured || !this.client) {
      console.warn('⚠️  WhatsApp service not configured')
      return { success: false, error: 'WhatsApp service not configured' }
    }

    try {
      const formattedTo = options.to.startsWith('whatsapp:') ? options.to : `whatsapp:${options.to}`
      const formattedFrom = this.fromNumber.startsWith('whatsapp:') ? this.fromNumber : `whatsapp:${this.fromNumber}`

      // For Meta templates, use Content Template Message format
      const message = await this.client.messages.create({
        from: formattedFrom,
        to: formattedTo,
        contentSid: options.templateName,
        contentVariables: JSON.stringify({
          1: options.parameters?.[0] || '',
          2: options.parameters?.[1] || '',
          3: options.parameters?.[2] || '',
        }),
      })

      console.log(`✅ WhatsApp template sent: ${message.sid}`)
      return { success: true, messageId: message.sid }
    } catch (error) {
      console.error('❌ WhatsApp template send failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  // Pre-built message templates for common use cases

  /**
   * Send order confirmation via WhatsApp
   */
  async sendOrderConfirmation(phoneNumber: string, orderNumber: string, total: number) {
    return this.sendMessage({
      to: phoneNumber,
      message: `✅ *Order Confirmed!*\n\nYour order #${orderNumber} has been confirmed.\n\n💰 Total: LKR ${total.toFixed(2)}\n\nWe'll notify you when it's ready for pickup.\n\nThank you for choosing Madeena Textiles! 🧵`,
    })
  }

  /**
   * Send order ready notification
   */
  async sendOrderReady(phoneNumber: string, orderNumber: string, customerName: string) {
    return this.sendMessage({
      to: phoneNumber,
      message: `🎉 *Order Ready for Pickup!*\n\nHello ${customerName},\n\nYour order #${orderNumber} is ready!\n\nYou can collect it from our store during business hours.\n\nSee you soon! 👋\n\n- Madeena Textiles`,
    })
  }

  /**
   * Send delivery notification
   */
  async sendDeliveryNotification(phoneNumber: string, orderNumber: string, estimatedTime: string) {
    return this.sendMessage({
      to: phoneNumber,
      message: `🚚 *Order Out for Delivery*\n\nYour order #${orderNumber} is on its way!\n\n⏰ Estimated delivery: ${estimatedTime}\n\nPlease keep your phone handy.\n\n- Madeena Textiles`,
    })
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(phoneNumber: string, customerName: string, invoiceNumber: string, amount: number, dueDate: string) {
    return this.sendMessage({
      to: phoneNumber,
      message: `💰 *Payment Reminder*\n\nDear ${customerName},\n\nThis is a friendly reminder that invoice #${invoiceNumber} is due.\n\nAmount: LKR ${amount.toFixed(2)}\nDue Date: ${dueDate}\n\nPlease process payment at your earliest convenience.\n\nThank you!\n- Madeena Textiles`,
    })
  }

  /**
   * Send stock availability inquiry response
   */
  async sendStockAvailability(phoneNumber: string, productName: string, available: boolean, quantity?: number) {
    const message = available
      ? `✅ *Product Available*\n\n${productName}\n\n📦 Stock: ${quantity} units available\n\nVisit us or place an order online!\n\n- Madeena Textiles`
      : `❌ *Currently Out of Stock*\n\n${productName}\n\nWe'll notify you when it's back in stock.\n\nBrowse similar items on our website.\n\n- Madeena Textiles`

    return this.sendMessage({
      to: phoneNumber,
      message,
    })
  }

  /**
   * Send new product announcement
   */
  async sendNewProductAnnouncement(phoneNumber: string, productName: string, price: number, imageUrl?: string) {
    return this.sendMessage({
      to: phoneNumber,
      message: `🆕 *New Arrival!*\n\n${productName}\n\n💰 Only LKR ${price.toFixed(2)}\n\nCheck it out in-store or online!\n\n- Madeena Textiles`,
      mediaUrl: imageUrl,
    })
  }

  /**
   * Send flash sale notification
   */
  async sendFlashSale(phoneNumber: string, discount: number, endTime: string) {
    return this.sendMessage({
      to: phoneNumber,
      message: `🔥 *FLASH SALE!*\n\n${discount}% OFF on selected items!\n\n⏰ Ends: ${endTime}\n\nHurry! Limited time offer!\n\n🛒 Shop now at Madeena Textiles`,
    })
  }

  /**
   * Send return status update
   */
  async sendReturnStatusUpdate(phoneNumber: string, returnId: string, status: string, refundAmount?: number) {
    let message = `🔄 *Return Status Update*\n\nReturn ID: ${returnId}\nStatus: ${status}\n`

    if (refundAmount) {
      message += `\n💵 Refund Amount: LKR ${refundAmount.toFixed(2)}\n`
    }

    message += `\nThank you for your patience.\n\n- Madeena Textiles`

    return this.sendMessage({
      to: phoneNumber,
      message,
    })
  }

  /**
   * Send customer support acknowledgment
   */
  async sendSupportAcknowledgment(phoneNumber: string, ticketNumber: string, customerName: string) {
    return this.sendMessage({
      to: phoneNumber,
      message: `🎫 *Support Ticket Created*\n\nHello ${customerName},\n\nYour ticket #${ticketNumber} has been created.\n\nOur team will respond within 24 hours.\n\nThank you for contacting us!\n\n- Madeena Textiles Support`,
    })
  }

  /**
   * Validate phone number format (E.164)
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // E.164 format: +[country code][number]
    const e164Regex = /^\+[1-9]\d{1,14}$/
    return e164Regex.test(phoneNumber)
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService()

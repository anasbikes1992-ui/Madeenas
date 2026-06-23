import twilio from 'twilio'

interface SMSOptions {
  to: string // Phone number in E.164 format (e.g., +94771234567)
  message: string
}

interface BulkSMSOptions {
  recipients: string[]
  message: string
}

export class SMSService {
  private client: twilio.Twilio | null = null
  private fromNumber: string
  private isConfigured: boolean = false

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || ''

    if (
      accountSid && 
      authToken && 
      accountSid !== 'your_twilio_account_sid_here' &&
      authToken !== 'your_twilio_auth_token_here'
    ) {
      this.client = twilio(accountSid, authToken)
      this.isConfigured = true
      console.log('✅ SMS service initialized successfully')
    } else {
      console.warn('⚠️  SMS service not configured. Set TWILIO credentials in environment.')
    }
  }

  /**
   * Send SMS to a single recipient
   */
  async sendSMS(options: SMSOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured || !this.client) {
      console.warn('⚠️  SMS service not configured')
      return { success: false, error: 'SMS service not configured' }
    }

    try {
      const message = await this.client.messages.create({
        body: options.message,
        from: this.fromNumber,
        to: options.to,
      })

      console.log(`✅ SMS sent: ${message.sid}`)
      return { success: true, messageId: message.sid }
    } catch (error) {
      console.error('❌ SMS send failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send SMS to multiple recipients
   */
  async sendBulkSMS(options: BulkSMSOptions): Promise<{
    successCount: number
    failureCount: number
    results: Array<{ phone: string; success: boolean; messageId?: string; error?: string }>
  }> {
    if (!this.isConfigured || !this.client) {
      console.warn('⚠️  SMS service not configured')
      return {
        successCount: 0,
        failureCount: options.recipients.length,
        results: options.recipients.map(phone => ({ phone, success: false, error: 'Service not configured' })),
      }
    }

    const results = await Promise.allSettled(
      options.recipients.map(async (phone) => {
        const result = await this.sendSMS({ to: phone, message: options.message })
        return { phone, ...result }
      })
    )

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failureCount = results.length - successCount

    console.log(`✅ Bulk SMS complete: ${successCount} successful, ${failureCount} failed`)

    return {
      successCount,
      failureCount,
      results: results.map(r => 
        r.status === 'fulfilled' 
          ? r.value 
          : { phone: '', success: false, error: 'Promise rejected' }
      ),
    }
  }

  // Pre-built SMS templates

  /**
   * Send OTP for verification
   */
  async sendOTP(phoneNumber: string, otp: string, expiryMinutes: number = 5) {
    return this.sendSMS({
      to: phoneNumber,
      message: `Your Madeena Textiles verification code is: ${otp}\n\nValid for ${expiryMinutes} minutes.\n\nDo not share this code with anyone.`,
    })
  }

  /**
   * Send order confirmation SMS
   */
  async sendOrderConfirmation(phoneNumber: string, orderNumber: string, total: number) {
    return this.sendSMS({
      to: phoneNumber,
      message: `Order confirmed! #${orderNumber}\nTotal: LKR ${total.toFixed(2)}\n\nThank you for shopping at Madeena Textiles!`,
    })
  }

  /**
   * Send order ready notification
   */
  async sendOrderReady(phoneNumber: string, orderNumber: string, customerName: string) {
    return this.sendSMS({
      to: phoneNumber,
      message: `Hi ${customerName}, your order #${orderNumber} is ready for pickup at Madeena Textiles! Visit us during business hours.`,
    })
  }

  /**
   * Send delivery notification
   */
  async sendDeliveryNotification(phoneNumber: string, orderNumber: string, trackingNumber?: string) {
    const message = trackingNumber
      ? `Your order #${orderNumber} has been dispatched. Tracking: ${trackingNumber}. Thank you - Madeena Textiles`
      : `Your order #${orderNumber} is out for delivery. You'll receive it soon! - Madeena Textiles`

    return this.sendSMS({
      to: phoneNumber,
      message,
    })
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(phoneNumber: string, invoiceNumber: string, amount: number, dueDate: string) {
    return this.sendSMS({
      to: phoneNumber,
      message: `Payment reminder: Invoice #${invoiceNumber} - LKR ${amount.toFixed(2)} is due on ${dueDate}. Pay at Madeena Textiles or online.`,
    })
  }

  /**
   * Send appointment reminder
   */
  async sendAppointmentReminder(phoneNumber: string, customerName: string, appointmentDate: string, appointmentTime: string) {
    return this.sendSMS({
      to: phoneNumber,
      message: `Reminder: ${customerName}, your appointment at Madeena Textiles is on ${appointmentDate} at ${appointmentTime}. See you there!`,
    })
  }

  /**
   * Send promotional SMS
   */
  async sendPromotion(phoneNumber: string, offerDetails: string, validUntil: string, promoCode?: string) {
    const message = promoCode
      ? `SPECIAL OFFER! ${offerDetails}\nUse code: ${promoCode}\nValid until: ${validUntil}\n\n- Madeena Textiles`
      : `SPECIAL OFFER! ${offerDetails}\nValid until: ${validUntil}\n\n- Madeena Textiles`

    return this.sendSMS({
      to: phoneNumber,
      message,
    })
  }

  /**
   * Send flash sale alert
   */
  async sendFlashSaleAlert(phoneNumbers: string[], discount: number, endsAt: string) {
    return this.sendBulkSMS({
      recipients: phoneNumbers,
      message: `FLASH SALE! ${discount}% OFF - Ends ${endsAt}! Shop now at Madeena Textiles. Limited stock!`,
    })
  }

  /**
   * Send stock alert
   */
  async sendStockAlert(phoneNumber: string, productName: string) {
    return this.sendSMS({
      to: phoneNumber,
      message: `Good news! ${productName} is back in stock at Madeena Textiles. Order now before it's gone!`,
    })
  }

  /**
   * Send account activation SMS
   */
  async sendAccountActivation(phoneNumber: string, userName: string, activationLink: string) {
    return this.sendSMS({
      to: phoneNumber,
      message: `Welcome ${userName}! Activate your Madeena Textiles account: ${activationLink}`,
    })
  }

  /**
   * Send password reset SMS
   */
  async sendPasswordReset(phoneNumber: string, resetCode: string) {
    return this.sendSMS({
      to: phoneNumber,
      message: `Your password reset code: ${resetCode}\n\nValid for 10 minutes. Do not share this code.\n\n- Madeena Textiles`,
    })
  }

  /**
   * Send feedback request
   */
  async sendFeedbackRequest(phoneNumber: string, customerName: string, orderNumber: string) {
    return this.sendSMS({
      to: phoneNumber,
      message: `Hi ${customerName}, how was your experience with order #${orderNumber}? Rate us: ${process.env.NEXT_PUBLIC_APP_URL}/feedback/${orderNumber}`,
    })
  }

  /**
   * Send loyalty points update
   */
  async sendLoyaltyPointsUpdate(phoneNumber: string, customerName: string, points: number, totalPoints: number) {
    return this.sendSMS({
      to: phoneNumber,
      message: `${customerName}, you earned ${points} points! Total: ${totalPoints} points. Redeem at Madeena Textiles anytime!`,
    })
  }

  /**
   * Send return confirmation
   */
  async sendReturnConfirmation(phoneNumber: string, returnId: string, refundAmount: number) {
    return this.sendSMS({
      to: phoneNumber,
      message: `Return approved! Return ID: ${returnId}. Refund of LKR ${refundAmount.toFixed(2)} will be processed in 3-5 business days. - Madeena Textiles`,
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

  /**
   * Get SMS cost estimation (approximate)
   */
  estimateCost(messageCount: number, segmentCount: number = 1): number {
    // Approximate cost per SMS segment (varies by country)
    // Sri Lanka: ~$0.05 per segment
    const costPerSegment = 0.05
    return messageCount * segmentCount * costPerSegment
  }

  /**
   * Calculate SMS segments needed
   */
  calculateSegments(message: string): number {
    // GSM-7 encoding: 160 characters per segment
    // Unicode (UTF-16): 70 characters per segment
    const hasUnicode = /[^\x00-\x7F]/.test(message)
    const maxLength = hasUnicode ? 70 : 160
    const continuationLength = hasUnicode ? 67 : 153

    if (message.length <= maxLength) {
      return 1
    }

    return Math.ceil(message.length / continuationLength)
  }
}

// Export singleton instance
export const smsService = new SMSService()

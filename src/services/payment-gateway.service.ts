import Stripe from 'stripe'

interface PaymentIntentOptions {
  amount: number // Amount in cents (LKR 1000 = 100000 cents)
  currency?: string
  description: string
  customerId?: string
  metadata?: Record<string, string>
  paymentMethods?: string[]
}

interface RefundOptions {
  paymentIntentId: string
  amount?: number // Partial refund amount in cents (optional, full refund if not provided)
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  metadata?: Record<string, string>
}

interface CustomerOptions {
  email: string
  name: string
  phone?: string
  address?: Stripe.AddressParam
  metadata?: Record<string, string>
}

export class PaymentGatewayService {
  private stripe: Stripe | null = null
  private isConfigured: boolean = false
  private webhookSecret: string = ''

  constructor() {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

    if (stripeSecretKey && stripeSecretKey !== 'your_stripe_secret_key_here') {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-08-27.basil',
        typescript: true,
      })
      this.isConfigured = true
      console.log('✅ Stripe payment gateway initialized')
    } else {
      console.warn('⚠️  Payment gateway not configured. Set STRIPE_SECRET_KEY in environment.')
    }
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(options: PaymentIntentOptions): Promise<{
    success: boolean
    clientSecret?: string
    paymentIntentId?: string
    error?: string
  }> {
    if (!this.isConfigured || !this.stripe) {
      console.warn('⚠️  Payment gateway not configured')
      return { success: false, error: 'Payment gateway not configured' }
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(options.amount), // Ensure integer
        currency: options.currency || 'lkr', // Sri Lankan Rupee
        description: options.description,
        customer: options.customerId,
        metadata: options.metadata,
        payment_method_types: options.paymentMethods || ['card'],
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never', // For POS/in-person payments
        },
      })

      console.log(`✅ Payment intent created: ${paymentIntent.id}`)

      return {
        success: true,
        clientSecret: paymentIntent.client_secret || undefined,
        paymentIntentId: paymentIntent.id,
      }
    } catch (error) {
      console.error('❌ Payment intent creation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Confirm a payment intent (for server-side confirmation)
   */
  async confirmPaymentIntent(paymentIntentId: string): Promise<{
    success: boolean
    status?: string
    error?: string
  }> {
    if (!this.isConfigured || !this.stripe) {
      return { success: false, error: 'Payment gateway not configured' }
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId)

      console.log(`✅ Payment intent confirmed: ${paymentIntent.id} - Status: ${paymentIntent.status}`)

      return {
        success: true,
        status: paymentIntent.status,
      }
    } catch (error) {
      console.error('❌ Payment confirmation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Retrieve payment intent details
   */
  async getPaymentIntent(paymentIntentId: string): Promise<{
    success: boolean
    paymentIntent?: Stripe.PaymentIntent
    error?: string
  }> {
    if (!this.isConfigured || !this.stripe) {
      return { success: false, error: 'Payment gateway not configured' }
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId)

      return {
        success: true,
        paymentIntent,
      }
    } catch (error) {
      console.error('❌ Payment intent retrieval failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<{
    success: boolean
    error?: string
  }> {
    if (!this.isConfigured || !this.stripe) {
      return { success: false, error: 'Payment gateway not configured' }
    }

    try {
      await this.stripe.paymentIntents.cancel(paymentIntentId)

      console.log(`✅ Payment intent cancelled: ${paymentIntentId}`)

      return { success: true }
    } catch (error) {
      console.error('❌ Payment cancellation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Create a refund
   */
  async createRefund(options: RefundOptions): Promise<{
    success: boolean
    refundId?: string
    status?: string
    error?: string
  }> {
    if (!this.isConfigured || !this.stripe) {
      return { success: false, error: 'Payment gateway not configured' }
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: options.paymentIntentId,
        amount: options.amount, // Undefined for full refund
        reason: options.reason,
        metadata: options.metadata,
      })

      console.log(`✅ Refund created: ${refund.id} - Status: ${refund.status}`)

      return {
        success: true,
        refundId: refund.id,
        status: refund.status ?? undefined,
      }
    } catch (error) {
      console.error('❌ Refund creation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Create a customer in Stripe
   */
  async createCustomer(options: CustomerOptions): Promise<{
    success: boolean
    customerId?: string
    error?: string
  }> {
    if (!this.isConfigured || !this.stripe) {
      return { success: false, error: 'Payment gateway not configured' }
    }

    try {
      const customer = await this.stripe.customers.create({
        email: options.email,
        name: options.name,
        phone: options.phone,
        address: options.address,
        metadata: options.metadata,
      })

      console.log(`✅ Stripe customer created: ${customer.id}`)

      return {
        success: true,
        customerId: customer.id,
      }
    } catch (error) {
      console.error('❌ Customer creation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Retrieve customer details
   */
  async getCustomer(customerId: string): Promise<{
    success: boolean
    customer?: Stripe.Customer | Stripe.DeletedCustomer
    error?: string
  }> {
    if (!this.isConfigured || !this.stripe) {
      return { success: false, error: 'Payment gateway not configured' }
    }

    try {
      const customer = await this.stripe.customers.retrieve(customerId)

      return {
        success: true,
        customer,
      }
    } catch (error) {
      console.error('❌ Customer retrieval failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Update customer details
   */
  async updateCustomer(
    customerId: string,
    updates: Partial<CustomerOptions>
  ): Promise<{
    success: boolean
    error?: string
  }> {
    if (!this.isConfigured || !this.stripe) {
      return { success: false, error: 'Payment gateway not configured' }
    }

    try {
      await this.stripe.customers.update(customerId, updates)

      console.log(`✅ Stripe customer updated: ${customerId}`)

      return { success: true }
    } catch (error) {
      console.error('❌ Customer update failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * List payment methods for a customer
   */
  async listPaymentMethods(customerId: string): Promise<{
    success: boolean
    paymentMethods?: Stripe.PaymentMethod[]
    error?: string
  }> {
    if (!this.isConfigured || !this.stripe) {
      return { success: false, error: 'Payment gateway not configured' }
    }

    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      })

      return {
        success: true,
        paymentMethods: paymentMethods.data,
      }
    } catch (error) {
      console.error('❌ Payment methods listing failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Verify webhook signature (for webhook endpoints)
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event | null {
    if (!this.isConfigured || !this.stripe || !this.webhookSecret) {
      console.warn('⚠️  Webhook verification not configured')
      return null
    }

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret)
      return event
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error)
      return null
    }
  }

  /**
   * Handle webhook event
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    console.log(`📥 Webhook event received: ${event.type}`)

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`✅ Payment succeeded: ${paymentIntent.id}`)
        // TODO: Update order status, send confirmation email, etc.
        break

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent
        console.log(`❌ Payment failed: ${failedPayment.id}`)
        // TODO: Notify customer, log failure, etc.
        break

      case 'refund.created':
        const refund = event.data.object as Stripe.Refund
        console.log(`🔄 Refund created: ${refund.id}`)
        // TODO: Update order status, notify customer, etc.
        break

      case 'customer.created':
        const customer = event.data.object as Stripe.Customer
        console.log(`👤 Customer created: ${customer.id}`)
        break

      default:
        console.log(`⚠️  Unhandled webhook event type: ${event.type}`)
    }
  }

  /**
   * Calculate payment processing fee (Stripe: 2.9% + $0.30)
   */
  calculateProcessingFee(amount: number): number {
    const percentageFee = amount * 0.029 // 2.9%
    const fixedFee = 30 // $0.30 in cents
    return Math.round(percentageFee + fixedFee)
  }

  /**
   * Convert LKR to cents for Stripe
   */
  lkrToCents(lkr: number): number {
    return Math.round(lkr * 100)
  }

  /**
   * Convert cents to LKR
   */
  centsToLkr(cents: number): number {
    return cents / 100
  }
}

// Export singleton instance
export const paymentGatewayService = new PaymentGatewayService()

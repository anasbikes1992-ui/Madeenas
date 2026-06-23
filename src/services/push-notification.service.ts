import * as admin from 'firebase-admin'

interface PushNotificationPayload {
  title: string
  body: string
  imageUrl?: string
  data?: Record<string, string>
  action?: {
    type: 'navigate' | 'url'
    target: string
  }
}

interface MulticastPayload {
  tokens: string[]
  notification: PushNotificationPayload
}

export class PushNotificationService {
  private app: admin.app.App | null = null
  private isConfigured: boolean = false

  constructor() {
    try {
      // Initialize Firebase Admin SDK
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      const projectId = process.env.FIREBASE_PROJECT_ID

      if (serviceAccount && serviceAccount !== 'your_firebase_service_account_key_here') {
        // Service account can be a JSON string or path to JSON file
        let credential: admin.ServiceAccount
        
        if (serviceAccount.startsWith('{')) {
          // JSON string
          credential = JSON.parse(serviceAccount)
        } else {
          // File path
          credential = require(serviceAccount)
        }

        this.app = admin.initializeApp({
          credential: admin.credential.cert(credential),
          projectId: projectId,
        })

        this.isConfigured = true
        console.log('✅ Firebase Admin SDK initialized successfully')
      } else {
        console.warn('⚠️  Push notification service not configured. Set FIREBASE credentials in environment.')
      }
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin SDK:', error)
      this.isConfigured = false
    }
  }

  /**
   * Send push notification to a single device
   */
  async sendToDevice(
    deviceToken: string,
    payload: PushNotificationPayload
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured || !this.app) {
      console.warn('⚠️  Push notification service not configured')
      return { success: false, error: 'Push notification service not configured' }
    }

    try {
      const message: admin.messaging.Message = {
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: {
          ...payload.data,
          ...(payload.action && {
            actionType: payload.action.type,
            actionTarget: payload.action.target,
          }),
        },
        token: deviceToken,
      }

      const response = await admin.messaging().send(message)
      console.log(`✅ Push notification sent: ${response}`)
      return { success: true, messageId: response }
    } catch (error) {
      console.error('❌ Push notification failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send push notification to multiple devices
   */
  async sendToMultipleDevices(
    payload: MulticastPayload
  ): Promise<{ 
    successCount: number
    failureCount: number
    responses: Array<{ success: boolean; messageId?: string; error?: string }> 
  }> {
    if (!this.isConfigured || !this.app) {
      console.warn('⚠️  Push notification service not configured')
      return { 
        successCount: 0, 
        failureCount: payload.tokens.length,
        responses: payload.tokens.map(() => ({ success: false, error: 'Service not configured' }))
      }
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: payload.notification.title,
          body: payload.notification.body,
          imageUrl: payload.notification.imageUrl,
        },
        data: {
          ...payload.notification.data,
          ...(payload.notification.action && {
            actionType: payload.notification.action.type,
            actionTarget: payload.notification.action.target,
          }),
        },
        tokens: payload.tokens,
      }

      const response = await admin.messaging().sendEachForMulticast(message)
      
      console.log(`✅ Push notifications sent: ${response.successCount} successful, ${response.failureCount} failed`)

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses.map(r => ({
          success: r.success,
          messageId: r.messageId,
          error: r.error?.message,
        })),
      }
    } catch (error) {
      console.error('❌ Multicast push notification failed:', error)
      return {
        successCount: 0,
        failureCount: payload.tokens.length,
        responses: payload.tokens.map(() => ({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })),
      }
    }
  }

  /**
   * Send push notification to a topic
   */
  async sendToTopic(
    topic: string,
    payload: PushNotificationPayload
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured || !this.app) {
      console.warn('⚠️  Push notification service not configured')
      return { success: false, error: 'Push notification service not configured' }
    }

    try {
      const message: admin.messaging.Message = {
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: {
          ...payload.data,
          ...(payload.action && {
            actionType: payload.action.type,
            actionTarget: payload.action.target,
          }),
        },
        topic: topic,
      }

      const response = await admin.messaging().send(message)
      console.log(`✅ Push notification sent to topic "${topic}": ${response}`)
      return { success: true, messageId: response }
    } catch (error) {
      console.error('❌ Topic push notification failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Subscribe device tokens to a topic
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<{ successCount: number; failureCount: number }> {
    if (!this.isConfigured || !this.app) {
      console.warn('⚠️  Push notification service not configured')
      return { successCount: 0, failureCount: tokens.length }
    }

    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic)
      console.log(`✅ Subscribed to topic "${topic}": ${response.successCount} successful`)
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      }
    } catch (error) {
      console.error('❌ Topic subscription failed:', error)
      return { successCount: 0, failureCount: tokens.length }
    }
  }

  /**
   * Unsubscribe device tokens from a topic
   */
  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<{ successCount: number; failureCount: number }> {
    if (!this.isConfigured || !this.app) {
      console.warn('⚠️  Push notification service not configured')
      return { successCount: 0, failureCount: tokens.length }
    }

    try {
      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic)
      console.log(`✅ Unsubscribed from topic "${topic}": ${response.successCount} successful`)
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      }
    } catch (error) {
      console.error('❌ Topic unsubscription failed:', error)
      return { successCount: 0, failureCount: tokens.length }
    }
  }

  // Pre-built notification templates

  /**
   * Send new order alert to staff
   */
  async sendNewOrderAlert(tokens: string[], orderNumber: string, customerName: string, total: number) {
    return this.sendToMultipleDevices({
      tokens,
      notification: {
        title: '🛒 New Order Received',
        body: `Order #${orderNumber} from ${customerName} - LKR ${total.toFixed(2)}`,
        data: {
          type: 'new_order',
          orderNumber,
        },
        action: {
          type: 'navigate',
          target: `/dashboard/orders/${orderNumber}`,
        },
      },
    })
  }

  /**
   * Send low stock warning to managers
   */
  async sendLowStockWarning(tokens: string[], productName: string, currentStock: number, locationName: string) {
    return this.sendToMultipleDevices({
      tokens,
      notification: {
        title: '⚠️ Low Stock Alert',
        body: `${productName} at ${locationName} - Only ${currentStock} left`,
        data: {
          type: 'low_stock',
          productName,
          locationName,
        },
        action: {
          type: 'navigate',
          target: '/dashboard/inventory',
        },
      },
    })
  }

  /**
   * Send approval request notification
   */
  async sendApprovalRequest(token: string, itemType: string, itemId: string, requesterName: string) {
    return this.sendToDevice(token, {
      title: '📋 Approval Required',
      body: `${requesterName} requested approval for ${itemType}`,
      data: {
        type: 'approval_request',
        itemType,
        itemId,
      },
      action: {
        type: 'navigate',
        target: `/dashboard/approvals/${itemId}`,
      },
    })
  }

  /**
   * Send sales milestone notification
   */
  async sendSalesMilestone(tokens: string[], milestone: string, amount: number) {
    return this.sendToMultipleDevices({
      tokens,
      notification: {
        title: '🎉 Sales Milestone Achieved!',
        body: `Congratulations! ${milestone} - LKR ${amount.toFixed(2)}`,
        data: {
          type: 'milestone',
          milestone,
        },
        action: {
          type: 'navigate',
          target: '/dashboard',
        },
      },
    })
  }

  /**
   * Send shift reminder to staff
   */
  async sendShiftReminder(token: string, staffName: string, shiftTime: string, location: string) {
    return this.sendToDevice(token, {
      title: '⏰ Shift Reminder',
      body: `${staffName}, your shift at ${location} starts at ${shiftTime}`,
      data: {
        type: 'shift_reminder',
        location,
      },
    })
  }

  /**
   * Send delivery status update to customer
   */
  async sendDeliveryUpdate(token: string, orderNumber: string, status: string) {
    const statusEmojis: Record<string, string> = {
      packed: '📦',
      shipped: '🚚',
      out_for_delivery: '🛵',
      delivered: '✅',
    }

    return this.sendToDevice(token, {
      title: `${statusEmojis[status] || '📦'} Order Update`,
      body: `Your order #${orderNumber} is ${status.replace(/_/g, ' ')}`,
      data: {
        type: 'delivery_update',
        orderNumber,
        status,
      },
      action: {
        type: 'navigate',
        target: `/orders/${orderNumber}`,
      },
    })
  }

  /**
   * Send price change alert
   */
  async sendPriceChangeAlert(tokens: string[], productName: string, oldPrice: number, newPrice: number) {
    const changeType = newPrice < oldPrice ? 'reduced' : 'increased'
    const emoji = newPrice < oldPrice ? '📉' : '📈'

    return this.sendToMultipleDevices({
      tokens,
      notification: {
        title: `${emoji} Price ${changeType}`,
        body: `${productName}: LKR ${oldPrice.toFixed(2)} → LKR ${newPrice.toFixed(2)}`,
        data: {
          type: 'price_change',
          productName,
        },
      },
    })
  }

  /**
   * Send abandoned cart reminder
   */
  async sendAbandonedCartReminder(token: string, customerName: string, itemCount: number) {
    return this.sendToDevice(token, {
      title: '🛒 Don\'t forget your items!',
      body: `${customerName}, you have ${itemCount} item(s) waiting in your cart`,
      data: {
        type: 'abandoned_cart',
      },
      action: {
        type: 'navigate',
        target: '/cart',
      },
    })
  }

  /**
   * Validate FCM token format
   */
  validateToken(token: string): boolean {
    // FCM tokens are typically 152-163 characters
    return token.length >= 140 && token.length <= 200
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService()

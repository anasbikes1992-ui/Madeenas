import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'

interface AuthenticatedSocket extends Socket {
  userId?: string
  userRole?: string
  locationId?: string
}

interface NotificationPayload {
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  data?: Record<string, any>
}

interface StockUpdatePayload {
  productId: string
  productName: string
  locationId: string
  locationName: string
  oldQuantity: number
  newQuantity: number
  timestamp: Date
}

interface OrderUpdatePayload {
  orderId: string
  orderNumber: string
  status: string
  customerId?: string
  locationId?: string
  timestamp: Date
}

interface ActivityPayload {
  userId: string
  userName: string
  action: string
  resource: string
  resourceId: string
  timestamp: Date
}

export class WebSocketService {
  private io: SocketIOServer | null = null
  private connectedClients: Map<string, Set<string>> = new Map() // userId -> Set of socketIds

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    })

    this.setupMiddleware()
    this.setupEventHandlers()

    console.log('✅ WebSocket server initialized')
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware() {
    if (!this.io) return

    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        // Extract token from handshake auth or query
        const token = socket.handshake.auth.token || socket.handshake.query.token

        if (!token) {
          return next(new Error('Authentication required'))
        }

        // Verify JWT token and extract user info
        // For now, we'll accept any token (YOU MUST IMPLEMENT PROPER AUTH)
        // const decoded = await verifyJWT(token)
        // socket.userId = decoded.userId
        // socket.userRole = decoded.role
        // socket.locationId = decoded.locationId

        // Temporary mock authentication
        socket.userId = 'user-' + Math.random().toString(36).substr(2, 9)
        socket.userRole = 'admin'

        next()
      } catch (error) {
        next(new Error('Authentication failed'))
      }
    })
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers() {
    if (!this.io) return

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`✅ Client connected: ${socket.id} (User: ${socket.userId})`)

      // Track connected client
      if (socket.userId) {
        if (!this.connectedClients.has(socket.userId)) {
          this.connectedClients.set(socket.userId, new Set())
        }
        this.connectedClients.get(socket.userId)!.add(socket.id)
      }

      // Join user-specific room
      if (socket.userId) {
        socket.join(`user:${socket.userId}`)
      }

      // Join role-specific room
      if (socket.userRole) {
        socket.join(`role:${socket.userRole}`)
      }

      // Join location-specific room
      if (socket.locationId) {
        socket.join(`location:${socket.locationId}`)
      }

      // Handle custom events
      this.handleClientEvents(socket)

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`❌ Client disconnected: ${socket.id} (Reason: ${reason})`)
        
        if (socket.userId) {
          const userSockets = this.connectedClients.get(socket.userId)
          if (userSockets) {
            userSockets.delete(socket.id)
            if (userSockets.size === 0) {
              this.connectedClients.delete(socket.userId)
            }
          }
        }
      })
    })
  }

  /**
   * Handle client-initiated events
   */
  private handleClientEvents(socket: AuthenticatedSocket) {
    // Ping/Pong for connection health
    socket.on('ping', () => {
      socket.emit('pong')
    })

    // Subscribe to specific channels
    socket.on('subscribe', (channel: string) => {
      socket.join(channel)
      socket.emit('subscribed', { channel })
      console.log(`📡 Socket ${socket.id} subscribed to ${channel}`)
    })

    // Unsubscribe from channels
    socket.on('unsubscribe', (channel: string) => {
      socket.leave(channel)
      socket.emit('unsubscribed', { channel })
      console.log(`📡 Socket ${socket.id} unsubscribed from ${channel}`)
    })

    // Typing indicators for chat
    socket.on('typing:start', (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('user:typing', {
        userId: socket.userId,
        conversationId: data.conversationId,
      })
    })

    socket.on('typing:stop', (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('user:stopped-typing', {
        userId: socket.userId,
        conversationId: data.conversationId,
      })
    })

    // Request current inventory snapshot
    socket.on('inventory:request-snapshot', async (data: { locationId?: string }) => {
      // Fetch current inventory from database
      socket.emit('inventory:snapshot', {
        products: [],
        timestamp: new Date(),
      })
    })
  }

  // Public methods for sending events

  /**
   * Send notification to specific user
   */
  sendNotificationToUser(userId: string, notification: NotificationPayload) {
    if (!this.io) return
    this.io.to(`user:${userId}`).emit('notification', notification)
  }

  /**
   * Send notification to all users with specific role
   */
  sendNotificationToRole(role: string, notification: NotificationPayload) {
    if (!this.io) return
    this.io.to(`role:${role}`).emit('notification', notification)
  }

  /**
   * Broadcast notification to all connected clients
   */
  broadcastNotification(notification: NotificationPayload) {
    if (!this.io) return
    this.io.emit('notification', notification)
  }

  /**
   * Emit stock level update
   */
  emitStockUpdate(update: StockUpdatePayload) {
    if (!this.io) return
    
    // Send to location-specific room
    this.io.to(`location:${update.locationId}`).emit('stock:update', update)
    
    // Send to all admins/managers
    this.io.to('role:admin').emit('stock:update', update)
    this.io.to('role:manager').emit('stock:update', update)
  }

  /**
   * Emit order status update
   */
  emitOrderUpdate(update: OrderUpdatePayload) {
    if (!this.io) return
    
    // Send to customer
    if (update.customerId) {
      this.io.to(`user:${update.customerId}`).emit('order:update', update)
    }
    
    // Send to location staff
    if (update.locationId) {
      this.io.to(`location:${update.locationId}`).emit('order:update', update)
    }
    
    // Send to all managers/admins
    this.io.to('role:admin').emit('order:update', update)
    this.io.to('role:manager').emit('order:update', update)
  }

  /**
   * Emit user activity to activity feed
   */
  emitActivity(activity: ActivityPayload) {
    if (!this.io) return
    
    // Send to all admins/managers
    this.io.to('role:admin').emit('activity:new', activity)
    this.io.to('role:manager').emit('activity:new', activity)
  }

  /**
   * Emit low stock alert
   */
  emitLowStockAlert(data: {
    productId: string
    productName: string
    locationId: string
    locationName: string
    currentStock: number
    minStock: number
  }) {
    if (!this.io) return
    
    const notification: NotificationPayload = {
      type: 'warning',
      title: 'Low Stock Alert',
      message: `${data.productName} at ${data.locationName} is low on stock (${data.currentStock} left)`,
      data,
    }
    
    this.io.to(`location:${data.locationId}`).emit('notification', notification)
    this.io.to('role:admin').emit('notification', notification)
    this.io.to('role:manager').emit('notification', notification)
  }

  /**
   * Emit new order notification
   */
  emitNewOrder(data: {
    orderId: string
    orderNumber: string
    customerName: string
    total: number
    locationId: string
  }) {
    if (!this.io) return
    
    const notification: NotificationPayload = {
      type: 'info',
      title: 'New Order',
      message: `Order #${data.orderNumber} from ${data.customerName} - LKR ${data.total.toFixed(2)}`,
      data,
    }
    
    this.io.to(`location:${data.locationId}`).emit('notification', notification)
    this.io.to('role:admin').emit('order:new', data)
    this.io.to('role:manager').emit('order:new', data)
  }

  /**
   * Emit approval request
   */
  emitApprovalRequest(approverId: string, data: {
    requestId: string
    type: string
    requestedBy: string
    details: string
  }) {
    if (!this.io) return
    
    const notification: NotificationPayload = {
      type: 'info',
      title: 'Approval Required',
      message: `${data.requestedBy} requested ${data.type} approval`,
      data,
    }
    
    this.sendNotificationToUser(approverId, notification)
  }

  /**
   * Emit payment received notification
   */
  emitPaymentReceived(data: {
    invoiceId: string
    invoiceNumber: string
    amount: number
    customerId: string
    locationId: string
  }) {
    if (!this.io) return
    
    // Notify customer
    this.sendNotificationToUser(data.customerId, {
      type: 'success',
      title: 'Payment Received',
      message: `Your payment of LKR ${data.amount.toFixed(2)} has been received`,
      data,
    })
    
    // Notify location staff
    this.io.to(`location:${data.locationId}`).emit('payment:received', data)
  }

  /**
   * Emit system alert
   */
  emitSystemAlert(alert: {
    severity: 'low' | 'medium' | 'high' | 'critical'
    title: string
    message: string
    action?: string
  }) {
    if (!this.io) return
    
    const notification: NotificationPayload = {
      type: alert.severity === 'critical' || alert.severity === 'high' ? 'error' : 'warning',
      title: alert.title,
      message: alert.message,
      data: alert,
    }
    
    this.io.to('role:admin').emit('system:alert', notification)
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedClients.has(userId)
  }

  /**
   * Get online users count
   */
  getOnlineUsersCount(): number {
    return this.connectedClients.size
  }

  /**
   * Get online users by role
   */
  async getOnlineUsersByRole(role: string): Promise<string[]> {
    if (!this.io) return []
    
    const sockets = await this.io.in(`role:${role}`).fetchSockets()
    return sockets
      .map(socket => (socket as unknown as AuthenticatedSocket).userId)
      .filter((id): id is string => !!id)
  }

  /**
   * Disconnect user from all devices
   */
  disconnectUser(userId: string, reason: string = 'Server disconnection') {
    if (!this.io) return
    
    this.io.to(`user:${userId}`).disconnectSockets(true)
    this.connectedClients.delete(userId)
    console.log(`🔌 Disconnected user ${userId}: ${reason}`)
  }
}

// Export singleton instance
export const websocketService = new WebSocketService()

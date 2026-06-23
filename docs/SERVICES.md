# Madeena Textiles - External Services Documentation

This document provides comprehensive information about all external services integrated into the Madeena Textiles application, including setup instructions, configuration, and usage examples.

## 📋 Table of Contents

1. [Email Service (Resend)](#email-service-resend)
2. [SMS Service (Twilio)](#sms-service-twilio)
3. [WhatsApp Service (Twilio)](#whatsapp-service-twilio)
4. [Push Notifications (Firebase Cloud Messaging)](#push-notifications-firebase-cloud-messaging)
5. [Payment Gateway (Stripe)](#payment-gateway-stripe)
6. [WebSocket Real-time Updates (Socket.io)](#websocket-real-time-updates-socketio)
7. [PDF Generation (jsPDF)](#pdf-generation-jspdf)
8. [Backup & Verification (PostgreSQL)](#backup--verification-postgresql)
9. [Environment Variables](#environment-variables)
10. [Testing & Troubleshooting](#testing--troubleshooting)

---

## 📧 Email Service (Resend)

### Overview
Resend is a developer-focused email service that provides a simple API for sending transactional emails.

### Setup Instructions

1. **Create Resend Account**
   - Visit [resend.com](https://resend.com)
   - Sign up for a free account
   - Verify your domain or use `onboarding@resend.dev` for testing

2. **Generate API Key**
   - Go to Settings → API Keys
   - Create a new API key
   - Copy the key (starts with `re_`)

3. **Configure Environment**
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxxx
   ```

### Usage Examples

```typescript
import { emailService } from '@/services/email.service'

// Send order confirmation
await emailService.sendOrderConfirmation(
  'customer@example.com',
  'John Doe',
  'ORD-12345',
  5000.00
)

// Send welcome email
await emailService.sendWelcomeEmail(
  'newuser@example.com',
  'Jane Smith'
)

// Send custom email
await emailService.sendEmail({
  to: 'recipient@example.com',
  subject: 'Custom Subject',
  html: '<h1>Custom Content</h1>',
})
```

### Pre-built Email Templates

- ✅ Order Confirmation
- ✅ Order Ready for Pickup
- ✅ Delivery Notification
- ✅ Payment Receipt
- ✅ Password Reset
- ✅ Welcome Email
- ✅ Invoice Email
- ✅ Low Stock Alert
- ✅ Return Confirmation

### Limitations
- **Free Tier**: 100 emails/day
- **Paid Tier**: Starts at $20/month for 50,000 emails

---

## 📱 SMS Service (Twilio)

### Overview
Twilio provides SMS messaging capabilities worldwide.

### Setup Instructions

1. **Create Twilio Account**
   - Visit [twilio.com](https://www.twilio.com)
   - Sign up for a free trial account
   - Get $15 free credit

2. **Get Credentials**
   - Go to Console → Account → Account Info
   - Copy Account SID and Auth Token
   - Buy a phone number (or use trial number)

3. **Configure Environment**
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_PHONE_NUMBER=+1234567890
   ```

### Usage Examples

```typescript
import { smsService } from '@/services/sms.service'

// Send OTP
await smsService.sendOTP('+94771234567', '123456', 5)

// Send order confirmation
await smsService.sendOrderConfirmation(
  '+94771234567',
  'ORD-12345',
  5000.00
)

// Send bulk SMS
await smsService.sendBulkSMS({
  recipients: ['+94771234567', '+94777654321'],
  message: 'FLASH SALE! 50% OFF - Today only!',
})
```

### Cost Estimation

```typescript
// Calculate SMS segments
const segments = smsService.calculateSegments('Your message here')

// Estimate cost
const cost = smsService.estimateCost(100, segments) // $5.00 for 100 SMS
```

### Limitations
- **Trial Account**: Can only send to verified numbers
- **Cost**: ~$0.05 per SMS in Sri Lanka

---

## 💬 WhatsApp Service (Twilio)

### Overview
Send WhatsApp messages using Twilio WhatsApp Business API.

### Setup Instructions

1. **Enable WhatsApp in Twilio**
   - Go to Twilio Console → Messaging → Try WhatsApp
   - Join sandbox by sending "join [your-code]" to WhatsApp number
   - For production, apply for WhatsApp Business approval

2. **Configure Environment**
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   ```

### Usage Examples

```typescript
import { whatsappService } from '@/services/whatsapp.service'

// Send order confirmation
await whatsappService.sendOrderConfirmation(
  '+94771234567',
  'ORD-12345',
  5000.00
)

// Send with media
await whatsappService.sendMessage({
  to: '+94771234567',
  message: 'Check out our new product!',
  mediaUrl: 'https://example.com/product.jpg',
})

// Send template (for production)
await whatsappService.sendTemplate({
  to: '+94771234567',
  templateName: 'order_confirmation',
  parameters: ['ORD-12345', '5000.00'],
})
```

### Pre-built WhatsApp Templates

- ✅ Order Confirmation
- ✅ Order Ready
- ✅ Delivery Notification
- ✅ Payment Reminder
- ✅ Stock Availability
- ✅ Flash Sale Alert
- ✅ Return Status Update

### Limitations
- **Sandbox**: 24-hour conversation window
- **Production**: Requires Meta approval for templates
- **Cost**: ~$0.005 per message

---

## 🔔 Push Notifications (Firebase Cloud Messaging)

### Overview
Firebase Cloud Messaging (FCM) provides cross-platform push notifications.

### Setup Instructions

1. **Create Firebase Project**
   - Visit [console.firebase.google.com](https://console.firebase.google.com)
   - Create a new project
   - Enable Cloud Messaging

2. **Generate Service Account**
   - Go to Project Settings → Service Accounts
   - Generate new private key
   - Download JSON file

3. **Configure Environment**
   ```env
   FIREBASE_SERVICE_ACCOUNT_KEY=/path/to/serviceAccount.json
   # OR as JSON string
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
   FIREBASE_PROJECT_ID=your-project-id
   ```

### Usage Examples

```typescript
import { pushNotificationService } from '@/services/push-notification.service'

// Send to single device
await pushNotificationService.sendToDevice(
  'device-token-here',
  {
    title: 'New Order',
    body: 'Order #ORD-12345 received',
    imageUrl: 'https://example.com/icon.png',
    action: {
      type: 'navigate',
      target: '/dashboard/orders/ORD-12345',
    },
  }
)

// Send to multiple devices
await pushNotificationService.sendToMultipleDevices({
  tokens: ['token1', 'token2', 'token3'],
  notification: {
    title: 'Flash Sale',
    body: '50% OFF on all items!',
  },
})

// Send to topic
await pushNotificationService.sendToTopic(
  'all-customers',
  {
    title: 'New Arrival',
    body: 'Check out our latest collection!',
  }
)

// Subscribe to topic
await pushNotificationService.subscribeToTopic(
  ['token1', 'token2'],
  'offers'
)
```

### Pre-built Notification Templates

- ✅ New Order Alert
- ✅ Low Stock Warning
- ✅ Approval Request
- ✅ Sales Milestone
- ✅ Shift Reminder
- ✅ Delivery Update
- ✅ Abandoned Cart Reminder

### Limitations
- **Free Tier**: Unlimited notifications
- **Rate Limit**: 500,000 messages/day to a single topic

---

## 💳 Payment Gateway (Stripe)

### Overview
Stripe provides secure payment processing for credit/debit cards.

### Setup Instructions

1. **Create Stripe Account**
   - Visit [stripe.com](https://stripe.com)
   - Sign up for an account
   - Complete identity verification

2. **Get API Keys**
   - Go to Developers → API Keys
   - Copy Secret Key (starts with `sk_`)
   - Copy Webhook Secret (for webhook verification)

3. **Configure Environment**
   ```env
   STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Usage Examples

```typescript
import { paymentGatewayService } from '@/services/payment-gateway.service'

// Create payment intent
const { clientSecret, paymentIntentId } = await paymentGatewayService.createPaymentIntent({
  amount: 500000, // LKR 5000.00 in cents
  currency: 'lkr',
  description: 'Order #ORD-12345',
  metadata: {
    orderId: 'ORD-12345',
    customerId: 'CUST-001',
  },
})

// Create refund
await paymentGatewayService.createRefund({
  paymentIntentId: 'pi_xxxxxxxxxxxxxx',
  amount: 100000, // Partial refund LKR 1000.00
  reason: 'requested_by_customer',
})

// Create customer
const { customerId } = await paymentGatewayService.createCustomer({
  email: 'customer@example.com',
  name: 'John Doe',
  phone: '+94771234567',
})

// Calculate fees
const amount = 500000 // LKR 5000.00
const fee = paymentGatewayService.calculateProcessingFee(amount) // ~LKR 145.00
```

### Webhook Integration

```typescript
// In your API route
export async function POST(request: Request) {
  const payload = await request.text()
  const signature = request.headers.get('stripe-signature')!
  
  const event = paymentGatewayService.verifyWebhookSignature(payload, signature)
  
  if (event) {
    await paymentGatewayService.handleWebhookEvent(event)
  }
  
  return Response.json({ received: true })
}
```

### Supported Events
- ✅ payment_intent.succeeded
- ✅ payment_intent.payment_failed
- ✅ refund.created
- ✅ customer.created

### Fees
- **Processing Fee**: 2.9% + $0.30 per transaction
- **Currency Conversion**: 1% for international cards

---

## 🔌 WebSocket Real-time Updates (Socket.io)

### Overview
Socket.io provides bidirectional real-time communication between clients and server.

### Setup Instructions

1. **Initialize in Server**
   ```typescript
   import { createServer } from 'http'
   import { websocketService } from '@/services/websocket.service'
   
   const httpServer = createServer(app)
   websocketService.initialize(httpServer)
   
   httpServer.listen(3000)
   ```

2. **Client Connection**
   ```typescript
   import { io } from 'socket.io-client'
   
   const socket = io('http://localhost:3000', {
     auth: {
       token: 'your-jwt-token',
     },
   })
   
   socket.on('notification', (data) => {
     console.log('New notification:', data)
   })
   ```

### Usage Examples

```typescript
import { websocketService } from '@/services/websocket.service'

// Send notification to specific user
websocketService.sendNotificationToUser('user-123', {
  type: 'success',
  title: 'Payment Received',
  message: 'Your payment has been processed',
})

// Broadcast to all admins
websocketService.sendNotificationToRole('admin', {
  type: 'warning',
  title: 'Low Stock Alert',
  message: 'Product XYZ is low on stock',
})

// Emit stock update
websocketService.emitStockUpdate({
  productId: 'prod-123',
  productName: 'Cotton Fabric',
  locationId: 'loc-001',
  locationName: 'Warehouse A',
  oldQuantity: 100,
  newQuantity: 50,
  timestamp: new Date(),
})

// Emit order update
websocketService.emitOrderUpdate({
  orderId: 'order-123',
  orderNumber: 'ORD-12345',
  status: 'shipped',
  customerId: 'customer-456',
  timestamp: new Date(),
})

// Check if user is online
const isOnline = websocketService.isUserOnline('user-123')

// Get online users count
const count = websocketService.getOnlineUsersCount()
```

### Client Events

```typescript
// Subscribe to channel
socket.emit('subscribe', 'inventory-updates')

// Typing indicators
socket.emit('typing:start', { conversationId: 'chat-123' })
socket.emit('typing:stop', { conversationId: 'chat-123' })

// Request inventory snapshot
socket.emit('inventory:request-snapshot', { locationId: 'loc-001' })
```

### Server Events

- `notification` - Generic notification
- `stock:update` - Stock level change
- `order:update` - Order status change
- `order:new` - New order received
- `activity:new` - User activity
- `payment:received` - Payment confirmation
- `system:alert` - System alerts
- `user:typing` - Typing indicator
- `user:stopped-typing` - Stop typing indicator

### Authentication
Currently using mock authentication. **TODO**: Implement JWT verification in middleware.

---

## 📄 PDF Generation (jsPDF)

### Overview
jsPDF generates PDF documents (invoices, receipts, reports) on the server.

### Usage Examples

```typescript
import { pdfGenerationService } from '@/services/pdf-generation.service'

// Generate invoice
const pdfBuffer = await pdfGenerationService.generateInvoice({
  invoiceNumber: 'INV-12345',
  invoiceDate: new Date(),
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  customerName: 'John Doe',
  customerAddress: '123 Main St, Colombo',
  customerEmail: 'john@example.com',
  items: [
    {
      name: 'Cotton Fabric',
      description: 'Blue cotton, 5 meters',
      quantity: 5,
      unitPrice: 500,
      taxRate: 0.08,
      total: 2500,
    },
  ],
  subtotal: 2500,
  taxAmount: 200,
  total: 2700,
  paymentMethod: 'Credit Card',
  notes: 'Thank you for your business!',
})

// Save to file
await fs.writeFile('invoice.pdf', pdfBuffer)

// Or send via email
await emailService.sendInvoice(
  'customer@example.com',
  'John Doe',
  'INV-12345',
  pdfBuffer
)
```

```typescript
// Generate POS receipt
const receiptBuffer = await pdfGenerationService.generateReceipt({
  receiptNumber: 'RCT-001',
  date: new Date(),
  cashierName: 'Jane Smith',
  items: [
    { name: 'Product A', quantity: 2, unitPrice: 100, total: 200 },
    { name: 'Product B', quantity: 1, unitPrice: 150, total: 150 },
  ],
  subtotal: 350,
  taxAmount: 28,
  total: 378,
  amountPaid: 400,
  change: 22,
  paymentMethod: 'Cash',
})
```

```typescript
// Generate stock report
const reportBuffer = await pdfGenerationService.generateStockReport({
  title: 'Monthly Stock Report',
  generatedDate: new Date(),
  locationName: 'Warehouse A',
  products: [
    {
      sku: 'SKU-001',
      name: 'Cotton Fabric',
      category: 'Fabrics',
      quantity: 100,
      unitPrice: 500,
      totalValue: 50000,
      reorderLevel: 20,
      status: 'in-stock',
    },
  ],
  totalProducts: 50,
  totalValue: 500000,
  lowStockCount: 5,
  outOfStockCount: 2,
})
```

### Features
- ✅ Professional invoice layout
- ✅ Thermal printer receipt format
- ✅ QR codes for payments
- ✅ Barcodes for tracking
- ✅ Color-coded stock reports
- ✅ Auto-page breaks
- ✅ Company branding

---

## 💾 Backup & Verification (PostgreSQL)

### Overview
Automated database backup with integrity verification.

### Setup Instructions

1. **Ensure PostgreSQL Tools Installed**
   ```bash
   # Check pg_dump and pg_restore
   pg_dump --version
   pg_restore --version
   ```

2. **Configure Environment**
   ```env
   DATABASE_URL=postgresql://user:pass@localhost:5432/madeena
   BACKUP_DIRECTORY=./backups
   ```

### Usage Examples

```typescript
import { backupVerificationService } from '@/services/backup-verification.service'

// Create backup
const { success, backupFile } = await backupVerificationService.createBackup()

// Verify backup integrity
const verification = await backupVerificationService.verifyBackup(backupFile!)
console.log('Checksum valid:', verification.integrity.checksumValid)
console.log('Tables complete:', verification.integrity.tablesComplete)

// Test restore (creates temporary database)
const restoreTest = await backupVerificationService.testRestore(backupFile!)
console.log('Restore successful:', restoreTest.success)
console.log('Time elapsed:', restoreTest.timeElapsed, 'ms')

// List all backups
const backups = await backupVerificationService.listBackups()
console.log('Available backups:', backups.length)

// Prune old backups (keep last 7)
const { deleted } = await backupVerificationService.pruneOldBackups(7)
console.log('Deleted backups:', deleted)
```

### Backup Metadata

Each backup includes:
- Timestamp
- File size
- SHA-256 checksum
- List of tables
- Record counts per table
- Database version

### Automated Verification

```bash
# Cron job example (daily backup at 2 AM)
0 2 * * * /path/to/backup-script.sh
```

### Restore Process

1. Stop application
2. Verify backup integrity
3. Create test database
4. Restore to test database
5. Verify record counts
6. If successful, restore to production
7. Restart application

---

## 🔐 Environment Variables

### Required Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/madeena

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxx

# SMS & WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Push Notifications (Firebase)
FIREBASE_SERVICE_ACCOUNT_KEY=/path/to/serviceAccount.json
FIREBASE_PROJECT_ID=your-project-id

# Payment Gateway (Stripe)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Backup
BACKUP_DIRECTORY=./backups

# Company Info (for PDFs)
COMPANY_NAME=Madeena Textiles
COMPANY_ADDRESS=123 Main Street, Colombo, Sri Lanka
COMPANY_PHONE=+94 11 234 5678
COMPANY_EMAIL=info@madeena.lk
COMPANY_WEBSITE=www.madeena.lk
COMPANY_TAX_ID=VAT123456789

# App URL (for links in emails/SMS)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Optional Variables

```env
# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx

# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

---

## 🧪 Testing & Troubleshooting

### Email Service
```typescript
// Test email sending
const result = await emailService.sendEmail({
  to: 'test@example.com',
  subject: 'Test Email',
  html: '<p>If you receive this, email service is working!</p>',
})
console.log('Email sent:', result.success)
```

### SMS Service
```typescript
// Validate phone number
const isValid = smsService.validatePhoneNumber('+94771234567')
console.log('Valid phone:', isValid)

// Send test SMS
const result = await smsService.sendSMS({
  to: '+94771234567',
  message: 'Test SMS from Madeena Textiles',
})
console.log('SMS sent:', result.success)
```

### Push Notifications
```typescript
// Validate device token
const isValid = pushNotificationService.validateToken('your-fcm-token')
console.log('Valid token:', isValid)
```

### Payment Gateway
```typescript
// Convert currency
const cents = paymentGatewayService.lkrToCents(1000) // 100000
const lkr = paymentGatewayService.centsToLkr(100000) // 1000

// Calculate fees
const fee = paymentGatewayService.calculateProcessingFee(100000)
console.log('Processing fee:', fee, 'cents')
```

### Common Issues

#### Email not sending
- ✅ Check API key is correct
- ✅ Verify domain in Resend dashboard
- ✅ Check daily sending limit

#### SMS not sending
- ✅ Trial account can only send to verified numbers
- ✅ Check phone number is in E.164 format
- ✅ Verify Twilio account has credit

#### Push notifications not working
- ✅ Ensure Firebase service account JSON is valid
- ✅ Check device token is not expired
- ✅ Verify app has notification permissions

#### Payment failing
- ✅ Test with Stripe test cards: `4242 4242 4242 4242`
- ✅ Check webhook signature is correct
- ✅ Verify amount is in cents, not dollars

---

## 📚 Additional Resources

### Documentation Links
- [Resend Docs](https://resend.com/docs)
- [Twilio Docs](https://www.twilio.com/docs)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Stripe API Docs](https://stripe.com/docs/api)
- [Socket.io Docs](https://socket.io/docs/v4/)
- [jsPDF Docs](https://github.com/parallax/jsPDF)

### Support
- **Email**: support@madeena.lk
- **Slack**: #tech-support
- **GitHub**: Issues tab

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintained by**: Madeena Textiles Development Team

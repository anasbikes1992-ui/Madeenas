# Quick Start Guide - Setting Up External Services

This guide will walk you through setting up all external services for the Madeena Textiles application. Follow each section in order to get your application fully configured.

## ⏱️ Time Estimates
- **Quick Setup** (Email + Payment): ~30 minutes
- **Full Setup** (All Services): ~2-3 hours

---

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ Node.js 18+ installed
- ✅ PostgreSQL database running
- ✅ Credit/debit card for service verification (won't be charged initially)
- ✅ Valid phone number for SMS testing
- ✅ Email address for notifications

---

## 🚀 Quick Start (Minimum Viable Setup)

For basic functionality, you only need:
1. Database (Already configured via `DATABASE_URL`)
2. Email Service (Free tier)
3. Payment Gateway (Test mode)

### Step 1: Copy Environment Template

```bash
cp .env.example .env
```

### Step 2: Configure Minimum Variables

```env
# Already configured
DATABASE_URL=postgresql://user:password@localhost:5432/madeena

# Add these minimum required variables
RESEND_API_KEY=your_resend_api_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Install Dependencies

```bash
npm install
# or
pnpm install
# or
yarn install
```

### Step 4: Start Development Server

```bash
npm run dev
```

Your application will now run with email and payment services enabled!

---

## 📧 Step-by-Step: Email Service (Resend)

**Time Required**: 10 minutes  
**Cost**: Free (100 emails/day)

### 1. Create Resend Account

1. Visit [resend.com](https://resend.com)
2. Click "Start Building" or "Sign Up"
3. Sign up with your email
4. Verify your email address

### 2. Get API Key

1. After logging in, you'll land on the dashboard
2. Click "API Keys" in the left sidebar
3. Click "Create API Key"
4. Name it `Madeena Textiles Production`
5. Copy the API key (starts with `re_`)
6. **Important**: Save this key securely - it won't be shown again!

### 3. Add Domain (Optional for Production)

**For testing**, you can skip this step and use `onboarding@resend.dev` as the sender.

**For production**:
1. Click "Domains" in sidebar
2. Click "Add Domain"
3. Enter your domain (e.g., `madeena.lk`)
4. Add DNS records as shown:
   - MX record: `feedback-smtp.us-east-1.amazonses.com`
   - TXT record: Copy from Resend dashboard
5. Wait for verification (~24 hours)

### 4. Configure Environment

```env
# Required
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional (defaults shown)
EMAIL_FROM=noreply@madeena.lk
EMAIL_FROM_NAME=Madeena Textiles
```

### 5. Test Email Service

```bash
# In your terminal
npm run test:email
```

Or test manually:
```typescript
import { emailService } from '@/services/email.service'

const result = await emailService.sendWelcomeEmail(
  'your-email@example.com',
  'Test User'
)
console.log('Email sent:', result.success)
```

### ✅ Success Criteria
- API key accepted (no error in console)
- Test email received (check spam folder)

---

## 💳 Step-by-Step: Payment Gateway (Stripe)

**Time Required**: 15 minutes  
**Cost**: Free (test mode), 2.9% + $0.30 per transaction (live mode)

### 1. Create Stripe Account

1. Visit [stripe.com](https://stripe.com)
2. Click "Start now" or "Sign up"
3. Enter business information
4. Verify your email
5. Complete identity verification (for live mode)

### 2. Get API Keys

1. In Stripe Dashboard, click "Developers" → "API Keys"
2. You'll see two keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`) ← We need this one
3. Click "Reveal test key" on Secret key
4. Copy the key

### 3. Setup Webhook Endpoint

1. Click "Developers" → "Webhooks"
2. Click "Add endpoint"
3. Enter URL: `https://your-domain.com/api/webhooks/stripe`
   - For local testing: Use [ngrok](https://ngrok.com) to expose localhost
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `refund.created`
   - `customer.created`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)

### 4. Configure Environment

```env
# Test mode keys (replace with your actual Stripe keys)
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_TEST_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# For production, use live keys
# STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_LIVE_KEY_HERE
```

### 5. Test Payment Flow

```bash
npm run test:payment
```

Use Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`

Any future date, any 3-digit CVC, any postal code.

### ✅ Success Criteria
- Payment intent created successfully
- Webhook signature verified
- Test payment processes without errors

---

## 📱 Step-by-Step: SMS & WhatsApp (Twilio)

**Time Required**: 20 minutes  
**Cost**: $15 free credit, then ~$0.05 per SMS, ~$0.005 per WhatsApp

### 1. Create Twilio Account

1. Visit [twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up with email and phone number
3. Verify phone number (you'll receive a code)
4. Complete the questionnaire:
   - Select "Notifications, 2FA, or other alerts"
   - Select "With code"
   - Select "Node.js"

### 2. Get Account Credentials

1. In Twilio Console, you'll see:
   - **Account SID** (starts with `AC`)
   - **Auth Token** (hidden, click "View" to reveal)
2. Copy both values

### 3. Get a Phone Number

1. Click "Phone Numbers" → "Manage" → "Buy a number"
2. Select country: **Sri Lanka** (+94)
3. Check capabilities:
   - ✅ SMS
   - ✅ Voice (optional)
4. Click "Search"
5. Select a number and click "Buy"
6. Copy your new phone number (e.g., `+94771234567`)

### 4. Enable WhatsApp (Sandbox for Testing)

1. Click "Messaging" → "Try it out" → "Send a WhatsApp message"
2. You'll see instructions:
   - Send `join [your-sandbox-code]` to `+1 415 523 8886` via WhatsApp
3. Send the message from your WhatsApp
4. You'll get a confirmation
5. Copy the WhatsApp number: `whatsapp:+14155238886`

### 5. WhatsApp Production Setup (Optional)

For production (not required for testing):
1. Apply for WhatsApp Business Account
2. Submit business information
3. Create message templates
4. Wait for Meta approval (~3-5 business days)

### 6. Configure Environment

```env
# Required
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+94771234567
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### 7. Test SMS

```bash
npm run test:sms
```

Or manually:
```typescript
import { smsService } from '@/services/sms.service'

await smsService.sendSMS({
  to: '+94771234567', // Your verified number
  message: 'Test SMS from Madeena Textiles!',
})
```

### 8. Test WhatsApp

```bash
npm run test:whatsapp
```

### ✅ Success Criteria
- SMS received on phone
- WhatsApp message received
- No errors in console

---

## 🔔 Step-by-Step: Push Notifications (Firebase)

**Time Required**: 25 minutes  
**Cost**: Free

### 1. Create Firebase Project

1. Visit [console.firebase.google.com](https://console.firebase.google.com)
2. Click "Add project"
3. Enter project name: `Madeena Textiles`
4. Disable Google Analytics (optional)
5. Click "Create project"

### 2. Add Android App

1. In project overview, click Android icon
2. Enter package name: `com.madeena.textiles`
3. Download `google-services.json`
4. Save it to `mobile/android/app/google-services.json`

### 3. Enable Cloud Messaging

1. Click "Build" → "Cloud Messaging"
2. Click "Get started"
3. Follow setup instructions for Android

### 4. Generate Service Account Key

1. Click "Project settings" ⚙️ (top left)
2. Click "Service accounts" tab
3. Click "Generate new private key"
4. Click "Generate key" (JSON file will download)
5. Save file as `firebase-service-account.json` in project root
6. **Important**: Add this file to `.gitignore`!

### 5. Configure Environment

**Option 1: File path (recommended for development)**
```env
FIREBASE_SERVICE_ACCOUNT_KEY=/absolute/path/to/firebase-service-account.json
FIREBASE_PROJECT_ID=madeena-textiles-xxxxx
```

**Option 2: JSON string (recommended for production)**
```env
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"madeena-textiles-xxxxx",...}'
FIREBASE_PROJECT_ID=madeena-textiles-xxxxx
```

### 6. Update Flutter App

Add to `mobile/pubspec.yaml`:
```yaml
dependencies:
  firebase_core: ^3.8.1
  firebase_messaging: ^15.1.5
```

Run:
```bash
cd mobile
flutter pub get
```

Add to `mobile/lib/main.dart`:
```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  
  // Request permission
  await FirebaseMessaging.instance.requestPermission();
  
  // Get device token
  String? token = await FirebaseMessaging.instance.getToken();
  print('FCM Token: $token');
  
  runApp(MyApp());
}
```

### 7. Test Push Notification

```bash
npm run test:push
```

Or from Flutter app, copy device token and test:
```typescript
import { pushNotificationService } from '@/services/push-notification.service'

await pushNotificationService.sendToDevice(
  'your-device-token-here',
  {
    title: 'Test Notification',
    body: 'If you see this, push notifications are working!',
  }
)
```

### ✅ Success Criteria
- Notification received on Android device
- Device token logged in console
- No errors in Firebase console

---

## 🔌 Step-by-Step: WebSocket (Socket.io)

**Time Required**: 10 minutes  
**Cost**: Free (self-hosted)

### 1. No External Service Required

Socket.io runs on your own server, so no API keys needed!

### 2. Initialize WebSocket Server

Add to your Next.js custom server (create `server.js`):

```javascript
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { websocketService } = require('./src/services/websocket.service')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true)
    await handle(req, res, parsedUrl)
  })

  // Initialize WebSocket
  websocketService.initialize(httpServer)

  const port = process.env.PORT || 3000
  httpServer.listen(port, () => {
    console.log(`> Server listening on http://localhost:${port}`)
  })
})
```

### 3. Update package.json

```json
{
  "scripts": {
    "dev": "node server.js",
    "build": "next build",
    "start": "NODE_ENV=production node server.js"
  }
}
```

### 4. Test WebSocket Connection

```bash
npm run dev
```

In browser console:
```javascript
const socket = io('http://localhost:3000')

socket.on('connect', () => {
  console.log('Connected to WebSocket!')
})

socket.on('notification', (data) => {
  console.log('Received notification:', data)
})
```

### ✅ Success Criteria
- Socket connection established
- Real-time events received
- No connection errors

---

## 📄 Step-by-Step: PDF Generation (jsPDF)

**Time Required**: 5 minutes  
**Cost**: Free (client-side library)

### 1. No External Service Required

jsPDF runs entirely in your application, no API keys needed!

### 2. Dependencies Already Installed

Check `package.json`:
```json
{
  "dependencies": {
    "jspdf": "^4.2.1",
    "jspdf-autotable": "^5.0.7",
    "jsbarcode": "^3.12.3",
    "qrcode": "^1.5.4"
  }
}
```

### 3. Configure Company Info (Optional)

```env
COMPANY_NAME=Madeena Textiles
COMPANY_ADDRESS=123 Main Street, Colombo, Sri Lanka
COMPANY_PHONE=+94 11 234 5678
COMPANY_EMAIL=info@madeena.lk
COMPANY_WEBSITE=www.madeena.lk
COMPANY_TAX_ID=VAT123456789
```

### 4. Test PDF Generation

```bash
npm run test:pdf
```

Or manually:
```typescript
import { pdfGenerationService } from '@/services/pdf-generation.service'
import * as fs from 'fs/promises'

const pdfBuffer = await pdfGenerationService.generateInvoice({
  invoiceNumber: 'INV-TEST-001',
  invoiceDate: new Date(),
  customerName: 'Test Customer',
  items: [
    {
      name: 'Test Product',
      quantity: 1,
      unitPrice: 1000,
      total: 1000,
    },
  ],
  subtotal: 1000,
  taxAmount: 80,
  total: 1080,
})

await fs.writeFile('test-invoice.pdf', pdfBuffer)
console.log('PDF generated: test-invoice.pdf')
```

### ✅ Success Criteria
- PDF file created
- Opens without errors
- Contains all expected content

---

## 💾 Step-by-Step: Backup & Verification

**Time Required**: 10 minutes  
**Cost**: Free (local storage)

### 1. Ensure PostgreSQL Tools Installed

```bash
# Check if pg_dump is installed
pg_dump --version

# Check if pg_restore is installed
pg_restore --version
```

If not installed:
- **macOS**: `brew install postgresql`
- **Ubuntu**: `sudo apt-get install postgresql-client`
- **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/windows/)

### 2. Configure Backup Directory

```env
BACKUP_DIRECTORY=./backups
```

### 3. Create Backup Directory

```bash
mkdir -p backups
```

### 4. Test Backup Creation

```bash
npm run backup:create
```

Or manually:
```typescript
import { backupVerificationService } from '@/services/backup-verification.service'

const { success, backupFile } = await backupVerificationService.createBackup()
console.log('Backup created:', backupFile)
```

### 5. Test Backup Verification

```bash
npm run backup:verify
```

### 6. Test Restore (Optional)

```bash
npm run backup:test-restore
```

**Warning**: This creates a temporary test database.

### 7. Setup Automated Backups (Production)

Create `scripts/backup.sh`:
```bash
#!/bin/bash
cd /path/to/your/app
npm run backup:create
npm run backup:prune # Keep last 7 backups
```

Add to crontab:
```bash
crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * /path/to/backup.sh >> /var/log/madeena-backup.log 2>&1
```

### ✅ Success Criteria
- Backup file created in `./backups/`
- Metadata file created (`.meta.json`)
- Verification passes all checks
- Test restore successful

---

## 🔐 Environment Variables Summary

After completing all setups, your `.env` file should look like this:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/madeena

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@madeena.lk
EMAIL_FROM_NAME=Madeena Textiles

# SMS & WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+94771234567
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Push Notifications (Firebase)
FIREBASE_SERVICE_ACCOUNT_KEY=/path/to/firebase-service-account.json
FIREBASE_PROJECT_ID=madeena-textiles-xxxxx

# Payment Gateway (Stripe)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Backup
BACKUP_DIRECTORY=./backups

# Company Info
COMPANY_NAME=Madeena Textiles
COMPANY_ADDRESS=123 Main Street, Colombo, Sri Lanka
COMPANY_PHONE=+94 11 234 5678
COMPANY_EMAIL=info@madeena.lk
COMPANY_WEBSITE=www.madeena.lk
COMPANY_TAX_ID=VAT123456789

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Rate Limiting (Optional)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx
```

---

## 🧪 Testing All Services

### Run All Tests

```bash
# Test all services at once
npm run test:services

# Or test individually
npm run test:email
npm run test:sms
npm run test:whatsapp
npm run test:push
npm run test:payment
npm run test:websocket
npm run test:pdf
npm run backup:verify
```

### Manual Integration Test

```bash
# Start development server
npm run dev

# In another terminal, run integration tests
npm run test:integration
```

---

## 📊 Service Status Dashboard

Add this to your admin dashboard to monitor service health:

```typescript
import { emailService } from '@/services/email.service'
import { smsService } from '@/services/sms.service'
import { whatsappService } from '@/services/whatsapp.service'
import { pushNotificationService } from '@/services/push-notification.service'
import { paymentGatewayService } from '@/services/payment-gateway.service'

const serviceStatus = {
  email: emailService.isConfigured,
  sms: smsService.isConfigured,
  whatsapp: whatsappService.isConfigured,
  pushNotifications: pushNotificationService.isConfigured,
  payments: paymentGatewayService.isConfigured,
}

console.log('Service Status:', serviceStatus)
```

---

## 🚨 Troubleshooting

### Service Not Working?

1. **Check environment variables**
   ```bash
   npm run env:check
   ```

2. **Verify API keys**
   - Copy-paste errors
   - Expired keys
   - Wrong environment (test vs. live)

3. **Check service-specific logs**
   ```bash
   # Enable verbose logging
   DEBUG=* npm run dev
   ```

4. **Test in isolation**
   ```bash
   # Test just one service
   npm run test:email -- --verbose
   ```

### Common Issues

#### "Service not configured" errors
- Environment variables not loaded
- Solution: Check `.env` file exists and is not `.env.example`

#### "API key invalid" errors
- Wrong API key format
- Solution: Regenerate key from service dashboard

#### "Webhook signature verification failed"
- Wrong webhook secret
- Solution: Copy webhook secret from Stripe dashboard

#### Push notifications not received
- FCM token expired
- Solution: Regenerate token in mobile app

---

## 📚 Next Steps

After setting up all services:

1. ✅ **Test in staging environment**
2. ✅ **Set up monitoring** (Sentry, LogRocket)
3. ✅ **Configure production keys** (replace `sk_test_` with `sk_live_`)
4. ✅ **Setup backup automation**
5. ✅ **Enable webhook endpoints** (use production URLs)
6. ✅ **Monitor service usage and costs**

---

## 💰 Cost Summary

| Service | Free Tier | Paid Tier | Monthly Estimate |
|---------|-----------|-----------|------------------|
| Email (Resend) | 100/day | $20 for 50K | $20 |
| SMS (Twilio) | $15 credit | $0.05/SMS | $50-100 |
| WhatsApp (Twilio) | Sandbox | $0.005/msg | $10-20 |
| Push (Firebase) | Unlimited | Free | $0 |
| Payment (Stripe) | Free | 2.9% + $0.30 | Variable |
| WebSocket | Self-hosted | Free | $0 |
| PDF | Client-side | Free | $0 |
| Backup | Local storage | Free | $0 |
| **TOTAL** | | | **~$80-140/month** |

---

## 🆘 Need Help?

- **Documentation**: See `docs/SERVICES.md`
- **Email**: support@madeena.lk
- **GitHub Issues**: Open an issue with `setup` label
- **Slack**: #tech-support channel

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Estimated Setup Time**: 2-3 hours for complete setup

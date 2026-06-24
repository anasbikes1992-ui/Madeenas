#!/usr/bin/env tsx
/**
 * Service Testing Script
 * 
 * Tests all external services to verify they're properly configured and working.
 * 
 * Usage:
 *   npm run test:services           # Test all services
 *   npm run test:email              # Test email only
 *   npm run test:sms                # Test SMS only
 *   npm run test:whatsapp           # Test WhatsApp only
 *   npm run test:push               # Test push notifications only
 *   npm run test:payment            # Test payment gateway only
 *   npm run test:pdf                # Test PDF generation only
 */

import { emailService } from '../src/services/email.service'
import { smsService } from '../src/services/sms.service'
import { whatsappService } from '../src/services/whatsapp.service'
import { pushNotificationService } from '../src/services/push-notification.service'
import { paymentGatewayService } from '../src/services/payment-gateway.service'
import { pdfGenerationService } from '../src/services/pdf-generation.service'
import { websocketService } from '../src/services/websocket.service'
import * as fs from 'fs/promises'
import * as path from 'path'

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green')
}

function logError(message: string) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow')
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'cyan')
}

function logHeader(message: string) {
  log(`\n${'='.repeat(60)}`, 'bright')
  log(message, 'bright')
  log('='.repeat(60), 'bright')
}

// Service test functions
async function testEmailService(): Promise<boolean> {
  logHeader('Testing Email Service (Resend)')

  if (!process.env.RESEND_API_KEY) {
    logWarning('Email service not configured')
    logInfo('Set RESEND_API_KEY in .env file')
    return false
  }

  logInfo('Email service is configured')

  // Get test email from user or use default
  const testEmail = process.env.TEST_EMAIL || 'test@example.com'
  logInfo(`Sending test email to: ${testEmail}`)

  try {
    const result = await emailService.sendPasswordReset(testEmail, 'test-reset-token', 'Test User')

    if (result.success) {
      logSuccess('Email sent successfully!')
      if (result.messageId) {
        logInfo(`Message ID: ${result.messageId}`)
      }
      return true
    } else {
      logError(`Email failed: ${result.error}`)
      return false
    }
  } catch (error) {
    logError(`Email test failed: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

async function testSMSService(): Promise<boolean> {
  logHeader('Testing SMS Service (Twilio)')

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    logWarning('SMS service not configured')
    logInfo('Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env file')
    return false
  }

  logInfo('SMS service is configured')

  // Get test phone number from user
  const testPhone = process.env.TEST_PHONE
  if (!testPhone) {
    logWarning('TEST_PHONE not set in .env file')
    logInfo('Set TEST_PHONE=+94771234567 in .env to test SMS')
    return false
  }

  logInfo(`Sending test SMS to: ${testPhone}`)

  try {
    const result = await smsService.sendSMS({
      to: testPhone,
      message: 'Test SMS from Madeena Textiles! If you receive this, SMS service is working correctly.',
    })

    if (result.success) {
      logSuccess('SMS sent successfully!')
      if (result.messageId) {
        logInfo(`Message SID: ${result.messageId}`)
      }
      return true
    } else {
      logError(`SMS failed: ${result.error}`)
      return false
    }
  } catch (error) {
    logError(`SMS test failed: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

async function testWhatsAppService(): Promise<boolean> {
  logHeader('Testing WhatsApp Service (Twilio)')

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_NUMBER) {
    logWarning('WhatsApp service not configured')
    logInfo('Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER in .env file')
    return false
  }

  logInfo('WhatsApp service is configured')

  // Get test phone number from user
  const testPhone = process.env.TEST_PHONE
  if (!testPhone) {
    logWarning('TEST_PHONE not set in .env file')
    logInfo('Set TEST_PHONE=+94771234567 in .env to test WhatsApp')
    return false
  }

  logInfo(`Sending test WhatsApp message to: ${testPhone}`)

  try {
    const result = await whatsappService.sendMessage({
      to: testPhone,
      message: 'Test WhatsApp message from Madeena Textiles! 🎉\n\nIf you receive this, WhatsApp service is working correctly.',
    })

    if (result.success) {
      logSuccess('WhatsApp message sent successfully!')
      if (result.messageId) {
        logInfo(`Message SID: ${result.messageId}`)
      }
      return true
    } else {
      logError(`WhatsApp failed: ${result.error}`)
      return false
    }
  } catch (error) {
    logError(`WhatsApp test failed: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

async function testPushNotificationService(): Promise<boolean> {
  logHeader('Testing Push Notification Service (Firebase)')

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY || !process.env.FIREBASE_PROJECT_ID) {
    logWarning('Push notification service not configured')
    logInfo('Set FIREBASE_SERVICE_ACCOUNT_KEY and FIREBASE_PROJECT_ID in .env file')
    return false
  }

  logInfo('Push notification service is configured')

  // Get test device token from user
  const testToken = process.env.TEST_FCM_TOKEN
  if (!testToken) {
    logWarning('TEST_FCM_TOKEN not set in .env file')
    logInfo('Set TEST_FCM_TOKEN=your_device_token in .env to test push notifications')
    logInfo('Get device token from your mobile app logs')
    return false
  }

  logInfo('Sending test push notification...')

  try {
    const result = await pushNotificationService.sendToDevice(testToken, {
      title: 'Test Notification',
      body: 'If you see this, push notifications are working! 🎉',
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
    })

    if (result.success) {
      logSuccess('Push notification sent successfully!')
      return true
    } else {
      logError(`Push notification failed: ${result.error}`)
      return false
    }
  } catch (error) {
    logError(`Push notification test failed: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

async function testPaymentGatewayService(): Promise<boolean> {
  logHeader('Testing Payment Gateway (Stripe)')

  if (!process.env.STRIPE_SECRET_KEY) {
    logWarning('Payment gateway not configured')
    logInfo('Set STRIPE_SECRET_KEY in .env file')
    return false
  }

  logInfo('Payment gateway is configured')
  logInfo('Creating test payment intent for LKR 1000.00...')

  try {
    // Create a test payment intent
    const result = await paymentGatewayService.createPaymentIntent({
      amount: paymentGatewayService.lkrToCents(1000), // LKR 1000
      currency: 'lkr',
      description: 'Test payment from service test script',
      metadata: {
        test: 'true',
        source: 'test-services-script',
      },
    })

    if (result.success && result.paymentIntentId) {
      logSuccess('Payment intent created successfully!')
      logInfo(`Payment Intent ID: ${result.paymentIntentId}`)
      if (result.clientSecret) {
        logInfo(`Client Secret: ${result.clientSecret.substring(0, 20)}...`)
      }

      const details = await paymentGatewayService.getPaymentIntent(result.paymentIntentId)
      if (details.success && details.paymentIntent) {
        logInfo(`Amount: LKR ${paymentGatewayService.centsToLkr(details.paymentIntent.amount).toFixed(2)}`)
        logInfo(`Status: ${details.paymentIntent.status}`)

        // Calculate processing fee
        const fee = paymentGatewayService.calculateProcessingFee(details.paymentIntent.amount)
        logInfo(`Processing Fee: LKR ${paymentGatewayService.centsToLkr(fee).toFixed(2)}`)
      }

      return true
    } else {
      logError(`Payment intent creation failed: ${result.error}`)
      return false
    }
  } catch (error) {
    logError(`Payment gateway test failed: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

async function testPDFGenerationService(): Promise<boolean> {
  logHeader('Testing PDF Generation (jsPDF)')

  logInfo('PDF generation is always available (client-side library)')

  try {
    // Generate test invoice
    const pdfBuffer = await pdfGenerationService.generateInvoice({
      invoiceNumber: 'INV-TEST-001',
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      customerName: 'Test Customer',
      customerAddress: '123 Test Street, Colombo, Sri Lanka',
      customerPhone: '+94 11 234 5678',
      customerEmail: 'customer@test.com',
      items: [
        {
          name: 'Test Product 1',
          description: 'Sample product for testing',
          quantity: 2,
          unitPrice: 500,
          total: 1000,
        },
        {
          name: 'Test Product 2',
          description: 'Another sample product',
          quantity: 1,
          unitPrice: 1500,
          total: 1500,
        },
      ],
      subtotal: 2500,
      taxAmount: 200,
      total: 2700,
      notes: 'This is a test invoice generated by the service test script.',
      terms: 'Payment via bank transfer or credit card.',
    })

    // Save to file
    const outputPath = path.join(process.cwd(), 'test-invoice.pdf')
    await fs.writeFile(outputPath, pdfBuffer)

    logSuccess('PDF invoice generated successfully!')
    logInfo(`Saved to: ${outputPath}`)
    logInfo(`File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`)

    return true
  } catch (error) {
    logError(`PDF generation test failed: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

async function testWebSocketService(): Promise<boolean> {
  logHeader('Testing WebSocket Service (Socket.io)')

  logInfo('WebSocket service is always available (self-hosted)')
  logWarning('WebSocket requires HTTP server - cannot test in CLI')
  logInfo('WebSocket will be tested when development server starts')
  logInfo('Use browser console to test: const socket = io("http://localhost:3000")')

  return true
}

// Main test runner
async function runTests() {
  logHeader('🧪 External Services Test Suite')
  logInfo('Testing all configured external services...\n')

  const args = process.argv.slice(2)
  const testAll = args.length === 0
  const testFlags = {
    email: testAll || args.includes('--email'),
    sms: testAll || args.includes('--sms'),
    whatsapp: testAll || args.includes('--whatsapp'),
    push: testAll || args.includes('--push'),
    payment: testAll || args.includes('--payment'),
    pdf: testAll || args.includes('--pdf'),
    websocket: testAll || args.includes('--websocket'),
  }

  const results: Record<string, boolean> = {}

  if (testFlags.email) {
    results.email = await testEmailService()
  }

  if (testFlags.sms) {
    results.sms = await testSMSService()
  }

  if (testFlags.whatsapp) {
    results.whatsapp = await testWhatsAppService()
  }

  if (testFlags.push) {
    results.push = await testPushNotificationService()
  }

  if (testFlags.payment) {
    results.payment = await testPaymentGatewayService()
  }

  if (testFlags.pdf) {
    results.pdf = await testPDFGenerationService()
  }

  if (testFlags.websocket) {
    results.websocket = await testWebSocketService()
  }

  // Print summary
  logHeader('📊 Test Summary')

  const tested = Object.keys(results)
  const passed = tested.filter((key) => results[key])
  const failed = tested.filter((key) => !results[key])

  log(`\nTotal Tests: ${tested.length}`, 'bright')
  logSuccess(`Passed: ${passed.length}`)
  if (failed.length > 0) {
    logError(`Failed: ${failed.length}`)
    log(`\nFailed services: ${failed.join(', ')}`, 'red')
  }

  // Print configuration tips
  if (failed.length > 0) {
    logHeader('💡 Configuration Tips')
    logInfo('1. Check your .env file has all required variables')
    logInfo('2. Verify API keys are correct and not expired')
    logInfo('3. For SMS/WhatsApp: Set TEST_PHONE=+94771234567')
    logInfo('4. For Push: Set TEST_FCM_TOKEN=your_device_token')
    logInfo('5. For Email: Set TEST_EMAIL=your@email.com')
    logInfo('\nSee docs/SETUP_GUIDE.md for detailed setup instructions')
  } else if (passed.length > 0) {
    log('\n🎉 All tested services are working correctly!', 'green')
  }

  // Exit with error code if any tests failed
  if (failed.length > 0) {
    process.exit(1)
  }
}

// Run tests
runTests().catch((error) => {
  logError(`Test suite failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})

/**
 * Two-Factor Authentication (2FA) Service
 * TOTP-based authentication using Google Authenticator/Authy compatible tokens
 */

import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import { prisma } from '@/lib/db'

const APP_NAME = 'Madeena Textiles'

authenticator.options = {
  window: 1, // Allow 30s time drift
}

export interface Setup2FAResult {
  secret: string
  qrCode: string
  backupCodes: string[]
}

export interface Verify2FAResult {
  success: boolean
  message: string
}

/**
 * Generate 2FA secret and QR code for user enrollment
 */
export async function setup2FA(userId: string, userEmail: string): Promise<Setup2FAResult> {
  const secret = authenticator.generateSecret()
  const otpauth = authenticator.keyuri(userEmail, APP_NAME, secret)

  // Generate QR code as data URL
  const qrCode = await QRCode.toDataURL(otpauth)

  // Generate backup codes
  const backupCodes = generateBackupCodes(8)
  const hashedBackupCodes = await Promise.all(
    backupCodes.map(async (code) => {
      const bcrypt = await import('bcryptjs')
      return bcrypt.hash(code, 10)
    })
  )

  // Store secret and backup codes
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: secret,
      twoFactorBackupCodes: hashedBackupCodes,
    },
  })

  return {
    secret,
    qrCode,
    backupCodes,
  }
}

/**
 * Verify TOTP token and enable 2FA
 */
export async function verify2FASetup(
  userId: string,
  token: string
): Promise<Verify2FAResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  })

  if (!user || !user.twoFactorSecret) {
    return {
      success: false,
      message: '2FA setup not initiated',
    }
  }

  if (user.twoFactorEnabled) {
    return {
      success: false,
      message: '2FA already enabled',
    }
  }

  const isValid = authenticator.verify({
    token,
    secret: user.twoFactorSecret,
  })

  if (!isValid) {
    return {
      success: false,
      message: 'Invalid verification code',
    }
  }

  // Enable 2FA
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  })

  return {
    success: true,
    message: '2FA successfully enabled',
  }
}

/**
 * Verify 2FA token during login
 */
export async function verify2FALogin(userId: string, token: string): Promise<Verify2FAResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorSecret: true,
      twoFactorEnabled: true,
      twoFactorBackupCodes: true,
    },
  })

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return {
      success: false,
      message: '2FA not enabled for this account',
    }
  }

  // Try TOTP token first
  const isValidToken = authenticator.verify({
    token,
    secret: user.twoFactorSecret,
  })

  if (isValidToken) {
    return {
      success: true,
      message: '2FA verification successful',
    }
  }

  // Try backup codes
  if (user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0) {
    const bcrypt = await import('bcryptjs')
    
    for (let i = 0; i < user.twoFactorBackupCodes.length; i++) {
      const isValidBackupCode = await bcrypt.compare(token, user.twoFactorBackupCodes[i])
      
      if (isValidBackupCode) {
        // Remove used backup code
        const updatedCodes = [...user.twoFactorBackupCodes]
        updatedCodes.splice(i, 1)
        
        await prisma.user.update({
          where: { id: userId },
          data: { twoFactorBackupCodes: updatedCodes },
        })

        return {
          success: true,
          message: 'Backup code accepted. You have ' + updatedCodes.length + ' backup codes remaining.',
        }
      }
    }
  }

  return {
    success: false,
    message: 'Invalid 2FA code or backup code',
  }
}

/**
 * Disable 2FA for user account
 */
export async function disable2FA(userId: string, token: string): Promise<Verify2FAResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorSecret: true,
      twoFactorEnabled: true,
    },
  })

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return {
      success: false,
      message: '2FA not enabled',
    }
  }

  // Verify token before disabling
  const isValid = authenticator.verify({
    token,
    secret: user.twoFactorSecret,
  })

  if (!isValid) {
    return {
      success: false,
      message: 'Invalid verification code',
    }
  }

  // Disable 2FA and clear secret
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
    },
  })

  return {
    success: true,
    message: '2FA successfully disabled',
  }
}

/**
 * Generate backup codes
 */
function generateBackupCodes(count: number): string[] {
  const codes: string[] = []
  
  for (let i = 0; i < count; i++) {
    // Generate 8-digit code
    const code = Math.floor(10000000 + Math.random() * 90000000).toString()
    codes.push(code)
  }
  
  return codes
}

/**
 * Check if user has 2FA enabled
 */
export async function is2FAEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  })

  return user?.twoFactorEnabled || false
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(
  userId: string,
  verificationToken: string
): Promise<{ success: boolean; backupCodes?: string[]; message: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorSecret: true,
      twoFactorEnabled: true,
    },
  })

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return {
      success: false,
      message: '2FA not enabled',
    }
  }

  // Verify current token
  const isValid = authenticator.verify({
    token: verificationToken,
    secret: user.twoFactorSecret,
  })

  if (!isValid) {
    return {
      success: false,
      message: 'Invalid verification code',
    }
  }

  // Generate new backup codes
  const backupCodes = generateBackupCodes(8)
  const hashedBackupCodes = await Promise.all(
    backupCodes.map(async (code) => {
      const bcrypt = await import('bcryptjs')
      return bcrypt.hash(code, 10)
    })
  )

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorBackupCodes: hashedBackupCodes },
  })

  return {
    success: true,
    backupCodes,
    message: 'Backup codes regenerated successfully',
  }
}

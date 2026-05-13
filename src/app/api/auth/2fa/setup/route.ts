import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { setup2FA } from '@/lib/auth-2fa'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id as string
    const userEmail = session.user.email as string

    const result = await setup2FA(userId, userEmail)

    return NextResponse.json({
      success: true,
      message: 'Scan QR code with Google Authenticator or Authy',
      ...result,
    })
  } catch (error) {
    console.error('[2FA Setup] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to setup 2FA',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

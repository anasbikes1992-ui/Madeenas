import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { verify2FASetup } from '@/lib/auth-2fa'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id as string
    const body = await request.json()
    const { token } = body

    if (!token || typeof token !== 'string' || token.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid token format. Expected 6-digit code.' },
        { status: 400 }
      )
    }

    const result = await verify2FASetup(userId, token)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    console.error('[2FA Verify] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to verify 2FA',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

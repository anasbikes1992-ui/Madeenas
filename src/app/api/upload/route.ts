import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { env } from '@/lib/env'
import { fail, ok } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return fail('No file provided', 400, 'VALIDATION_ERROR')

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

  // If Supabase configured, use it; else return base64
  if (!env.NEXT_PUBLIC_SUPABASE_URL.includes('[PROJECT-REF]')) {
    const { uploadProductImage } = await import('@/lib/supabase')
    const url = await uploadProductImage(buffer, file.name, file.type)
    if (url) return ok({ url })
  }

  return ok({ url: base64 })
}

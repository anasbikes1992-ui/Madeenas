import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { env } from '@/lib/env'
import { fail, ok } from '@/lib/api-response'

const hasSupabaseStorageCredentials =
  !env.NEXT_PUBLIC_SUPABASE_URL.includes('[PROJECT-REF]') &&
  !env.SUPABASE_SERVICE_ROLE_KEY.includes('[SUPABASE-')

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return fail('No file provided', 400, 'VALIDATION_ERROR')

  const maxBytes = 10 * 1024 * 1024
  if (file.size > maxBytes) {
    return fail('File too large (max 10MB)', 400, 'FILE_TOO_LARGE')
  }

  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
  if (file.type && !allowed.has(file.type)) {
    return fail('Only JPEG, PNG, WebP, or GIF images are allowed', 400, 'INVALID_MIME')
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

  // If Supabase configured, use it; else return base64
  if (hasSupabaseStorageCredentials) {
    const { uploadProductImage } = await import('@/lib/supabase')
    const url = await uploadProductImage(buffer, file.name, file.type)
    if (url) return ok({ url })
  }

  return ok({ url: base64 })
}

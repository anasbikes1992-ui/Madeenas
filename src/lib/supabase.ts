import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { env, publicEnv } from '@/lib/env'

const supabaseUrl = publicEnv.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Public client (browser-safe)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client (server-only)
export const supabaseAdmin = createClient(supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export function createBrowserSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // No-op in contexts where setting cookies is not supported.
        }
      },
    },
  })
}

export function createMiddlewareSupabaseClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        response = NextResponse.next({ request })

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  return { client, response }
}

export async function uploadProductImage(
  file: Buffer | Blob,
  fileName: string,
  contentType: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from('product-images')
    .upload(`products/${Date.now()}-${fileName}`, file, {
      contentType,
      upsert: false,
    })
  if (error) {
    console.error('Upload error:', error)
    return null
  }
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('product-images')
    .getPublicUrl(data.path)
  return publicUrl
}

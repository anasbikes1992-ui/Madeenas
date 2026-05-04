import { type NextRequest } from 'next/server'
import { createMiddlewareSupabaseClient } from '@/lib/supabase'

export const createClient = (request: NextRequest) => {
  const { response } = createMiddlewareSupabaseClient(request)
  return response
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Public client (browser-safe)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client (server-only)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

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

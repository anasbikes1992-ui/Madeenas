import { z } from 'zod'

const hasPlaceholder = (value: string) =>
  value.includes('[PROJECT-REF]') || value.includes('[REGION]') || value.includes('replace-with-')

const isValidUrl = (value: string) => {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

const urlOrPlaceholder = (fieldName: string) =>
  z.string().refine((value) => isValidUrl(value) || hasPlaceholder(value), {
    message: `${fieldName} must be a valid URL`,
  })

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  AUTH_URL: urlOrPlaceholder('AUTH_URL'),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: urlOrPlaceholder('NEXTAUTH_URL'),
  MOBILE_JWT_SECRET: z.string().min(32, 'MOBILE_JWT_SECRET must be at least 32 characters'),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: urlOrPlaceholder('NEXT_PUBLIC_APP_URL').optional(),
  NEXT_PUBLIC_SUPABASE_URL: urlOrPlaceholder('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SEED_SECRET: z.string().optional(),
})

const parsed = rawEnvSchema.safeParse(process.env)

if (!parsed.success) {
  const fields = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
  throw new Error(`[env] Invalid environment configuration: ${fields}`)
}

const data = parsed.data

if (data.NODE_ENV === 'production') {
  const prodUrlFields: Array<[string, string | undefined]> = [
    ['AUTH_URL', data.AUTH_URL],
    ['NEXTAUTH_URL', data.NEXTAUTH_URL],
    ['NEXT_PUBLIC_APP_URL', data.NEXT_PUBLIC_APP_URL],
    ['NEXT_PUBLIC_SUPABASE_URL', data.NEXT_PUBLIC_SUPABASE_URL],
  ]

  for (const [field, value] of prodUrlFields) {
    if (value && !isValidUrl(value)) {
      throw new Error(`[env] Invalid production ${field}. Expected a valid URL.`)
    }
  }
}

const publicSupabaseKey = data.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!publicSupabaseKey) {
  throw new Error('[env] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).')
}

export const env = {
  ...data,
  NEXTAUTH_SECRET: data.NEXTAUTH_SECRET ?? data.AUTH_SECRET,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: publicSupabaseKey,
} as const

export const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const

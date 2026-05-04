#!/usr/bin/env node
/**
 * Sets all required Vercel environment variables for the Madeena Tex project.
 * Run: node scratch/set-vercel-env.js <VERCEL_TOKEN>
 * Get token from: https://vercel.com/account/tokens
 */

const TOKEN  = process.argv[2]
const PROJ   = process.env.VERCEL_PROJECT_ID

if (!TOKEN) {
  console.error('Usage: node scratch/set-vercel-env.js <VERCEL_PERSONAL_ACCESS_TOKEN>')
  console.error('Get token from: https://vercel.com/account/tokens')
  process.exit(1)
}

if (!PROJ) {
  console.error('Missing VERCEL_PROJECT_ID environment variable.')
  process.exit(1)
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function optionalEnv(name) {
  return process.env[name] || null
}

const authUrlProduction = requireEnv('AUTH_URL_PRODUCTION')
const authUrlPreview = optionalEnv('AUTH_URL_PREVIEW') || authUrlProduction
const appUrl = optionalEnv('NEXT_PUBLIC_APP_URL') || authUrlProduction
const appName = optionalEnv('NEXT_PUBLIC_APP_NAME') || 'TextileStock'
const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

const ENV_VARS = [
  // Database
  { key: 'DATABASE_URL', value: requireEnv('DATABASE_URL'), target: ['production', 'preview'] },
  { key: 'DIRECT_URL', value: requireEnv('DIRECT_URL'), target: ['production', 'preview'] },

  // Auth
  { key: 'AUTH_SECRET', value: requireEnv('AUTH_SECRET'), target: ['production', 'preview'] },
  { key: 'AUTH_URL', value: authUrlProduction, target: ['production'] },
  { key: 'AUTH_URL', value: authUrlPreview, target: ['preview'] },

  // NextAuth aliases
  { key: 'NEXTAUTH_SECRET', value: requireEnv('AUTH_SECRET'), target: ['production', 'preview'] },
  { key: 'NEXTAUTH_URL', value: authUrlProduction, target: ['production'] },
  { key: 'NEXTAUTH_URL', value: authUrlPreview, target: ['preview'] },

  // Supabase
  { key: 'NEXT_PUBLIC_SUPABASE_URL', value: requireEnv('NEXT_PUBLIC_SUPABASE_URL'), target: ['production', 'preview'] },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: anonKey, target: ['production', 'preview'] },
  { key: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', value: anonKey, target: ['production', 'preview'] },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', value: requireEnv('SUPABASE_SERVICE_ROLE_KEY'), target: ['production', 'preview'] },

  // App
  { key: 'NEXT_PUBLIC_APP_NAME', value: appName, target: ['production', 'preview'] },
  { key: 'NEXT_PUBLIC_APP_URL', value: appUrl, target: ['production', 'preview'] },
]

const seedSecret = optionalEnv('SEED_SECRET')
if (seedSecret) {
  ENV_VARS.push({ key: 'SEED_SECRET', value: seedSecret, target: ['production', 'preview'] })
}

async function upsertEnvVar(envVar) {
  // First check if it exists
  const listRes = await fetch(`https://api.vercel.com/v9/projects/${PROJ}/env`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  })
  const list = await listRes.json()
  const existing = (list.envs || []).find(e => e.key === envVar.key && e.target?.some(t => envVar.target.includes(t)))

  if (existing) {
    // Update
    const res = await fetch(`https://api.vercel.com/v9/projects/${PROJ}/env/${existing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ value: envVar.value, target: envVar.target, type: 'encrypted' })
    })
    const data = await res.json()
    console.log(`  UPDATED ${envVar.key}:`, res.ok ? '✅' : `❌ ${data.error?.message}`)
  } else {
    // Create
    const res = await fetch(`https://api.vercel.com/v9/projects/${PROJ}/env`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ key: envVar.key, value: envVar.value, target: envVar.target, type: 'encrypted' })
    })
    const data = await res.json()
    console.log(`  CREATED ${envVar.key}:`, res.ok ? '✅' : `❌ ${JSON.stringify(data.error)}`)
  }
}

async function main() {
  console.log('🔧 Setting Vercel environment variables...\n')
  for (const envVar of ENV_VARS) {
    await upsertEnvVar(envVar)
  }
  console.log('\n✅ Done! Now trigger a redeploy on Vercel.')
}

main().catch(console.error)

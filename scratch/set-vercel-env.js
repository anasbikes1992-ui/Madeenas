#!/usr/bin/env node
/**
 * Sets all required Vercel environment variables for the Madeena Tex project.
 * Run: node scratch/set-vercel-env.js <VERCEL_TOKEN>
 * Get token from: https://vercel.com/account/tokens
 */

const TOKEN  = process.argv[2]
const PROJ   = 'prj_jWJbjxMZFsqbNA3r2WWMsTALJPGo'

if (!TOKEN) {
  console.error('Usage: node scratch/set-vercel-env.js <VERCEL_PERSONAL_ACCESS_TOKEN>')
  console.error('Get token from: https://vercel.com/account/tokens')
  process.exit(1)
}

const ENV_VARS = [
  // Database — use direct URL for Vercel (Vercel can reach Supabase port 5432)
  { key: 'DATABASE_URL',         value: 'postgresql://postgres:MadeenasShazan@db.klklufcegyfgezvjmanr.supabase.co:5432/postgres', target: ['production', 'preview'] },
  { key: 'DIRECT_URL',           value: 'postgresql://postgres:MadeenasShazan@db.klklufcegyfgezvjmanr.supabase.co:5432/postgres', target: ['production', 'preview'] },
  // Auth
  { key: 'AUTH_SECRET',          value: '7qF9iM0zmkdDbtKYZekBKWtuaoXZcYxLIXaLsKYGzdk', target: ['production', 'preview'] },
  { key: 'AUTH_URL',             value: 'https://madeenas.vercel.app',                  target: ['production'] },
  { key: 'AUTH_URL',             value: 'https://madeenas-dlsmpg9x3-anas-projects-7ceb7b61.vercel.app', target: ['preview'] },
  { key: 'NEXTAUTH_SECRET',      value: '7qF9iM0zmkdDbtKYZekBKWtuaoXZcYxLIXaLsKYGzdk', target: ['production', 'preview'] },
  { key: 'NEXTAUTH_URL',         value: 'https://madeenas.vercel.app',                  target: ['production'] },
  { key: 'NEXTAUTH_URL',         value: 'https://madeenas-dlsmpg9x3-anas-projects-7ceb7b61.vercel.app', target: ['preview'] },
  // Supabase
  { key: 'NEXT_PUBLIC_SUPABASE_URL',      value: 'https://klklufcegyfgezvjmanr.supabase.co', target: ['production', 'preview'] },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: 'sb_publishable_lBTUXxz_oVTUrhB24LHnPg_yxn1q2KN', target: ['production', 'preview'] },
  // App
  { key: 'NEXT_PUBLIC_APP_NAME', value: 'Madeena Tex', target: ['production', 'preview'] },
  { key: 'NEXT_PUBLIC_APP_URL',  value: 'https://madeenas.vercel.app', target: ['production', 'preview'] },
  // Seed secret
  { key: 'SEED_SECRET',          value: 'madeena-seed-2024', target: ['production', 'preview'] },
]

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

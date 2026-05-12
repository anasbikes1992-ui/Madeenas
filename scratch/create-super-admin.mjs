/**
 * One-shot script: create/upsert the super admin in production DB.
 * Run with: node --env-file=.env.local scratch/create-super-admin.mjs
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email    = 'anasbikes1992@gmail.com'
  const password = '12345678'
  const name     = 'Anas (Super Admin)'
  const role     = 'SUPER_ADMIN'

  console.log(`Creating / updating user: ${email} ...`)
  const hash = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where:  { email },
    update: { name, password: hash, role, isActive: true },
    create: { name, email, password: hash, role, isActive: true },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  })

  console.log('✅ Done:', user)
}

main()
  .catch(e => { console.error('❌', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())

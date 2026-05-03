import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { sql, token } = await req.json()
    
    if (token !== process.env.SEED_SECRET && token !== 'madeena-seed-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!sql) {
      return NextResponse.json({ error: 'No SQL provided' }, { status: 400 })
    }

    // Split statements because Prisma $executeRawUnsafe struggles with multiple DDLs at once
    const statements = sql.split(';').filter((s: string) => s.trim().length > 0)
    
    let executed = 0
    for (const statement of statements) {
      if (statement.trim()) {
        await prisma.$executeRawUnsafe(statement + ';')
        executed++
      }
    }

    return NextResponse.json({ success: true, message: `Executed ${executed} statements successfully.` })
  } catch (error: any) {
    console.error('Migration failed:', error)
    return NextResponse.json({ error: error.message || 'Migration failed', stack: error.stack }, { status: 500 })
  }
}

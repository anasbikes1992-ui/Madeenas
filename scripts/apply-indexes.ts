#!/usr/bin/env node
/**
 * Apply Performance Indexes to Database
 * 
 * Since psql is not available, we'll use Prisma's raw SQL execution
 * to apply the 36 performance indexes.
 */

import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';
import { join } from 'path';

const prisma = new PrismaClient();

async function applyIndexes() {
  console.log('📊 Applying 36 performance indexes...\n');

  const sqlPath = join(process.cwd(), 'prisma/migrations/add_performance_indexes.sql');
  const sqlContent = await readFile(sqlPath, 'utf-8');

  // Remove comments and extract CREATE INDEX statements
  const lines = sqlContent.split('\n').filter((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('--') && !trimmed.startsWith('/*');
  });

  const cleanedSQL = lines.join('\n');
  
  // Split by semicolon and filter for CREATE INDEX statements
  const statements = cleanedSQL
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.toUpperCase().startsWith('CREATE INDEX'))
    .map((s) => s + ';'); // Re-add semicolon

  console.log(`Found ${statements.length} CREATE INDEX statements\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    const match = statement.match(/idx_(\w+)/);
    const indexName = match ? match[0] : 'unknown';

    try {
      await prisma.$executeRawUnsafe(statement);
      console.log(`✅ ${indexName}`);
      successCount++;
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log(`⏭️  ${indexName} (already exists)`);
        skipCount++;
      } else {
        console.error(`❌ ${indexName}: ${error.message}`);
        errorCount++;
      }
    }
  }

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  Index Application Summary                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Created: ${successCount}`);
  console.log(`⏭️  Skipped: ${skipCount} (already exist)`);
  console.log(`❌ Failed:  ${errorCount}\n`);

  if (errorCount === 0) {
    console.log('🎉 All indexes applied successfully!\n');
    
    // Verify index creation
    console.log('Verifying indexes...\n');
    const indexes = await prisma.$queryRaw<Array<{tablename: string, indexname: string}>>`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `;

    console.log(`Total indexes found: ${indexes.length}\n`);
    
    // Group by table
    const byTable = indexes.reduce((acc, idx) => {
      if (!acc[idx.tablename]) acc[idx.tablename] = [];
      acc[idx.tablename].push(idx.indexname);
      return acc;
    }, {} as Record<string, string[]>);

    for (const [table, idxNames] of Object.entries(byTable)) {
      console.log(`📁 ${table}: ${idxNames.length} indexes`);
    }
  }

  await prisma.$disconnect();
  process.exit(errorCount > 0 ? 1 : 0);
}

applyIndexes().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

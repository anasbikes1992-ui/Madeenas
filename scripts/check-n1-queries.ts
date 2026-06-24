#!/usr/bin/env node
/**
 * N+1 Query Detection & Optimization Tool
 * 
 * Purpose: Analyze API routes for N+1 query patterns and missing includes
 * Usage: npx tsx scripts/check-n1-queries.ts
 * 
 * Checks:
 * 1. Loops with await inside (potential N+1)
 * 2. Missing include/select in findMany (relation lookups)
 * 3. Separate queries that could be combined
 * 4. Missing Promise.all for parallel queries
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const API_DIR = 'src/app/api';

type Issue = {
  file: string;
  line: number;
  type: 'N+1' | 'MISSING_INCLUDE' | 'SEQUENTIAL_AWAIT' | 'POTENTIAL_N+1';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  suggestion: string;
};

const issues: Issue[] = [];

/**
 * Scan a single file for N+1 patterns
 */
async function scanFile(filePath: string): Promise<void> {
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  let inForLoop = false;
  let inMapCall = false;
  let forLoopStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check 1: for...of loop with await inside
    if (/for\s*\(.*\s+of\s+/.test(line)) {
      inForLoop = true;
      forLoopStartLine = lineNum;
    }

    if (inForLoop && /await\s+prisma\./.test(line)) {
      issues.push({
        file: filePath,
        line: lineNum,
        type: 'N+1',
        severity: 'HIGH',
        message: 'N+1 query detected: await prisma inside for...of loop',
        suggestion: 'Use Promise.all() or add include to parent query',
      });
      inForLoop = false; // Reset to avoid duplicate reports
    }

    if (inForLoop && line.trim() === '}') {
      inForLoop = false;
    }

    // Check 2: .map() with await
    if (/\.map\s*\(.*await\s+prisma\./.test(line)) {
      issues.push({
        file: filePath,
        line: lineNum,
        type: 'N+1',
        severity: 'HIGH',
        message: 'N+1 query detected: await prisma inside .map()',
        suggestion: 'Use Promise.all() with map or include relations',
      });
    }

    // Check 3: findMany without include (potential missing relations)
    if (/prisma\.\w+\.findMany\({/.test(line)) {
      const nextFewLines = lines.slice(i, i + 10).join('\n');
      if (!/include:\s*{/.test(nextFewLines) && !/select:\s*{/.test(nextFewLines)) {
        issues.push({
          file: filePath,
          line: lineNum,
          type: 'MISSING_INCLUDE',
          severity: 'MEDIUM',
          message: 'findMany without include/select - may cause N+1 if relations used later',
          suggestion: 'Add include clause to fetch related data in single query',
        });
      }
    }

    // Check 4: Multiple sequential awaits without Promise.all
    if (/const\s+\w+\s*=\s*await\s+prisma\./.test(line)) {
      const nextLine = lines[i + 1] || '';
      const secondLine = lines[i + 2] || '';
      if (/const\s+\w+\s*=\s*await\s+prisma\./.test(nextLine) &&
          /const\s+\w+\s*=\s*await\s+prisma\./.test(secondLine)) {
        // Check if they're not in Promise.all already
        const prevLines = lines.slice(Math.max(0, i - 3), i).join('\n');
        if (!/Promise\.all/.test(prevLines)) {
          issues.push({
            file: filePath,
            line: lineNum,
            type: 'SEQUENTIAL_AWAIT',
            severity: 'MEDIUM',
            message: 'Multiple sequential await calls - could be parallelized',
            suggestion: 'Use Promise.all([...]) for independent queries',
          });
        }
      }
    }

    // Check 5: Nested queries (potential N+1)
    if (/prisma\.\w+\.findUnique.*\.then.*prisma\./.test(line)) {
      issues.push({
        file: filePath,
        line: lineNum,
        type: 'POTENTIAL_N+1',
        severity: 'MEDIUM',
        message: 'Nested prisma query detected - may be N+1',
        suggestion: 'Consider using include to fetch related data',
      });
    }
  }
}

/**
 * Recursively scan directory for TypeScript files
 */
async function scanDirectory(dir: string): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await scanDirectory(fullPath);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      await scanFile(fullPath);
    }
  }
}

/**
 * Generate report
 */
function generateReport(): void {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  N+1 Query Detection Report - Madeena Textile Management     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const highIssues = issues.filter((i) => i.severity === 'HIGH');
  const mediumIssues = issues.filter((i) => i.severity === 'MEDIUM');
  const lowIssues = issues.filter((i) => i.severity === 'LOW');

  console.log(`Total issues found: ${issues.length}`);
  console.log(`  🔴 HIGH:   ${highIssues.length}`);
  console.log(`  🟡 MEDIUM: ${mediumIssues.length}`);
  console.log(`  🟢 LOW:    ${lowIssues.length}\n`);

  if (issues.length === 0) {
    console.log('✅ No N+1 query patterns detected! Great job!\n');
    return;
  }

  // Group by file
  const issuesByFile = issues.reduce((acc, issue) => {
    if (!acc[issue.file]) acc[issue.file] = [];
    acc[issue.file].push(issue);
    return acc;
  }, {} as Record<string, Issue[]>);

  // Sort files by issue count (descending)
  const sortedFiles = Object.entries(issuesByFile).sort((a, b) => b[1].length - a[1].length);

  for (const [file, fileIssues] of sortedFiles) {
    console.log(`\n📁 ${file}`);
    console.log(`   ${fileIssues.length} issue(s) found\n`);

    for (const issue of fileIssues) {
      const icon = issue.severity === 'HIGH' ? '🔴' : issue.severity === 'MEDIUM' ? '🟡' : '🟢';
      console.log(`   ${icon} Line ${issue.line} [${issue.type}]`);
      console.log(`      ${issue.message}`);
      console.log(`      💡 ${issue.suggestion}\n`);
    }
  }

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  Optimization Recommendations                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  if (highIssues.length > 0) {
    console.log('🔴 HIGH PRIORITY:');
    console.log('   - Fix N+1 queries immediately (performance impact)');
    console.log('   - Use include/select or Promise.all patterns\n');
  }

  if (mediumIssues.length > 0) {
    console.log('🟡 MEDIUM PRIORITY:');
    console.log('   - Review missing includes for potential N+1s');
    console.log('   - Parallelize independent queries with Promise.all\n');
  }

  console.log('📚 Resources:');
  console.log('   - Prisma Best Practices: https://www.prisma.io/docs/guides/performance-and-optimization');
  console.log('   - N+1 Query Problem: https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem\n');
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔍 Scanning API routes for N+1 query patterns...\n');
    await scanDirectory(API_DIR);
    generateReport();

    // Exit code based on severity
    const hasHighIssues = issues.some((i) => i.severity === 'HIGH');
    process.exit(hasHighIssues ? 1 : 0);
  } catch (error) {
    console.error('❌ Error during scan:', error);
    process.exit(1);
  }
}

main();

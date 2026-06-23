#!/usr/bin/env tsx
/**
 * Backup Management Script
 * 
 * Automates database backup, verification, restoration, and pruning.
 * 
 * Usage:
 *   npm run backup:create         # Create a new backup
 *   npm run backup:verify         # Verify latest backup
 *   npm run backup:test-restore   # Test restore to temporary database
 *   npm run backup:prune          # Delete old backups (keep last 7)
 */

import { backupVerificationService } from '../src/services/backup-verification.service'
import * as fs from 'fs/promises'
import * as path from 'path'

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green')
}

function logError(message: string) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow')
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'cyan')
}

function logHeader(message: string) {
  log(`\n${'='.repeat(60)}`, 'bright')
  log(message, 'bright')
  log('='.repeat(60), 'bright')
}

// Format bytes to human-readable size
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// Format duration in milliseconds
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

async function createBackup() {
  logHeader('📦 Creating Database Backup')

  const startTime = Date.now()

  try {
    logInfo('Starting backup process...')

    const result = await backupVerificationService.createBackup()

    const duration = Date.now() - startTime

    if (result.success && result.backupFile) {
      logSuccess('Backup created successfully!')
      logInfo(`File: ${result.backupFile}`)

      // Get file size
      try {
        const stats = await fs.stat(result.backupFile)
        logInfo(`Size: ${formatBytes(stats.size)}`)
      } catch {
        // Ignore if we can't get file stats
      }

      logInfo(`Duration: ${formatDuration(duration)}`)

      // Check if metadata file exists
      const metaFile = `${result.backupFile}.meta.json`
      try {
        await fs.access(metaFile)
        logInfo(`Metadata: ${metaFile}`)
      } catch {
        logWarning('Metadata file not created')
      }

      return true
    } else {
      logError(`Backup failed: ${result.error || 'Unknown error'}`)
      return false
    }
  } catch (error) {
    logError(`Backup creation failed: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

async function verifyBackup() {
  logHeader('🔍 Verifying Latest Backup')

  try {
    logInfo('Locating latest backup...')

    // Get all backups
    const backups = await backupVerificationService.listBackups()

    if (backups.length === 0) {
      logWarning('No backups found')
      logInfo('Run "npm run backup:create" to create a backup')
      return false
    }

    const latestBackup = backups[0]
    logInfo(`Latest backup: ${latestBackup.filename}`)
    logInfo(`Created: ${latestBackup.createdAt.toLocaleString()}`)
    logInfo(`Size: ${formatBytes(latestBackup.size)}`)

    logInfo('\nRunning verification checks...')

    const startTime = Date.now()
    const result = await backupVerificationService.verifyBackup(latestBackup.path)
    const duration = Date.now() - startTime

    if (result.success && result.report) {
      logSuccess('Backup verification passed!')
      logInfo(`Duration: ${formatDuration(duration)}`)

      // Print verification details
      log('\nVerification Report:', 'bright')
      logInfo(`File Exists: ${result.report.fileExists ? '✓' : '✗'}`)
      logInfo(`Size Valid: ${result.report.sizeValid ? '✓' : '✗'} (${formatBytes(result.report.actualSize)})`)
      logInfo(`Checksum Valid: ${result.report.checksumValid ? '✓' : '✗'}`)

      if (result.report.tableCount !== undefined) {
        logInfo(`Tables Found: ${result.report.tableCount}`)
      }

      if (result.report.recordCount !== undefined) {
        logInfo(`Records: ${result.report.recordCount}`)
      }

      return true
    } else {
      logError(`Verification failed: ${result.error || 'Unknown error'}`)

      if (result.report) {
        log('\nVerification Report:', 'bright')
        if (!result.report.fileExists) {
          logError('Backup file does not exist')
        }
        if (!result.report.sizeValid) {
          logError(`Backup file size is invalid: ${formatBytes(result.report.actualSize)}`)
        }
        if (!result.report.checksumValid) {
          logError('Backup file checksum does not match')
        }
      }

      return false
    }
  } catch (error) {
    logError(`Backup verification failed: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

async function testRestore() {
  logHeader('🔄 Test Restore to Temporary Database')

  try {
    logInfo('Locating latest backup...')

    // Get all backups
    const backups = await backupVerificationService.listBackups()

    if (backups.length === 0) {
      logWarning('No backups found')
      logInfo('Run "npm run backup:create" to create a backup')
      return false
    }

    const latestBackup = backups[0]
    logInfo(`Latest backup: ${latestBackup.filename}`)
    logInfo(`Created: ${latestBackup.createdAt.toLocaleString()}`)
    logInfo(`Size: ${formatBytes(latestBackup.size)}`)

    logWarning('\nThis will create a temporary database for testing')
    logWarning('The temporary database will be dropped after the test')
    logInfo('Press Ctrl+C to cancel, or wait 5 seconds to continue...')

    await new Promise((resolve) => setTimeout(resolve, 5000))

    logInfo('\nStarting test restore...')

    const startTime = Date.now()
    const result = await backupVerificationService.testRestore(latestBackup.path)
    const duration = Date.now() - startTime

    if (result.success && result.report) {
      logSuccess('Test restore completed successfully!')
      logInfo(`Duration: ${formatDuration(duration)}`)

      // Print restore details
      log('\nRestore Report:', 'bright')
      logInfo(`Database Created: ${result.report.databaseCreated ? '✓' : '✗'}`)
      logInfo(`Restore Successful: ${result.report.restoreSuccessful ? '✓' : '✗'}`)

      if (result.report.tableCount !== undefined) {
        logInfo(`Tables Restored: ${result.report.tableCount}`)
      }

      if (result.report.recordCount !== undefined) {
        logInfo(`Records Restored: ${result.report.recordCount}`)
      }

      logInfo(`Database Dropped: ${result.report.databaseDropped ? '✓' : '✗'}`)

      return true
    } else {
      logError(`Test restore failed: ${result.error || 'Unknown error'}`)

      if (result.report) {
        log('\nRestore Report:', 'bright')
        if (!result.report.databaseCreated) {
          logError('Failed to create temporary database')
        }
        if (!result.report.restoreSuccessful) {
          logError('Failed to restore backup')
        }
        if (!result.report.databaseDropped) {
          logWarning('Failed to drop temporary database - manual cleanup may be required')
        }
      }

      return false
    }
  } catch (error) {
    logError(`Test restore failed: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

async function pruneBackups() {
  logHeader('🗑️  Pruning Old Backups')

  const keepCount = 7 // Keep last 7 backups

  try {
    logInfo('Scanning for backups...')

    // Get all backups
    const backups = await backupVerificationService.listBackups()

    if (backups.length === 0) {
      logInfo('No backups found')
      return true
    }

    logInfo(`Found ${backups.length} backup(s)`)

    if (backups.length <= keepCount) {
      logSuccess(`Keeping all ${backups.length} backup(s) (threshold: ${keepCount})`)
      return true
    }

    const toDelete = backups.slice(keepCount)
    logWarning(`Will delete ${toDelete.length} old backup(s), keeping ${keepCount} most recent`)

    // List backups to delete
    log('\nBackups to delete:', 'bright')
    toDelete.forEach((backup) => {
      logInfo(`- ${backup.filename} (${backup.createdAt.toLocaleString()})`)
    })

    logWarning('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...')
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // Delete old backups
    let deleted = 0
    let failed = 0

    for (const backup of toDelete) {
      try {
        // Delete backup file
        await fs.unlink(backup.path)

        // Delete metadata file if exists
        const metaFile = `${backup.path}.meta.json`
        try {
          await fs.unlink(metaFile)
        } catch {
          // Ignore if metadata file doesn't exist
        }

        logSuccess(`Deleted: ${backup.filename}`)
        deleted++
      } catch (error) {
        logError(`Failed to delete ${backup.filename}: ${error instanceof Error ? error.message : String(error)}`)
        failed++
      }
    }

    // Print summary
    log('\nPruning Summary:', 'bright')
    logInfo(`Total backups: ${backups.length}`)
    logSuccess(`Deleted: ${deleted}`)
    if (failed > 0) {
      logError(`Failed: ${failed}`)
    }
    logInfo(`Remaining: ${backups.length - deleted}`)

    return failed === 0
  } catch (error) {
    logError(`Backup pruning failed: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

// Main script runner
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    logError('No command specified')
    log('\nUsage:', 'bright')
    logInfo('  npm run backup:create         # Create a new backup')
    logInfo('  npm run backup:verify         # Verify latest backup')
    logInfo('  npm run backup:test-restore   # Test restore to temporary database')
    logInfo('  npm run backup:prune          # Delete old backups (keep last 7)')
    process.exit(1)
  }

  const command = args[0]

  let success = false

  switch (command) {
    case '--create':
      success = await createBackup()
      break

    case '--verify':
      success = await verifyBackup()
      break

    case '--test-restore':
      success = await testRestore()
      break

    case '--prune':
      success = await pruneBackups()
      break

    default:
      logError(`Unknown command: ${command}`)
      log('\nAvailable commands:', 'bright')
      logInfo('  --create         Create a new backup')
      logInfo('  --verify         Verify latest backup')
      logInfo('  --test-restore   Test restore to temporary database')
      logInfo('  --prune          Delete old backups')
      process.exit(1)
  }

  if (success) {
    logSuccess('\n✨ Operation completed successfully!')
    process.exit(0)
  } else {
    logError('\n💥 Operation failed!')
    process.exit(1)
  }
}

// Run main function
main().catch((error) => {
  logError(`Script failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})

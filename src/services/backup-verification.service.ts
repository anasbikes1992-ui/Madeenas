import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import { createHash } from 'crypto'

const execAsync = promisify(exec)

interface BackupMetadata {
  timestamp: Date
  size: number
  checksum: string
  tables: string[]
  recordCounts: Record<string, number>
  databaseVersion: string
}

interface BackupVerificationResult {
  success: boolean
  backupFile: string
  metadata?: BackupMetadata
  errors: string[]
  warnings: string[]
  integrity: {
    fileExists: boolean
    checksumValid: boolean
    sizeReasonable: boolean
    tablesComplete: boolean
    recordCountsMatch: boolean
  }
}

interface RestoreTestResult {
  success: boolean
  errors: string[]
  restoredTables: string[]
  recordCountsMatch: boolean
  timeElapsed: number
}

export class BackupVerificationService {
  private backupDir: string
  private testDbName: string = 'madeena_backup_test'
  private isConfigured: boolean = false

  constructor() {
    this.backupDir = process.env.BACKUP_DIRECTORY || './backups'
    
    // Check if PostgreSQL is accessible
    const dbUrl = process.env.DATABASE_URL
    if (dbUrl && dbUrl !== 'your_database_url_here') {
      this.isConfigured = true
      console.log('✅ Backup verification service initialized')
    } else {
      console.warn('⚠️  Backup verification service not configured. Set DATABASE_URL in environment.')
    }
  }

  /**
   * Create a database backup
   */
  async createBackup(): Promise<{ success: boolean; backupFile?: string; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Backup service not configured' }
    }

    try {
      await fs.mkdir(this.backupDir, { recursive: true })

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupFile = path.join(this.backupDir, `backup-${timestamp}.sql`)

      // Use pg_dump to create backup
      const dbUrl = process.env.DATABASE_URL!
      const command = `pg_dump "${dbUrl}" --format=custom --file="${backupFile}" --verbose`

      await execAsync(command)

      console.log(`✅ Backup created: ${backupFile}`)

      // Generate metadata
      const metadata = await this.generateBackupMetadata(backupFile)
      await this.saveBackupMetadata(backupFile, metadata)

      return { success: true, backupFile }
    } catch (error) {
      console.error('❌ Backup creation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupFile: string): Promise<BackupVerificationResult> {
    const result: BackupVerificationResult = {
      success: true,
      backupFile,
      errors: [],
      warnings: [],
      integrity: {
        fileExists: false,
        checksumValid: false,
        sizeReasonable: false,
        tablesComplete: false,
        recordCountsMatch: false,
      },
    }

    if (!this.isConfigured) {
      result.success = false
      result.errors.push('Backup service not configured')
      return result
    }

    try {
      // 1. Check if file exists
      try {
        await fs.access(backupFile)
        result.integrity.fileExists = true
      } catch {
        result.success = false
        result.errors.push('Backup file does not exist')
        return result
      }

      // 2. Check file size
      const stats = await fs.stat(backupFile)
      if (stats.size < 1024) {
        // Less than 1KB is suspicious
        result.warnings.push('Backup file size is suspiciously small')
      } else if (stats.size > 10 * 1024 * 1024 * 1024) {
        // More than 10GB is unusual
        result.warnings.push('Backup file size is unusually large')
      } else {
        result.integrity.sizeReasonable = true
      }

      // 3. Load metadata
      const metadata = await this.loadBackupMetadata(backupFile)
      if (metadata) {
        result.metadata = metadata

        // 4. Verify checksum
        const currentChecksum = await this.calculateChecksum(backupFile)
        if (currentChecksum === metadata.checksum) {
          result.integrity.checksumValid = true
        } else {
          result.success = false
          result.errors.push('Backup file checksum mismatch (file may be corrupted)')
        }

        // 5. Check table completeness
        const expectedTables = [
          'User',
          'Product',
          'Category',
          'Stock',
          'Sale',
          'CustomerOrder',
          'Return',
          'Location',
          'Warehouse',
          'Shop',
          'StockTransfer',
          'Expense',
          'Tax',
          'Notification',
        ]
        const missingTables = expectedTables.filter(table => !metadata.tables.includes(table))
        if (missingTables.length === 0) {
          result.integrity.tablesComplete = true
        } else {
          result.warnings.push(`Missing tables in backup: ${missingTables.join(', ')}`)
        }

        console.log(`✅ Backup verified: ${backupFile}`)
      } else {
        result.warnings.push('No metadata found for backup (cannot verify integrity fully)')
      }
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
      console.error('❌ Backup verification failed:', error)
    }

    return result
  }

  /**
   * Test restore to verify backup can be recovered
   */
  async testRestore(backupFile: string): Promise<RestoreTestResult> {
    const result: RestoreTestResult = {
      success: true,
      errors: [],
      restoredTables: [],
      recordCountsMatch: false,
      timeElapsed: 0,
    }

    if (!this.isConfigured) {
      result.success = false
      result.errors.push('Backup service not configured')
      return result
    }

    const startTime = Date.now()

    try {
      // 1. Create test database
      console.log(`🧪 Creating test database: ${this.testDbName}`)
      await this.createTestDatabase()

      // 2. Restore backup to test database
      console.log(`🧪 Restoring backup to test database...`)
      const dbUrl = process.env.DATABASE_URL!
      const testDbUrl = dbUrl.replace(/\/[^/]+$/, `/${this.testDbName}`)
      
      const command = `pg_restore --dbname="${testDbUrl}" --clean --if-exists --verbose "${backupFile}"`
      await execAsync(command)

      // 3. Verify tables exist
      result.restoredTables = await this.getTablesInDatabase(testDbUrl)
      console.log(`✅ Restored ${result.restoredTables.length} tables`)

      // 4. Compare record counts with original
      const metadata = await this.loadBackupMetadata(backupFile)
      if (metadata) {
        const originalCounts = metadata.recordCounts
        const restoredCounts = await this.getRecordCounts(testDbUrl, result.restoredTables)

        let countMismatch = false
        for (const table of result.restoredTables) {
          if (originalCounts[table] !== restoredCounts[table]) {
            result.errors.push(
              `Record count mismatch in ${table}: expected ${originalCounts[table]}, got ${restoredCounts[table]}`
            )
            countMismatch = true
          }
        }

        result.recordCountsMatch = !countMismatch
      }

      result.timeElapsed = Date.now() - startTime
      console.log(`✅ Test restore completed in ${(result.timeElapsed / 1000).toFixed(2)}s`)

      // 5. Cleanup test database
      await this.dropTestDatabase()
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
      console.error('❌ Test restore failed:', error)

      // Attempt cleanup even on failure
      try {
        await this.dropTestDatabase()
      } catch (cleanupError) {
        console.error('⚠️  Failed to cleanup test database:', cleanupError)
      }
    }

    return result
  }

  /**
   * List all backups in backup directory
   */
  async listBackups(): Promise<Array<{ file: string; size: number; created: Date; metadata?: BackupMetadata }>> {
    try {
      const files = await fs.readdir(this.backupDir)
      const backupFiles = files.filter(f => f.endsWith('.sql') || f.endsWith('.dump'))

      const backups = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = path.join(this.backupDir, file)
          const stats = await fs.stat(filePath)
          const metadata = await this.loadBackupMetadata(filePath)

          return {
            file: filePath,
            size: stats.size,
            created: stats.birthtime,
            metadata,
          }
        })
      )

      return backups.sort((a, b) => b.created.getTime() - a.created.getTime())
    } catch (error) {
      console.error('❌ Failed to list backups:', error)
      return []
    }
  }

  /**
   * Delete old backups (keep last N backups)
   */
  async pruneOldBackups(keepCount: number = 7): Promise<{ deleted: number; errors: string[] }> {
    const result = { deleted: 0, errors: [] as string[] }

    try {
      const backups = await this.listBackups()

      if (backups.length <= keepCount) {
        console.log(`✅ No backups to prune (${backups.length} <= ${keepCount})`)
        return result
      }

      const toDelete = backups.slice(keepCount)

      for (const backup of toDelete) {
        try {
          await fs.unlink(backup.file)
          const metadataFile = `${backup.file}.meta.json`
          try {
            await fs.unlink(metadataFile)
          } catch {
            // Metadata file may not exist
          }
          result.deleted++
          console.log(`🗑️  Deleted old backup: ${backup.file}`)
        } catch (error) {
          result.errors.push(`Failed to delete ${backup.file}: ${error}`)
        }
      }

      console.log(`✅ Pruned ${result.deleted} old backups`)
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    return result
  }

  // Private helper methods

  private async generateBackupMetadata(backupFile: string): Promise<BackupMetadata> {
    const dbUrl = process.env.DATABASE_URL!
    const checksum = await this.calculateChecksum(backupFile)
    const stats = await fs.stat(backupFile)
    const tables = await this.getTablesInDatabase(dbUrl)
    const recordCounts = await this.getRecordCounts(dbUrl, tables)
    const databaseVersion = await this.getDatabaseVersion(dbUrl)

    return {
      timestamp: new Date(),
      size: stats.size,
      checksum,
      tables,
      recordCounts,
      databaseVersion,
    }
  }

  private async saveBackupMetadata(backupFile: string, metadata: BackupMetadata): Promise<void> {
    const metadataFile = `${backupFile}.meta.json`
    await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2))
  }

  private async loadBackupMetadata(backupFile: string): Promise<BackupMetadata | null> {
    try {
      const metadataFile = `${backupFile}.meta.json`
      const content = await fs.readFile(metadataFile, 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath)
    return createHash('sha256').update(content).digest('hex')
  }

  private async getTablesInDatabase(dbUrl: string): Promise<string[]> {
    const { stdout } = await execAsync(
      `psql "${dbUrl}" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';" -t`
    )
    return stdout
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
  }

  private async getRecordCounts(dbUrl: string, tables: string[]): Promise<Record<string, number>> {
    const counts: Record<string, number> = {}

    for (const table of tables) {
      try {
        const { stdout } = await execAsync(`psql "${dbUrl}" -c "SELECT COUNT(*) FROM \\"${table}\\";" -t`)
        counts[table] = parseInt(stdout.trim(), 10)
      } catch {
        counts[table] = 0
      }
    }

    return counts
  }

  private async getDatabaseVersion(dbUrl: string): Promise<string> {
    const { stdout } = await execAsync(`psql "${dbUrl}" -c "SELECT version();" -t`)
    return stdout.trim()
  }

  private async createTestDatabase(): Promise<void> {
    const dbUrl = process.env.DATABASE_URL!
    const mainDbUrl = dbUrl.replace(/\/[^/]+$/, '/postgres')
    await execAsync(`psql "${mainDbUrl}" -c "DROP DATABASE IF EXISTS ${this.testDbName};"`)
    await execAsync(`psql "${mainDbUrl}" -c "CREATE DATABASE ${this.testDbName};"`)
  }

  private async dropTestDatabase(): Promise<void> {
    const dbUrl = process.env.DATABASE_URL!
    const mainDbUrl = dbUrl.replace(/\/[^/]+$/, '/postgres')
    await execAsync(`psql "${mainDbUrl}" -c "DROP DATABASE IF EXISTS ${this.testDbName};"`)
  }
}

// Export singleton instance
export const backupVerificationService = new BackupVerificationService()

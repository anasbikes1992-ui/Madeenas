import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'vitest/config'

// Integration tests talk to the real database, so the same env the app uses
// must be present. Unit tests are unaffected by this.
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    globals: true,
    passWithNoTests: true,
    // Integration tests share database fixtures, so files must not run
    // concurrently with each other.
    fileParallelism: false,
    // Integration tests hit a remote (Supabase) database; the 5s default is
    // not enough for multi-round-trip transactions over the network.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'text-summary'],
      reportsDirectory: './coverage',
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'src/**/*.test.{ts,tsx}',
        'src/app/**/*.tsx',
        'src/**/*.d.ts',
        'src/proxy.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

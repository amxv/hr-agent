import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'node:path'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['node_modules', '.next', 'dist'],
    // Prevent parallel execution to avoid database conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    setupFiles: ['./tests/integration/setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
    testTimeout: 30000, // 30 seconds for database operations
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})

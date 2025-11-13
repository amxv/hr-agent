import { beforeEach, vi } from 'vitest'
import { resetTestDatabase } from '../helpers/test-db'

// Set environment variables BEFORE any modules are imported
process.env.NODE_ENV = 'test'
process.env.POSTGRES_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hr_test'
process.env.DATABASE_URL = process.env.POSTGRES_URL

// Required core env vars for T3 env validation
process.env.AI_GATEWAY_API_KEY = 'test-gateway-key'
process.env.CRON_SECRET = 'test-cron-secret'
process.env.AUTH_SECRET = 'test-auth-secret'
process.env.BLOB_READ_WRITE_TOKEN = 'test-blob-token'

// Mock the env module to bypass T3 env validation in tests
vi.mock('@/lib/env', () => ({
  env: {
    POSTGRES_URL: process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/hr_test',
    AI_GATEWAY_API_KEY: 'test-gateway-key',
    CRON_SECRET: 'test-cron-secret',
    AUTH_SECRET: 'test-auth-secret',
    BLOB_READ_WRITE_TOKEN: 'test-blob-token',
    NEXT_PUBLIC_SANDBOX_AVAILABLE: false,
    NEXT_PUBLIC_TAVILY_AVAILABLE: false,
    NEXT_PUBLIC_OPENAI_AVAILABLE: false,
    NEXT_PUBLIC_EXA_AVAILABLE: false,
    NEXT_PUBLIC_FIRECRAWL_AVAILABLE: false,
  },
}))

// Mock server-only module (used in server components)
vi.mock('server-only', () => ({}))

// Reset database before each integration test
beforeEach(async () => {
  await resetTestDatabase()
})

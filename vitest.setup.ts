import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Set environment variables BEFORE any modules are imported
process.env.NODE_ENV = 'test'
process.env.POSTGRES_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hr_test'
process.env.DATABASE_URL = process.env.POSTGRES_URL

// Clean up after each test
afterEach(() => {
  cleanup()
})

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// Mock next/headers (async in Next.js 16)
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
    has: vi.fn(),
  })),
  headers: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    entries: vi.fn(() => []),
  })),
}))

// Mock server-only module (used in server components)
vi.mock('server-only', () => ({}))

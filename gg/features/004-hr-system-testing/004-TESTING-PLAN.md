# Feature 004: Comprehensive Testing for HR System
**Feature ID:** 004
**Date:** 2025-11-13
**Dependencies:** Feature 003 (HR Tools Admin Integration)

---

## Executive Summary

This plan establishes comprehensive testing coverage for the HR AI features and HCM administrative system implemented in Feature 003. The testing strategy covers unit tests, integration tests, and end-to-end (E2E) tests to ensure reliability, data integrity, and user experience quality across all HR workflows.

**Scope:** HR AI Tools (5 tools) + Admin Dashboard (12 tables, 40+ components, complete CRUD operations)

**Testing Framework:** Vitest (unit/integration) + Playwright (E2E) + MSW (API mocking)

**Target Coverage:**
- Unit Tests: 80%+ coverage for business logic
- Integration Tests: 100% coverage for tRPC procedures
- E2E Tests: Critical user journeys (admin workflows + AI agent interactions)

---

## Table of Contents

1. [Phase 1: Test Infrastructure Setup](#phase-1-test-infrastructure-setup)
2. [Phase 2: Unit Tests - Database Layer](#phase-2-unit-tests---database-layer)
3. [Phase 3: Integration Tests - tRPC & API Layer](#phase-3-integration-tests---trpc--api-layer)
4. [Phase 4: E2E Tests - Admin Dashboard](#phase-4-e2e-tests---admin-dashboard)
5. [Phase 5: E2E Tests - AI Agent HR Tools](#phase-5-e2e-tests---ai-agent-hr-tools)
6. [Phase 6: CI/CD Integration & Test Automation](#phase-6-cicd-integration--test-automation)

---

## Phase 1: Test Infrastructure Setup

### Objectives
- Configure Vitest for unit and integration testing
- Configure Playwright for E2E testing with Next.js 16
- Set up test databases (local and CI)
- Configure MSW for mocking AI model responses
- Create shared test utilities and fixtures

### Tasks

#### 1.1 Vitest Configuration

**Install Dependencies:**
```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom vite-tsconfig-paths @vitest/coverage-v8
```

**Create `vitest.config.mts`:**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '__tests__/',
        '*.config.*',
        'components/ui/**', // shadcn components
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

**Create `vitest.setup.ts`:**
```typescript
import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

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
}))

// Mock next/headers (async in Next.js 16)
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}))
```

#### 1.2 Playwright Configuration

**Install Playwright:**
```bash
npm init playwright@latest
```

**Create `playwright.config.ts`:**
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['list'],
    ['junit', { outputFile: 'test-results/e2e-junit-results.xml' }]
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
```

#### 1.3 Test Database Setup

**Create `.env.test`:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/hr_test"
NODE_ENV="test"
```

**Create `tests/helpers/test-db.ts`:**
```typescript
import { db } from '@/lib/db/client'
import { sql } from 'drizzle-orm'
import { seedAllHRData, clearAllHRData } from '@/lib/db/seeds/hr-data'

export async function setupTestDatabase() {
  // Clear all data
  await clearAllHRData()

  // Seed test data
  await seedAllHRData()
}

export async function cleanupTestDatabase() {
  await clearAllHRData()
}

export async function resetTestDatabase() {
  await setupTestDatabase()
}
```

**Create `vitest.config.integration.ts`:**
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    threads: false, // Important: prevent parallel execution
    setupFiles: ['./tests/integration/setup.ts'],
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL,
    },
  },
})
```

**Create `tests/integration/setup.ts`:**
```typescript
import { beforeEach } from 'vitest'
import { resetTestDatabase } from '../helpers/test-db'

beforeEach(async () => {
  await resetTestDatabase()
})
```

#### 1.4 MSW Setup for AI Mocking

**Install MSW:**
```bash
npm install -D msw
```

**Create `tests/mocks/handlers.ts`:**
```typescript
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Mock OpenAI/Anthropic API
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      choices: [
        {
          message: {
            content: 'Mocked AI response for testing',
            tool_calls: [],
          },
        },
      ],
    })
  }),

  // Mock Vercel AI Gateway
  http.post('*/api/chat', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: 'test-message-id',
      content: 'Mocked response',
      role: 'assistant',
    })
  }),
]
```

#### 1.5 Package.json Scripts

**Add test scripts:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:integration": "dotenv -e .env.test -- vitest -c vitest.config.integration.ts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:all": "npm run test && npm run test:integration && npm run test:e2e"
  }
}
```

### Success Criteria
- ✅ Vitest runs successfully with coverage reporting
- ✅ Playwright opens browser and can navigate to localhost:3000
- ✅ Test database connects and seeds successfully
- ✅ MSW intercepts and mocks AI API calls
- ✅ All test scripts execute without errors

### Estimated Time: 4-6 hours

---

## Phase 2: Unit Tests - Database Layer

### Objectives
- Test all database query functions in `lib/db/queries.ts`
- Test HR helper functions (`lib/hr/helpers.ts`)
- Test data validation and business logic
- Ensure proper error handling

### Tasks

#### 2.1 Employee Queries Tests

**Create `tests/unit/db/employee-queries.test.ts`:**
```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import {
  listEmployees,
  getEmployeeById,
  getEmployeeByEmployeeId,
  createEmployee,
  updateEmployee,
} from '@/lib/db/queries'
import { resetTestDatabase } from '../../helpers/test-db'

describe('Employee Queries', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  describe('listEmployees', () => {
    test('returns all employees when no filters applied', async () => {
      const result = await listEmployees({})

      expect(result.total).toBe(5) // from seed data
      expect(result.items).toHaveLength(5)
    })

    test('filters by search value in fullName', async () => {
      const result = await listEmployees({
        searchField: 'fullName',
        searchValue: 'John',
      })

      expect(result.items).toHaveLength(1)
      expect(result.items[0].fullName).toContain('John')
    })

    test('filters by employment status', async () => {
      const result = await listEmployees({
        status: 'active',
      })

      expect(result.items.every(e => e.employmentStatus === 'active')).toBe(true)
    })

    test('supports pagination with limit and offset', async () => {
      const page1 = await listEmployees({ limit: 2, offset: 0 })
      const page2 = await listEmployees({ limit: 2, offset: 2 })

      expect(page1.items).toHaveLength(2)
      expect(page2.items).toHaveLength(2)
      expect(page1.items[0].id).not.toBe(page2.items[0].id)
    })
  })

  describe('getEmployeeByEmployeeId', () => {
    test('returns employee with valid employeeId', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')

      expect(employee).toBeDefined()
      expect(employee?.employeeId).toBe('EMP001')
      expect(employee?.fullName).toBeDefined()
    })

    test('returns null for invalid employeeId', async () => {
      const employee = await getEmployeeByEmployeeId('INVALID')

      expect(employee).toBeNull()
    })

    test('includes manager details when present', async () => {
      const employee = await getEmployeeByEmployeeId('EMP200')

      expect(employee?.manager).toBeDefined()
      expect(employee?.manager?.fullName).toBeDefined()
    })
  })

  describe('createEmployee', () => {
    test('creates employee with required fields', async () => {
      const newEmployee = {
        employeeId: 'EMP999',
        fullName: 'Test Employee',
        email: 'test@example.com',
        phoneNumber: '555-0100',
        dateOfBirth: new Date('1990-01-01'),
        address: '123 Test St',
        city: 'Test City',
        state: 'CA',
        zipCode: '12345',
        country: 'USA',
        jobTitle: 'Software Engineer',
        department: 'Engineering',
        hireDate: new Date('2024-01-01'),
        employmentStatus: 'active' as const,
        workMode: 'remote' as const,
        officeLocation: 'Remote',
        reportsTo: null,
        yearsOfService: 0,
        createdBy: 'test-user',
      }

      const created = await createEmployee(newEmployee)

      expect(created.id).toBeDefined()
      expect(created.employeeId).toBe('EMP999')
      expect(created.fullName).toBe('Test Employee')
    })

    test('throws error for duplicate employeeId', async () => {
      const employee = {
        employeeId: 'EMP001', // Already exists in seed data
        fullName: 'Duplicate',
        email: 'duplicate@example.com',
        // ... other required fields
      }

      await expect(createEmployee(employee as any)).rejects.toThrow()
    })
  })
})
```

#### 2.2 Leave Balance Queries Tests

**Create `tests/unit/db/leave-balance-queries.test.ts`:**
```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import {
  listLeaveBalances,
  getLeaveBalancesByEmployeeId,
  updateLeaveBalance,
} from '@/lib/db/queries'
import { resetTestDatabase } from '../../helpers/test-db'

describe('Leave Balance Queries', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  describe('getLeaveBalancesByEmployeeId', () => {
    test('returns all leave types for employee', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      const balances = await getLeaveBalancesByEmployeeId(employee!.id)

      expect(balances).toHaveLength(3) // vacation, sick, personal
      expect(balances.map(b => b.leaveType)).toContain('vacation')
      expect(balances.map(b => b.leaveType)).toContain('sick')
      expect(balances.map(b => b.leaveType)).toContain('personal')
    })

    test('returns empty array for employee with no balances', async () => {
      // Create employee without balances
      const employee = await createEmployee({
        employeeId: 'EMP999',
        fullName: 'No Balances',
        // ... required fields
      })

      const balances = await getLeaveBalancesByEmployeeId(employee.id)
      expect(balances).toHaveLength(0)
    })
  })

  describe('updateLeaveBalance', () => {
    test('updates balance values', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      const balances = await getLeaveBalancesByEmployeeId(employee!.id)
      const vacationBalance = balances.find(b => b.leaveType === 'vacation')!

      const updated = await updateLeaveBalance(
        employee!.id,
        'vacation',
        {
          currentBalance: '25.0',
          accruedYTD: '20.0',
          usedYTD: '5.0',
          updatedBy: 'test-user',
        }
      )

      expect(updated.currentBalance).toBe('25.0')
      expect(updated.accruedYTD).toBe('20.0')
      expect(updated.usedYTD).toBe('5.0')
    })

    test('enforces currentBalance >= 0 constraint', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')

      await expect(
        updateLeaveBalance(employee!.id, 'vacation', {
          currentBalance: '-5.0',
          updatedBy: 'test-user',
        })
      ).rejects.toThrow()
    })
  })
})
```

#### 2.3 HR Helper Functions Tests

**Create `tests/unit/hr/helpers.test.ts`:**
```typescript
import { describe, test, expect, vi } from 'vitest'
import {
  generateCaseId,
  generateRequestId,
  calculateSLA,
  calculateCoveragePercent,
  detectConflicts,
  calculateBusinessDays,
} from '@/lib/hr/helpers'

describe('HR Helper Functions', () => {
  describe('generateCaseId', () => {
    test('generates ID with correct format', async () => {
      const caseId = await generateCaseId()

      expect(caseId).toMatch(/^HR-\d{4}-\d{6}$/)
    })

    test('includes current year', async () => {
      const caseId = await generateCaseId()
      const year = new Date().getFullYear()

      expect(caseId).toContain(`HR-${year}-`)
    })
  })

  describe('calculateSLA', () => {
    test('calculates correct SLA for payroll category', () => {
      const createdAt = new Date('2025-01-01T09:00:00Z')
      const sla = calculateSLA(createdAt, 'payroll')

      expect(sla.firstResponseDue).toEqual(
        new Date('2025-01-01T13:00:00Z') // +4 hours
      )
      expect(sla.resolutionDue).toEqual(
        new Date('2025-01-03T09:00:00Z') // +2 days
      )
      expect(sla.slaHoursRemaining).toBeGreaterThan(0)
    })

    test('calculates correct SLA for equipment category', () => {
      const createdAt = new Date('2025-01-01T09:00:00Z')
      const sla = calculateSLA(createdAt, 'equipment')

      expect(sla.firstResponseDue).toEqual(
        new Date('2025-01-02T09:00:00Z') // +24 hours
      )
      expect(sla.resolutionDue).toEqual(
        new Date('2025-01-08T09:00:00Z') // +7 days
      )
    })
  })

  describe('calculateCoveragePercent', () => {
    test('returns 100% with no absences', () => {
      const coverage = calculateCoveragePercent(
        10, // teamSize
        [], // no absences
        new Date('2025-01-15')
      )

      expect(coverage).toBe(100)
    })

    test('calculates correct percentage with absences', () => {
      const absences = [
        {
          startDate: new Date('2025-01-14'),
          endDate: new Date('2025-01-16'),
          employeeId: 'emp1',
        },
        {
          startDate: new Date('2025-01-15'),
          endDate: new Date('2025-01-17'),
          employeeId: 'emp2',
        },
      ]

      const coverage = calculateCoveragePercent(
        10,
        absences,
        new Date('2025-01-15')
      )

      expect(coverage).toBe(80) // 2 out of 10 absent
    })
  })

  describe('detectConflicts', () => {
    test('detects overlapping absence', () => {
      const existingAbsences = [
        {
          startDate: new Date('2025-01-10'),
          endDate: new Date('2025-01-15'),
          employeeId: 'emp1',
        },
      ]

      const result = detectConflicts(
        new Date('2025-01-12'),
        new Date('2025-01-14'),
        existingAbsences
      )

      expect(result.hasConflict).toBe(true)
      expect(result.conflictsWith).toContain('emp1')
    })

    test('returns no conflict for non-overlapping dates', () => {
      const existingAbsences = [
        {
          startDate: new Date('2025-01-10'),
          endDate: new Date('2025-01-15'),
          employeeId: 'emp1',
        },
      ]

      const result = detectConflicts(
        new Date('2025-01-20'),
        new Date('2025-01-25'),
        existingAbsences
      )

      expect(result.hasConflict).toBe(false)
      expect(result.conflictsWith).toHaveLength(0)
    })
  })

  describe('calculateBusinessDays', () => {
    test('excludes weekends', () => {
      // Monday to Friday (5 business days)
      const days = calculateBusinessDays(
        new Date('2025-01-06'), // Monday
        new Date('2025-01-10')  // Friday
      )

      expect(days).toBe(5)
    })

    test('counts only weekdays in range with weekend', () => {
      // Monday to next Monday (5 business days, excludes Sat/Sun)
      const days = calculateBusinessDays(
        new Date('2025-01-06'),  // Monday
        new Date('2025-01-13')   // Next Monday
      )

      expect(days).toBe(6) // 5 days first week + 1 day second week
    })
  })
})
```

### Additional Test Files to Create

- `tests/unit/db/benefits-queries.test.ts` - Benefits plans and enrollments
- `tests/unit/db/hr-case-queries.test.ts` - HR cases and updates
- `tests/unit/db/team-availability-queries.test.ts` - Absences and leave requests
- `tests/unit/hr/sla-config.test.ts` - SLA configuration validation

### Success Criteria
- ✅ All database query functions have unit tests
- ✅ All helper functions have unit tests
- ✅ Edge cases and error conditions tested
- ✅ 80%+ code coverage for tested modules
- ✅ Tests run in under 30 seconds

### Estimated Time: 12-16 hours

---

## Phase 3: Integration Tests - tRPC & API Layer

### Objectives
- Test all tRPC procedures in `admin.hr.*` namespace
- Test authentication and authorization
- Test data validation with Zod schemas
- Test end-to-end data flow from API to database

### Tasks

#### 3.1 tRPC Test Utilities

**Create `tests/integration/helpers/trpc-caller.ts`:**
```typescript
import { appRouter } from '@/trpc/routers'
import { db } from '@/lib/db/client'

export function createCaller(userId: string, role: 'admin' | 'user' = 'admin') {
  return appRouter.createCaller({
    db,
    user: {
      id: userId,
      role,
    },
  })
}

export const adminCaller = createCaller('test-admin-id', 'admin')
export const userCaller = createCaller('test-user-id', 'user')
```

#### 3.2 Employee Management Tests

**Create `tests/integration/trpc/admin-hr-employees.test.ts`:**
```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import { adminCaller, userCaller } from '../helpers/trpc-caller'
import { resetTestDatabase } from '../../helpers/test-db'

describe('admin.hr.employees tRPC procedures', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  describe('list', () => {
    test('returns paginated employee list', async () => {
      const result = await adminCaller.admin.hr.employees.list({
        limit: 10,
        offset: 0,
      })

      expect(result.total).toBe(5)
      expect(result.items).toHaveLength(5)
      expect(result.items[0]).toHaveProperty('employeeId')
      expect(result.items[0]).toHaveProperty('fullName')
    })

    test('supports search by fullName', async () => {
      const result = await adminCaller.admin.hr.employees.list({
        searchField: 'fullName',
        searchValue: 'John',
      })

      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items[0].fullName).toContain('John')
    })

    test('requires admin role', async () => {
      await expect(
        userCaller.admin.hr.employees.list({})
      ).rejects.toThrow('FORBIDDEN')
    })
  })

  describe('create', () => {
    test('creates new employee with valid data', async () => {
      const newEmployee = {
        employeeId: 'EMP999',
        fullName: 'New Employee',
        email: 'new@example.com',
        phoneNumber: '555-0199',
        dateOfBirth: new Date('1990-01-01'),
        address: '123 Test St',
        city: 'Test City',
        state: 'CA',
        zipCode: '12345',
        country: 'USA',
        jobTitle: 'Engineer',
        department: 'Engineering',
        hireDate: new Date('2025-01-01'),
        employmentStatus: 'active' as const,
        workMode: 'remote' as const,
        officeLocation: 'Remote',
      }

      const result = await adminCaller.admin.hr.employees.create(newEmployee)

      expect(result.success).toBe(true)
      expect(result.data.employeeId).toBe('EMP999')
      expect(result.data.id).toBeDefined()
    })

    test('validates required fields', async () => {
      await expect(
        adminCaller.admin.hr.employees.create({
          employeeId: 'EMP999',
          // missing required fields
        } as any)
      ).rejects.toThrow()
    })

    test('prevents duplicate employeeId', async () => {
      await expect(
        adminCaller.admin.hr.employees.create({
          employeeId: 'EMP001', // already exists
          fullName: 'Duplicate',
          email: 'dupe@example.com',
          // ... other fields
        } as any)
      ).rejects.toThrow()
    })
  })

  describe('update', () => {
    test('updates employee fields', async () => {
      const employees = await adminCaller.admin.hr.employees.list({})
      const employee = employees.items[0]

      const result = await adminCaller.admin.hr.employees.update({
        id: employee.id,
        data: {
          jobTitle: 'Senior Engineer',
          department: 'Engineering',
        },
      })

      expect(result.success).toBe(true)
      expect(result.data.jobTitle).toBe('Senior Engineer')
    })

    test('returns error for non-existent employee', async () => {
      await expect(
        adminCaller.admin.hr.employees.update({
          id: 'non-existent-uuid',
          data: { jobTitle: 'Test' },
        })
      ).rejects.toThrow()
    })
  })
})
```

#### 3.3 Leave Balance Tests

**Create `tests/integration/trpc/admin-hr-leave-balances.test.ts`:**
```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import { adminCaller } from '../helpers/trpc-caller'
import { resetTestDatabase } from '../../helpers/test-db'

describe('admin.hr.leaveBalances tRPC procedures', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  describe('list', () => {
    test('returns all leave balances', async () => {
      const result = await adminCaller.admin.hr.leaveBalances.list({})

      expect(result.total).toBeGreaterThan(0)
      expect(result.items[0]).toHaveProperty('leaveType')
      expect(result.items[0]).toHaveProperty('currentBalance')
      expect(result.items[0]).toHaveProperty('employee')
    })

    test('filters by employee', async () => {
      const employees = await adminCaller.admin.hr.employees.list({})
      const employee = employees.items[0]

      const result = await adminCaller.admin.hr.leaveBalances.list({
        employeeId: employee.id,
      })

      expect(result.items.every(
        b => b.employeeId === employee.id
      )).toBe(true)
    })

    test('filters by leave type', async () => {
      const result = await adminCaller.admin.hr.leaveBalances.list({
        leaveType: 'vacation',
      })

      expect(result.items.every(
        b => b.leaveType === 'vacation'
      )).toBe(true)
    })
  })

  describe('update', () => {
    test('updates balance values', async () => {
      const balances = await adminCaller.admin.hr.leaveBalances.list({})
      const balance = balances.items[0]

      const result = await adminCaller.admin.hr.leaveBalances.update({
        employeeId: balance.employeeId,
        leaveType: balance.leaveType,
        data: {
          currentBalance: '30.0',
          accruedYTD: '25.0',
          usedYTD: '5.0',
        },
      })

      expect(result.success).toBe(true)
      expect(result.data.currentBalance).toBe('30.0')
    })

    test('enforces non-negative balance constraint', async () => {
      const balances = await adminCaller.admin.hr.leaveBalances.list({})
      const balance = balances.items[0]

      await expect(
        adminCaller.admin.hr.leaveBalances.update({
          employeeId: balance.employeeId,
          leaveType: balance.leaveType,
          data: {
            currentBalance: '-10.0',
          },
        })
      ).rejects.toThrow()
    })
  })
})
```

#### 3.4 HR Cases Tests

**Create `tests/integration/trpc/admin-hr-cases.test.ts`:**
```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import { adminCaller } from '../helpers/trpc-caller'
import { resetTestDatabase } from '../../helpers/test-db'

describe('admin.hr.cases tRPC procedures', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  describe('create', () => {
    test('creates case with SLA calculation', async () => {
      const employees = await adminCaller.admin.hr.employees.list({})
      const employee = employees.items[0]

      const result = await adminCaller.admin.hr.cases.create({
        title: 'Test Case',
        description: 'Test description',
        category: 'payroll',
        priority: 'high',
        submittedBy: employee.id,
      })

      expect(result.success).toBe(true)
      expect(result.data.caseId).toMatch(/^HR-\d{4}-\d{6}$/)
      expect(result.data.status).toBe('open')
      expect(result.data.assignedTeam).toBe('Payroll Services')
      expect(result.data.firstResponseDue).toBeDefined()
      expect(result.data.resolutionDue).toBeDefined()
    })

    test('auto-assigns team based on category', async () => {
      const employees = await adminCaller.admin.hr.employees.list({})
      const employee = employees.items[0]

      const equipmentCase = await adminCaller.admin.hr.cases.create({
        title: 'Need new laptop',
        description: 'Laptop request',
        category: 'equipment',
        priority: 'medium',
        submittedBy: employee.id,
      })

      expect(equipmentCase.data.assignedTeam).toBe('IT & Facilities')
    })
  })

  describe('addUpdate', () => {
    test('adds update to case timeline', async () => {
      const cases = await adminCaller.admin.hr.cases.list({})
      const hrCase = cases.items[0]

      const result = await adminCaller.admin.hr.cases.addUpdate({
        caseId: hrCase.id,
        message: 'Update from test',
        updateType: 'hr_response',
        visibility: 'public',
      })

      expect(result.success).toBe(true)

      // Verify update was added
      const updated = await adminCaller.admin.hr.cases.get({
        id: hrCase.id,
      })

      const latestUpdate = updated.updates[updated.updates.length - 1]
      expect(latestUpdate.message).toBe('Update from test')
      expect(latestUpdate.updateType).toBe('hr_response')
    })
  })
})
```

### Additional Test Files to Create

- `tests/integration/trpc/admin-hr-benefits.test.ts` - Benefits plans and enrollments
- `tests/integration/trpc/admin-hr-availability.test.ts` - Absences and leave requests
- `tests/integration/trpc/admin-hr-reset.test.ts` - Reset to defaults functionality

### Success Criteria
- ✅ All tRPC procedures have integration tests
- ✅ Authorization checks verified
- ✅ Data validation tested
- ✅ Error handling covered
- ✅ Tests run with real database
- ✅ 100% coverage for tRPC procedures

### Estimated Time: 16-20 hours

---

## Phase 4: E2E Tests - Admin Dashboard

### Objectives
- Test complete admin workflows with real browser interactions
- Test all CRUD operations for HR entities
- Test complex interactions (dialogs, forms, file uploads)
- Test data persistence and UI state consistency

### Tasks

#### 4.1 Authentication Setup

**Create `tests/e2e/auth.setup.ts`:**
```typescript
import { test as setup, expect } from '@playwright/test'

const authFile = 'playwright/.auth/admin.json'

setup('authenticate as admin', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login')

  // Fill in admin credentials
  await page.getByLabel('Email').fill('admin@example.com')
  await page.getByLabel('Password').fill('admin-password')

  // Click sign in
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait for redirect to dashboard
  await page.waitForURL('/')

  // Verify successful login
  await expect(
    page.getByRole('button', { name: /profile/i })
  ).toBeVisible()

  // Save authentication state
  await page.context().storageState({ path: authFile })
})
```

#### 4.2 Page Object Models

**Create `tests/e2e/page-objects/hr-data-dashboard.page.ts`:**
```typescript
import { Page, Locator, expect } from '@playwright/test'

export class HRDataDashboardPage {
  readonly page: Page
  readonly employeesCard: Locator
  readonly leaveBalancesCard: Locator
  readonly benefitsCard: Locator
  readonly casesCard: Locator
  readonly availabilityCard: Locator
  readonly resetButton: Locator

  constructor(page: Page) {
    this.page = page
    this.employeesCard = page.getByRole('link', { name: /employee directory/i })
    this.leaveBalancesCard = page.getByRole('link', { name: /leave balances/i })
    this.benefitsCard = page.getByRole('link', { name: /benefits/i })
    this.casesCard = page.getByRole('link', { name: /hr cases/i })
    this.availabilityCard = page.getByRole('link', { name: /team availability/i })
    this.resetButton = page.getByRole('button', { name: /reset to defaults/i })
  }

  async goto() {
    await this.page.goto('/admin/hr-data')
    await this.waitForLoad()
  }

  async waitForLoad() {
    await expect(this.page.getByRole('heading', { name: /hr data/i })).toBeVisible()
  }

  async navigateToEmployees() {
    await this.employeesCard.click()
    await this.page.waitForURL('/admin/hr-data/employees')
  }

  async navigateToLeaveBalances() {
    await this.leaveBalancesCard.click()
    await this.page.waitForURL('/admin/hr-data/leave-balances')
  }

  async resetToDefaults() {
    await this.resetButton.click()

    // Confirm dialog
    await this.page.getByRole('button', { name: /reset to defaults/i }).click()

    // Wait for success message
    await expect(
      this.page.getByText(/reset.*successfully/i)
    ).toBeVisible()
  }
}
```

**Create `tests/e2e/page-objects/employee-list.page.ts`:**
```typescript
import { Page, Locator, expect } from '@playwright/test'

export class EmployeeListPage {
  readonly page: Page
  readonly addButton: Locator
  readonly searchInput: Locator
  readonly table: Locator

  constructor(page: Page) {
    this.page = page
    this.addButton = page.getByRole('button', { name: /add employee/i })
    this.searchInput = page.getByPlaceholder(/search/i)
    this.table = page.getByRole('table')
  }

  async goto() {
    await this.page.goto('/admin/hr-data/employees')
    await this.waitForLoad()
  }

  async waitForLoad() {
    await expect(this.table).toBeVisible()
  }

  async searchEmployee(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(300) // debounce
  }

  async clickAddEmployee() {
    await this.addButton.click()
    await expect(
      this.page.getByRole('dialog', { name: /create employee/i })
    ).toBeVisible()
  }

  async getEmployeeRow(employeeId: string) {
    return this.page.getByRole('row', { name: new RegExp(employeeId) })
  }

  async editEmployee(employeeId: string) {
    const row = await this.getEmployeeRow(employeeId)
    await row.getByRole('button', { name: /actions/i }).click()
    await this.page.getByRole('menuitem', { name: /edit/i }).click()

    await expect(
      this.page.getByRole('dialog', { name: /edit employee/i })
    ).toBeVisible()
  }

  async deleteEmployee(employeeId: string) {
    const row = await this.getEmployeeRow(employeeId)
    await row.getByRole('button', { name: /actions/i }).click()
    await this.page.getByRole('menuitem', { name: /delete/i }).click()

    // Confirm deletion
    await this.page.getByRole('button', { name: /delete/i }).click()
  }
}
```

#### 4.3 Employee Management Tests

**Create `tests/e2e/admin/employee-management.spec.ts`:**
```typescript
import { test, expect } from '@playwright/test'
import { HRDataDashboardPage } from '../page-objects/hr-data-dashboard.page'
import { EmployeeListPage } from '../page-objects/employee-list.page'

test.describe('Employee Management', () => {
  test('admin can view employee list', async ({ page }) => {
    const employeePage = new EmployeeListPage(page)
    await employeePage.goto()

    // Verify table displays employees
    await expect(employeePage.table).toBeVisible()

    // Verify employee IDs are visible
    await expect(page.getByText('EMP001')).toBeVisible()
  })

  test('admin can search employees', async ({ page }) => {
    const employeePage = new EmployeeListPage(page)
    await employeePage.goto()

    // Search for employee
    await employeePage.searchEmployee('John')

    // Verify filtered results
    await expect(page.getByText('John')).toBeVisible()

    // Verify other employees not shown
    const rows = page.getByRole('row')
    const count = await rows.count()
    expect(count).toBeLessThan(6) // Less than full list
  })

  test('admin can create new employee', async ({ page }) => {
    const employeePage = new EmployeeListPage(page)
    await employeePage.goto()

    // Click add employee
    await employeePage.clickAddEmployee()

    // Fill in form
    await page.getByLabel('Employee ID').fill('EMP999')
    await page.getByLabel('Full Name').fill('Test Employee')
    await page.getByLabel('Email').fill('test999@example.com')
    await page.getByLabel('Phone Number').fill('555-0199')
    await page.getByLabel('Job Title').fill('Software Engineer')
    await page.getByLabel('Department').selectOption('Engineering')

    // Select employment status
    await page.getByLabel('Employment Status').selectOption('active')
    await page.getByLabel('Work Mode').selectOption('remote')

    // Submit form
    await page.getByRole('button', { name: /create/i }).click()

    // Verify success message
    await expect(
      page.getByText(/employee created successfully/i)
    ).toBeVisible()

    // Verify employee appears in list
    await expect(page.getByText('EMP999')).toBeVisible()
    await expect(page.getByText('Test Employee')).toBeVisible()
  })

  test('admin can edit employee', async ({ page }) => {
    const employeePage = new EmployeeListPage(page)
    await employeePage.goto()

    // Edit first employee
    await employeePage.editEmployee('EMP001')

    // Update job title
    await page.getByLabel('Job Title').fill('Senior Backend Developer')

    // Save changes
    await page.getByRole('button', { name: /save/i }).click()

    // Verify success message
    await expect(
      page.getByText(/employee updated successfully/i)
    ).toBeVisible()

    // Verify updated value in table
    await expect(page.getByText('Senior Backend Developer')).toBeVisible()
  })

  test('admin can delete employee', async ({ page }) => {
    const employeePage = new EmployeeListPage(page)
    await employeePage.goto()

    // Create a test employee first
    await employeePage.clickAddEmployee()
    await page.getByLabel('Employee ID').fill('EMP998')
    await page.getByLabel('Full Name').fill('To Be Deleted')
    await page.getByLabel('Email').fill('delete@example.com')
    // ... fill other required fields
    await page.getByRole('button', { name: /create/i }).click()

    await expect(page.getByText('EMP998')).toBeVisible()

    // Now delete it
    await employeePage.deleteEmployee('EMP998')

    // Verify success message
    await expect(
      page.getByText(/employee deleted successfully/i)
    ).toBeVisible()

    // Verify employee removed from list
    await expect(page.getByText('EMP998')).not.toBeVisible()
  })

  test('form validates required fields', async ({ page }) => {
    const employeePage = new EmployeeListPage(page)
    await employeePage.goto()

    await employeePage.clickAddEmployee()

    // Try to submit without filling fields
    await page.getByRole('button', { name: /create/i }).click()

    // Verify validation errors
    await expect(page.getByText(/required/i).first()).toBeVisible()

    // Dialog should still be open
    await expect(
      page.getByRole('dialog', { name: /create employee/i })
    ).toBeVisible()
  })
})
```

#### 4.4 Leave Balance Management Tests

**Create `tests/e2e/admin/leave-balance-management.spec.ts`:**
```typescript
import { test, expect } from '@playwright/test'

test.describe('Leave Balance Management', () => {
  test('admin can view leave balances', async ({ page }) => {
    await page.goto('/admin/hr-data/leave-balances')

    // Verify table displays balances
    await expect(page.getByRole('table')).toBeVisible()

    // Verify balance types are shown
    await expect(page.getByText('Vacation')).toBeVisible()
    await expect(page.getByText('Sick')).toBeVisible()
    await expect(page.getByText('Personal')).toBeVisible()
  })

  test('admin can edit leave balance', async ({ page }) => {
    await page.goto('/admin/hr-data/leave-balances')

    // Click edit on first balance
    await page.getByRole('button', { name: /actions/i }).first().click()
    await page.getByRole('menuitem', { name: /edit/i }).click()

    // Wait for dialog
    await expect(
      page.getByRole('dialog', { name: /edit leave balance/i })
    ).toBeVisible()

    // Update current balance
    const balanceInput = page.getByLabel('Current Balance')
    await balanceInput.clear()
    await balanceInput.fill('25.5')

    // Save changes
    await page.getByRole('button', { name: /save/i }).click()

    // Verify success message
    await expect(
      page.getByText(/balance updated successfully/i)
    ).toBeVisible()

    // Verify updated value in table
    await expect(page.getByText('25.5')).toBeVisible()
  })

  test('admin can add blackout date', async ({ page }) => {
    await page.goto('/admin/hr-data/leave-balances')

    // Scroll to blackout dates section
    await page.getByRole('heading', { name: /blackout dates/i }).scrollIntoViewIfNeeded()

    // Click add button
    await page.getByRole('button', { name: /add blackout date/i }).click()

    // Fill in form
    await page.getByLabel('Start Date').fill('2025-12-24')
    await page.getByLabel('End Date').fill('2025-12-25')
    await page.getByLabel('Reason').fill('Christmas Holiday')
    await page.getByLabel('Department').selectOption('Engineering')

    // Submit
    await page.getByRole('button', { name: /add/i }).click()

    // Verify success
    await expect(
      page.getByText(/blackout date added/i)
    ).toBeVisible()

    // Verify appears in list
    await expect(page.getByText('Christmas Holiday')).toBeVisible()
  })
})
```

#### 4.5 HR Case Management Tests

**Create `tests/e2e/admin/hr-case-management.spec.ts`:**
```typescript
import { test, expect } from '@playwright/test'

test.describe('HR Case Management', () => {
  test('admin can create new HR case', async ({ page }) => {
    await page.goto('/admin/hr-data/cases')

    // Click create case
    await page.getByRole('button', { name: /create case/i }).click()

    // Fill in form
    await page.getByLabel('Title').fill('Test Case for E2E')
    await page.getByLabel('Description').fill('This is a test case description')
    await page.getByLabel('Category').selectOption('equipment')
    await page.getByLabel('Priority').selectOption('medium')

    // Select submitter
    await page.getByLabel('Submitted By').click()
    await page.getByRole('option', { name: /John Doe/i }).click()

    // Submit
    await page.getByRole('button', { name: /create/i }).click()

    // Verify success
    await expect(
      page.getByText(/case created successfully/i)
    ).toBeVisible()

    // Verify case appears with generated ID
    await expect(page.getByText(/HR-\d{4}-\d{6}/)).toBeVisible()

    // Verify assigned team
    await expect(page.getByText('IT & Facilities')).toBeVisible()
  })

  test('admin can view case timeline', async ({ page }) => {
    await page.goto('/admin/hr-data/cases')

    // Click on first case
    await page.getByRole('button', { name: /actions/i }).first().click()
    await page.getByRole('menuitem', { name: /view details/i }).click()

    // Verify dialog opens
    await expect(
      page.getByRole('dialog', { name: /case details/i })
    ).toBeVisible()

    // Verify timeline is visible
    await expect(page.getByText(/timeline/i)).toBeVisible()

    // Verify case updates are shown
    await expect(page.getByText(/case opened/i)).toBeVisible()
  })

  test('admin can add case update', async ({ page }) => {
    await page.goto('/admin/hr-data/cases')

    // Open case details
    await page.getByRole('button', { name: /actions/i }).first().click()
    await page.getByRole('menuitem', { name: /view details/i }).click()

    // Add update
    await page.getByLabel('Message').fill('Investigating the issue')
    await page.getByLabel('Update Type').selectOption('hr_response')
    await page.getByRole('button', { name: /add update/i }).click()

    // Verify update appears in timeline
    await expect(page.getByText('Investigating the issue')).toBeVisible()
  })

  test('admin can update case status', async ({ page }) => {
    await page.goto('/admin/hr-data/cases')

    // Edit case
    await page.getByRole('button', { name: /actions/i }).first().click()
    await page.getByRole('menuitem', { name: /edit/i }).click()

    // Update status
    await page.getByLabel('Status').selectOption('in_progress')

    // Save
    await page.getByRole('button', { name: /save/i }).click()

    // Verify success
    await expect(
      page.getByText(/case updated successfully/i)
    ).toBeVisible()

    // Verify status badge updated
    await expect(page.getByText('In Progress')).toBeVisible()
  })
})
```

### Additional Test Files to Create

- `tests/e2e/admin/benefits-management.spec.ts` - Benefits plans and enrollments
- `tests/e2e/admin/team-availability.spec.ts` - Absences and leave requests
- `tests/e2e/admin/reset-to-defaults.spec.ts` - Reset functionality

### Success Criteria
- ✅ All admin CRUD workflows tested
- ✅ Page Object Model pattern implemented
- ✅ Tests run independently and can be parallelized
- ✅ Screenshots/videos captured on failures
- ✅ Tests pass consistently (< 5% flakiness)

### Estimated Time: 20-24 hours

---

## Phase 5: E2E Tests - AI Agent HR Tools

### Objectives
- Test complete user workflows with AI agent
- Mock AI model responses for deterministic testing
- Test tool invocation and result display
- Test streaming responses and loading states

### Tasks

#### 5.1 MSW Setup for AI Testing

**Update Playwright config to use MSW:**
```typescript
// playwright.config.ts
import { defineConfig } from 'next/experimental/testmode/playwright'

export default defineConfig({
  // ... existing config
  use: {
    // Enable MSW
    mswHandlers: true,
  },
})
```

**Create `tests/e2e/mocks/ai-handlers.ts`:**
```typescript
import { http, HttpResponse } from 'msw'

export const aiHandlers = [
  // Mock chat API (Vercel AI SDK)
  http.post('*/api/chat', async ({ request }) => {
    const body = await request.json()
    const lastMessage = body.messages[body.messages.length - 1]

    // Detect which tool should be called based on message content
    let toolCall = null
    let toolResult = null

    if (lastMessage.content.toLowerCase().includes('leave balance')) {
      toolCall = {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'leaveBalance',
          arguments: JSON.stringify({
            query: lastMessage.content,
            leaveType: 'vacation',
          }),
        },
      }

      toolResult = {
        balances: [
          {
            leaveType: 'vacation',
            currentBalance: 18.5,
            accruedYTD: 20.0,
            usedYTD: 1.5,
            accrualRate: 1.67,
            accrualSchedule: 'monthly',
            carryoverLimit: 5,
            projectedYearEnd: 20.0,
          },
        ],
        blackoutDates: [],
        policies: {
          minNotice: 3,
          maxConsecutive: 10,
          carryoverRules: 'Up to 5 days',
        },
      }
    }

    // Return streaming response
    return new Response(
      new ReadableStream({
        start(controller) {
          // Send tool call
          if (toolCall) {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ tool_call: toolCall })}\n\n`
              )
            )

            // Send tool result
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  tool_result: {
                    tool_call_id: toolCall.id,
                    output: toolResult
                  }
                })}\n\n`
              )
            )
          }

          // Send AI response
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                content: 'Based on the data, you have 18.5 vacation days remaining.'
              })}\n\n`
            )
          )

          controller.close()
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
        },
      }
    )
  }),
]
```

#### 5.2 Leave Balance Tool Tests

**Create `tests/e2e/ai-tools/leave-balance-tool.spec.ts`:**
```typescript
import {
  test,
  expect,
  http,
  HttpResponse,
} from 'next/experimental/testmode/playwright/msw'

test.use({
  mswHandlers: [
    [
      http.post('*/api/chat', async () => {
        // Mock leave balance tool response
        return HttpResponse.json({
          id: 'msg-1',
          role: 'assistant',
          content: 'You have 18.5 vacation days remaining.',
          tool_calls: [
            {
              id: 'call_1',
              name: 'leaveBalance',
              arguments: {
                query: 'vacation days',
                leaveType: 'vacation',
              },
              result: {
                balances: [
                  {
                    leaveType: 'vacation',
                    currentBalance: 18.5,
                    accruedYTD: 20.0,
                    usedYTD: 1.5,
                  },
                ],
              },
            },
          ],
        })
      }),
    ],
    { scope: 'test' },
  ],
})

test('user can check vacation balance', async ({ page }) => {
  await page.goto('/chat')

  // Type question
  await page.getByLabel('Message').fill('How many vacation days do I have left?')
  await page.getByRole('button', { name: /send/i }).click()

  // Verify loading state
  await expect(
    page.getByText(/checking leave balances/i)
  ).toBeVisible()

  // Wait for tool result
  await expect(
    page.getByTestId('leave-balance-result')
  ).toBeVisible({ timeout: 10000 })

  // Verify balance is displayed
  await expect(page.getByText('18.5')).toBeVisible()
  await expect(page.getByText('Vacation')).toBeVisible()

  // Verify AI response
  await expect(
    page.getByText(/18.5 vacation days remaining/i)
  ).toBeVisible()
})

test('user can check specific leave type', async ({ page }) => {
  await page.goto('/chat')

  // Ask about sick days
  await page.getByLabel('Message').fill('How many sick days do I have?')
  await page.getByRole('button', { name: /send/i }).click()

  // Wait for result
  await expect(
    page.getByTestId('leave-balance-result')
  ).toBeVisible()

  // Verify sick leave is shown
  await expect(page.getByText('Sick')).toBeVisible()
})

test('displays blackout dates when present', async ({ page }) => {
  await page.goto('/chat')

  await page.getByLabel('Message').fill('When are the blackout dates?')
  await page.getByRole('button', { name: /send/i }).click()

  // Wait for result
  await expect(
    page.getByTestId('leave-balance-result')
  ).toBeVisible()

  // Verify blackout dates section
  await expect(page.getByText(/blackout dates/i)).toBeVisible()
})
```

#### 5.3 People Search Tool Tests

**Create `tests/e2e/ai-tools/people-search-tool.spec.ts`:**
```typescript
import { test, expect, http, HttpResponse } from 'next/experimental/testmode/playwright/msw'

test.use({
  mswHandlers: [
    [
      http.post('*/api/chat', async ({ request }) => {
        return HttpResponse.json({
          id: 'msg-1',
          role: 'assistant',
          content: 'I found information about Michael Chen.',
          tool_calls: [
            {
              id: 'call_1',
              name: 'peopleSearch',
              result: {
                results: [
                  {
                    employeeId: 'EMP200',
                    fullName: 'Michael Chen',
                    email: 'michael.chen@example.com',
                    jobTitle: 'Senior Backend Developer',
                    department: 'Engineering',
                    employmentStatus: 'active',
                  },
                ],
                totalResults: 1,
              },
            },
          ],
        })
      }),
    ],
    { scope: 'test' },
  ],
})

test('user can search for employee by name', async ({ page }) => {
  await page.goto('/chat')

  // Search for employee
  await page.getByLabel('Message').fill('Who is Michael Chen?')
  await page.getByRole('button', { name: /send/i }).click()

  // Wait for result
  await expect(
    page.getByTestId('people-search-result')
  ).toBeVisible()

  // Verify employee info displayed
  await expect(page.getByText('Michael Chen')).toBeVisible()
  await expect(page.getByText('michael.chen@example.com')).toBeVisible()
  await expect(page.getByText('Senior Backend Developer')).toBeVisible()
  await expect(page.getByText('Engineering')).toBeVisible()
})

test('displays org chart when requested', async ({ page }) => {
  await page.goto('/chat')

  await page.getByLabel('Message').fill('Show me Michael Chen\'s team')
  await page.getByRole('button', { name: /send/i }).click()

  await expect(
    page.getByTestId('people-search-result')
  ).toBeVisible()

  // Verify org chart section
  await expect(page.getByText(/organizational chart/i)).toBeVisible()
  await expect(page.getByText(/manager/i)).toBeVisible()
})
```

#### 5.4 HR Case Tool Tests

**Create `tests/e2e/ai-tools/hr-case-tool.spec.ts`:**
```typescript
import { test, expect, http, HttpResponse } from 'next/experimental/testmode/playwright/msw'

test('user can create HR case via chat', async ({ page }) => {
  await page.goto('/chat')

  // Request to create case
  await page.getByLabel('Message').fill(
    'I need help with my payroll. My last paycheck was incorrect.'
  )
  await page.getByRole('button', { name: /send/i }).click()

  // Wait for case creation result
  await expect(
    page.getByTestId('hr-case-result')
  ).toBeVisible()

  // Verify case was created
  await expect(page.getByText(/case created/i)).toBeVisible()
  await expect(page.getByText(/HR-\d{4}-\d{6}/)).toBeVisible()

  // Verify category and team
  await expect(page.getByText('Payroll')).toBeVisible()
  await expect(page.getByText('Payroll Services')).toBeVisible()
})

test('user can check case status', async ({ page }) => {
  await page.goto('/chat')

  await page.getByLabel('Message').fill('What is the status of case HR-2025-001234?')
  await page.getByRole('button', { name: /send/i }).click()

  await expect(
    page.getByTestId('hr-case-result')
  ).toBeVisible()

  // Verify case details shown
  await expect(page.getByText('HR-2025-001234')).toBeVisible()
  await expect(page.getByText(/status/i)).toBeVisible()

  // Verify timeline
  await expect(page.getByText(/timeline/i)).toBeVisible()
})

test('displays SLA status', async ({ page }) => {
  await page.goto('/chat')

  await page.getByLabel('Message').fill('Show me my open HR cases')
  await page.getByRole('button', { name: /send/i }).click()

  await expect(
    page.getByTestId('hr-case-result')
  ).toBeVisible()

  // Verify SLA indicators
  await expect(
    page.locator('[data-testid="sla-status"]')
  ).toBeVisible()
})
```

### Additional Test Files to Create

- `tests/e2e/ai-tools/benefits-info-tool.spec.ts` - Benefits queries
- `tests/e2e/ai-tools/team-availability-tool.spec.ts` - Team availability checks
- `tests/e2e/ai-tools/multi-tool-conversation.spec.ts` - Test multiple tools in one conversation

### Success Criteria
- ✅ All 5 HR tools tested via chat interface
- ✅ Tool invocations mocked deterministically
- ✅ Loading states and streaming verified
- ✅ Result components render correctly
- ✅ Error states handled gracefully

### Estimated Time: 16-20 hours

---

## Phase 6: CI/CD Integration & Test Automation

### Objectives
- Integrate tests into CI/CD pipeline
- Set up automated test runs on PR and main branch
- Configure test reporting and artifact storage
- Implement test database for CI environment
- Set up test result notifications

### Tasks

#### 6.1 GitHub Actions Workflow

**Create `.github/workflows/test.yml`:**
```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests

  integration-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: hr_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5433:5432

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5433/hr_test

      - name: Run integration tests
        run: npm run test:integration
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5433/hr_test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-results
          path: test-results/
          retention-days: 30

  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: hr_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5433:5432

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium

      - name: Run database migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5433/hr_test

      - name: Build Next.js app
        run: npm run build
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5433/hr_test

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: 'true'
          DATABASE_URL: postgresql://postgres:postgres@localhost:5433/hr_test
          PLAYWRIGHT_TEST_BASE_URL: http://localhost:3000

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: test-results/
          retention-days: 30

  test-summary:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests, e2e-tests]
    if: always()

    steps:
      - name: Generate test summary
        run: |
          echo "## Test Results Summary" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "- Unit Tests: ${{ needs.unit-tests.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- Integration Tests: ${{ needs.integration-tests.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- E2E Tests: ${{ needs.e2e-tests.result }}" >> $GITHUB_STEP_SUMMARY
```

#### 6.2 Sharded E2E Tests (Optional Performance Optimization)

**Create `.github/workflows/e2e-sharded.yml`:**
```yaml
name: E2E Tests (Sharded)

on:
  push:
    branches: [main]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: hr_test
        ports:
          - 5433:5432

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests (shard ${{ matrix.shard }}/4)
        run: npx playwright test --shard=${{ matrix.shard }}/4

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: blob-report-${{ matrix.shard }}
          path: blob-report
          retention-days: 1

  merge-reports:
    if: always()
    needs: e2e-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - name: Install dependencies
        run: npm ci

      - name: Download blob reports
        uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true

      - name: Merge into HTML Report
        run: npx playwright merge-reports --reporter html ./all-blob-reports

      - name: Upload HTML report
        uses: actions/upload-artifact@v4
        with:
          name: html-report
          path: playwright-report
          retention-days: 14
```

#### 6.3 Test Database Docker Compose

**Create `docker-compose.test.yml`:**
```yaml
version: '3.8'

services:
  test-db:
    image: postgres:16-alpine
    restart: always
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=hr_test
    ports:
      - '5433:5432'
    volumes:
      - test-db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  test-db-data:
    driver: local
```

**Add scripts to package.json:**
```json
{
  "scripts": {
    "docker:test-db:up": "docker-compose -f docker-compose.test.yml up -d",
    "docker:test-db:down": "docker-compose -f docker-compose.test.yml down",
    "docker:test-db:reset": "docker-compose -f docker-compose.test.yml down -v && docker-compose -f docker-compose.test.yml up -d"
  }
}
```

#### 6.4 Test Coverage Reporting

**Configure Codecov:**

Create `.codecov.yml`:
```yaml
coverage:
  status:
    project:
      default:
        target: 80%
        threshold: 2%
    patch:
      default:
        target: 70%

ignore:
  - "node_modules"
  - "tests"
  - "*.config.ts"
  - "*.config.js"
  - "components/ui/**"

comment:
  layout: "reach,diff,flags,files,footer"
  behavior: default
  require_changes: false
```

#### 6.5 Pre-commit Hooks

**Create `.husky/pre-commit`:**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run unit tests before commit
npm run test -- --run --reporter=verbose
```

**Create `.husky/pre-push`:**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run all tests before push
npm run test -- --run
npm run test:integration
```

### Success Criteria
- ✅ Tests run automatically on every PR
- ✅ Test results visible in PR checks
- ✅ Coverage reports uploaded to Codecov
- ✅ Artifacts (screenshots, videos, reports) stored
- ✅ Test database provisioned in CI
- ✅ E2E tests run against production build
- ✅ Notifications on test failures

### Estimated Time: 8-12 hours

---

## Summary

### Total Estimated Time: 76-98 hours (approximately 10-13 days)

### Phase Breakdown:
1. **Phase 1:** Test Infrastructure Setup - 4-6 hours
2. **Phase 2:** Unit Tests - Database Layer - 12-16 hours
3. **Phase 3:** Integration Tests - tRPC & API Layer - 16-20 hours
4. **Phase 4:** E2E Tests - Admin Dashboard - 20-24 hours
5. **Phase 5:** E2E Tests - AI Agent HR Tools - 16-20 hours
6. **Phase 6:** CI/CD Integration & Test Automation - 8-12 hours

### Expected Outcomes:
- ✅ Comprehensive test coverage (80%+ for unit tests)
- ✅ Automated test execution in CI/CD
- ✅ Reliable E2E tests with minimal flakiness
- ✅ Fast feedback loop for developers
- ✅ Confidence in deployments
- ✅ Regression prevention
- ✅ Documentation via test cases

### Key Technologies:
- **Vitest** - Unit and integration testing
- **Playwright** - E2E testing
- **MSW** - API mocking
- **PostgreSQL** - Test database
- **GitHub Actions** - CI/CD automation
- **Codecov** - Coverage reporting

### Maintenance Recommendations:
1. Review and update tests when features change
2. Monitor test execution times and optimize slow tests
3. Keep test data seeds up to date
4. Regularly review and refactor test code
5. Add tests for new features as they're developed
6. Monitor flaky tests and fix or quarantine them
7. Review coverage reports monthly

---

## Next Steps

1. **Review and approve this plan** with the team
2. **Set up test infrastructure** (Phase 1)
3. **Implement tests phase by phase** following the plan
4. **Integrate with CI/CD** (Phase 6)
5. **Establish testing culture** - make tests a requirement for all PRs

---

## Appendix: Useful Commands

```bash
# Unit tests
npm run test                    # Watch mode
npm run test -- --run           # Run once
npm run test:coverage           # With coverage
npm run test:ui                 # UI mode

# Integration tests
npm run test:integration        # Run integration tests

# E2E tests
npm run test:e2e                # Headless mode
npm run test:e2e:headed         # Headed mode
npm run test:e2e:ui             # UI mode
npx playwright test --debug     # Debug mode

# Test database
npm run docker:test-db:up       # Start test DB
npm run docker:test-db:down     # Stop test DB
npm run docker:test-db:reset    # Reset test DB

# Run all tests
npm run test:all                # Unit + Integration + E2E

# CI commands
npm run test -- --run --reporter=verbose
npm run test:integration
npm run test:e2e
```

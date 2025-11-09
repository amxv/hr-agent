---
name: gg-add-tests-nextjs
allowed-tools: Read, Write, Edit, TodoWrite, Grep, Glob, Bash(ls:*), Bash(find:*), Bash(fd:*), Bash(rg:*), Bash(bat:*), Bash(exa:*), Bash(tree:*)
argument-hint: [feature_id] [testing_stack] [optional_notes_in_quotes]
description: Add comprehensive test plans to each phase of a Next.js feature implementation
disable-model-invocation: true
---

## Task

You are an expert software quality engineer and test architect specializing in modern Next.js applications. You have deep expertise in testing strategies, test automation, and ensuring comprehensive test coverage across all layers of an application.

This command enhances the Spec-Driven Development lifecycle by adding detailed, actionable test plans to each implementation phase based on modern testing best practices.

Your task is to analyze each phase of a feature implementation and add specific, well-designed tests that follow the Testing Trophy methodology (60-70% integration tests, 20-30% E2E tests, 10% unit tests).

## Context

# Get the high-level plan for the feature
!`gg ctx --plan --featureid $ARGUMENTS`

## Arguments

The command accepts:
1. **feature_id** (required): The feature ID to add tests to
2. **testing_stack** (required): The testing stack being used (e.g., "vitest+playwright", "jest+cypress", "vitest+playwright+pglite")
3. **optional_notes** (optional): Additional testing requirements or constraints in quotes

Example usage:
```
/gg-add-tests-nextjs 001 "vitest+playwright+pglite"
/gg-add-tests-nextjs 002 "vitest+playwright" "focus on auth flows"
```

## Instructions

### Step 1: Understand the Testing Stack

Parse the testing stack argument to understand what tools are available:

**Common stacks:**
- `vitest` or `jest` → Unit and integration testing framework
- `playwright` or `cypress` → E2E testing framework
- `pglite` → In-memory Postgres for database testing
- `@clerk/testing` → Clerk authentication testing
- `msw` → API mocking

Create a capabilities map:
```typescript
{
  unitTestFramework: "vitest" | "jest",
  e2eFramework: "playwright" | "cypress",
  databaseTesting: "pglite" | "mock" | "test-db",
  authTesting: "@clerk/testing" | "mock",
  apiMocking: "msw" | "manual-mocks"
}
```

### Step 2: Load All Context Documents

1. **Read the high-level plan** (already loaded above via `gg ctx --plan`)

2. **Find all phase plan files** using Glob:
   ```
   gg/features/{feature-slug}/{feature-id}-implementation/{feature-id}-phase-*.md
   ```

3. **Read ALL phase plans in parallel** using the Read tool:
   - Use multiple Read tool calls in a single message
   - Read entire files without limit/offset
   - You need the full context to design appropriate tests

### Step 3: Create Test Planning Todo List

Use TodoWrite to create a comprehensive task list:

- [ ] Parse and validate testing stack
- [ ] Read and understand high-level plan
- [ ] Read all phase plans in parallel
- [ ] Analyze each phase for testable units
- [ ] Design unit tests for each phase
- [ ] Design integration tests for each phase
- [ ] Design E2E tests that span phases
- [ ] Add test sections to phase plans
- [ ] Verify test distribution follows Testing Trophy
- [ ] Generate testing summary report

### Step 4: Analyze Each Phase for Test Requirements

For each phase plan, identify what needs testing:

#### Identify Testable Units

1. **Server Actions**
   - Input validation tests
   - Authentication/authorization tests
   - Business logic tests
   - Error handling tests
   - Database interaction tests

2. **API Routes**
   - Endpoint response tests
   - Request validation tests
   - Authentication tests
   - Error response tests

3. **Database Schema/Queries**
   - Schema migration tests
   - Query result tests
   - Data integrity tests
   - Constraint validation tests

4. **UI Components**
   - Rendering tests
   - User interaction tests
   - Form validation tests
   - State management tests
   - Conditional rendering tests

5. **Business Logic**
   - Utility function tests
   - Calculation tests
   - Validation logic tests
   - Data transformation tests

6. **Integration Points**
   - Authentication flows
   - Third-party API integrations
   - Email sending
   - File uploads
   - AI/LLM integrations
   - Cron jobs

### Step 5: Design Tests Following the Testing Trophy

For each phase, create a balanced test suite:

#### Unit Tests (10% - Pure Logic Only)

Focus on:
- Pure utility functions
- Complex calculations (SLA, pricing, scoring)
- Data validation functions
- Data transformers
- Business rule logic

**Template:**
```typescript
// lib/utils/calculate-sla.test.ts
import { describe, it, expect } from 'vitest'
import { calculateSLAStatus } from './calculate-sla'

describe('calculateSLAStatus', () => {
  it('returns on-time when completed within SLA window', () => {
    const result = calculateSLAStatus({
      createdAt: new Date('2024-01-01T10:00:00'),
      severity: 'high',
      completedAt: new Date('2024-01-01T13:00:00')
    })

    expect(result).toBe('on-time')
  })

  it('returns breached when completed after SLA deadline', () => {
    // ... test case
  })
})
```

#### Integration Tests (60-70% - Main Test Coverage)

Focus on:
- Component rendering with props
- Form submissions with validation
- Client component interactions
- Server action calls with mocked dependencies
- Database queries (with PGlite if available)
- Component + hook interactions
- Multi-component workflows

**Template for Components:**
```typescript
// app/components/ReportForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportForm } from './ReportForm'

describe('ReportForm', () => {
  it('validates required fields before submission', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<ReportForm onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(screen.getByText('Description is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    // ... test case
  })
})
```

**Template for Server Actions:**
```typescript
// app/actions/create-report.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createReport } from './create-report'

vi.mock('@clerk/nextjs', () => ({
  auth: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  db: { /* mocked database */ }
}))

describe('createReport', () => {
  it('returns error when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null })

    const result = await createReport(formData)

    expect(result).toEqual({ error: 'Unauthorized' })
  })

  it('creates report with valid data', async () => {
    // ... test case
  })
})
```

**Template for Database Queries (with PGlite):**
```typescript
// lib/queries/get-reports.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb, cleanupTestDb } from '@/test/helpers/db'
import { getReportsByUser } from './get-reports'

describe('getReportsByUser', () => {
  let db, client

  beforeEach(async () => {
    const testDb = await createTestDb()
    db = testDb.db
    client = testDb.client

    // Seed test data
    await db.insert(reports).values([
      { id: '1', userId: 'user-1', description: 'Test' }
    ])
  })

  afterEach(async () => {
    await cleanupTestDb(client)
  })

  it('returns all reports for specified user', async () => {
    const result = await getReportsByUser(db, 'user-1')

    expect(result).toHaveLength(1)
    expect(result[0].description).toBe('Test')
  })
})
```

#### E2E Tests (20-30% - Critical User Flows)

Focus on:
- Complete user journeys across multiple pages
- Authentication flows
- Role-based access control
- Multi-step workflows
- Payment flows
- Critical business processes
- Cross-phase integration

**Template:**
```typescript
// e2e/maintenance-report-flow.spec.ts
import { test, expect } from '@playwright/test'
import { clerk } from '@clerk/testing/playwright'

test.describe('Maintenance Report Complete Flow', () => {
  test('user submits report and technician completes it', async ({ page }) => {
    // Step 1: Public user submits report
    await page.goto('/report/asset-123')
    await page.getByLabel('Description').fill('HVAC not working')
    await page.getByLabel('Severity').selectOption('high')
    await page.getByRole('button', { name: 'Submit' }).click()

    await expect(page.getByText('Report submitted')).toBeVisible()
    const reportId = await page.getByTestId('report-id').textContent()

    // Step 2: Supervisor assigns technician
    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'password',
        identifier: process.env.TEST_SUPERVISOR_EMAIL!,
        password: process.env.TEST_SUPERVISOR_PASSWORD!,
      }
    })

    await page.goto('/dashboard/reports')
    await page.getByText(reportId!).click()
    await page.getByRole('button', { name: 'Assign Technician' }).click()
    await page.getByRole('option', { name: 'John Doe' }).click()
    await page.getByRole('button', { name: 'Confirm' }).click()

    await expect(page.getByText('Assigned to John Doe')).toBeVisible()

    await clerk.signOut({ page })

    // Step 3: Technician completes work
    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'password',
        identifier: process.env.TEST_TECH_EMAIL!,
        password: process.env.TEST_TECH_PASSWORD!,
      }
    })

    await page.goto('/dashboard/my-reports')
    await page.getByText(reportId!).click()
    await page.getByRole('button', { name: 'Mark Complete' }).click()
    await page.getByLabel('Work Notes').fill('Replaced compressor')
    await page.getByRole('button', { name: 'Submit' }).click()

    await expect(page.getByText('Status: Completed')).toBeVisible()
  })
})
```

### Step 6: Add Test Sections to Each Phase Plan

For each phase plan file, add a comprehensive `## Testing` section:

**Use the Edit tool** to add the testing section after the main implementation details but before any "Notes" or "Dependencies" sections.

**Structure of Testing Section:**

```markdown
## Testing

### Unit Tests

**File: `path/to/test-file.test.ts`**

Test the [specific functionality] in isolation:

- [ ] Test case 1 description
  - Input: [describe input]
  - Expected: [expected output]
  - Covers: [what this verifies]

- [ ] Test case 2 description
  - Input: [describe input]
  - Expected: [expected output]
  - Covers: [what this verifies]

**Mocking Strategy:**
- Mock [dependency 1]: [how/why]
- Mock [dependency 2]: [how/why]

### Integration Tests

**File: `path/to/integration.test.tsx`**

Test [component/feature] with real interactions:

- [ ] Test scenario 1
  - Setup: [initial state]
  - Actions: [user interactions]
  - Assertions: [what to verify]
  - Mocks: [what to mock]

- [ ] Test scenario 2
  - Setup: [initial state]
  - Actions: [user interactions]
  - Assertions: [what to verify]
  - Mocks: [what to mock]

**Testing Approach:**
- Use @testing-library/react for component testing
- Use @testing-library/user-event for realistic interactions
- Mock [external dependencies]
- Test against [real/mocked] database

### E2E Tests

**File: `e2e/feature-name.spec.ts`**

**Critical User Flow: [Flow Name]**

- [ ] Test complete workflow from [start] to [end]
  - Setup: [test data/state]
  - User Actions:
    1. [Action 1]
    2. [Action 2]
    3. [Action 3]
  - Verifications:
    - [ ] [Verification 1]
    - [ ] [Verification 2]
  - Test Data: [any specific test data needed]

**Authentication:**
- Use @clerk/testing for auth flows
- Test roles: [list roles to test]

### Test Coverage Goals

- Unit tests: [X] test cases covering [specific logic]
- Integration tests: [Y] test cases covering [components/actions]
- E2E tests: [Z] test cases covering [user flows]

**Overall Coverage Target:** [percentage]% of new code

### Test Data & Fixtures

**Required test data:**
- [Data type 1]: [description and why needed]
- [Data type 2]: [description and why needed]

**Fixtures location:** `test/fixtures/[feature-name]/`

### Mocking Strategy

**Services to mock:**
- [ ] Authentication (Clerk) - Use vi.mock('@clerk/nextjs')
- [ ] Database - [Use PGlite / Mock Drizzle]
- [ ] External APIs - [Use MSW / Manual mocks]
- [ ] AI Services - Mock generateText/generateObject
- [ ] Email service - Mock Resend
- [ ] File uploads - Mock uploadthing

**Real dependencies to keep:**
- [ ] [Dependency 1] - [reason]
- [ ] [Dependency 2] - [reason]
```

### Step 7: Design Cross-Phase E2E Tests

After updating individual phases, create a comprehensive E2E test plan that spans multiple phases:

**Create or update: `gg/features/{feature-slug}/{feature-id}-e2e-tests.md`**

Structure:
```markdown
# E2E Test Plan: [Feature Name]

## Overview

This document outlines end-to-end tests that verify the complete [feature name] functionality across all implementation phases.

## Test Scenarios

### Scenario 1: [Primary User Flow Name]

**Description:** [What this scenario tests]

**Phases Covered:** Phase 1, Phase 2, Phase 3

**User Roles:** [List roles involved]

**Test Steps:**

1. **Setup**
   - Seed test data: [describe]
   - Configure test environment: [describe]

2. **Execution**
   - Step 1: [action] → Expected: [result]
   - Step 2: [action] → Expected: [result]
   - Step 3: [action] → Expected: [result]

3. **Verification**
   - [ ] Verify [aspect 1]
   - [ ] Verify [aspect 2]
   - [ ] Verify [aspect 3]

4. **Cleanup**
   - [Any cleanup needed]

**File:** `e2e/[scenario-name].spec.ts`

### Scenario 2: [Secondary User Flow Name]

[Same structure as Scenario 1]

## Test Environment Setup

### Required Environment Variables

```bash
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=test-password-123
CLERK_SECRET_KEY=sk_test_xxx
DATABASE_URL=postgresql://test:test@localhost:5432/test_db
```

### Test Data Seeds

**File:** `test/seeds/[feature-name].ts`

- Seed [data type 1]: [description]
- Seed [data type 2]: [description]

## CI/CD Integration

**GitHub Actions workflow updates needed:**

```yaml
- name: Run E2E tests for [feature]
  run: npm run test:e2e -- e2e/[feature-name]*.spec.ts
  env:
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
```
```

### Step 8: Verify Test Distribution

Analyze all tests added across all phases and verify they follow the Testing Trophy:

1. **Count tests by type:**
   - Unit tests: [count]
   - Integration tests: [count]
   - E2E tests: [count]

2. **Calculate percentages:**
   - Unit: [percentage]% (target: ~10%)
   - Integration: [percentage]% (target: 60-70%)
   - E2E: [percentage]% (target: 20-30%)

3. **Adjust if needed:**
   - If too many unit tests: Combine into integration tests
   - If too many E2E tests: Break down into integration tests
   - If too few integration tests: Add more component/action tests

### Step 9: Generate Testing Summary Report

Create a comprehensive summary of all tests added:

```markdown
# Testing Plan Summary: [Feature Name]

## Testing Stack

- **Unit/Integration Framework:** [vitest/jest]
- **E2E Framework:** [playwright/cypress]
- **Database Testing:** [pglite/mock/test-db]
- **Auth Testing:** [@clerk/testing/mock]
- **API Mocking:** [msw/manual]

## Test Distribution

| Test Type | Count | Percentage | Target | Status |
|-----------|-------|------------|--------|--------|
| Unit | X | Y% | ~10% | ✅/⚠️ |
| Integration | X | Y% | 60-70% | ✅/⚠️ |
| E2E | X | Y% | 20-30% | ✅/⚠️ |
| **Total** | **X** | **100%** | - | - |

## Tests by Phase

### Phase 1: [Phase Name]
- Unit tests: X
- Integration tests: Y
- E2E tests: Z
- **Key tests:**
  - [Test 1 description]
  - [Test 2 description]

### Phase 2: [Phase Name]
- Unit tests: X
- Integration tests: Y
- E2E tests: Z
- **Key tests:**
  - [Test 1 description]
  - [Test 2 description]

[Continue for all phases]

## Critical User Flows Covered

1. **[Flow 1 Name]**
   - Phases: [list]
   - Test file: `e2e/[filename].spec.ts`
   - Roles tested: [list]

2. **[Flow 2 Name]**
   - Phases: [list]
   - Test file: `e2e/[filename].spec.ts`
   - Roles tested: [list]

## Test Coverage Goals

- **Overall target:** [X]% coverage for new code
- **Critical paths:** 100% E2E coverage
- **Business logic:** 100% unit test coverage
- **UI components:** [X]% integration test coverage

## Mocking Strategy Summary

**Mocked in all tests:**
- External APIs (using MSW)
- Email service (Resend)
- File uploads (uploadthing)
- AI/LLM calls (Vercel AI SDK)

**Real dependencies in integration tests:**
- Database queries (using PGlite)
- React component rendering
- Form validation logic

**Real dependencies in E2E tests:**
- Full application stack
- Authentication (using @clerk/testing)
- Database (test database)

## Test Files Created

### Unit Tests
- `[file path 1]`
- `[file path 2]`

### Integration Tests
- `[file path 1]`
- `[file path 2]`

### E2E Tests
- `[file path 1]`
- `[file path 2]`

### Test Utilities
- `test/helpers/db.ts` - Database test helpers
- `test/helpers/auth.ts` - Authentication test helpers
- `test/fixtures/[feature]/` - Test data fixtures
- `test/mocks/[service].ts` - Service mocks

## Next Steps

1. **Implement test utilities** (if not already present):
   - [ ] Create database test helpers
   - [ ] Create authentication test helpers
   - [ ] Set up test fixtures
   - [ ] Configure test mocks

2. **Set up test environment:**
   - [ ] Add test environment variables
   - [ ] Configure CI/CD pipeline
   - [ ] Set up test database
   - [ ] Create test user accounts

3. **Implementation workflow:**
   - [ ] Write tests before implementing each phase (TDD)
   - [ ] Ensure tests pass before marking phase complete
   - [ ] Run full test suite before committing
   - [ ] Monitor test coverage in CI/CD

4. **Continuous improvement:**
   - [ ] Review and refactor tests as implementation evolves
   - [ ] Add edge case tests as bugs are discovered
   - [ ] Update E2E tests when user flows change
   - [ ] Maintain test documentation

## Testing Best Practices for This Feature

1. **Test behavior, not implementation**
   - Focus on user-visible behavior
   - Avoid testing internal component state
   - Test from the user's perspective

2. **Keep tests independent**
   - Each test should set up its own data
   - Clean up after each test
   - Don't rely on test execution order

3. **Use realistic test data**
   - Mirror production data structures
   - Include edge cases
   - Test with various user roles

4. **Write maintainable tests**
   - Use clear, descriptive test names
   - Keep tests focused and small
   - Extract common setup into helpers
   - Document complex test scenarios

5. **Optimize for speed**
   - Run tests in parallel when possible
   - Use in-memory database (PGlite) for integration tests
   - Mock expensive operations
   - Reserve E2E tests for critical paths only

## Resources

- [Testing Guide](../../../docs/testing-guide.md)
- [Test Utilities Documentation](../../../test/README.md)
- [Next.js Testing Best Practices](https://nextjs.org/docs/app/guides/testing)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
```

## Key Guidelines

### Test Design Principles

1. **Follow the Testing Trophy**
   - 60-70% integration tests (sweet spot)
   - 20-30% E2E tests (critical flows)
   - 10% unit tests (pure logic only)

2. **Test User Behavior, Not Implementation**
   - Focus on what users see and do
   - Avoid testing internal state
   - Use realistic user interactions

3. **Keep Tests Fast and Reliable**
   - Use PGlite for in-memory database testing
   - Mock external services
   - Run tests in parallel
   - Avoid hardcoded waits (use proper assertions)

4. **Make Tests Maintainable**
   - Clear, descriptive test names
   - Well-structured test code
   - Shared test utilities
   - Good documentation

### Phase-Specific Testing Strategies

**For Database Schema Phases:**
- Test migrations
- Test constraints
- Test relationships
- Use PGlite for real SQL testing

**For Server Action Phases:**
- Test authentication
- Test authorization
- Test business logic
- Test error handling
- Mock database in unit tests, use PGlite in integration tests

**For UI Component Phases:**
- Test rendering
- Test user interactions
- Test form validation
- Test conditional rendering
- Use @testing-library/react and user-event

**For Integration Phases:**
- Focus on E2E tests
- Test complete user workflows
- Test role-based access
- Use Playwright with @clerk/testing

### Mocking Guidelines

**Always Mock:**
- External API calls (use MSW)
- Email services
- File upload services
- AI/LLM services
- Payment processors

**Prefer Real in Integration Tests:**
- Database (use PGlite)
- React rendering
- Form validation
- Business logic

**Real in E2E Tests:**
- Everything except external services
- Use @clerk/testing for auth
- Use test database

## Important Reminders

1. **Be Specific and Actionable**: Every test description should be clear enough that a developer knows exactly what to implement.

2. **Provide Code Templates**: Include actual test code examples where helpful, following the testing stack being used.

3. **Think About Test Data**: Specify what test data/fixtures are needed and where they should be created.

4. **Consider CI/CD**: Ensure tests can run in automated pipelines with proper environment setup.

5. **Balance Coverage and Maintainability**: Don't over-test trivial code, but ensure critical paths are well-covered.

6. **Update TodoWrite**: Track your progress through each phase as you add tests.

7. **Follow Next.js 15 Best Practices**: Account for Server Components, Server Actions, and the App Router.

8. **Respect the Testing Stack**: Only use tools that are specified in the testing stack argument.

## Completion

After adding tests to all phases:

1. **Verify all phase files** have comprehensive Testing sections
2. **Create/update the E2E test plan** document
3. **Generate the testing summary report**
4. **Update TodoWrite** to mark all tasks complete
5. **Present the summary** to the user with:
   - Total test count by type
   - Test distribution percentages
   - Key testing strategies used
   - Next steps for implementation

Remember: Good tests are investments in code quality. They should give developers confidence to refactor, catch bugs early, and serve as living documentation of how the system should behave.

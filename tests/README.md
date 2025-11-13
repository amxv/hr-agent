# HR System Tests

This directory contains comprehensive tests for the HR system including unit tests, integration tests, and E2E tests.

## Prerequisites

### Test Database

The tests require a PostgreSQL database. You have two options:

#### Option 1: Docker (Recommended)

```bash
# Start test database
docker compose -f docker-compose.test.yml up -d

# Stop test database
docker compose -f docker-compose.test.yml down

# Reset test database (removes all data)
docker compose -f docker-compose.test.yml down -v && docker compose -f docker-compose.test.yml up -d
```

#### Option 2: Local PostgreSQL

If you have PostgreSQL installed locally, create a test database:

```sql
CREATE DATABASE hr_test;
```

Then set the TEST_DATABASE_URL environment variable:

```bash
export TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hr_test"
```

## Running Tests

### Unit Tests

Unit tests test individual functions in isolation (database queries, helper functions, etc.).

```bash
# Watch mode (recommended for development)
bun run test

# Run once
bun run test:run

# Run specific test file
bun run test:run tests/unit/db/employee-queries.test.ts

# With coverage report
bun run test:coverage

# With Vitest UI
bun run test:ui
```

### Integration Tests

Integration tests test the full tRPC API layer with a real database.

**IMPORTANT:** Integration tests require a test database to be running.

```bash
# Run all integration tests
bun run test:integration

# Run specific integration test
dotenv -e .env.test -- vitest -c vitest.config.integration.mts tests/integration/trpc/admin-hr-employees.test.ts
```

### E2E Tests

E2E tests test the full application flow in a real browser using Playwright.

```bash
# Run all E2E tests
bun run test:e2e

# Run HR admin dashboard tests only
bun run test:e2e:hr-admin

# Run HR AI tools tests only
bun run test:e2e:hr-tools

# Run with UI
bun run test:e2e:ui

# Run in headed mode (see the browser)
bun run test:e2e:headed
```

### Run All Tests

```bash
# Run all test suites sequentially
bun run test:all
```

## Test Structure

```
tests/
├── README.md                    # This file
├── helpers/                     # Shared test utilities
│   └── test-db.ts              # Database setup/reset helpers
├── mocks/                       # MSW API mocking handlers
│   └── handlers.ts
├── unit/                        # Unit tests
│   ├── db/                      # Database query tests
│   │   ├── employee-queries.test.ts
│   │   ├── leave-balance-queries.test.ts
│   │   ├── hr-case-queries.test.ts
│   │   └── benefits-queries.test.ts
│   └── hr/                      # HR helper function tests
│       └── helpers.test.ts
├── integration/                 # Integration tests
│   ├── setup.ts                 # Integration test setup
│   ├── helpers/
│   │   └── trpc-caller.ts      # tRPC test helpers
│   └── trpc/                    # tRPC procedure tests
│       ├── admin-hr-employees.test.ts
│       └── admin-hr-leave-balances.test.ts
└── e2e/                         # End-to-end tests
    ├── admin/                   # Admin dashboard tests
    │   ├── employee-management.spec.ts
    │   └── ...
    ├── ai-tools/                # AI agent tool tests
    │   └── leave-balance-tool.spec.ts
    └── page-objects/            # Page object models
        └── hr-data-dashboard.page.ts
```

## Writing Tests

### Unit Tests

Unit tests should be fast and isolated. They test individual functions without external dependencies.

```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import { listEmployees } from '@/lib/db/queries'
import { resetTestDatabase } from '../../helpers/test-db'

describe('listEmployees', () => {
  beforeEach(async () => {
    await resetTestDatabase() // Reset DB before each test
  })

  test('returns all employees', async () => {
    const result = await listEmployees({})
    expect(result.items.length).toBeGreaterThan(0)
  })
})
```

### Integration Tests

Integration tests test the full API layer with a real database.

```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import { adminCaller } from '../helpers/trpc-caller'
import { resetTestDatabase } from '../../helpers/test-db'

describe('admin.hr.employees.list', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  test('returns paginated results', async () => {
    const result = await adminCaller.hr.employees.list({
      limit: 10,
      offset: 0,
    })
    expect(result.total).toBeGreaterThan(0)
  })
})
```

### E2E Tests

E2E tests use Playwright to test the full application in a browser.

```typescript
import { test, expect } from '@playwright/test'

test('admin can view employee list', async ({ page }) => {
  await page.goto('/admin/hr-data/employees')
  await expect(page.getByRole('table')).toBeVisible()
})
```

## Test Coverage

The test suite aims for:
- **Unit Tests:** 80%+ code coverage
- **Integration Tests:** 100% coverage of tRPC procedures
- **E2E Tests:** All critical user journeys

View coverage report:

```bash
bun run test:coverage
# Open coverage/index.html in browser
```

## CI/CD

Tests run automatically in GitHub Actions on every pull request. See `.github/workflows/test.yml` for the CI configuration.

## Troubleshooting

### "Cannot connect to database"

Make sure the test database is running and the `TEST_DATABASE_URL` is set correctly.

### "Module cannot be imported from a Client Component"

This usually means a server-only module is being imported in tests. Check `vitest.setup.ts` for the proper mocks.

### Tests are flaky

- Ensure database is reset before each test with `resetTestDatabase()`
- Check for race conditions in async operations
- Verify that tests don't depend on execution order

### Playwright tests fail

- Make sure the dev server is running (Playwright config starts it automatically)
- Check that authentication setup is working
- Run with `--headed` flag to see what's happening in the browser

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [MSW Documentation](https://mswjs.io/)

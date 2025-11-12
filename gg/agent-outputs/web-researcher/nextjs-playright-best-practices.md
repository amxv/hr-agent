# Comprehensive Guide: E2E Testing Next.js 16 Applications with Playwright



**Research Date:** November 12, 2025

**Framework Versions:** Next.js 16, Playwright 1.56+



---



## Executive Summary



This comprehensive guide covers best practices for implementing End-to-End (E2E) testing in Next.js 16 applications using Playwright. Based on official documentation, industry best practices, and real-world implementations, this report provides actionable insights for testing modern web applications with authentication, databases, AI features, and complex user workflows.



**Key Takeaways:**

- Playwright is the recommended E2E testing framework for Next.js 16 with built-in support and configuration

- Test isolation via browser contexts is critical for reliable parallel execution

- Page Object Model (POM) pattern significantly improves test maintainability

- Authentication state should be saved and reused via setup projects

- Server-side mocking with MSW (Mock Service Worker) is essential for testing Next.js Server Components

- CI/CD integration should use headless execution, parallelization, and trace viewer for debugging



---



## Table of Contents



1. [Playwright Setup & Configuration](#1-playwright-setup--configuration)

2. [E2E Testing Strategies](#2-e2e-testing-strategies)

3. [Best Practices](#3-best-practices)

4. [Next.js 16 Specific Considerations](#4-nextjs-16-specific-considerations)

5. [Code Examples](#5-code-examples)

6. [Additional Resources](#6-additional-resources)



---



## 1. Playwright Setup & Configuration



### 1.1 Installation and Initial Setup



#### Quick Start with Next.js 16



The fastest way to get started is using `create-next-app` with the official example:



```bash

npx create-next-app@latest --example with-playwright with-playwright-app

```



#### Manual Installation



For existing Next.js 16 projects:



```bash

npm init playwright

# or

yarn create playwright

# or

pnpm create playwright

```



**Source:** [Next.js Official Playwright Documentation](https://nextjs.org/docs/app/guides/testing/playwright)



This installation process:

- Installs `@playwright/test` package

- Creates a `playwright.config.ts` configuration file

- Sets up example test files

- Installs browser binaries (Chromium, Firefox, WebKit)



### 1.2 Configuration for Next.js 16



#### Basic Configuration (playwright.config.ts)



```typescript

import { defineConfig, devices } from '@playwright/test';



export default defineConfig({

  // Test directory

  testDir: './tests',



  // Run tests in files in parallel

  fullyParallel: true,



  // Fail the build on CI if you accidentally left test.only in the source code

  forbidOnly: !!process.env.CI,



  // Retry on CI only

  retries: process.env.CI ? 2 : 0,



  // Opt out of parallel tests on CI for stability

  workers: process.env.CI ? 1 : undefined,



  // Reporter to use

  reporter: [

    ['html'],

    ['list'],

    ['junit', { outputFile: 'test-results/e2e-junit-results.xml' }]

  ],



  // Shared settings for all the projects below

  use: {

    // Base URL to use in actions like `await page.goto('/')`

    baseURL: 'http://localhost:3000',



    // Collect trace when retrying the failed test

    trace: 'on-first-retry',



    // Screenshot on failure

    screenshot: 'only-on-failure',



    // Video on first retry

    video: 'on-first-retry',

  },



  // Configure projects for major browsers

  projects: [

    // Setup project - runs before all tests

    {

      name: 'setup',

      testMatch: /.*\.setup\.ts/

    },



    {

      name: 'chromium',

      use: {

        ...devices['Desktop Chrome'],

        // Use prepared auth state

        storageState: 'playwright/.auth/user.json',

      },

      dependencies: ['setup'],

    },



    {

      name: 'firefox',

      use: {

        ...devices['Desktop Firefox'],

        storageState: 'playwright/.auth/user.json',

      },

      dependencies: ['setup'],

    },



    {

      name: 'webkit',

      use: {

        ...devices['Desktop Safari'],

        storageState: 'playwright/.auth/user.json',

      },

      dependencies: ['setup'],

    },

  ],



  // Run your local dev server before starting the tests

  webServer: {

    command: 'npm run dev',

    url: 'http://localhost:3000',

    reuseExistingServer: !process.env.CI,

    timeout: 120 * 1000,

  },

});

```



**Key Configuration Points:**



1. **Workers Configuration**: Set to 1 in CI for stability, use available cores locally

2. **Base URL**: Configure to avoid repeating the URL in every test

3. **Trace/Screenshot/Video**: Enable only on failures or retries to save resources

4. **Web Server**: Automatically start/stop Next.js dev server for tests

5. **Projects**: Configure multiple browser testing with shared authentication state



**Source:** [Playwright Best Practices](https://playwright.dev/docs/best-practices)



### 1.3 Test Environment Setup (Dev vs Production)



#### Development Environment



For rapid development, use the `webServer` configuration to automatically start the dev server:



```typescript

webServer: {

  command: 'npm run dev',

  url: 'http://localhost:3000',

  reuseExistingServer: !process.env.CI,

}

```



**Pros:**

- Fast Refresh for rapid development

- Better debugging with source maps

- Hot reload on code changes



**Cons:**

- Slower initial build

- Development-specific behaviors may differ from production



#### Production Environment Testing



For more realistic testing, build and test against production build:



```bash

npm run build

npm run start

npx playwright test

```



**Configuration:**



```typescript

webServer: {

  command: 'npm run build && npm run start',

  url: 'http://localhost:3000',

  timeout: 120 * 1000,

}

```



**Recommendation:** Use dev mode locally, production mode in CI/CD pipelines.



**Source:** [Next.js Testing Guide from Strapi](https://strapi.io/blog/nextjs-testing-guide-unit-and-e2e-tests-with-vitest-and-playwright)



### 1.4 Headless vs Headed Mode



#### Headless Mode (Default)



Tests run without a visible browser window. Ideal for CI/CD:



```bash

npx playwright test

```



#### Headed Mode



Shows the browser for debugging:



```bash

npx playwright test --headed

```



#### Debug Mode with Playwright Inspector



Step through tests with the Playwright Inspector:



```bash

npx playwright test --debug

```



#### UI Mode



Interactive mode with test explorer and time-travel debugging:



```bash

npx playwright test --ui

```



**Best Practice:** Use headed/UI mode for local development and debugging, headless mode for CI/CD.



**Source:** [Playwright Configuration Documentation](https://playwright.dev/docs/test-configuration)



### 1.5 Playwright Test Runner Configuration



#### Key Test Runner Features



1. **Auto-waiting**: Playwright automatically waits for elements to be actionable

2. **Retry-ability**: Built-in retries for flaky operations

3. **Web-first assertions**: Smart assertions that wait for conditions

4. **Browser contexts**: Isolated test environments

5. **Fixtures**: Reusable test setup and teardown



#### Test File Organization



```

tests/

├── e2e/

│   ├── auth.setup.ts          # Authentication setup

│   ├── homepage.spec.ts       # Homepage tests

│   ├── dashboard.spec.ts      # Dashboard tests

│   └── checkout.spec.ts       # Checkout flow tests

├── fixtures/

│   ├── auth.ts                # Authentication fixtures

│   └── test-data.ts           # Test data fixtures

└── page-objects/

    ├── login-page.ts          # Login page object

    ├── dashboard-page.ts      # Dashboard page object

    └── base-page.ts           # Base page object

```



**Best Practice:** Organize tests by feature or user journey, not by page.



---



## 2. E2E Testing Strategies



### 2.1 Testing User Workflows and Journeys



#### Focus on User-Visible Behavior



Tests should verify what end users see and interact with, not implementation details.



**Good Example:**



```typescript

import { test, expect } from '@playwright/test';



test('user can complete checkout process', async ({ page }) => {

  // Navigate to product page

  await page.goto('/products/laptop');



  // Add to cart

  await page.getByRole('button', { name: 'Add to Cart' }).click();



  // Verify cart count updated

  await expect(page.getByRole('button', { name: /Cart \(1\)/i })).toBeVisible();



  // Proceed to checkout

  await page.getByRole('link', { name: 'Checkout' }).click();



  // Fill shipping information

  await page.getByLabel('Full Name').fill('John Doe');

  await page.getByLabel('Address').fill('123 Main St');

  await page.getByLabel('City').fill('New York');



  // Submit order

  await page.getByRole('button', { name: 'Place Order' }).click();



  // Verify success

  await expect(page.getByText('Order confirmed')).toBeVisible();

  await expect(page.getByText(/Order #[0-9]+/)).toBeVisible();

});

```



**Bad Example:**



```typescript

// ❌ Testing implementation details

test('state updates correctly', async ({ page }) => {

  await page.goto('/checkout');



  // Testing class names (implementation detail)

  await expect(page.locator('.checkout-form-container')).toBeVisible();



  // Testing internal state (not user-visible)

  const state = await page.evaluate(() => window.__NEXT_DATA__);

  expect(state.props.pageProps.items.length).toBe(1);

});

```



**Key Principles:**



1. **Test user journeys, not individual functions**

2. **Use semantic locators** (role, label, text) over CSS selectors

3. **Assert on visible outcomes**, not internal state

4. **Think like a user**, not a developer



**Source:** [Playwright Best Practices - Test User-Visible Behavior](https://playwright.dev/docs/best-practices#test-user-visible-behavior)



### 2.2 Testing Authenticated Routes and Sessions



#### Strategy 1: Basic Shared Account (Recommended for Stateless Apps)



Use a setup project to authenticate once and reuse the state:



**tests/auth.setup.ts:**



```typescript

import { test as setup, expect } from '@playwright/test';

import path from 'path';



const authFile = path.join(__dirname, '../playwright/.auth/user.json');



setup('authenticate', async ({ page }) => {

  // Navigate to login page

  await page.goto('/login');



  // Fill in credentials

  await page.getByLabel('Email').fill('test@example.com');

  await page.getByLabel('Password').fill('password123');



  // Click sign in

  await page.getByRole('button', { name: 'Sign in' }).click();



  // Wait for redirect to dashboard

  await page.waitForURL('/dashboard');



  // Verify successful login

  await expect(page.getByRole('button', { name: 'Profile' })).toBeVisible();



  // Save authentication state

  await page.context().storageState({ path: authFile });

});

```



**Configuration:**



```typescript

export default defineConfig({

  projects: [

    { name: 'setup', testMatch: /.*\.setup\.ts/ },



    {

      name: 'chromium',

      use: { storageState: 'playwright/.auth/user.json' },

      dependencies: ['setup'],

    },

  ],

});

```



**Usage in tests:**



```typescript

import { test, expect } from '@playwright/test';



test('user can access dashboard', async ({ page }) => {

  // Already authenticated via setup project

  await page.goto('/dashboard');

  await expect(page.getByText('Welcome back')).toBeVisible();

});

```



**When to use:**

- Tests don't modify shared server-side state

- All tests can run with the same account simultaneously



**Source:** [Playwright Authentication Guide](https://playwright.dev/docs/auth#basic-shared-account-in-all-tests)



#### Strategy 2: One Account Per Parallel Worker (For Tests That Modify State)



Use worker-scoped fixtures to create unique accounts per worker:



**playwright/fixtures.ts:**



```typescript

import { test as baseTest, expect } from '@playwright/test';

import fs from 'fs';

import path from 'path';



export * from '@playwright/test';

export const test = baseTest.extend<{}, { workerStorageState: string }>({

  // Use the same storage state for all tests in this worker

  storageState: ({ workerStorageState }, use) => use(workerStorageState),



  // Authenticate once per worker

  workerStorageState: [async ({ browser }, use) => {

    const id = test.info().parallelIndex;

    const fileName = path.resolve(

      test.info().project.outputDir,

      `.auth/${id}.json`

    );



    if (fs.existsSync(fileName)) {

      await use(fileName);

      return;

    }



    // Create new browser context without auth

    const page = await browser.newPage({ storageState: undefined });



    // Get unique test account

    const account = await acquireAccount(id);



    // Perform authentication

    await page.goto('/login');

    await page.getByLabel('Email').fill(account.email);

    await page.getByLabel('Password').fill(account.password);

    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.waitForURL('/dashboard');



    // Save auth state

    await page.context().storageState({ path: fileName });

    await page.close();

    await use(fileName);

  }, { scope: 'worker' }],

});



// Mock function - replace with your actual account creation logic

async function acquireAccount(id: number) {

  return {

    email: `test-user-${id}@example.com`,

    password: `password-${id}`,

  };

}

```



**Usage:**



```typescript

// Import from fixtures instead of @playwright/test

import { test, expect } from '../playwright/fixtures';



test('user can update profile', async ({ page }) => {

  // Uses worker-specific authenticated account

  await page.goto('/profile');

  await page.getByLabel('Name').fill('Updated Name');

  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Profile updated')).toBeVisible();

});

```



**When to use:**

- Tests modify shared server-side state (settings, data, etc.)

- Need isolation between parallel test executions



**Source:** [Playwright Authentication - One Account Per Worker](https://playwright.dev/docs/auth#moderate-one-account-per-parallel-worker)



#### Strategy 3: API-Based Authentication



Skip UI login for faster tests:



```typescript

import { test as setup } from '@playwright/test';



const authFile = 'playwright/.auth/user.json';



setup('authenticate via API', async ({ request }) => {

  // Send login API request

  const response = await request.post('/api/auth/login', {

    data: {

      email: 'test@example.com',

      password: 'password123',

    },

  });



  expect(response.ok()).toBeTruthy();



  // Save cookies/tokens

  await request.storageState({ path: authFile });

});

```



**When to use:**

- API authentication is available and stable

- Need faster test execution

- UI login is already tested elsewhere



**Source:** [Playwright Authentication - API Request](https://playwright.dev/docs/auth#authenticate-with-api-request)



#### Strategy 4: Multiple User Roles



Test different permission levels:



```typescript

// Setup multiple roles

setup('authenticate as admin', async ({ page }) => {

  await page.goto('/login');

  await page.getByLabel('Email').fill('admin@example.com');

  await page.getByLabel('Password').fill('admin-password');

  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('/dashboard');

  await page.context().storageState({ path: 'playwright/.auth/admin.json' });

});



setup('authenticate as user', async ({ page }) => {

  await page.goto('/login');

  await page.getByLabel('Email').fill('user@example.com');

  await page.getByLabel('Password').fill('user-password');

  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('/dashboard');

  await page.context().storageState({ path: 'playwright/.auth/user.json' });

});

```



**Usage:**



```typescript

import { test } from '@playwright/test';



// Admin tests

test.describe('admin features', () => {

  test.use({ storageState: 'playwright/.auth/admin.json' });



  test('admin can access user management', async ({ page }) => {

    await page.goto('/admin/users');

    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();

  });

});



// Regular user tests

test.describe('user features', () => {

  test.use({ storageState: 'playwright/.auth/user.json' });



  test('user cannot access admin panel', async ({ page }) => {

    await page.goto('/admin/users');

    await expect(page.getByText('Access denied')).toBeVisible();

  });

});

```



**Source:** [Playwright Authentication - Multiple Roles](https://playwright.dev/docs/auth#multiple-signed-in-roles)



### 2.3 Testing Forms, File Uploads, and Complex Interactions



#### Form Testing Best Practices



```typescript

test('contact form submission', async ({ page }) => {

  await page.goto('/contact');



  // Fill form using labels (accessible)

  await page.getByLabel('Name').fill('John Doe');

  await page.getByLabel('Email').fill('john@example.com');

  await page.getByLabel('Message').fill('This is a test message');



  // Select from dropdown

  await page.getByLabel('Subject').selectOption('Support');



  // Check checkbox

  await page.getByLabel('I agree to terms').check();



  // Submit form

  await page.getByRole('button', { name: 'Send Message' }).click();



  // Verify success message

  await expect(page.getByText('Message sent successfully')).toBeVisible();



  // Verify form cleared

  await expect(page.getByLabel('Name')).toHaveValue('');

});

```



#### File Upload Testing



```typescript

test('user can upload profile photo', async ({ page }) => {

  await page.goto('/profile/edit');



  // Set file input

  const fileInput = page.getByLabel('Profile Photo');

  await fileInput.setInputFiles('tests/fixtures/profile-photo.jpg');



  // Verify preview shows

  await expect(page.locator('img[alt="Preview"]')).toBeVisible();



  // Save changes

  await page.getByRole('button', { name: 'Save' }).click();



  // Verify upload success

  await expect(page.getByText('Profile photo updated')).toBeVisible();

});



// Multiple file upload

test('user can upload multiple documents', async ({ page }) => {

  await page.goto('/documents/upload');



  const fileInput = page.getByLabel('Upload Documents');

  await fileInput.setInputFiles([

    'tests/fixtures/document1.pdf',

    'tests/fixtures/document2.pdf',

  ]);



  // Verify both files listed

  await expect(page.getByText('document1.pdf')).toBeVisible();

  await expect(page.getByText('document2.pdf')).toBeVisible();



  await page.getByRole('button', { name: 'Upload' }).click();

  await expect(page.getByText('2 files uploaded')).toBeVisible();

});

```



#### Complex Interactions (Drag and Drop, Hover, Multi-Step)



```typescript

// Drag and drop

test('user can reorder tasks', async ({ page }) => {

  await page.goto('/tasks');



  const task1 = page.getByRole('listitem', { name: 'Task 1' });

  const task3 = page.getByRole('listitem', { name: 'Task 3' });



  await task1.dragTo(task3);



  // Verify new order

  const tasks = page.getByRole('listitem');

  await expect(tasks.nth(0)).toContainText('Task 2');

  await expect(tasks.nth(1)).toContainText('Task 3');

  await expect(tasks.nth(2)).toContainText('Task 1');

});



// Hover interactions

test('tooltip appears on hover', async ({ page }) => {

  await page.goto('/dashboard');



  const helpIcon = page.getByRole('button', { name: 'Help' });

  await helpIcon.hover();



  await expect(page.getByText('Click for assistance')).toBeVisible();

});



// Multi-step wizard

test('user completes onboarding wizard', async ({ page }) => {

  await page.goto('/onboarding');



  // Step 1: Personal Info

  await page.getByLabel('Full Name').fill('John Doe');

  await page.getByRole('button', { name: 'Next' }).click();



  // Step 2: Company Info

  await page.getByLabel('Company Name').fill('Acme Corp');

  await page.getByRole('button', { name: 'Next' }).click();



  // Step 3: Preferences

  await page.getByLabel('Email Notifications').check();

  await page.getByRole('button', { name: 'Complete' }).click();



  // Verify completion

  await expect(page.getByText('Welcome to the platform!')).toBeVisible();

});

```



**Source:** [Playwright Documentation - Actions](https://playwright.dev/docs/input)



### 2.4 Testing AI Chat Interfaces and Streaming Responses



#### Challenges with AI Testing



1. **Non-deterministic responses**: Same input may produce different outputs

2. **Streaming data**: Responses arrive incrementally

3. **Long response times**: May cause timeouts

4. **Cost**: Each test run costs API credits



#### Solution: Mock AI Responses with MSW



**Next.js 16 Experimental Test Mode:**



```typescript

// next.config.ts

import type { NextConfig } from 'next';



const nextConfig: NextConfig = {

  experimental: {

    testProxy: true,

  },

};



export default nextConfig;

```



**Install MSW:**



```bash

npm install -D msw

```



**Configure Playwright for MSW:**



```typescript

// playwright.config.ts

import { defineConfig } from 'next/experimental/testmode/playwright';



export default defineConfig({

  testDir: './tests',

  webServer: {

    command: 'npm run dev',

    url: 'http://localhost:3000',

  },

});

```



**Test with Mocked AI Response:**



```typescript

// tests/ai-chat.spec.ts

import {

  HttpResponse,

  expect,

  http,

  passthrough,

  test,

} from 'next/experimental/testmode/playwright/msw';



test.use({

  mswHandlers: [

    [

      // Mock OpenAI API

      http.post('https://api.openai.com/v1/chat/completions', () => {

        return HttpResponse.json({

          choices: [

            {

              message: {

                content: 'This is a mocked AI response for testing',

              },

            },

          ],

        });

      }),

      // Allow other requests to pass through

      http.all('*', () => passthrough()),

    ],

    { scope: 'test' },

  ],

});



test('AI chat displays response', async ({ page }) => {

  await page.goto('/chat');



  // Type message

  await page.getByLabel('Message').fill('What is Next.js?');

  await page.getByRole('button', { name: 'Send' }).click();



  // Verify loading state

  await expect(page.getByText('AI is thinking...')).toBeVisible();



  // Verify mocked response appears

  await expect(

    page.getByText('This is a mocked AI response for testing')

  ).toBeVisible();



  // Verify loading state cleared

  await expect(page.getByText('AI is thinking...')).not.toBeVisible();

});

```



#### Testing Streaming Responses



```typescript

test('AI chat handles streaming response', async ({ page }) => {

  await page.goto('/chat');



  // Send message

  await page.getByLabel('Message').fill('Tell me a story');

  await page.getByRole('button', { name: 'Send' }).click();



  // Wait for first chunk of response

  await expect(page.locator('[data-testid="ai-response"]')).not.toBeEmpty();



  // Wait for complete response (polling)

  await page.waitForFunction(() => {

    const response = document.querySelector('[data-testid="ai-response"]');

    return response?.getAttribute('data-complete') === 'true';

  }, { timeout: 30000 });



  // Verify complete indicator

  await expect(

    page.getByRole('button', { name: 'Copy Response' })

  ).toBeVisible();

});

```



#### Testing Error States



```typescript

test.use({

  mswHandlers: [

    [

      http.post('https://api.openai.com/v1/chat/completions', () => {

        return HttpResponse.json(

          { error: 'Rate limit exceeded' },

          { status: 429 }

        );

      }),

      http.all('*', () => passthrough()),

    ],

    { scope: 'test' },

  ],

});



test('AI chat handles rate limit error', async ({ page }) => {

  await page.goto('/chat');



  await page.getByLabel('Message').fill('Test message');

  await page.getByRole('button', { name: 'Send' }).click();



  // Verify error message

  await expect(

    page.getByText('Too many requests. Please try again later.')

  ).toBeVisible();



  // Verify retry button appears

  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();

});

```



**Source:** [Momentic - Fetch Mocking with Playwright in Next.js](https://momentic.ai/blog/fetch-mocking-with-playwright-next-js)



### 2.5 API Mocking Strategies for E2E Tests



#### When to Mock APIs



**Mock:**

- Third-party services (payment processors, email services)

- External APIs with rate limits or costs

- Non-deterministic responses (AI, weather, stock prices)

- Slow external services



**Don't Mock:**

- Your own backend APIs (test the full stack)

- Simple static data endpoints

- Critical business logic APIs



#### Strategy 1: Route-Level Mocking (Client-Side Only)



```typescript

test('displays user profile', async ({ page }) => {

  // Mock API response

  await page.route('**/api/user/profile', async (route) => {

    await route.fulfill({

      status: 200,

      contentType: 'application/json',

      body: JSON.stringify({

        name: 'Test User',

        email: 'test@example.com',

        avatar: '/avatars/test.jpg',

      }),

    });

  });



  await page.goto('/profile');



  await expect(page.getByText('Test User')).toBeVisible();

  await expect(page.getByText('test@example.com')).toBeVisible();

});

```



**Limitation:** Only works for client-side requests, not Server Components.



#### Strategy 2: MSW for Full-Stack Mocking (Recommended)



Works for both client and server-side requests in Next.js 16:



```typescript

// playwright/msw-handlers.ts

import { http, HttpResponse } from 'msw';



export const handlers = [

  http.get('/api/products', () => {

    return HttpResponse.json([

      { id: 1, name: 'Product 1', price: 29.99 },

      { id: 2, name: 'Product 2', price: 39.99 },

    ]);

  }),



  http.post('/api/checkout', async ({ request }) => {

    const body = await request.json();

    return HttpResponse.json({

      orderId: '12345',

      total: body.total,

      status: 'confirmed',

    });

  }),



  http.get('/api/external-service/*', () => {

    return HttpResponse.json({ data: 'mocked external data' });

  }),

];

```



**Usage:**



```typescript

import { test, expect } from 'next/experimental/testmode/playwright/msw';

import { handlers } from '../playwright/msw-handlers';



test.use({

  mswHandlers: [handlers, { scope: 'test' }],

});



test('checkout flow with mocked APIs', async ({ page }) => {

  await page.goto('/products');



  // Products from mocked API

  await expect(page.getByText('Product 1')).toBeVisible();



  await page.getByRole('button', { name: 'Add to Cart' }).first().click();

  await page.getByRole('link', { name: 'Checkout' }).click();



  await page.getByRole('button', { name: 'Place Order' }).click();



  // Order ID from mocked checkout API

  await expect(page.getByText('Order #12345')).toBeVisible();

});

```



#### Strategy 3: Conditional Mocking with Environment Variables



```typescript

// playwright.config.ts

export default defineConfig({

  use: {

    baseURL: process.env.USE_MOCK_API

      ? 'http://localhost:3000'

      : 'https://staging.example.com',

  },

});

```



**Source:** [Playwright Network API](https://playwright.dev/docs/network)



### 2.6 Testing Database Interactions in E2E Context



#### Approach 1: Use Test Database



```typescript

// tests/helpers/db.ts

import { PrismaClient } from '@prisma/client';



export async function setupTestDatabase() {

  const prisma = new PrismaClient({

    datasources: {

      db: {

        url: process.env.TEST_DATABASE_URL,

      },

    },

  });



  // Clean database

  await prisma.user.deleteMany();

  await prisma.post.deleteMany();



  // Seed test data

  await prisma.user.create({

    data: {

      email: 'test@example.com',

      name: 'Test User',

    },

  });



  return prisma;

}

```



**Global Setup:**



```typescript

// global-setup.ts

import { setupTestDatabase } from './tests/helpers/db';



export default async function globalSetup() {

  await setupTestDatabase();

}

```



**Configuration:**



```typescript

// playwright.config.ts

export default defineConfig({

  globalSetup: require.resolve('./global-setup'),

});

```



#### Approach 2: Database Fixtures per Worker



```typescript

// playwright/fixtures.ts

import { test as baseTest } from '@playwright/test';

import { setupDatabaseForWorker } from './helpers/db';



export const test = baseTest.extend<{}, { dbConnection: any }>({

  dbConnection: [async ({}, use) => {

    const workerId = test.info().parallelIndex;

    const db = await setupDatabaseForWorker(workerId);

    await use(db);

    await db.cleanup();

  }, { scope: 'worker' }],

});

```



#### Approach 3: Transaction Rollback Pattern



```typescript

test('user can create post', async ({ page }) => {

  // Start transaction

  await page.evaluate(() => {

    localStorage.setItem('test-transaction-id', 'test-123');

  });



  await page.goto('/posts/new');

  await page.getByLabel('Title').fill('Test Post');

  await page.getByLabel('Content').fill('This is a test');

  await page.getByRole('button', { name: 'Publish' }).click();



  await expect(page.getByText('Post published')).toBeVisible();



  // Backend should rollback transaction after test

});

```



**Best Practice:** Isolate database state per worker using `parallelIndex` to enable safe parallel execution.



**Source:** [Playwright Best Practices - Testing with Database](https://playwright.dev/docs/best-practices#testing-with-a-database)



---



## 3. Best Practices



### 3.1 Test Organization and Structure



#### Recommended Folder Structure



```

tests/

├── e2e/

│   ├── auth/

│   │   ├── auth.setup.ts

│   │   ├── login.spec.ts

│   │   └── signup.spec.ts

│   ├── user-flows/

│   │   ├── checkout.spec.ts

│   │   ├── profile.spec.ts

│   │   └── dashboard.spec.ts

│   ├── admin/

│   │   ├── user-management.spec.ts

│   │   └── settings.spec.ts

│   └── api/

│       ├── products.spec.ts

│       └── orders.spec.ts

├── fixtures/

│   ├── auth.ts

│   ├── database.ts

│   └── test-data.ts

├── page-objects/

│   ├── base-page.ts

│   ├── login-page.ts

│   ├── dashboard-page.ts

│   └── checkout-page.ts

├── helpers/

│   ├── api-helpers.ts

│   ├── db-helpers.ts

│   └── test-utils.ts

└── global-setup.ts

```



#### Test File Naming Convention



```typescript

// ✅ Good: Descriptive, action-oriented

user-registration.spec.ts

checkout-flow.spec.ts

admin-user-management.spec.ts



// ❌ Bad: Too generic

test1.spec.ts

homepage.spec.ts

features.spec.ts

```



#### Test Structure (AAA Pattern)



```typescript

test('user can update profile information', async ({ page }) => {

  // Arrange: Setup preconditions

  await page.goto('/profile');

  await expect(page.getByLabel('Name')).toHaveValue('John Doe');



  // Act: Perform the action

  await page.getByLabel('Name').fill('Jane Smith');

  await page.getByLabel('Email').fill('jane@example.com');

  await page.getByRole('button', { name: 'Save Changes' }).click();



  // Assert: Verify the outcome

  await expect(page.getByText('Profile updated successfully')).toBeVisible();

  await expect(page.getByLabel('Name')).toHaveValue('Jane Smith');

});

```



#### Group Related Tests



```typescript

import { test, expect } from '@playwright/test';



test.describe('User Profile Management', () => {

  test.beforeEach(async ({ page }) => {

    await page.goto('/profile');

  });



  test('displays current user information', async ({ page }) => {

    await expect(page.getByText('John Doe')).toBeVisible();

    await expect(page.getByText('john@example.com')).toBeVisible();

  });



  test('allows editing name', async ({ page }) => {

    await page.getByRole('button', { name: 'Edit' }).click();

    await page.getByLabel('Name').fill('Updated Name');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Profile updated')).toBeVisible();

  });



  test('validates email format', async ({ page }) => {

    await page.getByRole('button', { name: 'Edit' }).click();

    await page.getByLabel('Email').fill('invalid-email');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Invalid email format')).toBeVisible();

  });

});

```



**Source:** [Organizing Playwright Tests Effectively](https://dev.to/playwright/organizing-playwright-tests-effectively-2hi0)



### 3.2 Page Object Model (POM) Patterns



#### Why Use Page Object Model?



1. **Separation of Concerns**: Test logic separated from UI implementation

2. **Reusability**: Common actions defined once, used everywhere

3. **Maintainability**: UI changes only require updates in one place

4. **Readability**: Tests read like user stories



#### Basic Page Object Implementation



```typescript

// page-objects/base-page.ts

import { Page, Locator } from '@playwright/test';



export class BasePage {

  readonly page: Page;



  constructor(page: Page) {

    this.page = page;

  }



  async goto(path: string) {

    await this.page.goto(path);

  }



  async waitForPageLoad() {

    await this.page.waitForLoadState('domcontentloaded');

  }

}

```



```typescript

// page-objects/login-page.ts

import { Page, Locator, expect } from '@playwright/test';

import { BasePage } from './base-page';



export class LoginPage extends BasePage {

  readonly emailInput: Locator;

  readonly passwordInput: Locator;

  readonly loginButton: Locator;

  readonly errorMessage: Locator;



  constructor(page: Page) {

    super(page);

    this.emailInput = page.getByLabel('Email');

    this.passwordInput = page.getByLabel('Password');

    this.loginButton = page.getByRole('button', { name: 'Sign in' });

    this.errorMessage = page.getByRole('alert');

  }



  async goto() {

    await super.goto('/login');

    await expect(this.loginButton).toBeVisible();

  }



  async login(email: string, password: string) {

    await this.emailInput.fill(email);

    await this.passwordInput.fill(password);

    await this.loginButton.click();

  }



  async expectError(message: string) {

    await expect(this.errorMessage).toContainText(message);

  }

}

```



```typescript

// page-objects/dashboard-page.ts

import { Page, Locator, expect } from '@playwright/test';

import { BasePage } from './base-page';



export class DashboardPage extends BasePage {

  readonly welcomeMessage: Locator;

  readonly profileButton: Locator;

  readonly newPostButton: Locator;



  constructor(page: Page) {

    super(page);

    this.welcomeMessage = page.getByRole('heading', { name: /Welcome/i });

    this.profileButton = page.getByRole('button', { name: 'Profile' });

    this.newPostButton = page.getByRole('button', { name: 'New Post' });

  }



  async goto() {

    await super.goto('/dashboard');

    await this.waitForLoad();

  }



  async waitForLoad() {

    await expect(this.welcomeMessage).toBeVisible();

  }



  async openProfile() {

    await this.profileButton.click();

  }



  async createNewPost() {

    await this.newPostButton.click();

  }

}

```



#### Using Page Objects in Tests



```typescript

// tests/e2e/user-login.spec.ts

import { test, expect } from '@playwright/test';

import { LoginPage } from '../page-objects/login-page';

import { DashboardPage } from '../page-objects/dashboard-page';



test('successful login redirects to dashboard', async ({ page }) => {

  const loginPage = new LoginPage(page);

  const dashboardPage = new DashboardPage(page);



  await loginPage.goto();

  await loginPage.login('test@example.com', 'password123');



  await dashboardPage.waitForLoad();

  await expect(dashboardPage.welcomeMessage).toContainText('Welcome back');

});



test('invalid credentials show error', async ({ page }) => {

  const loginPage = new LoginPage(page);



  await loginPage.goto();

  await loginPage.login('invalid@example.com', 'wrong-password');



  await loginPage.expectError('Invalid email or password');

});

```



#### Advanced: Page Object Fixtures



```typescript

// fixtures/page-objects.ts

import { test as baseTest } from '@playwright/test';

import { LoginPage } from '../page-objects/login-page';

import { DashboardPage } from '../page-objects/dashboard-page';



type PageObjects = {

  loginPage: LoginPage;

  dashboardPage: DashboardPage;

};



export const test = baseTest.extend<PageObjects>({

  loginPage: async ({ page }, use) => {

    await use(new LoginPage(page));

  },



  dashboardPage: async ({ page }, use) => {

    await use(new DashboardPage(page));

  },

});



export { expect } from '@playwright/test';

```



**Usage with fixtures:**



```typescript

import { test, expect } from '../fixtures/page-objects';



test('login flow', async ({ loginPage, dashboardPage }) => {

  await loginPage.goto();

  await loginPage.login('test@example.com', 'password123');

  await dashboardPage.waitForLoad();

});

```



**Source:** [Page Object Model in Playwright - Complete Guide](https://posium.ai/blog/page-object-model-in-playwright)



### 3.3 Fixtures and Setup/Teardown



#### Understanding Playwright Fixtures



Fixtures are a way to:

1. Set up test preconditions

2. Provide reusable test context

3. Handle cleanup automatically

4. Share data between tests



#### Built-in Fixtures



```typescript

import { test } from '@playwright/test';



test('using built-in fixtures', async ({ page, context, browser }) => {

  // page: New page for this test

  // context: Browser context (isolated environment)

  // browser: Browser instance



  await page.goto('/');

});

```



#### Custom Fixture: Test Data



```typescript

// fixtures/test-data.ts

import { test as baseTest } from '@playwright/test';



type TestData = {

  testUser: {

    email: string;

    password: string;

    name: string;

  };

};



export const test = baseTest.extend<TestData>({

  testUser: async ({}, use) => {

    const user = {

      email: `test-${Date.now()}@example.com`,

      password: 'SecurePass123!',

      name: 'Test User',

    };



    await use(user);



    // Cleanup: Delete test user

    // await api.deleteUser(user.email);

  },

});

```



**Usage:**



```typescript

import { test, expect } from '../fixtures/test-data';



test('new user registration', async ({ page, testUser }) => {

  await page.goto('/signup');

  await page.getByLabel('Name').fill(testUser.name);

  await page.getByLabel('Email').fill(testUser.email);

  await page.getByLabel('Password').fill(testUser.password);

  await page.getByRole('button', { name: 'Sign up' }).click();



  await expect(page.getByText('Registration successful')).toBeVisible();

});

```



#### Worker-Scoped Fixtures



Fixtures that run once per worker (not per test):



```typescript

// fixtures/database.ts

import { test as baseTest } from '@playwright/test';

import { PrismaClient } from '@prisma/client';



export const test = baseTest.extend<{}, { prisma: PrismaClient }>({

  prisma: [async ({}, use, workerInfo) => {

    const prisma = new PrismaClient({

      datasources: {

        db: {

          url: `${process.env.DATABASE_URL}_worker_${workerInfo.workerIndex}`,

        },

      },

    });



    await prisma.$connect();

    await use(prisma);

    await prisma.$disconnect();

  }, { scope: 'worker' }],

});

```



#### Setup and Teardown with Hooks



```typescript

import { test, expect } from '@playwright/test';



test.describe('Shopping Cart', () => {

  // Runs before all tests in this describe block

  test.beforeAll(async ({ browser }) => {

    console.log('Starting shopping cart tests');

  });



  // Runs before each test

  test.beforeEach(async ({ page }) => {

    await page.goto('/shop');

    await page.getByRole('link', { name: 'Products' }).click();

  });



  // Runs after each test

  test.afterEach(async ({ page }) => {

    // Clear cart

    await page.getByRole('button', { name: 'Clear Cart' }).click();

  });



  // Runs after all tests in this describe block

  test.afterAll(async () => {

    console.log('Completed shopping cart tests');

  });



  test('add item to cart', async ({ page }) => {

    await page.getByRole('button', { name: 'Add to Cart' }).first().click();

    await expect(page.getByText('Cart (1)')).toBeVisible();

  });



  test('remove item from cart', async ({ page }) => {

    await page.getByRole('button', { name: 'Add to Cart' }).first().click();

    await page.getByRole('button', { name: 'Remove' }).click();

    await expect(page.getByText('Cart (0)')).toBeVisible();

  });

});

```



#### Global Setup/Teardown



```typescript

// global-setup.ts

import { chromium, FullConfig } from '@playwright/test';



async function globalSetup(config: FullConfig) {

  // Start mock API server

  // Seed database

  // Set up test environment



  console.log('Global setup complete');

}



export default globalSetup;

```



```typescript

// global-teardown.ts

import { FullConfig } from '@playwright/test';



async function globalTeardown(config: FullConfig) {

  // Stop mock API server

  // Clean database

  // Clean up test files



  console.log('Global teardown complete');

}



export default globalTeardown;

```



**Configuration:**



```typescript

// playwright.config.ts

export default defineConfig({

  globalSetup: require.resolve('./global-setup'),

  globalTeardown: require.resolve('./global-teardown'),

});

```



**Source:** [Playwright Fixtures Guide](https://playwright.dev/docs/test-fixtures)



### 3.4 Parallel Test Execution



#### How Playwright Runs Tests in Parallel



- **Test files** run in parallel by default

- **Tests within a file** run sequentially (by default)

- Each test file runs in its own **worker process**

- Workers have isolated browser contexts



#### Configuration



```typescript

// playwright.config.ts

export default defineConfig({

  // Maximum parallel workers

  workers: process.env.CI ? 2 : 4,



  // OR use percentage of CPU cores

  // workers: '50%',



  // Run all tests in all files in parallel

  fullyParallel: true,



  // Limit failures before stopping

  maxFailures: process.env.CI ? 5 : undefined,

});

```



#### Parallelize Tests Within a Single File



```typescript

import { test } from '@playwright/test';



// Enable parallel mode for this describe block

test.describe.configure({ mode: 'parallel' });



test('runs in parallel 1', async ({ page }) => {

  await page.goto('/page1');

  // Test logic

});



test('runs in parallel 2', async ({ page }) => {

  await page.goto('/page2');

  // Test logic

});



test('runs in parallel 3', async ({ page }) => {

  await page.goto('/page3');

  // Test logic

});

```



#### Serial Mode (When Tests Depend on Each Other)



```typescript

import { test, type Page } from '@playwright/test';



test.describe.configure({ mode: 'serial' });



let page: Page;



test.beforeAll(async ({ browser }) => {

  page = await browser.newPage();

});



test.afterAll(async () => {

  await page.close();

});



test('step 1: login', async () => {

  await page.goto('/login');

  await page.getByLabel('Email').fill('test@example.com');

  await page.getByLabel('Password').fill('password');

  await page.getByRole('button', { name: 'Sign in' }).click();

});



test('step 2: navigate to dashboard', async () => {

  // Uses same page from step 1

  await page.getByRole('link', { name: 'Dashboard' }).click();

});



test('step 3: create item', async () => {

  // Uses same page and state from previous steps

  await page.getByRole('button', { name: 'New Item' }).click();

});

```



**Note:** Serial mode is discouraged. Make tests independent when possible.



#### Sharding (Distribute Tests Across Machines)



```bash

# Machine 1: Run shard 1 of 3

npx playwright test --shard=1/3



# Machine 2: Run shard 2 of 3

npx playwright test --shard=2/3



# Machine 3: Run shard 3 of 3

npx playwright test --shard=3/3

```



**CI Configuration (GitHub Actions):**



```yaml

jobs:

  test:

    runs-on: ubuntu-latest

    strategy:

      matrix:

        shard: [1, 2, 3, 4]

    steps:

      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4

      - run: npm ci

      - run: npx playwright install --with-deps

      - run: npx playwright test --shard=${{ matrix.shard }}/4

```



#### Isolating Test Data Between Workers



```typescript

import { test as baseTest } from '@playwright/test';



export const test = baseTest.extend<{}, { workerDatabase: string }>({

  workerDatabase: [async ({}, use) => {

    const workerId = test.info().parallelIndex;

    const dbName = `test_db_worker_${workerId}`;



    // Create worker-specific database

    await setupDatabase(dbName);



    await use(dbName);



    // Cleanup

    await cleanupDatabase(dbName);

  }, { scope: 'worker' }],

});

```



**Best Practices:**

1. Keep tests independent

2. Avoid shared state between tests

3. Use worker-scoped fixtures for expensive setup

4. Set workers to 1 in CI for stability (or use sharding)

5. Use `test.describe.configure({ mode: 'parallel' })` for independent tests in same file



**Source:** [Playwright Parallelism Documentation](https://playwright.dev/docs/test-parallel)



### 3.5 CI/CD Integration



#### GitHub Actions Configuration



**Basic Setup:**



```yaml

# .github/workflows/playwright.yml

name: Playwright Tests



on:

  push:

    branches: [ main, develop ]

  pull_request:

    branches: [ main, develop ]



jobs:

  test:

    timeout-minutes: 60

    runs-on: ubuntu-latest



    steps:

      - uses: actions/checkout@v4



      - uses: actions/setup-node@v4

        with:

          node-version: 'lts/*'

          cache: 'npm'



      - name: Install dependencies

        run: npm ci



      - name: Install Playwright Browsers

        run: npx playwright install --with-deps



      - name: Run Playwright tests

        run: npx playwright test

        env:

          CI: 'true'



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

```



#### Sharded Tests in CI



```yaml

name: Playwright Tests (Sharded)



on:

  push:

    branches: [ main ]



jobs:

  test:

    timeout-minutes: 60

    runs-on: ubuntu-latest

    strategy:

      fail-fast: false

      matrix:

        shard: [1, 2, 3, 4]



    steps:

      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4

        with:

          node-version: 'lts/*'



      - name: Install dependencies

        run: npm ci



      - name: Install Playwright

        run: npx playwright install --with-deps chromium



      - name: Run Playwright tests

        run: npx playwright test --shard=${{ matrix.shard }}/4



      - uses: actions/upload-artifact@v4

        if: always()

        with:

          name: blob-report-${{ matrix.shard }}

          path: blob-report

          retention-days: 1



  merge-reports:

    if: always()

    needs: test

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

          name: html-report--attempt-${{ github.run_attempt }}

          path: playwright-report

          retention-days: 14

```



#### Docker Container Setup



```yaml

name: Playwright Tests (Container)



on:

  push:

    branches: [ main ]



jobs:

  test:

    runs-on: ubuntu-latest

    container:

      image: mcr.microsoft.com/playwright:v1.56.1-noble

      options: --user 1001



    steps:

      - uses: actions/checkout@v4



      - uses: actions/setup-node@v4

        with:

          node-version: 'lts/*'



      - name: Install dependencies

        run: npm ci



      - name: Run Playwright tests

        run: npx playwright test

```



#### Environment Variables and Secrets



```yaml

- name: Run Playwright tests

  run: npx playwright test

  env:

    CI: 'true'

    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

    NEXT_PUBLIC_API_URL: 'https://staging-api.example.com'

    API_KEY: ${{ secrets.API_KEY }}

```



#### Testing on Deployment (Vercel)



```yaml

name: E2E Tests on Deployment



on:

  deployment_status:



jobs:

  test:

    if: github.event.deployment_status.state == 'success'

    runs-on: ubuntu-latest



    steps:

      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4



      - name: Install dependencies

        run: npm ci



      - name: Install Playwright

        run: npx playwright install --with-deps



      - name: Run Playwright tests

        run: npx playwright test

        env:

          PLAYWRIGHT_TEST_BASE_URL: ${{ github.event.deployment_status.target_url }}

```



#### GitLab CI Configuration



```yaml

# .gitlab-ci.yml

stages:

  - test



playwright-tests:

  stage: test

  image: mcr.microsoft.com/playwright:v1.56.1-noble

  script:

    - npm ci

    - npx playwright test

  artifacts:

    when: always

    paths:

      - playwright-report/

      - test-results/

    expire_in: 30 days

```



#### Jenkins Pipeline



```groovy

pipeline {

  agent {

    docker {

      image 'mcr.microsoft.com/playwright:v1.56.1-noble'

    }

  }



  stages {

    stage('Install') {

      steps {

        sh 'npm ci'

      }

    }



    stage('Test') {

      steps {

        sh 'npx playwright test'

      }

    }

  }



  post {

    always {

      publishHTML([

        allowMissing: false,

        alwaysLinkToLastBuild: true,

        keepAll: true,

        reportDir: 'playwright-report',

        reportFiles: 'index.html',

        reportName: 'Playwright Test Report'

      ])

    }

  }

}

```



**Best Practices for CI/CD:**

1. Use Docker containers for consistent environments

2. Cache node_modules for faster builds

3. Run tests in headless mode

4. Set workers to 1 or use sharding for stability

5. Upload artifacts (reports, traces) for debugging

6. Set appropriate timeouts

7. Run tests on PR and main branch

8. Consider running on staging/preview deployments



**Source:** [Playwright CI Documentation](https://playwright.dev/docs/ci)



### 3.6 Screenshot and Video Capture for Debugging



#### Configuration



```typescript

// playwright.config.ts

export default defineConfig({

  use: {

    // Take screenshot on failure

    screenshot: 'only-on-failure',



    // Record video on first retry

    video: 'on-first-retry',



    // OR record video for all tests

    // video: 'on',



    // Video size

    video: {

      mode: 'on-first-retry',

      size: { width: 1280, height: 720 }

    },

  },

});

```



#### Screenshot Options



```typescript

use: {

  screenshot: 'off',              // Never take screenshots

  screenshot: 'on',               // Always take screenshots

  screenshot: 'only-on-failure',  // Only on test failure

}

```



#### Video Options



```typescript

use: {

  video: 'off',              // Never record video

  video: 'on',               // Always record video

  video: 'retain-on-failure', // Keep video only on failure

  video: 'on-first-retry',   // Record only on first retry

}

```



#### Programmatic Screenshots



```typescript

test('manual screenshot', async ({ page }) => {

  await page.goto('/dashboard');



  // Full page screenshot

  await page.screenshot({ path: 'screenshots/dashboard.png', fullPage: true });



  // Element screenshot

  const element = page.getByRole('button', { name: 'Submit' });

  await element.screenshot({ path: 'screenshots/submit-button.png' });

});

```



#### Accessing Videos After Test



```typescript

test('accessing video path', async ({ page }, testInfo) => {

  await page.goto('/');



  // Video is available after test completes

  const videoPath = await page.video()?.path();

  console.log('Video saved to:', videoPath);



  // Attach to test report

  testInfo.attachments.push({

    name: 'video',

    path: videoPath!,

    contentType: 'video/webm'

  });

});

```



#### CI Configuration for Artifacts



```yaml

# GitHub Actions

- uses: actions/upload-artifact@v4

  if: always()

  with:

    name: playwright-screenshots

    path: test-results/**/screenshots/



- uses: actions/upload-artifact@v4

  if: always()

  with:

    name: playwright-videos

    path: test-results/**/video/

```



**Best Practices:**

1. Use `only-on-failure` for screenshots to save space

2. Use `on-first-retry` for videos (expensive storage)

3. Configure lower resolution for videos (720p sufficient)

4. Clean up old artifacts in CI to save storage costs

5. Upload to artifact storage with retention policies



**Source:** [Playwright Videos Documentation](https://playwright.dev/docs/videos)



### 3.7 Testing Accessibility in E2E Tests



#### Installing Axe-Core



```bash

npm install -D @axe-core/playwright

```



#### Basic Accessibility Test



```typescript

import { test, expect } from '@playwright/test';

import AxeBuilder from '@axe-core/playwright';



test('homepage should not have accessibility violations', async ({ page }) => {

  await page.goto('/');



  // Run accessibility scan

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();



  // Assert no violations

  expect(accessibilityScanResults.violations).toEqual([]);

});

```



#### Testing Specific WCAG Standards



```typescript

test('should pass WCAG 2.1 Level AA', async ({ page }) => {

  await page.goto('/products');



  const results = await new AxeBuilder({ page })

    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])

    .analyze();



  expect(results.violations).toEqual([]);

});

```



#### Scanning Specific Elements



```typescript

test('form should be accessible', async ({ page }) => {

  await page.goto('/contact');



  const results = await new AxeBuilder({ page })

    .include('#contact-form')

    .analyze();



  expect(results.violations).toEqual([]);

});

```



#### Excluding Known Issues



```typescript

test('homepage accessibility (with exclusions)', async ({ page }) => {

  await page.goto('/');



  const results = await new AxeBuilder({ page })

    .exclude('.third-party-widget')  // Exclude elements

    .disableRules(['color-contrast']) // Temporarily disable rules

    .analyze();



  expect(results.violations).toEqual([]);

});

```



#### Detailed Violation Reporting



```typescript

test('generate detailed accessibility report', async ({ page }) => {

  await page.goto('/dashboard');



  const results = await new AxeBuilder({ page }).analyze();



  if (results.violations.length > 0) {

    console.log('Accessibility Violations:');

    results.violations.forEach((violation) => {

      console.log(`\n${violation.id}: ${violation.description}`);

      console.log(`Impact: ${violation.impact}`);

      console.log(`Help: ${violation.helpUrl}`);



      violation.nodes.forEach((node) => {

        console.log(`  - ${node.html}`);

        console.log(`    ${node.failureSummary}`);

      });

    });

  }



  expect(results.violations).toEqual([]);

});

```



#### Testing Dynamic Content



```typescript

test('modal dialog accessibility', async ({ page }) => {

  await page.goto('/settings');



  // Open modal

  await page.getByRole('button', { name: 'Delete Account' }).click();



  // Wait for modal to be visible

  await page.getByRole('dialog').waitFor();



  // Scan modal

  const results = await new AxeBuilder({ page })

    .include('[role="dialog"]')

    .analyze();



  expect(results.violations).toEqual([]);

});

```



#### Comprehensive Accessibility Suite



```typescript

import { test, expect } from '@playwright/test';

import AxeBuilder from '@axe-core/playwright';



const pages = [

  { name: 'Home', url: '/' },

  { name: 'About', url: '/about' },

  { name: 'Products', url: '/products' },

  { name: 'Contact', url: '/contact' },

];



pages.forEach(({ name, url }) => {

  test(`${name} page should be accessible`, async ({ page }) => {

    await page.goto(url);



    const results = await new AxeBuilder({ page })

      .withTags(['wcag2a', 'wcag2aa'])

      .analyze();



    expect(results.violations).toEqual([]);

  });

});

```



#### CI Integration



```yaml

# .github/workflows/accessibility.yml

name: Accessibility Tests



on: [push, pull_request]



jobs:

  test:

    runs-on: ubuntu-latest

    steps:

      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4



      - name: Install dependencies

        run: npm ci



      - name: Install Playwright

        run: npx playwright install --with-deps



      - name: Run accessibility tests

        run: npx playwright test --grep @a11y



      - name: Upload accessibility report

        if: always()

        uses: actions/upload-artifact@v4

        with:

          name: accessibility-report

          path: playwright-report/

```



**Tag Accessibility Tests:**



```typescript

test('homepage accessibility @a11y', async ({ page }) => {

  await page.goto('/');

  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);

});

```



**Common Accessibility Issues to Test:**

1. Missing alt text on images

2. Form inputs without labels

3. Insufficient color contrast

4. Missing ARIA labels

5. Keyboard navigation issues

6. Missing page titles

7. Improper heading hierarchy



**Source:** [Playwright Accessibility Testing](https://playwright.dev/docs/accessibility-testing)



---



## 4. Next.js 16 Specific Considerations



### 4.1 Testing Server Components in E2E Context



#### Understanding Server Components



Next.js 16 Server Components:

- Render on the server

- Don't have client-side JavaScript

- Cannot use hooks like `useState` or `useEffect`

- Can directly access databases and APIs

- Improve performance and reduce bundle size



#### Key Testing Challenge



Traditional mocking approaches (like `page.route()`) only work for **client-side requests**. Server Components make requests on the server before HTML is sent to the browser.



**Solution:** Use Next.js 15+ experimental test mode with MSW.



#### Setting Up Next.js Test Mode



**next.config.ts:**



```typescript

import type { NextConfig } from 'next';



const nextConfig: NextConfig = {

  experimental: {

    testProxy: true, // Enable test mode

  },

};



export default nextConfig;

```



#### Testing Server Component with Data Fetching



**Component (app/products/page.tsx):**



```typescript

// Server Component

export default async function ProductsPage() {

  const response = await fetch('https://api.example.com/products');

  const products = await response.json();



  return (

    <div>

      <h1>Products</h1>

      <ul>

        {products.map((product) => (

          <li key={product.id}>{product.name}</li>

        ))}

      </ul>

    </div>

  );

}

```



**Test:**



```typescript

import { test, expect, http, HttpResponse } from 'next/experimental/testmode/playwright/msw';



test.use({

  mswHandlers: [

    [

      http.get('https://api.example.com/products', () => {

        return HttpResponse.json([

          { id: 1, name: 'Product 1', price: 29.99 },

          { id: 2, name: 'Product 2', price: 39.99 },

        ]);

      }),

    ],

    { scope: 'test' },

  ],

});



test('displays products from API', async ({ page }) => {

  await page.goto('/products');



  // Server Component renders with mocked data

  await expect(page.getByText('Product 1')).toBeVisible();

  await expect(page.getByText('Product 2')).toBeVisible();

});

```



#### Testing Server Component Error States



```typescript

test.use({

  mswHandlers: [

    [

      http.get('https://api.example.com/products', () => {

        return HttpResponse.json(

          { error: 'Internal Server Error' },

          { status: 500 }

        );

      }),

    ],

    { scope: 'test' },

  ],

});



test('handles API error gracefully', async ({ page }) => {

  await page.goto('/products');



  await expect(page.getByText('Failed to load products')).toBeVisible();

  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();

});

```



#### Testing Server Component with Streaming



```typescript

test('displays streamed product list', async ({ page }) => {

  await page.goto('/products');



  // Wait for suspense boundary to resolve

  await expect(page.getByText('Loading products...')).toBeVisible();



  // Wait for content to stream in

  await expect(page.getByText('Product 1')).toBeVisible({ timeout: 10000 });

});

```



**Source:** [Next.js Testing Documentation](https://nextjs.org/docs/app/guides/testing)



### 4.2 Testing Server Actions



#### What are Server Actions?



Server Actions are asynchronous functions that run on the server and can be called from Client Components:



```typescript

// app/actions.ts

'use server';



export async function createPost(formData: FormData) {

  const title = formData.get('title');

  const content = formData.get('content');



  // Database operation

  const post = await db.post.create({

    data: { title, content },

  });



  revalidatePath('/posts');

  return { success: true, postId: post.id };

}

```



#### Testing Challenge



Server Actions bypass traditional HTTP endpoints, making them difficult to mock with standard techniques.



#### Approach 1: Test via UI (Recommended)



```typescript

import { test, expect } from '@playwright/test';



test('user can create post via form', async ({ page }) => {

  await page.goto('/posts/new');



  // Fill form

  await page.getByLabel('Title').fill('My New Post');

  await page.getByLabel('Content').fill('This is the post content');



  // Submit (triggers Server Action)

  await page.getByRole('button', { name: 'Publish' }).click();



  // Verify success

  await expect(page.getByText('Post published successfully')).toBeVisible();



  // Verify redirect

  await expect(page).toHaveURL(/\/posts\/\d+/);



  // Verify post appears

  await expect(page.getByText('My New Post')).toBeVisible();

});

```



#### Approach 2: Mock Database Layer



Instead of mocking the Server Action itself, mock the underlying database:



```typescript

// tests/helpers/db-mock.ts

import { PrismaClient } from '@prisma/client';

import { mockDeep, mockReset } from 'jest-mock-extended';



const prisma = mockDeep<PrismaClient>();



export function setupDatabaseMock() {

  mockReset(prisma);



  prisma.post.create.mockResolvedValue({

    id: 1,

    title: 'Mocked Post',

    content: 'Mocked content',

    createdAt: new Date(),

  });



  return prisma;

}

```



#### Approach 3: Test in Isolation



Test Server Actions directly (unit test approach):



```typescript

// tests/server-actions/posts.test.ts

import { describe, test, expect } from 'vitest';

import { createPost } from '@/app/actions';



describe('createPost', () => {

  test('creates post with valid data', async () => {

    const formData = new FormData();

    formData.append('title', 'Test Post');

    formData.append('content', 'Test content');



    const result = await createPost(formData);



    expect(result.success).toBe(true);

    expect(result.postId).toBeDefined();

  });



  test('validates required fields', async () => {

    const formData = new FormData();

    // Missing title



    await expect(createPost(formData)).rejects.toThrow('Title is required');

  });

});

```



#### Approach 4: Mock Network Requests (Experimental)



```typescript

import { test, expect, http, HttpResponse } from 'next/experimental/testmode/playwright/msw';



test.use({

  mswHandlers: [

    [

      // Intercept Server Action POST

      http.post('*', async ({ request }) => {

        const url = new URL(request.url);



        // Check if it's a Server Action

        if (url.searchParams.has('_rsc')) {

          return HttpResponse.json({

            success: true,

            postId: 123,

          });

        }



        return passthrough();

      }),

    ],

    { scope: 'test' },

  ],

});



test('form submission with mocked server action', async ({ page }) => {

  await page.goto('/posts/new');

  await page.getByLabel('Title').fill('Test Post');

  await page.getByRole('button', { name: 'Publish' }).click();



  await expect(page.getByText('Post published')).toBeVisible();

});

```



**Best Practice:**

- E2E tests should test Server Actions through the UI

- Use integration/unit tests to test Server Action logic in isolation

- Mock the database layer, not the Server Action itself



**Source:** [Next.js Server Actions Testing Discussion](https://github.com/vercel/next.js/discussions/67136)



### 4.3 Testing Streaming and Suspense Boundaries



#### Understanding Next.js 16 Streaming



Next.js 16 supports streaming HTML:

1. Server starts sending HTML immediately

2. Suspense boundaries show loading states

3. Components stream in as they complete



#### Testing Streaming Components



**Component (app/dashboard/page.tsx):**



```typescript

import { Suspense } from 'react';



async function SlowData() {

  // Simulates slow data fetch

  await new Promise(resolve => setTimeout(resolve, 2000));

  return <div>Slow data loaded</div>;

}



function Loading() {

  return <div>Loading slow data...</div>;

}



export default function Dashboard() {

  return (

    <div>

      <h1>Dashboard</h1>

      <div>Fast content</div>



      <Suspense fallback={<Loading />}>

        <SlowData />

      </Suspense>

    </div>

  );

}

```



**Test:**



```typescript

test('handles streaming with suspense', async ({ page }) => {

  await page.goto('/dashboard');



  // Fast content appears immediately

  await expect(page.getByText('Fast content')).toBeVisible();



  // Loading state visible while slow data loads

  await expect(page.getByText('Loading slow data...')).toBeVisible();



  // Wait for slow data to stream in

  await expect(page.getByText('Slow data loaded')).toBeVisible({

    timeout: 5000

  });



  // Loading state should be gone

  await expect(page.getByText('Loading slow data...')).not.toBeVisible();

});

```



#### Testing Multiple Streaming Sections



```typescript

test('multiple suspense boundaries stream independently', async ({ page }) => {

  await page.goto('/dashboard');



  // All loading states should be visible initially

  await expect(page.getByText('Loading users...')).toBeVisible();

  await expect(page.getByText('Loading posts...')).toBeVisible();

  await expect(page.getByText('Loading stats...')).toBeVisible();



  // Wait for each to complete (may complete in any order)

  await Promise.all([

    page.getByText('Users loaded').waitFor(),

    page.getByText('Posts loaded').waitFor(),

    page.getByText('Stats loaded').waitFor(),

  ]);

});

```



#### Testing Streaming Error Boundaries



```typescript

test('error boundary catches streaming errors', async ({ page }) => {

  // Mock API to return error

  await page.route('**/api/slow-data', route => {

    route.fulfill({ status: 500, body: 'Server error' });

  });



  await page.goto('/dashboard');



  // Loading state first

  await expect(page.getByText('Loading...')).toBeVisible();



  // Then error boundary

  await expect(page.getByText('Failed to load data')).toBeVisible();

  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();

});

```



#### Testing Progressive Enhancement



```typescript

test('page works with JS disabled (SSR)', async ({ page }) => {

  // Disable JavaScript

  await page.setJavaScriptEnabled(false);



  await page.goto('/products');



  // Server-rendered content should be visible

  await expect(page.getByText('Products')).toBeVisible();

  await expect(page.locator('article').first()).toBeVisible();

});

```



**Source:** [Next.js Streaming Documentation](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)



### 4.4 Testing with Turbopack in Development



#### What is Turbopack?



Turbopack is the new default bundler in Next.js 16, replacing Webpack in development mode. It offers:

- 5-10x faster Fast Refresh

- 2-5x faster builds

- File system caching (beta)



#### Configuration for Testing



**next.config.ts:**



```typescript

import type { NextConfig } from 'next';



const nextConfig: NextConfig = {

  // Turbopack is default in Next.js 16

  experimental: {

    turbo: {

      // Enable caching for faster subsequent runs

      cache: true,

    },

  },

};



export default nextConfig;

```



#### Testing Considerations



1. **Fast Refresh During Test Development**



Turbopack's Fast Refresh is nearly instantaneous, making test development smoother:



```bash

# Run tests in watch mode with dev server

npm run dev &

npx playwright test --ui

```



2. **Test Both Dev and Production Modes**



Turbopack is only used in development. Always test production builds:



```typescript

// playwright.config.ts

export default defineConfig({

  projects: [

    {

      name: 'dev-mode',

      use: { baseURL: 'http://localhost:3000' },

      webServer: {

        command: 'npm run dev',

        url: 'http://localhost:3000',

      },

    },

    {

      name: 'production',

      use: { baseURL: 'http://localhost:3000' },

      webServer: {

        command: 'npm run build && npm run start',

        url: 'http://localhost:3000',

      },

    },

  ],

});

```



3. **Hot Module Replacement (HMR) Testing**



```typescript

test('hot module replacement updates UI', async ({ page }) => {

  await page.goto('/');



  // Get initial content

  const initialText = await page.textContent('h1');



  // In a real scenario, you would modify the component file here

  // Turbopack would automatically refresh the page



  // Wait for HMR update

  await page.waitForTimeout(1000);



  // Verify content updated without full page reload

  const updatedText = await page.textContent('h1');

  // Assert updatedText reflects the change

});

```



4. **File System Watching**



Turbopack watches files more efficiently. Test that changes are detected:



```bash

# Terminal 1: Dev server

npm run dev



# Terminal 2: Watch mode tests

npx playwright test --watch

```



5. **Source Maps in Error Traces**



Turbopack provides better source maps:



```typescript

test('error traces show correct source location', async ({ page }) => {

  page.on('pageerror', error => {

    console.log('Error:', error.message);

    console.log('Stack:', error.stack);



    // With Turbopack, stack traces point to actual source files

    expect(error.stack).toContain('app/components/Button.tsx');

  });



  await page.goto('/page-with-error');

});

```



**Testing Strategy:**

- **Development**: Use Turbopack for fast iteration

- **CI/CD**: Test production builds (Webpack by default for builds)

- **Pre-release**: Test both dev and prod modes for parity



**Source:** [Next.js 16 Turbopack Documentation](https://nextjs.org/blog/next-16)



### 4.5 Next.js 16 New Features and Testing Implications



#### Cache Components (PPR - Partial Pre-Rendering)



Next.js 16 introduces intelligent caching at the component level:



```typescript

// app/dashboard/page.tsx

import { cache } from 'next/cache';



// Cache this component's data

const getCachedData = cache(async () => {

  return await fetch('https://api.example.com/data').then(r => r.json());

});



export default async function Dashboard() {

  const data = await getCachedData();

  return <div>{data.message}</div>;

}

```



**Testing cached components:**



```typescript

test('cached component updates after revalidation', async ({ page }) => {

  // First load - cache MISS

  await page.goto('/dashboard');

  const firstLoad = await page.textContent('[data-testid="message"]');



  // Reload - cache HIT (same content)

  await page.reload();

  const secondLoad = await page.textContent('[data-testid="message"]');

  expect(secondLoad).toBe(firstLoad);



  // Trigger revalidation (via API or time-based)

  await page.evaluate(() => fetch('/api/revalidate'));



  // Next load should show new data

  await page.reload();

  const thirdLoad = await page.textContent('[data-testid="message"]');

  // May be different if cache was invalidated

});

```



#### Improved Caching APIs: `updateTag()` and `revalidateTag()`



```typescript

// app/actions.ts

'use server';



import { revalidateTag, updateTag } from 'next/cache';



export async function updatePost(id: string) {

  await db.post.update({ where: { id } });



  // Revalidate specific cache tags

  await revalidateTag('posts', { cacheLife: 'minutes' });

  // OR update cache inline

  await updateTag('posts', newData);

}

```



**Testing:**



```typescript

test('cache invalidation after update', async ({ page }) => {

  await page.goto('/posts');



  // Initial posts list

  await expect(page.getByText('Post 1')).toBeVisible();



  // Update a post (triggers revalidateTag)

  await page.goto('/posts/1/edit');

  await page.getByLabel('Title').fill('Updated Post 1');

  await page.getByRole('button', { name: 'Save' }).click();



  // Navigate back to list

  await page.goto('/posts');



  // Should see updated post (cache was invalidated)

  await expect(page.getByText('Updated Post 1')).toBeVisible();

});

```



#### Turbopack File System Caching (Beta)



Faster subsequent builds:



```typescript

// playwright.config.ts

export default defineConfig({

  webServer: {

    command: 'npm run dev',

    url: 'http://localhost:3000',

    reuseExistingServer: true, // Reuse for faster test runs

  },

});

```



**Source:** [Next.js 16 Release Blog](https://nextjs.org/blog/next-16)



---



## 5. Code Examples



### 5.1 Complete E2E Test Example: E-Commerce Checkout Flow



```typescript

// tests/e2e/checkout-flow.spec.ts

import { test, expect } from '@playwright/test';



test.describe('E-Commerce Checkout Flow', () => {

  test.beforeEach(async ({ page }) => {

    // Setup: Login as test user

    await page.goto('/login');

    await page.getByLabel('Email').fill('test@example.com');

    await page.getByLabel('Password').fill('password123');

    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/');

  });



  test('complete purchase flow from product to order confirmation', async ({ page }) => {

    // Step 1: Browse products

    await page.goto('/products');

    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();



    // Step 2: View product details

    await page.getByRole('link', { name: 'Laptop Pro' }).click();

    await expect(page).toHaveURL(/\/products\/\d+/);

    await expect(page.getByRole('heading', { name: 'Laptop Pro' })).toBeVisible();



    // Step 3: Add to cart

    await page.getByRole('button', { name: 'Add to Cart' }).click();

    await expect(page.getByText('Added to cart')).toBeVisible();

    await expect(page.getByRole('link', { name: /Cart \(1\)/ })).toBeVisible();



    // Step 4: View cart

    await page.getByRole('link', { name: /Cart/ }).click();

    await expect(page).toHaveURL('/cart');

    await expect(page.getByText('Laptop Pro')).toBeVisible();

    await expect(page.getByText('$999.00')).toBeVisible();



    // Step 5: Update quantity

    const quantityInput = page.getByLabel('Quantity');

    await quantityInput.fill('2');

    await page.getByRole('button', { name: 'Update Cart' }).click();

    await expect(page.getByText('$1,998.00')).toBeVisible(); // Updated total



    // Step 6: Proceed to checkout

    await page.getByRole('button', { name: 'Proceed to Checkout' }).click();

    await expect(page).toHaveURL('/checkout');



    // Step 7: Fill shipping information

    await page.getByLabel('Full Name').fill('John Doe');

    await page.getByLabel('Address Line 1').fill('123 Main St');

    await page.getByLabel('City').fill('New York');

    await page.getByLabel('State').selectOption('NY');

    await page.getByLabel('ZIP Code').fill('10001');

    await page.getByLabel('Phone').fill('555-0100');



    // Step 8: Select shipping method

    await page.getByLabel('Standard Shipping ($5.99)').check();



    // Step 9: Continue to payment

    await page.getByRole('button', { name: 'Continue to Payment' }).click();



    // Step 10: Fill payment information

    await page.getByLabel('Card Number').fill('4111111111111111');

    await page.getByLabel('Card Holder Name').fill('John Doe');

    await page.getByLabel('Expiration Date').fill('12/25');

    await page.getByLabel('CVV').fill('123');



    // Step 11: Review order

    await page.getByRole('button', { name: 'Review Order' }).click();

    await expect(page.getByText('Order Summary')).toBeVisible();

    await expect(page.getByText('Laptop Pro × 2')).toBeVisible();

    await expect(page.getByText('Subtotal: $1,998.00')).toBeVisible();

    await expect(page.getByText('Shipping: $5.99')).toBeVisible();

    await expect(page.getByText('Total: $2,003.99')).toBeVisible();



    // Step 12: Place order

    await page.getByRole('button', { name: 'Place Order' }).click();



    // Step 13: Verify order confirmation

    await expect(page).toHaveURL(/\/orders\/\d+/);

    await expect(page.getByText('Order Confirmed')).toBeVisible();

    await expect(page.getByText(/Order #[A-Z0-9]+/)).toBeVisible();

    await expect(page.getByText('Thank you for your purchase!')).toBeVisible();



    // Step 14: Verify order details

    await expect(page.getByText('Laptop Pro × 2')).toBeVisible();

    await expect(page.getByText('$2,003.99')).toBeVisible();

    await expect(page.getByText('123 Main St')).toBeVisible();



    // Step 15: Verify confirmation email (if applicable)

    const confirmationEmail = page.getByText(/A confirmation email has been sent to/);

    await expect(confirmationEmail).toBeVisible();

  });



  test('validates required fields in checkout form', async ({ page }) => {

    // Add item to cart

    await page.goto('/products/1');

    await page.getByRole('button', { name: 'Add to Cart' }).click();

    await page.getByRole('link', { name: /Cart/ }).click();

    await page.getByRole('button', { name: 'Proceed to Checkout' }).click();



    // Try to submit without filling required fields

    await page.getByRole('button', { name: 'Continue to Payment' }).click();



    // Verify validation errors

    await expect(page.getByText('Full Name is required')).toBeVisible();

    await expect(page.getByText('Address is required')).toBeVisible();

    await expect(page.getByText('City is required')).toBeVisible();

    await expect(page.getByText('ZIP Code is required')).toBeVisible();

  });



  test('applies promo code correctly', async ({ page }) => {

    await page.goto('/products/1');

    await page.getByRole('button', { name: 'Add to Cart' }).click();

    await page.getByRole('link', { name: /Cart/ }).click();



    // Apply promo code

    await page.getByLabel('Promo Code').fill('SAVE10');

    await page.getByRole('button', { name: 'Apply' }).click();



    await expect(page.getByText('Promo code applied')).toBeVisible();

    await expect(page.getByText('Discount: -$99.90')).toBeVisible();

    await expect(page.getByText('Total: $899.10')).toBeVisible(); // 10% off

  });



  test('handles out of stock items', async ({ page }) => {

    await page.goto('/products/999'); // Product marked as out of stock



    await expect(page.getByText('Out of Stock')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Add to Cart' })).toBeDisabled();

    await expect(page.getByRole('button', { name: 'Notify When Available' })).toBeVisible();

  });

});

```



### 5.2 Page Object Model Implementation



```typescript

// page-objects/base-page.ts

import { Page, Locator } from '@playwright/test';



export class BasePage {

  readonly page: Page;



  constructor(page: Page) {

    this.page = page;

  }



  async goto(path: string) {

    await this.page.goto(path);

  }



  async waitForPageLoad() {

    await this.page.waitForLoadState('domcontentloaded');

  }



  async takeScreenshot(name: string) {

    await this.page.screenshot({ path: `screenshots/${name}.png` });

  }

}

```



```typescript

// page-objects/products-page.ts

import { Page, Locator, expect } from '@playwright/test';

import { BasePage } from './base-page';



export class ProductsPage extends BasePage {

  readonly heading: Locator;

  readonly productCards: Locator;

  readonly searchInput: Locator;

  readonly filterDropdown: Locator;

  readonly sortDropdown: Locator;



  constructor(page: Page) {

    super(page);

    this.heading = page.getByRole('heading', { name: 'Products' });

    this.productCards = page.locator('[data-testid="product-card"]');

    this.searchInput = page.getByPlaceholder('Search products...');

    this.filterDropdown = page.getByLabel('Filter by category');

    this.sortDropdown = page.getByLabel('Sort by');

  }



  async goto() {

    await super.goto('/products');

    await expect(this.heading).toBeVisible();

  }



  async searchProducts(query: string) {

    await this.searchInput.fill(query);

    await this.searchInput.press('Enter');

  }



  async filterByCategory(category: string) {

    await this.filterDropdown.selectOption(category);

  }



  async sortBy(option: string) {

    await this.sortDropdown.selectOption(option);

  }



  async getProductCount(): Promise<number> {

    return await this.productCards.count();

  }



  async clickProduct(name: string) {

    await this.productCards.filter({ hasText: name }).click();

  }



  async expectProductVisible(name: string) {

    await expect(this.productCards.filter({ hasText: name })).toBeVisible();

  }

}

```



```typescript

// page-objects/cart-page.ts

import { Page, Locator, expect } from '@playwright/test';

import { BasePage } from './base-page';



export class CartPage extends BasePage {

  readonly cartItems: Locator;

  readonly emptyCartMessage: Locator;

  readonly subtotal: Locator;

  readonly checkoutButton: Locator;



  constructor(page: Page) {

    super(page);

    this.cartItems = page.locator('[data-testid="cart-item"]');

    this.emptyCartMessage = page.getByText('Your cart is empty');

    this.subtotal = page.locator('[data-testid="subtotal"]');

    this.checkoutButton = page.getByRole('button', { name: 'Proceed to Checkout' });

  }



  async goto() {

    await super.goto('/cart');

  }



  async getItemCount(): Promise<number> {

    return await this.cartItems.count();

  }



  async removeItem(productName: string) {

    const item = this.cartItems.filter({ hasText: productName });

    await item.getByRole('button', { name: 'Remove' }).click();

  }



  async updateQuantity(productName: string, quantity: number) {

    const item = this.cartItems.filter({ hasText: productName });

    await item.getByLabel('Quantity').fill(quantity.toString());

    await item.getByRole('button', { name: 'Update' }).click();

  }



  async proceedToCheckout() {

    await this.checkoutButton.click();

  }



  async expectItemInCart(productName: string) {

    await expect(this.cartItems.filter({ hasText: productName })).toBeVisible();

  }



  async expectCartEmpty() {

    await expect(this.emptyCartMessage).toBeVisible();

  }



  async getSubtotal(): Promise<string> {

    return await this.subtotal.textContent() || '';

  }

}

```



```typescript

// tests/e2e/shopping-cart.spec.ts

import { test, expect } from '@playwright/test';

import { ProductsPage } from '../page-objects/products-page';

import { CartPage } from '../page-objects/cart-page';



test('add and remove items from cart', async ({ page }) => {

  const productsPage = new ProductsPage(page);

  const cartPage = new CartPage(page);



  // Browse products

  await productsPage.goto();

  await productsPage.clickProduct('Laptop Pro');



  // Add to cart

  await page.getByRole('button', { name: 'Add to Cart' }).click();



  // View cart

  await cartPage.goto();

  await cartPage.expectItemInCart('Laptop Pro');

  expect(await cartPage.getItemCount()).toBe(1);



  // Remove item

  await cartPage.removeItem('Laptop Pro');

  await cartPage.expectCartEmpty();

  expect(await cartPage.getItemCount()).toBe(0);

});

```



### 5.3 Authentication Fixture



```typescript

// fixtures/authenticated-page.ts

import { test as baseTest, expect } from '@playwright/test';

import path from 'path';

import fs from 'fs';



// Define types for our custom fixtures

type AuthFixtures = {

  authenticatedPage: Page;

};



export const test = baseTest.extend<AuthFixtures>({

  authenticatedPage: async ({ browser }, use) => {

    const authFile = path.join(__dirname, '../playwright/.auth/user.json');



    // Create context with saved auth state

    const context = await browser.newContext({

      storageState: authFile,

    });



    const page = await context.newPage();



    // Verify authentication is valid

    await page.goto('/dashboard');

    await expect(page.getByRole('button', { name: 'Profile' })).toBeVisible();



    await use(page);



    // Cleanup

    await context.close();

  },

});



export { expect };

```



**Usage:**



```typescript

import { test, expect } from '../fixtures/authenticated-page';



test('authenticated user can access dashboard', async ({ authenticatedPage }) => {

  // Page is already authenticated and navigated to dashboard

  await expect(authenticatedPage.getByText('Welcome back')).toBeVisible();

});

```



### 5.4 Test Data Factory



```typescript

// helpers/test-data-factory.ts

import { faker } from '@faker-js/faker';



export class TestDataFactory {

  static createUser() {

    return {

      email: faker.internet.email(),

      password: faker.internet.password({ length: 12 }),

      firstName: faker.person.firstName(),

      lastName: faker.person.lastName(),

      phone: faker.phone.number(),

    };

  }



  static createProduct() {

    return {

      name: faker.commerce.productName(),

      description: faker.commerce.productDescription(),

      price: parseFloat(faker.commerce.price()),

      category: faker.commerce.department(),

      inStock: faker.datatype.boolean(),

    };

  }



  static createOrder(productCount: number = 2) {

    return {

      orderId: faker.string.uuid(),

      items: Array.from({ length: productCount }, () => ({

        product: this.createProduct(),

        quantity: faker.number.int({ min: 1, max: 5 }),

      })),

      shippingAddress: {

        street: faker.location.streetAddress(),

        city: faker.location.city(),

        state: faker.location.state({ abbreviated: true }),

        zip: faker.location.zipCode(),

      },

      paymentMethod: {

        cardNumber: '**** **** **** 1111',

        cardType: 'Visa',

      },

    };

  }



  static createAddress() {

    return {

      street: faker.location.streetAddress(),

      city: faker.location.city(),

      state: faker.location.state(),

      zip: faker.location.zipCode(),

      country: 'United States',

    };

  }

}

```



**Usage:**



```typescript

import { test, expect } from '@playwright/test';

import { TestDataFactory } from '../helpers/test-data-factory';



test('user registration with generated data', async ({ page }) => {

  const user = TestDataFactory.createUser();



  await page.goto('/signup');

  await page.getByLabel('First Name').fill(user.firstName);

  await page.getByLabel('Last Name').fill(user.lastName);

  await page.getByLabel('Email').fill(user.email);

  await page.getByLabel('Password').fill(user.password);

  await page.getByRole('button', { name: 'Sign Up' }).click();



  await expect(page.getByText('Registration successful')).toBeVisible();

});

```



### 5.5 API Helper for Test Setup



```typescript

// helpers/api-helpers.ts

import { APIRequestContext } from '@playwright/test';



export class ApiHelpers {

  constructor(private request: APIRequestContext) {}



  async createTestUser(userData: any) {

    const response = await this.request.post('/api/users', {

      data: userData,

    });

    expect(response.ok()).toBeTruthy();

    return await response.json();

  }



  async deleteTestUser(userId: string) {

    const response = await this.request.delete(`/api/users/${userId}`);

    expect(response.ok()).toBeTruthy();

  }



  async createTestProduct(productData: any) {

    const response = await this.request.post('/api/products', {

      data: productData,

    });

    expect(response.ok()).toBeTruthy();

    return await response.json();

  }



  async clearCart(userId: string) {

    const response = await this.request.delete(`/api/cart/${userId}`);

    expect(response.ok()).toBeTruthy();

  }



  async seedDatabase() {

    const response = await this.request.post('/api/test/seed');

    expect(response.ok()).toBeTruthy();

  }



  async cleanDatabase() {

    const response = await this.request.post('/api/test/clean');

    expect(response.ok()).toBeTruthy();

  }

}

```



**Usage:**



```typescript

import { test, expect } from '@playwright/test';

import { ApiHelpers } from '../helpers/api-helpers';

import { TestDataFactory } from '../helpers/test-data-factory';



test.describe('Product Management', () => {

  let apiHelpers: ApiHelpers;

  let testProductId: string;



  test.beforeAll(async ({ request }) => {

    apiHelpers = new ApiHelpers(request);

    await apiHelpers.seedDatabase();

  });



  test.afterAll(async () => {

    await apiHelpers.cleanDatabase();

  });



  test('admin can create product', async ({ page }) => {

    const product = TestDataFactory.createProduct();



    await page.goto('/admin/products/new');

    await page.getByLabel('Product Name').fill(product.name);

    await page.getByLabel('Description').fill(product.description);

    await page.getByLabel('Price').fill(product.price.toString());

    await page.getByRole('button', { name: 'Create Product' }).click();



    await expect(page.getByText('Product created successfully')).toBeVisible();

  });

});

```



---



## 6. Additional Resources



### Official Documentation



1. **Playwright Documentation**

   - [https://playwright.dev/docs/intro](https://playwright.dev/docs/intro)

   - Comprehensive guide to all Playwright features



2. **Next.js Testing Documentation**

   - [https://nextjs.org/docs/app/guides/testing](https://nextjs.org/docs/app/guides/testing)

   - Official guide for testing Next.js applications



3. **Next.js with Playwright Example**

   - [https://github.com/vercel/next.js/tree/canary/examples/with-playwright](https://github.com/vercel/next.js/tree/canary/examples/with-playwright)

   - Official example repository



4. **Playwright Best Practices**

   - [https://playwright.dev/docs/best-practices](https://playwright.dev/docs/best-practices)

   - Recommended patterns and anti-patterns



5. **Playwright CI Documentation**

   - [https://playwright.dev/docs/ci](https://playwright.dev/docs/ci)

   - CI/CD integration guides



### Tutorials and Guides



1. **Strapi - Next.js Testing Guide**

   - [https://strapi.io/blog/nextjs-testing-guide-unit-and-e2e-tests-with-vitest-and-playwright](https://strapi.io/blog/nextjs-testing-guide-unit-and-e2e-tests-with-vitest-and-playwright)

   - Comprehensive guide covering both unit and E2E testing



2. **Momentic - Fetch Mocking with Playwright**

   - [https://momentic.ai/blog/fetch-mocking-with-playwright-next-js](https://momentic.ai/blog/fetch-mocking-with-playwright-next-js)

   - Guide to mocking API calls in Next.js 15+



3. **Posium - Page Object Model Guide**

   - [https://posium.ai/blog/page-object-model-in-playwright](https://posium.ai/blog/page-object-model-in-playwright)

   - Complete guide to implementing POM pattern



4. **Checkly - Accessibility Testing**

   - [https://www.checklyhq.com/blog/integrating-accessibility-checks-in-playwright-tes/](https://www.checklyhq.com/blog/integrating-accessibility-checks-in-playwright-tes/)

   - Integrating accessibility checks with axe-core



5. **Infinite Table - Best Testing Setup**

   - [https://infinite-table.com/blog/2024/04/18/the-best-testing-setup-for-frontends-playwright-nextjs](https://infinite-table.com/blog/2024/04/18/the-best-testing-setup-for-frontends-playwright-nextjs)

   - Comprehensive testing setup guide



### Community Resources



1. **Playwright Discord**

   - [https://discord.com/invite/playwright-807756831384403968](https://discord.com/invite/playwright-807756831384403968)

   - Active community for questions and discussions



2. **Playwright GitHub Discussions**

   - [https://github.com/microsoft/playwright/discussions](https://github.com/microsoft/playwright/discussions)

   - Feature requests, bug reports, and discussions



3. **Next.js GitHub Discussions**

   - [https://github.com/vercel/next.js/discussions](https://github.com/vercel/next.js/discussions)

   - Next.js-specific questions and discussions



### Tools and Libraries



1. **@axe-core/playwright**

   - [https://www.npmjs.com/package/@axe-core/playwright](https://www.npmjs.com/package/@axe-core/playwright)

   - Accessibility testing library



2. **MSW (Mock Service Worker)**

   - [https://mswjs.io/](https://mswjs.io/)

   - API mocking for tests



3. **Faker.js**

   - [https://fakerjs.dev/](https://fakerjs.dev/)

   - Generate realistic test data



4. **Playwright Trace Viewer**

   - [https://trace.playwright.dev/](https://trace.playwright.dev/)

   - Online trace viewer for debugging



### Video Tutorials



1. **Playwright YouTube Channel**

   - [https://www.youtube.com/c/Playwrightdev](https://www.youtube.com/c/Playwrightdev)

   - Official tutorials and feature demos



2. **Vercel YouTube - Next.js Testing**

   - [https://www.youtube.com/c/VercelHQ](https://www.youtube.com/c/VercelHQ)

   - Next.js feature demos and best practices



### Books and Courses



1. **Learn Playwright**

   - [https://nitya.github.io/learn-playwright/](https://nitya.github.io/learn-playwright/)

   - Comprehensive learning path



2. **Test Automation University - Playwright**

   - [https://testautomationu.applitools.com/playwright-advanced/](https://testautomationu.applitools.com/playwright-advanced/)

   - Free courses on Playwright



---



## Conclusion



E2E testing Next.js 16 applications with Playwright requires a comprehensive approach that addresses modern web development challenges:



**Key Takeaways:**



1. **Isolation is Critical**: Use browser contexts and worker-scoped fixtures for reliable parallel execution

2. **Authentication Matters**: Implement setup projects to save and reuse authentication state

3. **Server Components Need Special Handling**: Use Next.js 15+ test mode with MSW for server-side mocking

4. **Page Object Model Improves Maintainability**: Abstract UI interactions into reusable page objects

5. **Streaming and Suspense Are Testable**: Wait for suspense boundaries and streaming content appropriately

6. **CI/CD Integration is Essential**: Use headless execution, parallelization, and trace viewer for debugging

7. **Accessibility Should Be Tested**: Integrate axe-core for automated accessibility checks

8. **Test Real User Workflows**: Focus on end-to-end user journeys, not implementation details



**Testing Strategy Recommendations:**



- **Development**: Use Playwright UI mode with Turbopack for fast iteration

- **Pull Requests**: Run critical path tests (auth, checkout, etc.)

- **Main Branch**: Run full test suite with parallelization or sharding

- **Production Deployments**: Run smoke tests against production environment

- **Nightly**: Run comprehensive suite including accessibility and performance tests



By following the best practices and patterns outlined in this guide, you can build a robust, maintainable E2E testing strategy that scales with your Next.js 16 application and provides confidence in your deployments.



---



**Document Version:** 1.0

**Last Updated:** November 12, 2025

**Total Sources Referenced:** 35+

**Framework Versions:** Next.js 16, Playwright 1.56+
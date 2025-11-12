# Comprehensive Next.js 16 Testing Guide with Vitest



**Research Date:** November 12, 2025

**Focus Areas:** Unit Testing with Vitest, Integration Testing, React Server Components, Server Actions



---



## Executive Summary



This comprehensive guide covers testing strategies for Next.js 16 applications with a focus on Vitest as the primary testing framework. Next.js 16 introduces significant changes including Turbopack as the default bundler, async request APIs, and the renaming of middleware to proxy. This guide addresses these changes and provides actionable testing strategies for modern Next.js applications.



**Key Findings:**

- Next.js 16 officially recommends Vitest for unit testing over Jest due to better Vite/Turbopack integration

- Async React Server Components (RSC) require special handling and testing approaches

- Server Actions need dedicated testing strategies with proper mocking

- Integration testing with real databases is recommended for comprehensive coverage

- Next.js 16 breaking changes impact testing setup, particularly async request APIs



---



## Table of Contents



1. [Unit Testing with Vitest](#1-unit-testing-with-vitest)

2. [Testing React Server Components](#2-testing-react-server-components)

3. [Testing Server Actions](#3-testing-server-actions)

4. [Integration Testing](#4-integration-testing)

5. [Testing Authentication Flows](#5-testing-authentication-flows)

6. [Next.js 16 Specific Changes](#6-nextjs-16-specific-changes)

7. [Best Practices and Patterns](#7-best-practices-and-patterns)

8. [Resources and References](#8-resources-and-references)



---



## 1. Unit Testing with Vitest



### 1.1 Setup and Configuration



#### Installation



Install Vitest and required dependencies:



```bash

# For TypeScript projects

npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths



# For JavaScript projects

npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom

```



**Additional testing utilities:**

```bash

npm install -D @testing-library/jest-dom @testing-library/user-event

```



**Source:** [Next.js Vitest Documentation](https://nextjs.org/docs/app/guides/testing/vitest)



#### Configuration File



Create `vitest.config.mts` (TypeScript) or `vitest.config.js` (JavaScript) at project root:



```typescript

// vitest.config.mts

import { defineConfig } from 'vitest/config'

import react from '@vitejs/plugin-react'

import tsconfigPaths from 'vite-tsconfig-paths'



export default defineConfig({

  plugins: [tsconfigPaths(), react()],

  test: {

    environment: 'jsdom',

    globals: true, // Optional: enables global test APIs

    setupFiles: './vitest.setup.ts', // Optional: setup file

  },

})

```



**Key Configuration Options:**

- `environment: 'jsdom'` - Simulates browser environment for React component testing

- `plugins: [react()]` - Enables React JSX transformation

- `tsconfigPaths()` - Resolves TypeScript path aliases (e.g., `@/components`)



#### Setup File



Create `vitest.setup.ts` for global test configuration:



```typescript

// vitest.setup.ts

import '@testing-library/jest-dom'

```



This extends Jest DOM matchers for better assertions like `toBeInTheDocument()`.



#### Package.json Scripts



```json

{

  "scripts": {

    "test": "vitest",

    "test:ui": "vitest --ui",

    "test:coverage": "vitest --coverage"

  }

}

```



**Source:** [Strapi Next.js Testing Guide](https://strapi.io/blog/nextjs-testing-guide-unit-and-e2e-tests-with-vitest-and-playwright)



---



### 1.2 Testing Client Components



Client components are straightforward to test with React Testing Library:



```typescript

// components/Counter.tsx

'use client'



import { useState } from 'react'



export default function Counter() {

  const [count, setCount] = useState(0)



  return (

    <div>

      <p>Count: {count}</p>

      <button onClick={() => setCount(count + 1)}>Increment</button>

    </div>

  )

}

```



```typescript

// components/__tests__/Counter.test.tsx

import { render, screen, fireEvent } from '@testing-library/react'

import { expect, test, describe } from 'vitest'

import Counter from '../Counter'



describe('Counter', () => {

  test('increments count when button is clicked', () => {

    render(<Counter />)



    expect(screen.getByText('Count: 0')).toBeInTheDocument()



    const button = screen.getByRole('button', { name: 'Increment' })

    fireEvent.click(button)



    expect(screen.getByText('Count: 1')).toBeInTheDocument()

  })

})

```



**Best Practices:**

- Use semantic queries (`getByRole`, `getByLabelText`) over test IDs

- Test user interactions, not implementation details

- Use `userEvent` from `@testing-library/user-event` for more realistic user interactions



**Source:** [Vitest with React Testing Library Guide](https://blog.incubyte.co/blog/vitest-react-testing-library-guide/)



---



### 1.3 Mocking Next.js Modules



#### Mocking `next/navigation`



**Using next-router-mock:**



```bash

npm install -D next-router-mock

```



```typescript

// __tests__/navigation.test.tsx

import { render, screen } from '@testing-library/react'

import { vi } from 'vitest'

import mockRouter from 'next-router-mock'



vi.mock('next/navigation', () => require('next-router-mock'))



test('navigation works', () => {

  mockRouter.push('/about')

  expect(mockRouter.asPath).toBe('/about')

})

```



**Manual mocking:**



```typescript

// Mock useRouter

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

```



**Source:** [GitHub Discussion - Testing next/navigation](https://github.com/vercel/next.js/discussions/42527)



#### Mocking `next/headers`



```typescript

// Mock cookies and headers (async in Next.js 16)

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



**Important:** In Next.js 16, `cookies()` and `headers()` are async functions. Your tests must handle this:



```typescript

test('uses cookies', async () => {

  const cookieStore = await cookies()

  cookieStore.get('session')

  // assertions...

})

```



**Source:** [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)



---



### 1.4 Testing with Module Path Aliases



If using TypeScript path aliases (e.g., `@/components`), ensure `vite-tsconfig-paths` is configured:



```typescript

// vitest.config.mts

import tsconfigPaths from 'vite-tsconfig-paths'



export default defineConfig({

  plugins: [tsconfigPaths(), react()],

})

```



Alternatively, manually configure aliases:



```typescript

// vitest.config.mts

import path from 'path'



export default defineConfig({

  resolve: {

    alias: {

      '@': path.resolve(__dirname, './src'),

      '@/components': path.resolve(__dirname, './src/components'),

    },

  },

})

```



**Source:** [Codemancers - Setup Vitest in Next.js 14](https://www.codemancers.com/blog/2024-04-26-setup-vitest-on-nextjs-14)



---



## 2. Testing React Server Components



### 2.1 Understanding the Challenge



**Critical Information from Next.js Documentation:**



> Since `async` Server Components are new to the React ecosystem, Vitest currently does not support them. While you can still run unit tests for synchronous Server and Client Components, we recommend using E2E tests for async components.



**Source:** [Next.js Vitest Documentation](https://nextjs.org/docs/app/guides/testing/vitest)



However, there are workarounds that allow testing async Server Components with some limitations.



---



### 2.2 Testing Synchronous Server Components



Synchronous Server Components can be tested like regular React components:



```typescript

// app/components/ServerGreeting.tsx

export default function ServerGreeting({ name }: { name: string }) {

  return <h1>Hello, {name}!</h1>

}

```



```typescript

// __tests__/ServerGreeting.test.tsx

import { render, screen } from '@testing-library/react'

import { expect, test } from 'vitest'

import ServerGreeting from '../ServerGreeting'



test('renders greeting', () => {

  render(<ServerGreeting name="World" />)

  expect(screen.getByText('Hello, World!')).toBeInTheDocument()

})

```



---



### 2.3 Testing Async Server Components (Workarounds)



#### Method 1: Using React Suspense and Async Queries (Recommended)



This method uses React 19's improved Suspense handling:



```typescript

// components/AsyncServerComponent.tsx

export default async function AsyncServerComponent() {

  const data = await fetchData() // Async call

  return <div>{data.title}</div>

}

```



```typescript

// __tests__/AsyncServerComponent.test.tsx

import { render, screen } from '@testing-library/react'

import { expect, test, vi } from 'vitest'

import { Suspense } from 'react'

import AsyncServerComponent from '../AsyncServerComponent'



// Mock the async data fetching

vi.mock('../api', () => ({

  fetchData: vi.fn(async () => ({ title: 'Test Title' })),

}))



test('renders async server component', async () => {

  render(

    <Suspense fallback={<div>Loading...</div>}>

      <AsyncServerComponent />

    </Suspense>

  )



  // Use findBy* queries which wait for elements to appear

  expect(await screen.findByText('Test Title')).toBeInTheDocument()

})

```



**Key Points:**

- Wrap async components in `<Suspense>`

- Use `findBy*` queries which return promises

- Await the query results

- Mock async dependencies



**Requirements:**

- React 19+ (React Canary/RC)

- Ensure your test environment uses React 19:



```typescript

// Check React version in tests

import React from 'react'

console.log(React.version) // Should be 19.x

```



If Vitest isn't using React 19, reinstall:

```bash

npm install react@rc react-dom@rc

```



**Source:** [Aurora Scharff - Testing RSC with Vitest](https://aurorascharff.no/posts/running-tests-with-rtl-and-vitest-on-internationalized-react-server-components-in-nextjs-app-router/)



#### Method 2: Custom Render Helper (Legacy)



For projects not yet on React 19:



```typescript

// test-utils/renderAsync.ts

import { act, render } from '@testing-library/react'



function isAsyncFunction(value: any): boolean {

  return Object.prototype.toString.call(value) === '[object AsyncFunction]'

}



async function getNearestClientComponent(node: JSX.Element) {

  if (!isAsyncFunction(node.type)) {

    return node

  }

  const nodeReturnValue = await node.type({ ...node.props })

  return getNearestClientComponent(nodeReturnValue)

}



export async function renderAsync(node: JSX.Element) {

  await act(async () => {

    render(await getNearestClientComponent(node))

  })

}

```



```typescript

// Usage

import { renderAsync } from './test-utils/renderAsync'



test('renders async component', async () => {

  await renderAsync(<AsyncServerComponent />)

  expect(screen.getByText('Test Title')).toBeInTheDocument()

})

```



**Limitations:**

- Cannot test nested async server components

- Mock nested async components separately



**Source:** [GitHub - nickserv/rsc-testing](https://github.com/nickserv/rsc-testing)



---



### 2.4 Testing Internationalized (i18n) Server Components



For apps using `next-international` or similar i18n libraries:



```typescript

// vitest.setup.ts

import { beforeEach, vi } from 'vitest'

import en from '@/locales/en'



beforeEach(() => {

  // Mock server-side i18n

  vi.mock('@/locales/server', () => ({

    getCurrentLocale: () => 'en',

    getI18n: () => (key: string) => en[key as keyof typeof en],

    getScopedI18n: () => (key: string) => en[key as keyof typeof en],

  }))



  // Mock client-side i18n

  vi.mock('@/locales/client', () => ({

    useCurrentLocale: () => 'en',

    useI18n: () => (key: string) => en[key as keyof typeof en],

    useScopedI18n: () => (key: string) => en[key as keyof typeof en],

    useChangeLocale: () => () => {},

  }))

})

```



**Source:** [Aurora Scharff - Testing Internationalized RSC](https://aurorascharff.no/posts/running-tests-with-rtl-and-vitest-on-internationalized-react-server-components-in-nextjs-app-router/)



---



## 3. Testing Server Actions



### 3.1 Basic Server Action Testing



Server Actions are async functions marked with `'use server'`:



```typescript

// app/actions.ts

'use server'



import { revalidatePath } from 'next/cache'



export async function createPost(formData: FormData) {

  const title = formData.get('title') as string

  const content = formData.get('content') as string



  // Validation

  if (!title || !content) {

    return { error: 'Title and content are required' }

  }



  // Database operation

  await db.post.create({ data: { title, content } })



  revalidatePath('/posts')

  return { success: true }

}

```



```typescript

// __tests__/actions.test.ts

import { expect, test, vi, describe } from 'vitest'

import { createPost } from '../actions'



// Mock database

vi.mock('@/lib/db', () => ({

  db: {

    post: {

      create: vi.fn(),

    },

  },

}))



// Mock Next.js cache

vi.mock('next/cache', () => ({

  revalidatePath: vi.fn(),

}))



describe('createPost', () => {

  test('creates post with valid data', async () => {

    const formData = new FormData()

    formData.append('title', 'Test Post')

    formData.append('content', 'Test content')



    const result = await createPost(formData)



    expect(result).toEqual({ success: true })

  })



  test('returns error for missing title', async () => {

    const formData = new FormData()

    formData.append('content', 'Test content')



    const result = await createPost(formData)



    expect(result).toEqual({ error: 'Title and content are required' })

  })

})

```



**Source:** [GitHub Discussion - Testing Server Actions](https://github.com/vercel/next.js/discussions/69036)



---



### 3.2 Testing Server Actions with Redirects



Server Actions can use `redirect()` from `next/navigation`:



```typescript

// app/actions.ts

'use server'



import { redirect } from 'next/navigation'



export async function processForm(success: boolean) {

  if (success) {

    redirect('/success')

  }

  redirect('/error')

}

```



```typescript

// __tests__/actions.test.ts

import { expect, test, vi } from 'vitest'

import { processForm } from '../actions'



vi.mock('next/navigation', () => ({

  redirect: vi.fn((path: string) => {

    throw new Error(`NEXT_REDIRECT ${path}`)

  }),

}))



test('redirects to success page', async () => {

  await expect(processForm(true)).rejects.toThrow('NEXT_REDIRECT /success')

})



test('redirects to error page', async () => {

  await expect(processForm(false)).rejects.toThrow('NEXT_REDIRECT /error')

})

```



**Note:** `redirect()` throws an error internally in Next.js to trigger redirects, so testing it requires catching the error.



**Source:** [Reddit - Unit Testing Server Actions](https://www.reddit.com/r/nextjs/comments/1f83nv8/unit_testing_server_actions/)



---



### 3.3 Integration Testing Server Actions with React Testing Library



Testing Server Actions invoked from components:



```typescript

// components/CreatePostForm.tsx

'use client'



import { createPost } from '@/app/actions'

import { useFormState } from 'react-dom'



export default function CreatePostForm() {

  const [state, formAction] = useFormState(createPost, null)



  return (

    <form action={formAction}>

      <input name="title" />

      <input name="content" />

      <button type="submit">Create</button>

      {state?.error && <p>{state.error}</p>}

    </form>

  )

}

```



```typescript

// __tests__/CreatePostForm.test.tsx

import { render, screen, waitFor } from '@testing-library/react'

import userEvent from '@testing-library/user-event'

import { vi } from 'vitest'

import CreatePostForm from '../CreatePostForm'



vi.mock('@/app/actions', () => ({

  createPost: vi.fn(async (prevState, formData) => {

    const title = formData.get('title')

    if (!title) return { error: 'Title required' }

    return { success: true }

  }),

}))



test('displays error for missing title', async () => {

  const user = userEvent.setup()

  render(<CreatePostForm />)



  const submitButton = screen.getByRole('button', { name: 'Create' })

  await user.click(submitButton)



  await waitFor(() => {

    expect(screen.getByText('Title required')).toBeInTheDocument()

  })

})

```



**Source:** [Reddit - Testing Server Actions with RTL](https://www.reddit.com/r/nextjs/comments/14lun3o/how_to_test_a_server_action_using_testing_library/)



---



### 3.4 Testing Server Actions with Database Operations



For comprehensive testing, use integration tests with a real test database (see [Section 4](#4-integration-testing)).



---



## 4. Integration Testing



### 4.1 API Route Testing



#### Setup with `next-test-api-route-handler`



Install the package:



```bash

npm install -D next-test-api-route-handler

```



**Basic API route test:**



```typescript

// app/api/hello/route.ts

import { NextResponse } from 'next/server'



export async function GET(request: Request) {

  return NextResponse.json({ hello: true }, { status: 200 })

}

```



```typescript

// app/api/hello/route.test.ts

import { testApiHandler } from 'next-test-api-route-handler'

import * as appHandler from './route'



test('GET returns 200', async () => {

  await testApiHandler({

    appHandler,

    test: async ({ fetch }) => {

      const response = await fetch({ method: 'GET' })

      const json = await response.json()



      expect(response.status).toBe(200)

      expect(json).toStrictEqual({ hello: true })

    },

  })

})

```



**Source:** [Arcjet - Testing Next.js API Routes](https://blog.arcjet.com/testing-next-js-app-router-api-routes/)



---



#### Testing Authenticated API Routes



Mock authentication providers:



```typescript

// app/api/protected/route.ts

import { getServerSession } from 'next-auth/next'

import { authOptions } from '@/lib/auth'

import { NextResponse } from 'next/server'



export async function GET(request: Request) {

  const session = await getServerSession(authOptions)



  if (!session?.user) {

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  }



  return NextResponse.json({ hello: true }, { status: 200 })

}

```



```typescript

// app/api/protected/route.test.ts

import { testApiHandler } from 'next-test-api-route-handler'

import type { Session } from 'next-auth'

import * as appHandler from './route'



let mockedSession: Session | null = null



// Mock auth configuration

jest.mock('@/lib/auth', () => ({

  authOptions: {

    adapter: {},

    providers: [],

    callbacks: {},

  },

}))



// Mock getServerSession

jest.mock('next-auth/next', () => ({

  getServerSession: jest.fn(() => Promise.resolve(mockedSession)),

}))



afterEach(() => {

  mockedSession = null

})



test('returns 401 when not authenticated', async () => {

  mockedSession = null



  await testApiHandler({

    appHandler,

    test: async ({ fetch }) => {

      const response = await fetch({ method: 'GET' })

      const json = await response.json()



      expect(response.status).toBe(401)

      expect(json).toStrictEqual({ error: 'Unauthorized' })

    },

  })

})



test('returns 200 when authenticated', async () => {

  mockedSession = {

    expires: '2025-12-31',

    user: { id: 'test-user-id' },

  }



  await testApiHandler({

    appHandler,

    test: async ({ fetch }) => {

      const response = await fetch({ method: 'GET' })

      const json = await response.json()



      expect(response.status).toBe(200)

      expect(json).toStrictEqual({ hello: true })

    },

  })

})

```



**Source:** [Arcjet - Testing API Routes with Auth](https://blog.arcjet.com/testing-next-js-app-router-api-routes/)



---



### 4.2 Database Integration Testing with Prisma



#### Setup Test Database with Docker



Create `docker-compose.yml`:



```yaml

version: '3.8'

services:

  test-db:

    image: postgres:16-alpine

    restart: always

    environment:

      - POSTGRES_USER=postgres

      - POSTGRES_PASSWORD=postgres

      - POSTGRES_DB=test

    ports:

      - '5433:5432'

    volumes:

      - test-db:/var/lib/postgresql/data



volumes:

  test-db:

    driver: local

```



Create `.env.test`:



```env

DATABASE_URL="postgresql://postgres:postgres@localhost:5433/test"

```



**Source:** [Prisma Integration Testing Guide](https://www.prisma.io/blog/testing-series-3-aBUyF8nxAn)



---



#### Vitest Configuration for Integration Tests



```typescript

// vitest.config.integration.ts

import { defineConfig } from 'vitest/config'



export default defineConfig({

  test: {

    include: ['src/__tests__/integration/**/*.test.ts'],

    threads: false, // Important: prevent parallel test execution

    setupFiles: ['./src/__tests__/integration/setup.ts'],

  },

})

```



**Key Point:** `threads: false` prevents tests from running in parallel, which could cause database conflicts.



---



#### Database Reset Helper



```typescript

// src/__tests__/helpers/reset-db.ts

import { PrismaClient } from '@prisma/client'



const prisma = new PrismaClient()



export default async function resetDb() {

  await prisma.$transaction([

    prisma.post.deleteMany(),

    prisma.user.deleteMany(),

    // Add all your models here

  ])

}

```



```typescript

// src/__tests__/integration/setup.ts

import { beforeEach } from 'vitest'

import resetDb from '../helpers/reset-db'



beforeEach(async () => {

  await resetDb()

})

```



---



#### Integration Test Example



```typescript

// src/__tests__/integration/user.test.ts

import { describe, test, expect } from 'vitest'

import { PrismaClient } from '@prisma/client'

import { createUser } from '@/lib/user-service'



const prisma = new PrismaClient()



describe('User Service Integration Tests', () => {

  test('creates user and stores in database', async () => {

    const userData = {

      email: 'test@example.com',

      name: 'Test User',

    }



    const user = await createUser(userData)



    // Verify user was created

    expect(user).toMatchObject(userData)

    expect(user.id).toBeDefined()



    // Verify user exists in database

    const dbUser = await prisma.user.findUnique({

      where: { id: user.id },

    })



    expect(dbUser).toMatchObject(userData)

  })



  test('throws error for duplicate email', async () => {

    const userData = {

      email: 'duplicate@example.com',

      name: 'Test User',

    }



    await createUser(userData)



    await expect(createUser(userData)).rejects.toThrow()

  })

})

```



---



#### Running Integration Tests



Create npm scripts:



```json

{

  "scripts": {

    "test:integration": "dotenv -e .env.test -- vitest -c vitest.config.integration.ts",

    "test:integration:ui": "dotenv -e .env.test -- vitest -c vitest.config.integration.ts --ui",

    "docker:test-db:up": "docker-compose up -d",

    "docker:test-db:down": "docker-compose down"

  }

}

```



Install `dotenv-cli`:



```bash

npm install -D dotenv-cli

```



**Workflow:**



1. Start test database: `npm run docker:test-db:up`

2. Run migrations: `dotenv -e .env.test -- npx prisma migrate dev`

3. Run tests: `npm run test:integration`

4. Stop database: `npm run docker:test-db:down`



**Source:** [Prisma Integration Testing](https://www.prisma.io/blog/testing-series-3-aBUyF8nxAn)



---



### 4.3 Testing Middleware/Proxy



In Next.js 16, `middleware.ts` has been renamed to `proxy.ts`.



**Testing proxy logic:**



```typescript

// proxy.ts

import { NextRequest, NextResponse } from 'next/server'



export function proxy(request: NextRequest) {

  const isAuthenticated = request.cookies.get('session')



  if (!isAuthenticated && request.nextUrl.pathname.startsWith('/dashboard')) {

    return NextResponse.redirect(new URL('/login', request.url))

  }



  return NextResponse.next()

}

```



```typescript

// __tests__/proxy.test.ts

import { describe, test, expect } from 'vitest'

import { NextRequest } from 'next/server'

import { proxy } from '../proxy'



describe('Proxy', () => {

  test('redirects unauthenticated users from dashboard', () => {

    const request = new NextRequest('http://localhost:3000/dashboard')



    const response = proxy(request)



    expect(response.status).toBe(307)

    expect(response.headers.get('location')).toBe('http://localhost:3000/login')

  })



  test('allows authenticated users to dashboard', () => {

    const request = new NextRequest('http://localhost:3000/dashboard', {

      headers: {

        cookie: 'session=valid-session-token',

      },

    })



    const response = proxy(request)



    expect(response.status).toBe(200) // NextResponse.next() returns 200

  })

})

```



**Note:** The entire proxy function can be tested as a regular function.



**Source:** [Next.js Proxy Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)



---



## 5. Testing Authentication Flows



### 5.1 Mocking NextAuth / Auth.js



#### Client-Side Hook Mocking



```typescript

// __tests__/setup.ts

import { vi } from 'vitest'



vi.mock('next-auth/react', () => ({

  useSession: vi.fn(() => ({

    data: {

      user: { id: 'test-id', email: 'test@example.com' },

      expires: '2025-12-31',

    },

    status: 'authenticated',

  })),

  signIn: vi.fn(),

  signOut: vi.fn(),

}))

```



**Per-test customization:**



```typescript

import { useSession } from 'next-auth/react'

import { vi } from 'vitest'



test('shows login button when unauthenticated', () => {

  (useSession as jest.Mock).mockReturnValue({

    data: null,

    status: 'unauthenticated',

  })



  render(<Header />)

  expect(screen.getByText('Login')).toBeInTheDocument()

})



test('shows user email when authenticated', () => {

  (useSession as jest.Mock).mockReturnValue({

    data: {

      user: { email: 'user@example.com' },

    },

    status: 'authenticated',

  })



  render(<Header />)

  expect(screen.getByText('user@example.com')).toBeInTheDocument()

})

```



**Source:** [GitHub - Mocking useSession](https://github.com/nextauthjs/next-auth/discussions/4185)



---



#### Server-Side Session Mocking



```typescript

// Mock getServerSession

vi.mock('next-auth/next', () => ({

  getServerSession: vi.fn(async () => ({

    user: { id: 'test-id' },

    expires: '2025-12-31',

  })),

}))



// Or for dynamic session data

let mockSession: Session | null = null



vi.mock('next-auth/next', () => ({

  getServerSession: vi.fn(async () => mockSession),

}))



// In tests

test('denies access without session', async () => {

  mockSession = null

  // test logic

})



test('allows access with session', async () => {

  mockSession = { user: { id: 'user-1' }, expires: '2025-12-31' }

  // test logic

})

```



**Source:** [Medium - Testing NextAuth with Jest](https://medium.com/@renanleonel/how-to-set-up-nextauth-v5-authentication-with-middleware-and-jest-configuration-in-next-js-14-ca3e64bfb7d5)



---



### 5.2 End-to-End Authentication Testing



For comprehensive authentication flow testing, use E2E frameworks like Playwright:



```typescript

// e2e/auth.spec.ts

import { test, expect } from '@playwright/test'



test('user can sign in', async ({ page }) => {

  await page.goto('http://localhost:3000')



  await page.click('text=Login')

  await page.fill('input[name="email"]', 'test@example.com')

  await page.fill('input[name="password"]', 'password123')

  await page.click('button[type="submit"]')



  await expect(page.locator('text=Dashboard')).toBeVisible()

})

```



**Recommended for:**

- Login/logout flows

- OAuth provider integration

- Session persistence

- Protected route access



**Source:** [Strapi Next.js Testing Guide](https://strapi.io/blog/nextjs-testing-guide-unit-and-e2e-tests-with-vitest-and-playwright)



---



## 6. Next.js 16 Specific Changes



### 6.1 Breaking Changes Affecting Tests



#### Async Request APIs (Breaking Change)



**All dynamic APIs are now async:**



- `cookies()`

- `headers()`

- `draftMode()`

- `params` (in layouts, pages, routes)

- `searchParams` (in pages)



**Before (Next.js 15):**



```typescript

export default function Page({ params, searchParams }) {

  const { id } = params

  const { query } = searchParams

  // ...

}

```



**After (Next.js 16):**



```typescript

export default async function Page({ params, searchParams }) {

  const { id } = await params

  const { query } = await searchParams

  // ...

}

```



**Testing Impact:**



Mock async functions:



```typescript

vi.mock('next/headers', () => ({

  cookies: vi.fn(async () => ({

    get: vi.fn(),

    set: vi.fn(),

  })),

  headers: vi.fn(async () => ({

    get: vi.fn(),

  })),

}))



// In tests, await the calls

test('uses headers', async () => {

  const headerStore = await headers()

  const auth = headerStore.get('authorization')

  // ...

})

```



**Source:** [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)



---



#### Middleware → Proxy Rename



**File rename:**



```bash

mv middleware.ts proxy.ts

```



**Function rename:**



```typescript

// Before

export function middleware(request: NextRequest) { }



// After

export function proxy(request: NextRequest) { }

```



**Testing remains the same**, just update imports and function names.



**Source:** [Next.js 16 Blog](https://nextjs.org/blog/next-16)



---



#### Turbopack as Default Bundler



Turbopack is now the default for `next dev` and `next build`.



**Impact on Testing:**

- Vitest uses Vite, not Turbopack, so test builds are unaffected

- If you have custom Webpack configs, they won't apply to tests

- Ensure your `vitest.config` properly handles module resolution



**Opting out** (if needed):



```json

{

  "scripts": {

    "build": "next build --webpack"

  }

}

```



**Source:** [Next.js 16 Upgrade Guide - Turbopack](https://nextjs.org/docs/app/guides/upgrading/version-16#turbopack-by-default)



---



### 6.2 New Caching APIs



Next.js 16 introduces new caching APIs affecting how you test cache invalidation:



#### `updateTag()`



**Usage:**



```typescript

'use server'



import { updateTag } from 'next/cache'



export async function updateUserProfile(userId: string) {

  await db.users.update(userId, { /* ... */ })



  // Expire and refresh immediately

  updateTag(`user-${userId}`)

}

```



**Testing:**



```typescript

vi.mock('next/cache', () => ({

  updateTag: vi.fn(),

}))



test('calls updateTag after updating user', async () => {

  const { updateTag } = await import('next/cache')



  await updateUserProfile('user-1')



  expect(updateTag).toHaveBeenCalledWith('user-user-1')

})

```



---



#### `revalidateTag()` with cacheLife



**New signature:**



```typescript

revalidateTag(tag: string, cacheLifeProfile: string)

```



**Testing:**



```typescript

vi.mock('next/cache', () => ({

  revalidateTag: vi.fn(),

}))



test('revalidates with correct cache profile', async () => {

  const { revalidateTag } = await import('next/cache')



  await someAction()



  expect(revalidateTag).toHaveBeenCalledWith('article-123', 'max')

})

```



**Source:** [Next.js 16 - Improved Caching APIs](https://nextjs.org/docs/app/guides/upgrading/version-16#improved-caching-apis)



---



### 6.3 React 19 Support



Next.js 16 uses React 19, which includes new features:



- **View Transitions**

- **`useEffectEvent`**

- **Activity component**



**Ensure tests use React 19:**



```bash

npm install react@rc react-dom@rc

```



**Verify in tests:**



```typescript

import React from 'react'

console.log(React.version) // Should output 19.x

```



If still using React 18, reinstall React:



```bash

npm install react@rc react-dom@rc --force

```



**Source:** [Aurora Scharff - Testing React 19 Hooks](https://aurorascharff.no/posts/running-tests-with-rtl-and-vitest-on-internationalized-react-server-components-in-nextjs-app-router/)



---



## 7. Best Practices and Patterns



### 7.1 Test Organization



**Recommended structure:**



```

src/

├── __tests__/

│   ├── unit/

│   │   ├── components/

│   │   ├── lib/

│   │   └── utils/

│   ├── integration/

│   │   ├── api/

│   │   ├── database/

│   │   └── setup.ts

│   └── helpers/

│       ├── reset-db.ts

│       ├── test-data.ts

│       └── mocks.ts

├── app/

├── components/

└── lib/

```



**Alternative (colocation):**



```

src/

├── app/

│   ├── page.tsx

│   ├── page.test.tsx

│   └── api/

│       └── users/

│           ├── route.ts

│           └── route.test.ts

├── components/

│   └── Button/

│       ├── Button.tsx

│       └── Button.test.tsx

```



**Source:** [Next.js Testing Documentation](https://nextjs.org/docs/app/guides/testing)



---



### 7.2 Test Naming Conventions



**Files:**

- `*.test.ts` or `*.test.tsx` - for Vitest

- `*.spec.ts` or `*.spec.tsx` - alternative convention



**Test descriptions:**



```typescript

// Good

describe('UserProfile', () => {

  test('displays user name when authenticated', () => { })

  test('redirects to login when not authenticated', () => { })

})



// Avoid

describe('UserProfile', () => {

  test('test1', () => { })

  test('should work', () => { })

})

```



---



### 7.3 Query Selection Priority



**Recommended query order (React Testing Library):**



1. **`getByRole`** - Most accessible

2. **`getByLabelText`** - For form fields

3. **`getByPlaceholderText`** - When label not available

4. **`getByText`** - For non-interactive elements

5. **`getByTestId`** - Last resort



```typescript

// Good

screen.getByRole('button', { name: 'Submit' })

screen.getByLabelText('Email address')



// Avoid (unless necessary)

screen.getByTestId('submit-button')

```



**Source:** [Testing Library - Query Priority](https://testing-library.com/docs/queries/about/#priority)



---



### 7.4 Mocking Best Practices



#### Mock at the Module Level



```typescript

// Good: Mock entire module

vi.mock('@/lib/api', () => ({

  fetchUser: vi.fn(async () => ({ name: 'Test' })),

}))



// Avoid: Mocking implementations in tests

test('...', () => {

  const spy = vi.spyOn(api, 'fetchUser')

  // Hard to maintain

})

```



#### Use Factory Functions



```typescript

// test-utils/factories.ts

export const createMockUser = (overrides = {}) => ({

  id: 'user-1',

  email: 'test@example.com',

  name: 'Test User',

  ...overrides,

})



// In tests

const user = createMockUser({ name: 'Custom Name' })

```



---



### 7.5 Async Testing Patterns



**Use `async`/`await` consistently:**



```typescript

// Good

test('fetches data', async () => {

  render(<Component />)

  expect(await screen.findByText('Loaded')).toBeInTheDocument()

})



// Avoid: Mixing promises and async/await

test('fetches data', async () => {

  render(<Component />)

  screen.findByText('Loaded').then(el => {

    expect(el).toBeInTheDocument()

  })

})

```



**Use `waitFor` for complex assertions:**



```typescript

import { waitFor } from '@testing-library/react'



test('processes form submission', async () => {

  const user = userEvent.setup()

  render(<Form />)



  await user.type(screen.getByLabelText('Name'), 'John')

  await user.click(screen.getByRole('button', { name: 'Submit' }))



  await waitFor(() => {

    expect(screen.getByText('Success!')).toBeInTheDocument()

    expect(mockSubmit).toHaveBeenCalledTimes(1)

  })

})

```



---



### 7.6 Code Coverage



**Setup coverage:**



```bash

npm install -D @vitest/coverage-v8

```



```typescript

// vitest.config.mts

export default defineConfig({

  test: {

    coverage: {

      provider: 'v8',

      reporter: ['text', 'json', 'html'],

      exclude: [

        'node_modules/',

        '__tests__/',

        '*.config.*',

      ],

    },

  },

})

```



**Run with coverage:**



```bash

npm run test -- --coverage

```



**Coverage thresholds:**



```typescript

export default defineConfig({

  test: {

    coverage: {

      thresholds: {

        lines: 80,

        functions: 80,

        branches: 75,

        statements: 80,

      },

    },

  },

})

```



**Source:** [Vitest Coverage Documentation](https://vitest.dev/guide/coverage)



---



## 8. Resources and References



### Official Documentation



1. **Next.js Testing Guide**

   https://nextjs.org/docs/app/guides/testing



2. **Next.js Vitest Documentation**

   https://nextjs.org/docs/app/guides/testing/vitest



3. **Next.js 16 Upgrade Guide**

   https://nextjs.org/docs/app/guides/upgrading/version-16



4. **Vitest Documentation**

   https://vitest.dev/guide/



5. **React Testing Library**

   https://testing-library.com/docs/react-testing-library/intro/



### Community Resources



6. **Strapi - Next.js Testing Guide**

   https://strapi.io/blog/nextjs-testing-guide-unit-and-e2e-tests-with-vitest-and-playwright



7. **Aurora Scharff - Testing RSC with Vitest**

   https://aurorascharff.no/posts/running-tests-with-rtl-and-vitest-on-internationalized-react-server-components-in-nextjs-app-router/



8. **Arcjet - Testing Next.js API Routes**

   https://blog.arcjet.com/testing-next-js-app-router-api-routes/



9. **Prisma - Integration Testing Guide**

   https://www.prisma.io/blog/testing-series-3-aBUyF8nxAn



### GitHub Repositories



10. **nickserv/rsc-testing**

    https://github.com/nickserv/rsc-testing

    Example Next.js project testing RSC with Vitest



11. **vercel/next.js - with-vitest example**

    https://github.com/vercel/next.js/tree/canary/examples/with-vitest



12. **next-test-api-route-handler**

    https://www.npmjs.com/package/next-test-api-route-handler



### Articles and Guides



13. **Vitest with React Testing Library Guide**

    https://blog.incubyte.co/blog/vitest-react-testing-library-guide/



14. **Testing Server Actions Discussion**

    https://github.com/vercel/next.js/discussions/69036



15. **Mocking next-auth Guide**

    https://github.com/nextauthjs/next-auth/discussions/4185



---



## Appendix: Quick Reference Commands



### Installation



```bash

# Core testing dependencies

npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom



# TypeScript support

npm install -D vite-tsconfig-paths



# Additional testing utilities

npm install -D @testing-library/jest-dom @testing-library/user-event



# API route testing

npm install -D next-test-api-route-handler



# Coverage

npm install -D @vitest/coverage-v8



# Integration testing with Prisma

npm install -D dotenv-cli

```



### Common Scripts



```json

{

  "scripts": {

    "test": "vitest",

    "test:ui": "vitest --ui",

    "test:coverage": "vitest --coverage",

    "test:integration": "dotenv -e .env.test -- vitest -c vitest.config.integration.ts"

  }

}

```



### Vitest Config Boilerplate



```typescript

// vitest.config.mts

import { defineConfig } from 'vitest/config'

import react from '@vitejs/plugin-react'

import tsconfigPaths from 'vite-tsconfig-paths'



export default defineConfig({

  plugins: [tsconfigPaths(), react()],

  test: {

    environment: 'jsdom',

    globals: true,

    setupFiles: './vitest.setup.ts',

  },

})

```



```typescript

// vitest.setup.ts

import '@testing-library/jest-dom'

```



---



## Conclusion



Testing Next.js 16 applications with Vitest requires understanding of:



1. **Next.js 16 breaking changes** - Particularly async request APIs

2. **React Server Components** - Require special testing approaches

3. **Server Actions** - Test as async functions with proper mocking

4. **Integration testing** - Essential for database and API testing

5. **Vitest configuration** - Proper setup for Next.js environment



**Key Takeaways:**



- Use **Vitest** over Jest for better Vite/Turbopack compatibility

- **Async Server Components** can be tested with React 19 + Suspense

- **Server Actions** require mocking Next.js cache and navigation APIs

- **Integration tests** with real databases provide the most confidence

- Next.js 16 breaking changes impact test setup significantly



**Recommended Testing Strategy:**



1. **Unit tests** for utilities, hooks, and client components

2. **Integration tests** for API routes and database operations

3. **E2E tests** for critical user flows and authentication



This guide provides a solid foundation for building a comprehensive testing strategy for Next.js 16 applications using Vitest.



---
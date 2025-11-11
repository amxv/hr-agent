# BetterAuth Authentication and Authorization System - Comprehensive Research

## Executive Summary

This document provides a detailed analysis of the BetterAuth authentication system in the AgentDune Chat Next.js project. BetterAuth v1.3.27 is configured with GitHub and Google OAuth providers, PostgreSQL database persistence via Drizzle ORM, and implements server-side session management with client-side state synchronization. The system uses middleware-based route protection and tRPC procedures for authorization.

---

## 1. BetterAuth Configuration

### Location and Initialization

**Primary Configuration File:** `/Users/ashray/code/amxv/agentdune-chat/lib/auth.ts`

BetterAuth is initialized with comprehensive configuration:

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: env.VERCEL_URL ? [env.VERCEL_URL] : undefined,
  secret: env.AUTH_SECRET,

  socialProviders: (() => {
    const googleId = env.AUTH_GOOGLE_ID;
    const googleSecret = env.AUTH_GOOGLE_SECRET;
    const githubId = env.AUTH_GITHUB_ID;
    const githubSecret = env.AUTH_GITHUB_SECRET;

    const google =
      typeof googleId === "string" &&
      googleId.length > 0 &&
      typeof googleSecret === "string" &&
      googleSecret.length > 0
        ? { clientId: googleId, clientSecret: googleSecret }
        : undefined;

    const github =
      typeof githubId === "string" &&
      githubId.length > 0 &&
      typeof githubSecret === "string" &&
      githubSecret.length > 0
        ? { clientId: githubId, clientSecret: githubSecret }
        : undefined;

    return { google, github } as const;
  })(),
  plugins: [nextCookies()],
});
```

**File:** `/Users/ashray/code/amxv/agentdune-chat/lib/auth.ts` - Lines 18-51

### Core Configuration Options

#### 1. Database Adapter
- **Type:** Drizzle ORM Adapter for PostgreSQL
- **Provider:** `pg` (PostgreSQL)
- **Schema Location:** `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts`
- **Configuration:** Uses Drizzle adapter to connect to PostgreSQL database with BetterAuth-compatible schema

#### 2. Trust Configuration
- **Trusted Origins:** Configured from `env.VERCEL_URL` if available
- **Purpose:** Prevents CSRF attacks by restricting auth requests to known domains
- **File:** `/Users/ashray/code/amxv/agentdune-chat/lib/auth.ts` - Line 23

#### 3. Secret Configuration
- **Secret Source:** `env.AUTH_SECRET`
- **Purpose:** Used for signing and encrypting sensitive data (tokens, sessions)
- **Type:** Cryptographic secret generated via `https://generate-secret.vercel.app/32` or `openssl rand -base64 32`
- **File:** `/Users/ashray/code/amxv/agentdune-chat/lib/auth.ts` - Line 24

#### 4. Plugins
- **Used:** `nextCookies()` plugin from BetterAuth
- **Purpose:** Enables cookie-based session management for Next.js applications
- **File:** `/Users/ashray/code/amxv/agentdune-chat/lib/auth.ts` - Line 50

### Environment Variables Required

**File:** `/Users/ashray/code/amxv/agentdune-chat/.env.example`

```env
# Authentication Secret
AUTH_SECRET=****

# Database Connection
POSTGRES_URL=****

# Google OAuth (Optional - conditionally enabled)
AUTH_GOOGLE_ID=****
AUTH_GOOGLE_SECRET=****

# GitHub OAuth (Active)
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret

# Optional: Vercel deployment URL
VERCEL_URL=<optional>
```

**Type Safety:** Validated via T3 Env
**File:** `/Users/ashray/code/amxv/agentdune-chat/lib/env.ts` - Lines 6-87

Environment variable validation:

```typescript
export const env = createEnv({
  server: {
    // Required core
    POSTGRES_URL: z.string().min(1),
    AUTH_SECRET: z.string().min(1),

    // OAuth providers (optional)
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
    AUTH_GITHUB_ID: z.string().optional(),
    AUTH_GITHUB_SECRET: z.string().optional(),
  },
  // ... rest of config
});
```

---

## 2. OAuth Provider Setup

### GitHub OAuth Configuration

**Status:** Active/Primary authentication provider

**Configuration Location:** `/Users/ashray/code/amxv/agentdune-chat/lib/auth.ts` - Lines 40-46

```typescript
const github =
  typeof githubId === "string" &&
  githubId.length > 0 &&
  typeof githubSecret === "string" &&
  githubSecret.length > 0
    ? { clientId: githubId, clientSecret: githubSecret }
    : undefined;
```

**Credentials Required:**
- `AUTH_GITHUB_ID` - GitHub OAuth App Client ID
- `AUTH_GITHUB_SECRET` - GitHub OAuth App Client Secret

**Callback Flow:**
1. User clicks "Continue with GitHub" button (line 21 in `/Users/ashray/code/amxv/agentdune-chat/components/social-auth-providers.tsx`)
2. Client calls `authClient.signIn.social({ provider: "github" })`
3. Redirects to GitHub authorization endpoint with app credentials
4. GitHub redirects back to callback URL at `/api/auth/[...all]/` (BetterAuth handles this)
5. BetterAuth exchanges code for access token
6. Creates/updates user in database
7. Sets session cookies

**Cookie-Based Session Handling:** Via `nextCookies()` plugin

---

### Google OAuth Configuration

**Status:** Conditionally enabled (not currently active in environment)

**Configuration Location:** `/Users/ashray/code/amxv/agentdune-chat/lib/auth.ts` - Lines 32-38

```typescript
const google =
  typeof googleId === "string" &&
  googleId.length > 0 &&
  typeof googleSecret === "string" &&
  googleSecret.length > 0
    ? { clientId: googleId, clientSecret: googleSecret }
    : undefined;
```

**Credentials Required (if enabled):**
- `AUTH_GOOGLE_ID` - Google OAuth Client ID
- `AUTH_GOOGLE_SECRET` - Google OAuth Client Secret

**Callback Flow:** Same as GitHub - handled transparently by BetterAuth

**UI Implementation:**
- Button in `/Users/ashray/code/amxv/agentdune-chat/components/social-auth-providers.tsx` - Line 12
- Call: `authClient.signIn.social({ provider: "google" })`

**Conditional Enabling Logic:**
- Both credentials must be present and non-empty strings
- If either is missing, provider is set to `undefined`
- Frontend buttons are static (both shown) regardless of backend provider availability
- Backend will handle missing providers gracefully

---

## 3. Authentication Routes and Endpoints

### Primary Auth Route Handler

**Location:** `/Users/ashray/code/amxv/agentdune-chat/app/(auth)/api/auth/[...all]/route.ts`

```typescript
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
```

**Details:**
- **Lines:** 1-4
- **Pattern:** Catch-all route `[...all]` handles all authentication endpoints
- **Handler:** `toNextJsHandler()` converts BetterAuth instance to Next.js GET/POST handlers
- **Methods Supported:**
  - `GET` - For callback redirects and session retrieval
  - `POST` - For sign-in/sign-out operations

### BetterAuth Auto-Generated Endpoints

The BetterAuth `toNextJsHandler` creates the following endpoints automatically:

1. **Sign-in Endpoints**
   - `POST /api/auth/sign-in/social` - OAuth provider redirect
   - `GET /api/auth/sign-in/social/callback/{provider}` - OAuth callback

2. **Sign-out Endpoint**
   - `POST /api/auth/sign-out` - Session termination

3. **Session Endpoint**
   - `GET /api/auth/session` - Retrieve current session

4. **Other Built-in Endpoints**
   - Verification endpoints for email verification (if implemented)
   - Account linking endpoints

---

## 4. Session Management

### Session Creation Flow

**Step 1: OAuth Code Exchange**
When user is redirected back from GitHub/Google, BetterAuth:
1. Receives authorization code at `/api/auth/callback`
2. Exchanges code for access token using OAuth credentials
3. Fetches user profile data from OAuth provider

**Step 2: User Database Entry**
- User is created or updated in `user` table
- User data stored: `id`, `name`, `email`, `emailVerified`, `image`, `createdAt`, `updatedAt`
- File: `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` - Lines 138-149

```typescript
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});
```

**Step 3: OAuth Account Record**
- OAuth credentials stored in `account` table
- File: `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` - Lines 166-184

```typescript
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});
```

**Step 4: Session Creation**
- Session record created in `session` table
- File: `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` - Lines 151-164

```typescript
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});
```

### Session Storage Mechanism

**Cookie-Based Storage:** `nextCookies()` plugin

The `nextCookies()` plugin stores session information in secure HTTP-only cookies:

```typescript
plugins: [nextCookies()],
```

**Cookie Settings (Standard BetterAuth Configuration):**
- **HttpOnly:** true - Prevents JavaScript access (XSS protection)
- **Secure:** true (in production) - Only sent over HTTPS
- **SameSite:** Strict/Lax - CSRF protection
- **Domain:** Automatically set to request domain
- **Path:** `/` - Available app-wide

**Cookie Retrieval:** Accessible via Next.js `headers()` API

```typescript
const session = await auth.api.getSession({ headers: req.headers });
```

### Session Validation Flow

**Server-Side (Middleware):**
File: `/Users/ashray/code/amxv/agentdune-chat/middleware.ts` - Lines 34-35

```typescript
const session = await auth.api.getSession({ headers: req.headers });
const isLoggedIn = !!session?.user;
```

**Client-Side (React Hook):**
File: `/Users/ashray/code/amxv/agentdune-chat/lib/auth-client.ts` - Line 4

```typescript
const { data: clientSessionRaw, isPending } = authClient.useSession();
```

**Combined Usage (SessionProvider):**
File: `/Users/ashray/code/amxv/agentdune-chat/providers/session-provider.tsx` - Lines 23-32

```typescript
const { data: clientSessionRaw, isPending } = authClient.useSession();

const clientSession = clientSessionRaw ? clientSessionRaw : undefined;

const value = useMemo<SessionContextValue>(() => {
  const effective = isPending
    ? (initialSession ?? clientSession)
    : clientSession;
  return { data: effective, isPending };
}, [clientSession, initialSession, isPending]);
```

### Session Expiration

**Database Field:** `session.expiresAt` (timestamp)
- Set by BetterAuth based on default session duration (typically 30 days)
- Automatically compared on each request
- Expired sessions are invalidated

**Verification Tables:**
File: `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` - Lines 186-196

```typescript
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});
```

---

## 5. Protected Routes and Authorization

### Middleware-Based Route Protection

**Location:** `/Users/ashray/code/amxv/agentdune-chat/middleware.ts`

The Next.js middleware implements route-based protection logic:

**Runtime:** Node.js runtime (required for session validation)
File: `/Users/ashray/code/amxv/agentdune-chat/middleware.ts` - Line 6
```typescript
export const runtime = "nodejs";
```

**Session Retrieval:**
File: `/Users/ashray/code/amxv/agentdune-chat/middleware.ts` - Lines 34-35
```typescript
const session = await auth.api.getSession({ headers: req.headers });
const isLoggedIn = !!session?.user;
```

**Route Protection Rules:**

1. **Auth Routes** (Lines 11-14)
   - `/api/auth/*` - Bypassed (handled by BetterAuth)

2. **Metadata Routes** (Lines 16-22)
   - `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` - Public

3. **API Routes** (Lines 24-32)
   - `/api/trpc/*` - Bypassed (tRPC handles auth separately)
   - `/api/chat` - Bypassed (has own auth logic)

4. **Public Pages** (Lines 40-64)
   - `/login`, `/register` - Redirect to home if already logged in
   - `/share/*` - Public share pages (no auth needed)
   - `/models`, `/compare` - Public (unless `DISABLE_MODEL_SELECTION` is true)
   - `/privacy`, `/terms` - Public documentation

5. **Protected Pages** (Lines 66-74)
   - Chat pages (`/`) - Require authentication
   - Redirect to `/login` if not authenticated

**Matcher Configuration:**
File: `/Users/ashray/code/amxv/agentdune-chat/middleware.ts` - Lines 81-94

```typescript
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|opengraph-image|manifest|privacy|terms|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest)$).*)",
  ],
};
```

Excludes from middleware:
- `/api/*` routes
- `/_next/*` resources
- Static files (images, manifests)
- Documentation pages

---

### tRPC Procedure-Level Authorization

**Location:** `/Users/ashray/code/amxv/agentdune-chat/trpc/init.ts`

#### Context Creation (Lines 29-34)

```typescript
export const createTRPCContext = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return {
    user: session?.user,
  };
});
```

**Purpose:** Retrieves session on every tRPC request and adds user to context

#### Public Procedure (Line 110)

```typescript
export const publicProcedure = t.procedure.use(timingMiddleware);
```

**Usage:** Accessible by any client (logged in or anonymous)

**Example - Chat Title Generation:**
File: `/Users/ashray/code/amxv/agentdune-chat/trpc/routers/chat.router.ts` - Lines 220-239

```typescript
generateTitle: publicProcedure
  .input(
    z.object({
      message: z.string().min(1).max(MAX_MESSAGE_CHARS),
    })
  )
  .mutation(async ({ input }) => {
    const { text: title } = await generateText({
      // ... AI generation logic
    });
    return { title };
  }),
```

#### Protected Procedure (Lines 120-135)

```typescript
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const { id, ...rest } = ctx.user;
  if (!id) {
    console.error("User ID missing in session callback");
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      // infers the `session` as non-nullable
      user: { id, ...rest },
    },
  });
});
```

**Behavior:**
- Throws `TRPCError` with code `UNAUTHORIZED` if user is not logged in
- Validates user ID is present in session
- Passes user context to procedure with non-nullable user guarantee

**Example - Get All Chats:**
File: `/Users/ashray/code/amxv/agentdune-chat/trpc/routers/chat.router.ts` - Lines 40-55

```typescript
getAllChats: protectedProcedure.query(async ({ ctx }) => {
  const chats = await getChatsByUserId({ id: ctx.user.id });

  // Sort chats by pinned status, then by last updated date
  chats.sort((a, b) => {
    if (a.isPinned && !b.isPinned) {
      return -1;
    }
    if (!a.isPinned && b.isPinned) {
      return 1;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return chats.map(dbChatToUIChat);
}),
```

#### Resource Ownership Validation

All protected procedures validate that the user owns the resource:

File: `/Users/ashray/code/amxv/agentdune-chat/trpc/routers/chat.router.ts` - Lines 57-74

```typescript
getChatById: protectedProcedure
  .input(
    z.object({
      chatId: z.string().uuid(),
    })
  )
  .query(async ({ ctx, input }) => {
    const chat = await getChatById({ id: input.chatId });

    if (!chat || chat.userId !== ctx.user.id) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Chat not found",
      });
    }

    return dbChatToUIChat(chat);
  }),
```

---

## 6. User Data Model

### User Table Schema

**File:** `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` - Lines 138-149

```typescript
export type User = InferSelectModel<typeof user>;

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});
```

**Data Fields:**

| Field | Type | Constraints | Purpose |
|-------|------|-----------|---------|
| `id` | text | PRIMARY KEY | Unique user identifier (generated by BetterAuth) |
| `name` | text | NOT NULL | User's full name from OAuth provider |
| `email` | text | NOT NULL, UNIQUE | User's email address |
| `emailVerified` | boolean | DEFAULT false | Email verification status |
| `image` | text | NULLABLE | Avatar URL from OAuth provider |
| `createdAt` | timestamp | DEFAULT NOW | Account creation timestamp |
| `updatedAt` | timestamp | DEFAULT NOW, AUTO-UPDATE | Last update timestamp |

### Session Table Schema

**File:** `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` - Lines 151-164

```typescript
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});
```

**Data Fields:**

| Field | Type | Constraints | Purpose |
|-------|------|-----------|---------|
| `id` | text | PRIMARY KEY | Unique session identifier |
| `expiresAt` | timestamp | NOT NULL | Session expiration time |
| `token` | text | NOT NULL, UNIQUE | Session token (sent in cookies) |
| `createdAt` | timestamp | DEFAULT NOW | Session creation timestamp |
| `updatedAt` | timestamp | AUTO-UPDATE | Last activity timestamp |
| `ipAddress` | text | NULLABLE | Client IP address (optional) |
| `userAgent` | text | NULLABLE | Client browser info (optional) |
| `userId` | text | FK → user.id, CASCADE DELETE | User this session belongs to |

### Account (OAuth) Table Schema

**File:** `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` - Lines 166-184

```typescript
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});
```

**Data Fields:**

| Field | Type | Purpose |
|-------|------|---------|
| `id` | text PRIMARY KEY | Unique account identifier |
| `accountId` | text | OAuth provider's user ID (e.g., GitHub user ID) |
| `providerId` | text | Provider name ("github", "google") |
| `userId` | text FK | User this account is linked to |
| `accessToken` | text | OAuth access token for API calls |
| `refreshToken` | text | Token for refreshing access token |
| `idToken` | text | OpenID Connect ID token (if applicable) |
| `accessTokenExpiresAt` | timestamp | When access token expires |
| `refreshTokenExpiresAt` | timestamp | When refresh token expires |
| `scope` | text | OAuth scopes granted |
| `password` | text | Password hash (if email/password auth used) |
| `createdAt` | timestamp | When account was linked |
| `updatedAt` | timestamp | Last update timestamp |

### Related User Credit Table

**File:** `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` - Lines 17-24

```typescript
export const userCredit = pgTable("UserCredit", {
  userId: text("userId")
    .primaryKey()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  credits: integer("credits").notNull().default(100),
  reservedCredits: integer("reservedCredits").notNull().default(0),
});
```

**Purpose:** Tracks AI credit/token usage per user

### User Retrieval and Access

**Session Type Definition:**
File: `/Users/ashray/code/amxv/agentdune-chat/lib/auth.ts` - Lines 8-16

```typescript
export type Session = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires?: string;
};
```

**Server-Side Access:**

```typescript
// In middleware
const session = await auth.api.getSession({ headers: req.headers });
const userId = session?.user?.id;

// In tRPC procedures
protectedProcedure.query(async ({ ctx }) => {
  const userId = ctx.user.id;  // Non-nullable, guaranteed by protectedProcedure
});
```

**Client-Side Access:**

```typescript
// Via useSession hook
const { data: session } = useSession();
const user = session?.user;  // Optional until session loads
```

---

## 7. Client-Side Authentication

### Auth Client Configuration

**Location:** `/Users/ashray/code/amxv/agentdune-chat/lib/auth-client.ts`

```typescript
import { nextCookies } from "better-auth/next-js";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  // baseURL can be omitted if API base matches frontend origin
  plugins: [nextCookies()],
});

export default authClient;
```

**Configuration:**
- **baseURL:** Omitted - uses same origin as frontend
- **Plugins:** `nextCookies()` for cookie handling
- **Default behavior:** Auto-detects auth API at `/api/auth`

### Session Provider (React Context)

**Location:** `/Users/ashray/code/amxv/agentdune-chat/providers/session-provider.tsx`

```typescript
"use client";

import { createContext, useContext, useMemo } from "react";
import type { Session } from "@/lib/auth";
import authClient from "@/lib/auth-client";

type SessionContextValue = {
  data: Session | undefined;
  isPending: boolean;
};

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined
);

export function SessionProvider({
  initialSession,
  children,
}: {
  initialSession?: Session;
  children: React.ReactNode;
}) {
  const { data: clientSessionRaw, isPending } = authClient.useSession();

  const clientSession = clientSessionRaw ? clientSessionRaw : undefined;

  const value = useMemo<SessionContextValue>(() => {
    const effective = isPending
      ? (initialSession ?? clientSession)
      : clientSession;
    return { data: effective, isPending };
  }, [clientSession, initialSession, isPending]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
```

**Features:**

1. **Initial Session (Server-Rendered):** Passed from server layout
2. **Client Session Sync:** Auto-fetched via `authClient.useSession()`
3. **Loading State Management:** `isPending` flag during async fetch
4. **Graceful Fallback:** Uses server session until client hydration completes

**Usage Pattern:**
File: `/Users/ashray/code/amxv/agentdune-chat/app/(chat)/layout.tsx` - Lines 16-37

```typescript
export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side session retrieval
  const raw = await auth.api.getSession({ headers: await headers() });
  const session = raw
    ? {
        user: raw.user
          ? {
              id: raw.user.id,
              name: raw.user.name ?? null,
              email: raw.user.email ?? null,
              image: raw.user.image ?? null,
            }
          : undefined,
        expires: raw.session?.expiresAt
          ? new Date(raw.session.expiresAt).toISOString()
          : undefined,
      }
    : undefined;

  return (
    <TRPCReactProvider>
      <SessionProvider initialSession={session}>
        {/* Children can now use useSession() */}
      </SessionProvider>
    </TRPCReactProvider>
  );
}
```

### Social Authentication UI Components

**Login Form Component**
File: `/Users/ashray/code/amxv/agentdune-chat/components/login-form.tsx`

```typescript
"use client";

import Link from "next/link";
import { SocialAuthProviders } from "@/components/social-auth-providers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Continue with a social provider</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <SocialAuthProviders />
            {/* Link to signup */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Social Auth Providers Component**
File: `/Users/ashray/code/amxv/agentdune-chat/components/social-auth-providers.tsx`

```typescript
"use client";

import { GithubLogo, GoogleLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import authClient from "@/lib/auth-client";

export function SocialAuthProviders() {
  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        onClick={() => authClient.signIn.social({ provider: "google" })}
        type="button"
        variant="outline"
      >
        <GoogleLogo className="mr-2 h-4 w-4" />
        Continue with Google
      </Button>
      <Button
        className="w-full"
        onClick={() => authClient.signIn.social({ provider: "github" })}
        type="button"
        variant="outline"
      >
        <GithubLogo className="mr-2 h-4 w-4" />
        Continue with GitHub
      </Button>
    </div>
  );
}
```

**OAuth Sign-In Flow:**
1. User clicks "Continue with GitHub" or "Continue with Google"
2. `authClient.signIn.social({ provider: "github" })` is called
3. Redirects to `/api/auth/signin/social?provider=github`
4. BetterAuth redirects to GitHub/Google OAuth endpoint
5. User grants permissions
6. OAuth provider redirects to `/api/auth/callback/github`
7. BetterAuth handles token exchange and session creation
8. Redirects to app home page `/`

---

## 8. Token and Cookie Handling

### Cookie Management

**Plugin:** `nextCookies()` from BetterAuth
**File:** `/Users/ashray/code/amxv/agentdune-chat/lib/auth.ts` - Line 50

BetterAuth's `nextCookies()` plugin handles all cookie operations transparently.

**Cookie Flow:**

1. **Session Creation:** When OAuth callback completes
   - BetterAuth creates session in database
   - Generates session token
   - Sets HTTP-only cookie with token

2. **Session Validation:** On every request
   - Next.js middleware reads cookie via `headers()`
   - BetterAuth validates token against database
   - Retrieves user and session data

3. **Session Expiration:**
   - Checked on each request
   - If expired, session is invalid
   - Cookie remains but session is treated as null

### Cookie Security Settings

**Standard BetterAuth Configuration (via nextCookies() plugin):**

| Setting | Value | Purpose |
|---------|-------|---------|
| HttpOnly | true | Prevents XSS attacks - no JavaScript access |
| Secure | true (prod) | Only sent over HTTPS |
| SameSite | Strict/Lax | CSRF protection - only sent to same-origin |
| Path | / | Available app-wide |
| Domain | Auto-detected | Set to request domain |
| MaxAge/Expires | Session duration | Typically 30 days |

### Access Token Storage

**Location:** Database table `account.accessToken`
File: `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` - Line 173

```typescript
accessToken: text("access_token"),
```

**Purpose:** Store OAuth provider's access token for API calls
**Security:** Stored in encrypted database (if encryption enabled)
**Usage:** Can be used to make authenticated API calls to GitHub/Google APIs

### Refresh Token Management

**Location:** Database table `account.refreshToken`
File: `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` - Line 174

```typescript
refreshToken: text("refresh_token"),
```

**Purpose:** Refresh access token when it expires
**Expiration:** Tracked in `account.refreshTokenExpiresAt`
File: `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` - Line 177

```typescript
refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
```

---

## 9. Complete Authentication Flow

### User Registration/Sign-Up Flow

```
1. User navigates to /register
   ↓
2. Middleware checks session → redirects if already logged in
   ↓
3. SignupForm component displayed with social auth buttons
   ↓
4. User clicks "Continue with GitHub"
   ↓
5. authClient.signIn.social({ provider: "github" }) called
   ↓
6. Redirect to: /api/auth/signin/social?provider=github
   ↓
7. BetterAuth handler receives request → auth.ts (Line 1-4)
   ↓
8. Redirects to GitHub OAuth authorize endpoint with:
   - AUTH_GITHUB_ID (client_id)
   - AUTH_GITHUB_SECRET (client_secret)
   - redirect_uri=https://.../api/auth/callback/github
   ↓
9. GitHub displays permission dialog
   ↓
10. User grants permissions
    ↓
11. GitHub redirects to /api/auth/callback/github?code=...&state=...
    ↓
12. BetterAuth handler processes callback:
    - Exchanges code for access_token
    - Fetches user profile from GitHub API
    ↓
13. BetterAuth creates database records:
    - NEW user in `user` table (if first time)
    - NEW account in `account` table (OAuth credentials)
    - NEW session in `session` table
    ↓
14. Sets HTTP-only session cookie
    ↓
15. Redirects to / (home page)
    ↓
16. Middleware on subsequent request:
    - Reads session from cookie
    - Validates against database
    - User is authenticated
```

### Login Flow (Returning User)

```
1. User navigates to /login
   ↓
2. Middleware checks session → redirects if already logged in
   ↓
3. LoginForm displayed with social auth buttons
   ↓
4. User clicks "Continue with GitHub"
   ↓
5. Same OAuth flow as registration (steps 5-11)
   ↓
6. BetterAuth processes callback:
    - Exchanges code for access_token
    - Fetches user profile
    ↓
7. BetterAuth finds EXISTING user by email
    - Does NOT create new user
    - Creates NEW session in `session` table
    - Updates `account` table with new tokens
    ↓
8. Sets HTTP-only session cookie
    ↓
9. Redirects to / (home page)
    ↓
10. User is logged in
```

### Session Validation on Protected Routes

```
1. User requests protected route /chat/[id]
   ↓
2. Middleware intercepts request:
   - Extracts headers (including cookies)
   ↓
3. Calls: await auth.api.getSession({ headers: req.headers })
   ↓
4. BetterAuth:
    - Reads session token from cookie
    - Looks up session in database
    - Checks expiration against current time
    - Returns user object if valid
   ↓
5. If valid:
    - isLoggedIn = true
    - Route access allowed
   ↓
6. If invalid/expired:
    - isLoggedIn = false
    - Redirects to /login
```

### tRPC Protected Procedure Call Flow

```
1. Client calls: trpc.chat.getChatById.useQuery({ chatId })
   ↓
2. tRPC client sends request to /api/trpc/chat.getChatById
   ↓
3. Request includes session cookie in headers
   ↓
4. tRPC server-side:
    - Calls createTRPCContext()
    - Extracts headers from request
    ↓
5. Context creation:
    - Calls: await auth.api.getSession({ headers })
    - BetterAuth validates session from cookie
    - Returns user object or null
   ↓
6. tRPC procedure execution:
    - protectedProcedure middleware runs
    - Checks: if (!ctx.user) throw UNAUTHORIZED
    ↓
7. If user present:
    - Procedure logic executes with ctx.user.id
    - Can access user-specific data
   ↓
8. If user missing:
    - Throws TRPCError { code: "UNAUTHORIZED" }
    - Client receives error
    - Client can redirect to /login
```

### Sign-Out Flow

```
1. User clicks logout button (or calls authClient.signOut())
   ↓
2. POST request to /api/auth/sign-out
   ↓
3. BetterAuth handler:
    - Reads session cookie
    - Marks session as invalid in database
   ↓
4. Clears session cookie from response
   ↓
5. Redirects to /login
   ↓
6. Subsequent requests:
    - No valid session cookie
    - Middleware detects unauthenticated state
    - User cannot access protected routes
```

---

## 10. Authorization and Permissions

### Role-Based Access Control (RBAC)

**Current Implementation:** No explicit RBAC system found

The application uses simple binary authentication (authenticated vs. unauthenticated) without roles.

### Resource-Level Authorization

**Pattern:** Ownership-based access control

All protected tRPC procedures verify resource ownership before allowing access.

**Example: Chat Access Control**
File: `/Users/ashray/code/amxv/agentdune-chat/trpc/routers/chat.router.ts` - Lines 66-70

```typescript
if (!chat || chat.userId !== ctx.user.id) {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Chat not found",
  });
}
```

**Pattern:** Returns `NOT_FOUND` instead of `UNAUTHORIZED` to prevent leaking existence of other users' chats.

### Public vs. Private Resources

**Visibility Model:**
File: `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` - Lines 36-38

```typescript
visibility: varchar("visibility", { enum: ["public", "private"] })
  .notNull()
  .default("private"),
```

**Public Chats:** Accessible via public procedures (no auth required)
File: `/Users/ashray/code/amxv/agentdune-chat/trpc/routers/chat.router.ts` - Lines 241-258

```typescript
getPublicChat: publicProcedure
  .input(
    z.object({
      chatId: z.string().uuid(),
    })
  )
  .query(async ({ input }) => {
    const chat = await getChatById({ id: input.chatId });

    if (!chat || chat.visibility !== "public") {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Public chat not found",
      });
    }

    return dbChatToUIChat(chat);
  }),
```

**Private Chats:** Only accessible by owner (protected procedure)

### User Credit/Quota System

**Implementation:** User credit tracking for API usage
File: `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` - Lines 17-24

```typescript
export const userCredit = pgTable("UserCredit", {
  userId: text("userId")
    .primaryKey()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  credits: integer("credits").notNull().default(100),
  reservedCredits: integer("reservedCredits").notNull().default(0),
});
```

**Fields:**
- `credits` - Available credits
- `reservedCredits` - Credits held for in-progress operations

**No explicit authorization checks for credits in authentication code** - likely enforced in API route handlers or separate utility functions.

---

## Security Considerations and Best Practices

### 1. Secure Cookie Handling
- HTTP-only cookies prevent XSS attacks
- Secure flag ensures HTTPS-only in production
- SameSite attribute prevents CSRF attacks
- Session tokens are unique and cryptographically secure

### 2. CSRF Protection
- Trusted origins configured: `env.VERCEL_URL`
- Only OAuth requests from trusted origins accepted
- CSRF tokens embedded in OAuth state parameter

### 3. Session Validation
- Session expiration checked on every request
- Expired sessions treated as invalid
- Session database record required for validity

### 4. Secret Management
- `AUTH_SECRET` used for signing/encryption
- Generated via secure random source
- Never logged or exposed
- Environment-variable based

### 5. OAuth Credentials Security
- Client IDs and secrets stored in environment variables
- Secrets never sent to frontend
- Conditional provider enabling if credentials missing

### 6. Resource Ownership Validation
- Every protected operation verifies user ownership
- Returns `NOT_FOUND` for unauthorized access (prevents existence leaking)
- User ID from session context used for all queries

### 7. Database Security
- Foreign key constraints enforce referential integrity
- CASCADE DELETE removes sessions/accounts when user deleted
- Session table tracks IP and user agent (optional auditing)

---

## Summary of Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| BetterAuth Init | `/lib/auth.ts` | Main auth instance with DB adapter & OAuth config |
| Auth Client | `/lib/auth-client.ts` | Client-side auth client for React |
| Auth Routes | `/app/(auth)/api/auth/[...all]/route.ts` | Catch-all for BetterAuth endpoints |
| Middleware | `/middleware.ts` | Route-level protection & redirects |
| Session Provider | `/providers/session-provider.tsx` | React context for session state |
| tRPC Init | `/trpc/init.ts` | Protected & public procedures |
| Database Client | `/lib/db/client.ts` | Drizzle ORM PostgreSQL connection |
| Database Schema | `/lib/db/schema.ts` | User, session, account tables |
| Environment Config | `/lib/env.ts` | Type-safe env variable validation |
| Login Form | `/components/login-form.tsx` | Login UI component |
| Signup Form | `/components/signup-form.tsx` | Registration UI component |
| Social Auth Buttons | `/components/social-auth-providers.tsx` | OAuth provider buttons |

---

## Integration Points Summary

1. **User navigates to protected route**
   → Middleware validates session
   → Redirects to login if invalid
   → SessionProvider supplies session to children

2. **User logs in**
   → Social auth button calls authClient.signIn.social()
   → BetterAuth route handler processes OAuth
   → Database records created/updated
   → Session cookie set
   → Redirect to home

3. **Client component needs user data**
   → Calls useSession() hook
   → Gets session from SessionProvider context
   → Session data from server + client sync

4. **Protected tRPC call made**
   → createTRPCContext retrieves session
   → protectedProcedure validates user exists
   → User ID available in ctx.user.id
   → Procedure executes with user context

5. **User logs out**
   → authClient.signOut() called
   → POST to /api/auth/sign-out
   → Session invalidated in database
   → Cookie cleared
   → Redirect to login

---

## Environment Variables Required for Full Functionality

```env
# REQUIRED
AUTH_SECRET=<cryptographically-secure-random-string>
POSTGRES_URL=postgres://...

# REQUIRED FOR GITHUB OAUTH (currently active)
AUTH_GITHUB_ID=<github-oauth-app-client-id>
AUTH_GITHUB_SECRET=<github-oauth-app-client-secret>

# OPTIONAL: GOOGLE OAUTH (currently disabled)
AUTH_GOOGLE_ID=<optional-google-oauth-client-id>
AUTH_GOOGLE_SECRET=<optional-google-oauth-client-secret>

# RECOMMENDED
VERCEL_URL=https://app.domain.com  # For trusted origins validation
```

---

## Key Files Quick Reference

| Question | File | Lines |
|----------|------|-------|
| Where is BetterAuth configured? | `/lib/auth.ts` | 18-51 |
| How are OAuth providers set up? | `/lib/auth.ts` | 26-48 |
| Where are auth routes? | `/app/(auth)/api/auth/[...all]/route.ts` | 1-4 |
| How is middleware protecting routes? | `/middleware.ts` | 34-79 |
| How is session provided to React? | `/providers/session-provider.tsx` | 16-45 |
| How are protected procedures defined? | `/trpc/init.ts` | 120-135 |
| What is the user schema? | `/lib/db/schema.ts` | 138-149 |
| What is the session schema? | `/lib/db/schema.ts` | 151-164 |
| What is the OAuth account schema? | `/lib/db/schema.ts` | 166-184 |
| How do social auth buttons work? | `/components/social-auth-providers.tsx` | 7-30 |
| What env vars are needed? | `/lib/env.ts` | 6-87 |
| How is session retrieved server-side? | `/trpc/init.ts` | 29-34 |
| How is session used in layouts? | `/app/(chat)/layout.tsx` | 21-36 |

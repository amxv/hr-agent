# Better-Auth Setup Research

## Analysis: Better-Auth Configuration in RAG Application

### Overview
This codebase uses `better-auth@1.3.27` for authentication, configured with OAuth social providers (Google and GitHub) on the backend, Drizzle ORM for database adapter, and Next.js integration with cookie-based session management. The auth system is fully typed with TypeScript and uses a PostgreSQL database for storing user, session, and account data.

---

## Entry Points

- **Backend Auth Server**: `/Users/ashray/code/amxv/rag/lib/auth.ts` - Core auth configuration
- **Backend API Route Handler**: `/Users/ashray/code/amxv/rag/app/(auth)/api/auth/[...all]/route.ts` - Catch-all route for auth endpoints
- **Frontend Auth Client**: `/Users/ashray/code/amxv/rag/lib/auth-client.ts` - React client for auth operations
- **Middleware**: `/Users/ashray/code/amxv/rag/middleware.ts` - Session-based route protection

---

## 1. Backend Auth Configuration

### Location
**File**: `/Users/ashray/code/amxv/rag/lib/auth.ts`

### Configuration Details

#### 1.1 Core Setup (Lines 18-51)

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: env.VERCEL_URL ? [env.VERCEL_URL] : undefined,
  secret: env.AUTH_SECRET,
  socialProviders: {
    google: { clientId, clientSecret },
    github: { clientId, clientSecret },
  },
  plugins: [nextCookies()],
});
```

**Key Points:**
- **Database Adapter** (Line 19-22): Uses Drizzle ORM adapter with PostgreSQL provider
- **Database Schema** (Line 21): References schema from `/Users/ashray/code/amxv/rag/lib/db/schema.ts`
- **Trusted Origins** (Line 23): Configured from `env.VERCEL_URL` for production deployments
- **Auth Secret** (Line 24): Required `AUTH_SECRET` from environment for cryptographic operations
- **Cookie Plugin** (Line 50): `nextCookies()` plugin handles cookie-based sessions for Next.js

#### 1.2 OAuth Provider Configuration (Lines 26-49)

The auth setup conditionally enables OAuth providers based on environment variables:

```typescript
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
```

**Behavior:**
- Providers are only enabled if BOTH `clientId` and `clientSecret` are present and non-empty strings
- If credentials are missing, the provider is set to `undefined` and won't be available
- This allows graceful degradation if OAuth credentials aren't configured

### Session Type Definition (Lines 8-16)

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

---

## 2. Environment Variables

### Location
**Primary**: `/Users/ashray/code/amxv/rag/lib/env.ts`
**Example**: `/Users/ashray/code/amxv/rag/.env.example`

### Required Environment Variables for Auth

#### 2.1 Core Auth Variables (Lines 12 & 24 in env.ts)

```typescript
AUTH_SECRET: z.string().min(1),
```

**Details:**
- **Type**: Required string
- **Purpose**: Cryptographic secret for session tokens and signing
- **Setup**: Generate with `openssl rand -base64 32` or https://generate-secret.vercel.app/32
- **Usage**: Line 49 in env.ts mapping

#### 2.2 Google OAuth Configuration (Lines 18-19 in env.ts)

```typescript
AUTH_GOOGLE_ID: z.string().optional(),
AUTH_GOOGLE_SECRET: z.string().optional(),
```

**Details:**
- **Type**: Optional strings
- **Setup**: Create OAuth app at Google Cloud Console
- **Configuration Location**: `/Users/ashray/code/amxv/rag/.env.example` lines 42-44
  ```
  # Google auth
  AUTH_GOOGLE_ID=****
  AUTH_GOOGLE_SECRET=****
  ```
- **Usage in Runtime** (env.ts lines 50-51):
  ```typescript
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  ```

#### 2.3 GitHub OAuth Configuration (Lines 20-21 in env.ts)

```typescript
AUTH_GITHUB_ID: z.string().optional(),
AUTH_GITHUB_SECRET: z.string().optional(),
```

**Details:**
- **Type**: Optional strings
- **Setup**: Create OAuth app at GitHub Developer Settings
- **Configuration Location**: `/Users/ashray/code/amxv/rag/.env.example` lines 46-47
  ```
  AUTH_GITHUB_ID=your_github_client_id
  AUTH_GITHUB_SECRET=your_github_client_secret
  ```
- **Usage in Runtime** (env.ts lines 52-53):
  ```typescript
  AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
  AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
  ```

#### 2.4 Database Configuration (Lines 9)

```typescript
POSTGRES_URL: z.string().min(1),
```

**Details:**
- **Purpose**: PostgreSQL connection string for auth data storage
- **Required**: Yes (auth tables need database)
- **Documentation**: `/Users/ashray/code/amxv/rag/.env.example` line 11
  ```
  POSTGRES_URL=****
  ```

#### 2.5 Vercel Deployment Configuration (Lines 33-34 in env.ts)

```typescript
VERCEL_URL: z.string().optional(),
VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
```

**Details:**
- **Purpose**: Used to set `trustedOrigins` for OAuth redirects in production
- **Line 23 in auth.ts**: `trustedOrigins: env.VERCEL_URL ? [env.VERCEL_URL] : undefined,`

---

## 3. Auth API Routes & Endpoints

### Location
**File**: `/Users/ashray/code/amxv/rag/app/(auth)/api/auth/[...all]/route.ts`

### Route Handler Implementation (Lines 1-4)

```typescript
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
```

**Details:**
- **Catch-all Route**: `[...all]` pattern captures all auth endpoints under `/api/auth/*`
- **Handler**: `toNextJsHandler()` converts the auth instance to Next.js API route handlers
- **HTTP Methods**: Both GET and POST are exposed for OAuth flows and session management

### Generated Auth Endpoints

Better-auth with Next.js integration automatically creates these endpoints (standard better-auth endpoints):

- **OAuth Sign-In**: `POST /api/auth/signIn/google` and `POST /api/auth/signIn/github`
- **OAuth Callback**: `GET /api/auth/callback/google` and `GET /api/auth/callback/github` (handled internally)
- **Sign Out**: `POST /api/auth/signOut`
- **Session**: `GET /api/auth/session`
- **CSRF**: `POST /api/auth/csrf`

---

## 4. Frontend Auth Client

### Location
**File**: `/Users/ashray/code/amxv/rag/lib/auth-client.ts`

### Client Initialization (Lines 1-9)

```typescript
import { nextCookies } from "better-auth/next-js";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  // baseURL can be omitted if API base matches frontend origin
  plugins: [nextCookies()],
});

export default authClient;
```

**Details:**
- **Client Type**: React client created with `createAuthClient()`
- **Cookie Plugin**: `nextCookies()` handles cookie-based session management
- **Base URL**: Omitted because API routes are on same origin (`/api/auth`)
- **Exported**: Default export for use in client components

### Client Usage Examples

#### 4.1 Social Sign-In (Component: `/Users/ashray/code/amxv/rag/components/social-auth-providers.tsx`)

**File**: `/Users/ashray/code/amxv/rag/components/social-auth-providers.tsx` (Lines 12 & 21)

```typescript
<Button
  onClick={() => authClient.signIn.social({ provider: "google" })}
  type="button"
>
  {/* ... */}
  Continue with Google
</Button>

<Button
  onClick={() => authClient.signIn.social({ provider: "github" })}
  type="button"
>
  {/* ... */}
  Continue with GitHub
</Button>
```

**Flow:**
1. User clicks "Continue with Google/GitHub" button
2. `authClient.signIn.social()` initiates OAuth flow
3. Redirects to OAuth provider's authorization endpoint
4. OAuth provider redirects back to callback URL
5. Session cookie is set upon successful authentication

#### 4.2 Session Access in Middleware (File: `/Users/ashray/code/amxv/rag/middleware.ts`)

**Lines 33-34**:

```typescript
const session = await auth.api.getSession({ headers: req.headers });
const isLoggedIn = !!session?.user;
```

**Details:**
- Uses server-side `auth.api.getSession()` to check session from request headers
- Session includes user info and expiration
- Used for protected route enforcement

---

## 5. OAuth Redirect/Callback URLs

### Configuration Pattern

Better-auth automatically constructs callback URLs based on:
1. **Application Base URL**: From `trustedOrigins` in auth config or request origin
2. **Provider**: OAuth provider name (google, github)
3. **Pattern**: `{baseUrl}/api/auth/callback/{provider}`

### Actual Callback URLs (Auto-Generated)

**For Local Development:**
- Google: `http://localhost:3000/api/auth/callback/google`
- GitHub: `http://localhost:3000/api/auth/callback/github`

**For Production (Vercel):**
- Google: `https://{VERCEL_URL}/api/auth/callback/google`
- GitHub: `https://{VERCEL_URL}/api/auth/callback/github`

### Where to Configure in OAuth Providers

1. **Google Cloud Console** (OAuth 2.0 Application):
   - Authorized redirect URIs: Add the callback URL above

2. **GitHub Developer Settings** (OAuth App):
   - Authorization callback URL: Set to the callback URL above

---

## 6. Database Schema for Auth

### Location
**File**: `/Users/ashray/code/amxv/rag/lib/db/schema.ts`

### Auth-Related Tables

#### 6.1 User Table (Lines 138-149)

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
    .$onUpdate(() => new Date())
    .notNull(),
});
```

**Purpose**: Stores core user profile information
**Fields:**
- `id`: Unique user identifier (primary key)
- `name`: User's display name
- `email`: User's email (unique constraint)
- `emailVerified`: Email verification status
- `image`: User's avatar/profile image URL
- `createdAt`: Account creation timestamp
- `updatedAt`: Last profile update timestamp

#### 6.2 Session Table (Lines 151-164)

```typescript
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});
```

**Purpose**: Manages user sessions and authentication tokens
**Fields:**
- `id`: Session identifier
- `expiresAt`: Session expiration time
- `token`: Session token (stored as cookie)
- `ipAddress`: IP address when session created
- `userAgent`: Browser user agent
- `userId`: Foreign key to user table (cascade delete)

#### 6.3 Account Table (Lines 166-184)

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
    .$onUpdate(() => new Date())
    .notNull(),
});
```

**Purpose**: Stores OAuth provider connections and credentials
**Fields:**
- `accountId`: Provider's account ID (e.g., GitHub user ID)
- `providerId`: OAuth provider name (google, github)
- `accessToken`: OAuth access token
- `refreshToken`: OAuth refresh token
- `accessTokenExpiresAt`: When access token expires
- `scope`: Granted OAuth scopes
- `password`: Hashed password (if applicable)
- `userId`: Foreign key to user table (cascade delete)

#### 6.4 Verification Table (Lines 186-196)

```typescript
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
```

**Purpose**: Stores verification codes and tokens (e.g., email verification, password reset)
**Fields:**
- `identifier`: Email or user ID being verified
- `value`: Verification code/token
- `expiresAt`: When verification expires

#### 6.5 Exported Schema (Line 198)

```typescript
export const schema = { user, session, account, verification };
```

**Usage**: This schema object is passed to Drizzle adapter in `lib/auth.ts` (line 21)

---

## 7. Login & Registration Pages

### Login Page
**File**: `/Users/ashray/code/amxv/rag/app/(auth)/login/page.tsx`

**Implementation** (Lines 13-31):
- Routes: `/login`
- Component: `<LoginForm />`
- Features: OAuth buttons for Google and GitHub, link to sign up

### Registration Page
**File**: `/Users/ashray/code/amxv/rag/app/(auth)/register/page.tsx`

**Implementation** (Lines 12-29):
- Routes: `/register`
- Component: `<SignupForm />`
- Features: OAuth buttons, link to login

### Login Form Component
**File**: `/Users/ashray/code/amxv/rag/components/login-form.tsx` (Lines 1-44)

**Details:**
- Imports: `SocialAuthProviders` component
- Only OAuth social logins (Google and GitHub) - no email/password form
- Links to terms and privacy policy
- Redirect link to registration page

### Sign-Up Form Component
**File**: `/Users/ashray/code/amxv/rag/components/signup-form.tsx` (Lines 1-43)

**Details:**
- Imports: `SocialAuthProviders` component
- Only OAuth social signups (Google and GitHub) - no email/password form
- Links to terms and privacy policy
- Redirect link to login page

### Social Auth Providers Component
**File**: `/Users/ashray/code/amxv/rag/components/social-auth-providers.tsx` (Lines 1-30)

**Details** (Lines 7-29):
- Uses `authClient` from `/lib/auth-client.ts`
- Two buttons: Google and GitHub
- Click handlers: `authClient.signIn.social({ provider: "google" })` and `authClient.signIn.social({ provider: "github" })`
- Icons from `@phosphor-icons/react`

---

## 8. Protected Routes & Middleware

### Middleware Implementation
**File**: `/Users/ashray/code/amxv/rag/middleware.ts`

#### 8.1 Session Checking (Lines 33-34)

```typescript
const session = await auth.api.getSession({ headers: req.headers });
const isLoggedIn = !!session?.user;
```

**Details:**
- Retrieves session from request headers (cookies)
- Checks if user is authenticated

#### 8.2 Route Protection Logic (Lines 45-73)

**Protected Routes:**
- `/` (home/chat) - Requires authentication (Line 61-68)
  - Redirects unauthenticated users to `/login`
- `/chat/*` - Requires authentication
- Auth state redirects (Line 45-46):
  - Logged-in users accessing `/login` or `/register` redirected to `/`

**Public Routes:**
- `/login`, `/register` - No authentication required (Lines 48-50)
- `/models`, `/compare` - No authentication required (Lines 54-55)
- `/privacy`, `/terms` - No authentication required (Lines 57-59)
- `/share/*` - Public shared chats, no authentication required (Lines 51-53)
- API routes - Bypassed (Line 23-25)

---

## 9. Data Flow: OAuth Sign-In

### Step-by-Step Flow

1. **User Action** (Frontend)
   - Click "Continue with Google" button in `<SocialAuthProviders />` component
   - Triggers: `authClient.signIn.social({ provider: "google" })`

2. **Client Request** (Frontend)
   - Better-auth client sends request to `/api/auth/signIn/google`

3. **Backend Processing** (Server)
   - Request hits: `/app/(auth)/api/auth/[...all]/route.ts` (Line 1-4)
   - `toNextJsHandler()` routes to better-auth internals
   - OAuth flow initiated

4. **OAuth Authorization**
   - User redirected to Google OAuth consent screen
   - User grants permissions

5. **OAuth Callback**
   - Google redirects to: `/api/auth/callback/google` (auto-handled by better-auth)
   - Backend verifies OAuth code and exchanges for tokens

6. **Session Creation**
   - Backend creates session in database (session table)
   - Backend creates user record if new (user table)
   - Backend stores OAuth tokens (account table)
   - Session token set as cookie

7. **Frontend Redirect**
   - User redirected back to application
   - Session cookie automatically included in requests
   - Middleware validates session (Line 33-34 in middleware.ts)
   - User can access protected routes

---

## 10. Configuration Summary

### Minimal Setup Required

To run this authentication system, you need:

```env
# Required
AUTH_SECRET=your-generated-secret-here
POSTGRES_URL=postgresql://user:password@host/database

# Optional but recommended
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-client-secret

# For Vercel deployments
VERCEL_URL=https://your-domain.vercel.app
```

### OAuth Provider Setup Checklist

1. **Google OAuth**:
   - Create project at Google Cloud Console
   - Create OAuth 2.0 credentials (Web application)
   - Add redirect URI: `https://your-domain/api/auth/callback/google`
   - Copy Client ID and Client Secret

2. **GitHub OAuth**:
   - Create OAuth App at GitHub Developer Settings
   - Set Authorization callback URL: `https://your-domain/api/auth/callback/github`
   - Copy Client ID and Client Secret

### Key Dependencies

- `better-auth@1.3.27` - Auth framework
- `drizzle-orm` - Database ORM
- `better-auth/adapters/drizzle` - Drizzle adapter for better-auth
- `better-auth/next-js` - Next.js integration
- `pg` - PostgreSQL driver

---

## 11. Key Architectural Patterns

### Pattern 1: Conditional Provider Setup
**Location**: `/Users/ashray/code/amxv/rag/lib/auth.ts` (Lines 26-49)

Providers are conditionally enabled based on environment variables rather than failing at startup. This allows the app to run without OAuth configured.

### Pattern 2: Middleware-Based Session Validation
**Location**: `/Users/ashray/code/amxv/rag/middleware.ts` (Line 33)

Session is validated at the middleware level for all requests, enabling centralized route protection.

### Pattern 3: Catch-All Route Handler
**Location**: `/Users/ashray/code/amxv/rag/app/(auth)/api/auth/[...all]/route.ts`

Uses Next.js catch-all segments to handle all better-auth endpoints with a single handler.

### Pattern 4: Typed Session Type
**Location**: `/Users/ashray/code/amxv/rag/lib/auth.ts` (Lines 8-16)

Exports a `Session` type for type-safe session usage throughout the application.

---

## 12. Important Notes

1. **OAuth-Only Authentication**: The app currently only supports OAuth (Google and GitHub). Email/password authentication is not implemented.

2. **Cookie-Based Sessions**: Sessions are stored in HTTP-only cookies managed by `nextCookies()` plugin for security.

3. **Automatic Schema Migration**: Better-auth creates all required tables automatically on first run. No manual migration needed for initial auth setup.

4. **Email Verification**: The `emailVerified` field exists but is not enforced - all OAuth users are assumed verified.

5. **Token Storage**: OAuth tokens (access and refresh) are stored in the database account table for potential future API access on behalf of users.

6. **Session Expiration**: Sessions are managed by better-auth with automatic expiration based on configuration.

7. **Development vs Production**: The `trustedOrigins` is only set in production when `VERCEL_URL` is available - important for OAuth security.

8. **CSRF Protection**: Better-auth handles CSRF protection internally with `/api/auth/csrf` endpoint.


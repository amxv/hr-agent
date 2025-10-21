---
date: 2025-10-21 19:05:56
feature-slug: 001-admin-user-management
---

# 001-admin-user-management Implementation Plan

## Overview

This feature replaces OAuth authentication with email/password authentication and adds administrative capabilities for user management. The implementation leverages Better Auth's admin plugin for core user management operations, adds role-based authorization middleware to tRPC, and creates a comprehensive admin dashboard UI.

### Current State Analysis

**Authentication:**
- Better Auth configured with OAuth providers (GitHub, Google) only
- No email/password authentication
- Session type (`lib/auth.ts:8-16`) doesn't include role field
- Login form (`components/login-form.tsx`) uses only OAuth buttons

**Database:**
- User table (`lib/db/schema.ts:138-149`) lacks role and status fields
- Better Auth tables exist: user, session, account, verification
- Password field exists in account table but unused

**Authorization:**
- `protectedProcedure` middleware exists (`trpc/init.ts:120-135`) but no role-based checks
- Next.js middleware (`middleware.ts:34-35`) validates sessions but doesn't check admin status
- No admin-specific routes or middleware protection

**UI:**
- Form patterns established with react-hook-form + Zod (`components/ui/form.tsx`)
- shadcn/ui components available (Card, Dialog, Table, etc.)
- No admin dashboard or user management UI exists

### Desired End State

After implementing this plan:

1. **Authentication:**
   - Users log in with email and password (OAuth removed)
   - Better Auth handles password hashing (scrypt) automatically
   - Sessions managed via HTTP-only cookies

2. **User Roles:**
   - Users have either "admin" or "user" role
   - Default admin account exists (admin@example.com / password)
   - Role stored in user table and included in session

3. **Admin Dashboard:**
   - Accessible at `/admin/users` (admin-only)
   - Lists all users with search/filter
   - Create users with auto-generated or custom passwords
   - Edit user emails
   - Reset user passwords
   - Deactivate/reactivate users (soft delete via ban system)

4. **Authorization:**
   - tRPC `adminProcedure` middleware enforces admin-only operations
   - Next.js middleware protects `/admin/*` routes
   - Self-deactivation and last-admin protection enforced

**Verification:**
- Visit `/login` and authenticate with email/password
- Admin users can access `/admin/users` dashboard
- Non-admin users redirected from `/admin/*` routes
- All user management operations work via admin dashboard
- Deactivated users cannot log in
- Default admin account exists and works

### What We're NOT Doing

The following are explicitly out of scope:
- Email verification for new accounts
- Self-service password reset via email
- Rate limiting on login attempts
- Account lockout after failed login
- Audit logging of admin actions
- Session timeout configuration
- User profile self-management
- Bulk user operations
- Multiple admin permission levels (super admin vs regular admin)
- Account linking or multiple auth methods per user
- Email notifications to users
- User activity tracking
- Advanced search/filtering (beyond basic email search)
- Pagination (future enhancement)
- Export/import user data
- Password complexity requirements (beyond min length)
- Password expiration policies

### Implementation Approach

**Strategy:**
1. Database first - Add role/ban fields via migrations
2. Auth configuration - Switch from OAuth to email/password
3. Authorization layer - Create admin middleware
4. Backend API - Build tRPC admin router
5. Frontend UI - Update login and create admin dashboard

**Key Architectural Patterns:**
- Use Better Auth admin plugin for user management operations (not custom implementations)
- Use Better Auth ban system for soft delete (banned = inactive)
- Leverage existing form patterns (react-hook-form + Zod)
- Follow shadcn/ui dialog pattern for create/edit operations
- Maintain end-to-end type safety (Zod → tRPC → React)

---

## Database Schema

After all changes, the user table will have this structure:

```typescript
// lib/db/schema.ts
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

  // NEW FIELDS (added by Better Auth admin plugin migration):
  role: text("role").notNull(),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});
```

**Notes:**
- Better Auth admin plugin migration adds role, banned, banReason, banExpires fields automatically
- We treat banned = true as "inactive" status (soft delete)
- role is text field (Better Auth stores as string, not enum)
- Default admin created via manual SQL migration after Better Auth migration

**Indexes:**
- Existing: unique index on email
- No new indexes needed (user list queries are not performance-critical for MVP)

---

## Shared Type Definitions

These types will be used across backend and frontend:

```typescript
// Type definitions (inferred from Zod schemas and Better Auth types)

// User role enum
type UserRole = "admin" | "user";

// User status (derived from banned field)
type UserStatus = "active" | "inactive";

// Extended session type (replaces lib/auth.ts:8-16)
type Session = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string; // "admin" | "user"
    banned?: boolean;
  };
  expires?: string;
};

// Admin dashboard user list item
type AdminUserListItem = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  banned: boolean;
  banReason: string | null;
};

// Create user input
type CreateUserInput = {
  email: string;
  name: string;
  password?: string; // Optional - auto-generated if not provided
  role?: UserRole;
};

// Create user output
type CreateUserOutput = {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  generatedPassword?: string; // Only present if password was auto-generated
};

// Update user input
type UpdateUserInput = {
  userId: string;
  email: string;
};

// Reset password input
type ResetPasswordInput = {
  userId: string;
  newPassword: string;
};

// List users input (for filtering/searching)
type ListUsersInput = {
  searchValue?: string;
  searchField?: "email" | "name";
  limit?: number;
  offset?: number;
  filterField?: "role" | "status";
  filterValue?: string;
};

// List users output
type ListUsersOutput = {
  users: AdminUserListItem[];
  total: number;
};

// Deactivate/reactivate user input
type DeactivateUserInput = {
  userId: string;
};

type ReactivateUserInput = {
  userId: string;
};

// Login credentials
type LoginCredentials = {
  email: string;
  password: string;
};
```

**Notes:**
- These types will be inferred from Zod schemas (no manual type definitions needed)
- Better Auth provides base session type - we extend it
- All inputs validated by Zod before reaching tRPC procedures

---

## Phase 1: Database Schema and Migrations

### Overview
This phase adds the required database fields for role-based authentication and user management. We'll run the Better Auth admin plugin migration to add role and ban fields, then create a manual migration to seed the default admin account.

### Important Codebase Context

#### Files that won't be modified but are important to understand
- `lib/db/client.ts` - Database connection using Drizzle
- `lib/db/migrate.ts` - Migration runner script
- `drizzle.config.ts` - Drizzle configuration for migrations
- `lib/db/migrations/` - Contains 26 existing migration files

#### Files that need to be modified or extended
- `lib/db/schema.ts:138-149` - User table definition (Better Auth will modify via its migration)

#### New Files that need to be created
- `lib/db/migrations/XXXX_better_auth_admin_plugin.sql` - Generated by Better Auth CLI
- `lib/db/migrations/XXXX_create_default_admin.sql` - Manual SQL to create admin@example.com

#### Patterns, Conventions, and Design Decisions to Reuse
- Migration workflow: Edit schema → Run `npm run db:generate` → Review SQL → Run `npm run db:migrate`
- Always use `.default()` for new NOT NULL columns on existing tables
- Use timestamp fields with `.defaultNow()` for creation tracking
- Follow Better Auth's naming conventions for auth-related fields

#### Key Constraints to work within
- Better Auth admin plugin controls schema for role/ban fields (don't modify manually)
- Must run Better Auth migration before creating default admin (role field must exist)
- Cannot modify Better Auth's user table structure directly
- Default values required for new NOT NULL columns on existing table with data

### Changes Required:

#### 1. Run Better Auth Admin Plugin Migration
**Command**: `npx @better-auth/cli migrate`
**Generated File**: `lib/db/migrations/XXXX_better_auth_admin_plugin.sql`

**Description**:
Better Auth CLI will generate and apply SQL migration that adds:
- `role` TEXT NOT NULL (default value set via Better Auth config)
- `banned` BOOLEAN DEFAULT false
- `ban_reason` TEXT
- `ban_expires` TIMESTAMP

**Notes:**
- This is an automatic process - Better Auth generates the SQL
- The migration adds fields to existing user table
- Default role ("user") configured in Better Auth plugin config
- After running, all existing users will have role = "user" and banned = false

#### 2. Create Default Admin Account Migration
**File**: `lib/db/migrations/XXXX_create_default_admin.sql` (manual creation)

**Description**:
Create SQL migration to insert default admin account with known credentials.

**SQL Structure** (pseudocode):
```sql
-- Check if admin@example.com already exists, only insert if not present
INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
VALUES (
  'admin-default-id',
  'Default Admin',
  'admin@example.com',
  true,
  'admin',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

-- Create account record with hashed password
-- Password: "password" (hashed with scrypt)
INSERT INTO "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
VALUES (
  'admin-account-id',
  'admin@example.com',
  'credential',
  'admin-default-id',
  '[scrypt-hashed-password-here]',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;
```

**Notes:**
- Password must be pre-hashed using scrypt (Better Auth's default algorithm)
- Use ON CONFLICT to make migration idempotent
- Generate hash using Node.js crypto.scrypt or Better Auth utility
- This migration runs after Better Auth migration (depends on role field existing)

#### 3. Update Schema Type Exports
**File**: `lib/db/schema.ts`
**Changes**: No code changes needed - Drizzle auto-generates types from schema

**Description**:
After migrations run, Drizzle will automatically include new fields in the `User` type export.
The `InferSelectModel<typeof user>` type will now include role, banned, banReason, banExpires fields.

**Verification**:
- TypeScript will recognize new fields in user queries
- `db.select().from(user)` will include role and banned in return type
- Session objects can access user.role and user.banned

---

## Phase 2: Authentication Configuration

### Overview
Replace OAuth authentication with email/password authentication and add the Better Auth admin plugin for user management capabilities.

### Important Codebase Context

#### Files that won't be modified but are important to understand
- `lib/env.ts` - Environment variable validation (may need AUTH_SECRET)
- `app/api/auth/[...all]/route.ts` - Better Auth API route handler (if exists)

#### Files that need to be modified or extended
- `lib/auth.ts:18-51` - Better Auth server configuration (replace OAuth with email/password)
- `lib/auth.ts:8-16` - Session type definition (add role field)
- `lib/auth-client.ts:4-7` - Better Auth client configuration (add adminClient plugin)

#### New Files that need to be created
None - all changes are modifications to existing files

#### Patterns, Conventions, and Design Decisions to Reuse
- Better Auth plugins pattern: array of plugin functions passed to `plugins: []`
- Environment variable access via `env.VARIABLE_NAME` from `@/lib/env`
- Type exports for session follow Better Auth conventions

#### Key Constraints to work within
- Must keep `nextCookies()` plugin for session management
- Must use Drizzle adapter with existing database schema
- Auth secret must be cryptographically secure (from env)
- Better Auth config is server-side only (runs in Node.js)

### Changes Required:

#### 1. Update Better Auth Server Configuration
**File**: `lib/auth.ts:18-51`

**Changes**:
Replace the current OAuth configuration with email/password authentication and add admin plugin.

**Current Configuration** (lines 18-51):
```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  trustedOrigins: env.VERCEL_URL ? [env.VERCEL_URL] : undefined,
  secret: env.AUTH_SECRET,
  socialProviders: { google, github },
  plugins: [nextCookies()],
});
```

**New Configuration Structure**:
```typescript
import { admin } from "better-auth/plugins";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  trustedOrigins: env.VERCEL_URL ? [env.VERCEL_URL] : undefined,
  secret: env.AUTH_SECRET,

  // REMOVE: socialProviders: { google, github }
  // ADD: Email/password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Per spec FR-020
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  // ADD: Admin plugin for user management
  plugins: [
    nextCookies(),
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
      impersonationSessionDuration: 60 * 60, // 1 hour (optional feature)
    }),
  ],
});
```

**Notes:**
- Remove entire socialProviders configuration block (lines 26-49)
- emailAndPassword.requireEmailVerification = false (per FR-020: no email verification)
- admin plugin provides createUser, setUserPassword, listUsers, banUser, etc.
- defaultRole ensures new users get "user" role
- adminRoles defines which roles count as admin

#### 2. Update Session Type Definition
**File**: `lib/auth.ts:8-16`

**Changes**:
Extend session type to include role and banned fields from user object.

**Current Type**:
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

**New Type**:
```typescript
export type Session = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string; // "admin" | "user"
    banned?: boolean;
  };
  expires?: string;
};
```

**Notes:**
- Better Auth automatically includes all user table fields in session
- role and banned fields available after migration completes
- Type definition documents what's available for TypeScript

#### 3. Update Better Auth Client Configuration
**File**: `lib/auth-client.ts:4-7`

**Changes**:
Add adminClient plugin to enable admin operations from client side.

**Current Configuration**:
```typescript
const authClient = createAuthClient({
  plugins: [nextCookies()],
});
```

**New Configuration**:
```typescript
import { adminClient } from "better-auth/client/plugins";

const authClient = createAuthClient({
  plugins: [
    nextCookies(),
    adminClient(), // Enables admin operations from client
  ],
});
```

**Notes:**
- adminClient plugin enables admin.* operations (createUser, listUsers, etc.)
- Operations still require admin role on server (middleware checks)
- Client plugin provides type-safe methods

---

## Phase 3: Authorization Middleware

### Overview
Create admin-only authorization middleware for tRPC and add route protection for admin pages in Next.js middleware.

### Important Codebase Context

#### Files that won't be modified but are important to understand
- `trpc/init.ts:86-101` - timingMiddleware pattern (base middleware structure)
- `trpc/init.ts:110` - publicProcedure (no auth required)
- `trpc/init.ts:120-135` - protectedProcedure pattern (auth required, session guaranteed)

#### Files that need to be modified or extended
- `trpc/init.ts:29-34` - createTRPCContext (needs to include role from session)
- `trpc/init.ts:135` - Add new adminProcedure after protectedProcedure
- `middleware.ts:34-79` - Add admin route protection

#### New Files that need to be created
None - all changes are additions to existing files

#### Patterns, Conventions, and Design Decisions to Reuse
- Middleware pattern: `t.procedure.use(({ ctx, next }) => { /* checks */ return next({ ctx: { /* enhanced */ } }) })`
- TRPCError with appropriate codes: UNAUTHORIZED, FORBIDDEN, BAD_REQUEST
- Next.js middleware pattern: check route, validate session, redirect if needed
- Session access: `await auth.api.getSession({ headers: await headers() })`

#### Key Constraints to work within
- Must maintain backward compatibility with existing protectedProcedure
- Cannot modify behavior of publicProcedure or protectedProcedure
- Next.js middleware must not break existing route protection
- Admin middleware must check both authentication AND role

### Changes Required:

#### 1. Update tRPC Context to Include Role
**File**: `trpc/init.ts:29-34`

**Changes**:
Context currently only includes basic user info. No changes needed - Better Auth session already includes role field after migration. The context automatically passes through all session.user fields.

**Current Implementation** (no changes needed):
```typescript
export const createTRPCContext = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return {
    user: session?.user, // Already includes role field after migration
  };
});
```

**Notes:**
- session.user already contains role field (from Better Auth)
- TypeScript will recognize role field after Session type updated
- No code changes needed - type system handles it

#### 2. Create Admin-Only Procedure Middleware
**File**: `trpc/init.ts` (add after line 135)

**New Export**:
```typescript
/**
 * Admin-only procedure
 *
 * Verifies user is authenticated AND has admin role.
 * Use this for operations that should only be accessible to administrators.
 */
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  // Check authentication (must be logged in)
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const { id, role, ...rest } = ctx.user;

  // Check user ID exists
  if (!id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Check admin role
  if (role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  // Pass through with guaranteed admin user
  return next({
    ctx: {
      user: { id, role: "admin" as const, ...rest },
    },
  });
});
```

**Notes:**
- Follows same pattern as protectedProcedure (lines 120-135)
- Throws UNAUTHORIZED if not logged in
- Throws FORBIDDEN if logged in but not admin
- Type narrows role to "admin" literal type in context
- All admin router procedures will use this instead of protectedProcedure

#### 3. Add Admin Route Protection to Next.js Middleware
**File**: `middleware.ts:34-79`

**Changes**:
Add admin route checking after session retrieval.

**Add after line 35** (after `const isLoggedIn = !!session?.user;`):

```typescript
// Check for admin routes
const isOnAdminRoute = url.pathname.startsWith("/admin");

if (isOnAdminRoute) {
  // Require authentication for admin routes
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", url));
  }

  // Require admin role
  if (session.user.role !== "admin") {
    // Redirect non-admins to home with error message
    return NextResponse.redirect(new URL("/?error=forbidden", url));
  }

  // Admin authenticated - allow access
  return;
}
```

**Notes:**
- Must be added before the final `isOnChat` block (before line 66)
- Checks authentication first (redirect to login if not logged in)
- Checks admin role second (redirect to home if not admin)
- Returns early to prevent further middleware logic for admin routes
- Could also check banned status here for extra security

#### 4. Update Middleware Matcher to Include Admin Routes
**File**: `middleware.ts:81-94`

**Changes**:
No changes needed - matcher already catches `/admin/*` routes with the catch-all pattern.

**Current Matcher** (already sufficient):
```typescript
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|opengraph-image|manifest|privacy|terms|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest)$).*)",
  ],
};
```

**Notes:**
- Matcher includes all routes except static assets and API routes
- `/admin/users` will be caught by this pattern
- No changes needed

---

## Phase 4: Backend - tRPC Admin Router and Utilities

### Overview
Create the admin router with all user management operations (list, create, update, reset password, deactivate, reactivate) and build supporting utilities for password generation.

### Important Codebase Context

#### Files that won't be modified but are important to understand
- `trpc/routers/chat.router.ts:57-74` - Example of query with input validation
- `trpc/routers/vote.router.ts:23-49` - Example of mutation with authorization checks
- `trpc/init.ts:47-56` - Error formatter with Zod error handling

#### Files that need to be modified or extended
- `trpc/routers/_app.ts:13-18` - Add admin router to main app router

#### New Files that need to be created
- `trpc/routers/admin.router.ts` - Admin user management router
- `lib/utils/password.ts` - Password generation utility

#### Patterns, Conventions, and Design Decisions to Reuse
- Router structure: `createTRPCRouter({ procedureName: adminProcedure.input(schema).mutation/query(...) })`
- Zod input validation: `z.object({ field: z.string().min(1), ... })`
- Error handling: Throw TRPCError with appropriate code and message
- Better Auth API calls: `await auth.api.operationName({ body: {...}, headers: await headers() })`
- Type inference: `type InputType = z.infer<typeof schema>`

#### Key Constraints to work within
- All procedures must use `adminProcedure` (not protectedProcedure or publicProcedure)
- Must call Better Auth admin APIs (don't write custom user management logic)
- Must prevent self-deactivation (throw BAD_REQUEST if userId === ctx.user.id)
- Must prevent last admin deactivation (query to check admin count)
- Email uniqueness enforced by database (catch and rethrow as user-friendly error)

### Changes Required:

#### 1. Create Password Generation Utility
**File**: `lib/utils/password.ts` (new file)

**Exports**:
```typescript
/**
 * Generates a cryptographically secure random password
 *
 * @param length - Password length (default: 16)
 * @returns Secure random password with uppercase, lowercase, numbers, and symbols
 */
export function generateSecurePassword(length?: number): string;
```

**Implementation Approach**:
- Use Node.js crypto.randomBytes() for cryptographic security
- Character set: A-Z, a-z, 0-9, and symbols (!@#$%^&*()_+-=[]{}|;:,.<>?)
- Default length: 16 characters
- Ensure random distribution across character set

**Pseudocode**:
```
FUNCTION generateSecurePassword(length = 16):
  DEFINE character_set = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"

  GENERATE random_bytes = crypto.randomBytes(length)

  INITIALIZE password = ""

  FOR each byte in random_bytes:
    index = byte % character_set.length
    password += character_set[index]

  RETURN password
```

**Notes:**
- Uses crypto.randomBytes for CSPRNG (cryptographically secure pseudorandom number generator)
- Meets FR-034, FR-035, FR-036 requirements
- No external dependencies needed

#### 2. Create Admin Router with User Management Procedures
**File**: `trpc/routers/admin.router.ts` (new file)

**Structure**:
```typescript
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { headers } from "next/headers";
import { createTRPCRouter, adminProcedure } from "@/trpc/init";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/schema";
import { eq, or, ilike, and } from "drizzle-orm";
import { generateSecurePassword } from "@/lib/utils/password";

export const adminRouter = createTRPCRouter({
  listUsers: adminProcedure
    .input(/* validation schema */)
    .query(async ({ input, ctx }) => { /* implementation */ }),

  createUser: adminProcedure
    .input(/* validation schema */)
    .mutation(async ({ input, ctx }) => { /* implementation */ }),

  updateUser: adminProcedure
    .input(/* validation schema */)
    .mutation(async ({ input, ctx }) => { /* implementation */ }),

  resetUserPassword: adminProcedure
    .input(/* validation schema */)
    .mutation(async ({ input, ctx }) => { /* implementation */ }),

  deactivateUser: adminProcedure
    .input(/* validation schema */)
    .mutation(async ({ input, ctx }) => { /* implementation */ }),

  reactivateUser: adminProcedure
    .input(/* validation schema */)
    .mutation(async ({ input, ctx }) => { /* implementation */ }),
});
```

**Procedure Details**:

##### listUsers Query

**Input Schema**:
```typescript
z.object({
  searchValue: z.string().optional(),
  searchField: z.enum(["email", "name"]).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  filterField: z.enum(["role", "status"]).optional(),
  filterValue: z.string().optional(),
})
```

**Returns**: `{ users: AdminUserListItem[], total: number }`

**Implementation Approach**:
- Use Drizzle to query user table with filters
- Transform banned field to status ("active" | "inactive")
- Apply search filter if provided (ILIKE on email or name)
- Apply role/status filter if provided
- Return list with total count

**Pseudocode**:
```
PROCEDURE listUsers(input):
  BUILD where_conditions = []

  IF input.searchValue AND input.searchField:
    ADD ILIKE filter on specified field to where_conditions

  IF input.filterField === "role":
    ADD role = input.filterValue to where_conditions

  IF input.filterField === "status":
    IF input.filterValue === "active":
      ADD banned = false to where_conditions
    ELSE:
      ADD banned = true to where_conditions

  QUERY users = db.select().from(user).where(AND(where_conditions))
    .limit(input.limit).offset(input.offset)

  TRANSFORM users to include status field (banned ? "inactive" : "active")

  COUNT total = db.select(count()).from(user).where(AND(where_conditions))

  RETURN { users, total }
```

**Notes:**
- Drizzle ORM handles SQL injection prevention
- Transform banned boolean to status string for UI
- Limit enforced to prevent large result sets

##### createUser Mutation

**Input Schema**:
```typescript
z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8).optional(),
  role: z.enum(["admin", "user"]).default("user"),
})
```

**Returns**: `{ user: { id, email, name, role }, generatedPassword?: string }`

**Implementation Approach**:
- Generate password if not provided
- Call Better Auth `admin.createUser()` API
- Return user object and generated password (if applicable)
- Handle duplicate email error

**Pseudocode**:
```
PROCEDURE createUser(input):
  IF input.password is undefined:
    password = generateSecurePassword(16)
    password_was_generated = true
  ELSE:
    password = input.password
    password_was_generated = false

  TRY:
    result = auth.api.createUser({
      body: {
        email: input.email,
        name: input.name,
        password: password,
        role: input.role,
      },
      headers: await headers(),
    })
  CATCH error:
    IF error indicates duplicate email:
      THROW TRPCError({ code: "BAD_REQUEST", message: "Email already exists" })
    ELSE:
      THROW error

  RETURN {
    user: result.user,
    generatedPassword: password_was_generated ? password : undefined
  }
```

**Notes:**
- Better Auth handles password hashing automatically (scrypt)
- Generated password returned only once (FR-017)
- Duplicate email caught and transformed to user-friendly error

##### updateUser Mutation

**Input Schema**:
```typescript
z.object({
  userId: z.string(),
  email: z.string().email(),
})
```

**Returns**: `{ success: true }`

**Implementation Approach**:
- Call Better Auth `admin.updateUser()` API
- Handle duplicate email error

**Pseudocode**:
```
PROCEDURE updateUser(input):
  TRY:
    auth.api.updateUser({
      body: {
        userId: input.userId,
        data: { email: input.email },
      },
      headers: await headers(),
    })
  CATCH error:
    IF error indicates duplicate email:
      THROW TRPCError({ code: "BAD_REQUEST", message: "Email already exists" })
    ELSE:
      THROW error

  RETURN { success: true }
```

**Notes:**
- Only email editing supported (per spec FR-027)
- Name changes not implemented (not in spec)
- Email uniqueness enforced by database

##### resetUserPassword Mutation

**Input Schema**:
```typescript
z.object({
  userId: z.string(),
  newPassword: z.string().min(8),
})
```

**Returns**: `{ success: true }`

**Implementation Approach**:
- Call Better Auth `admin.setUserPassword()` API
- Password automatically hashed by Better Auth

**Pseudocode**:
```
PROCEDURE resetUserPassword(input):
  auth.api.setUserPassword({
    body: {
      userId: input.userId,
      newPassword: input.newPassword,
    },
    headers: await headers(),
  })

  RETURN { success: true }
```

**Notes:**
- Better Auth handles password hashing (scrypt)
- Old password invalidated immediately (per FR-028)
- Could optionally revoke all user sessions for security

##### deactivateUser Mutation

**Input Schema**:
```typescript
z.object({
  userId: z.string(),
})
```

**Returns**: `{ success: true }`

**Implementation Approach**:
- Prevent self-deactivation
- Prevent last admin deactivation
- Call Better Auth `admin.banUser()` API

**Pseudocode**:
```
PROCEDURE deactivateUser(input):
  // Prevent self-deactivation (FR-025)
  IF input.userId === ctx.user.id:
    THROW TRPCError({ code: "BAD_REQUEST", message: "Cannot deactivate yourself" })

  // Check if this is the last admin (FR-026)
  target_user = db.select().from(user).where(eq(user.id, input.userId)).first()

  IF target_user.role === "admin":
    active_admin_count = db.select(count()).from(user)
      .where(and(eq(user.role, "admin"), eq(user.banned, false)))

    IF active_admin_count <= 1:
      THROW TRPCError({ code: "BAD_REQUEST", message: "Cannot deactivate the last admin" })

  // Deactivate via ban system
  auth.api.banUser({
    body: {
      userId: input.userId,
      banReason: "User deactivated by admin",
      // No banExpiresIn = permanent ban
    },
    headers: await headers(),
  })

  RETURN { success: true }
```

**Notes:**
- Uses Better Auth ban system for soft delete (recommended approach)
- Banned users cannot log in (handled by Better Auth)
- Existing sessions remain valid until expiration (per FR-033)
- Ban reason set to "User deactivated by admin" for audit trail

##### reactivateUser Mutation

**Input Schema**:
```typescript
z.object({
  userId: z.string(),
})
```

**Returns**: `{ success: true }`

**Implementation Approach**:
- Call Better Auth `admin.unbanUser()` API

**Pseudocode**:
```
PROCEDURE reactivateUser(input):
  auth.api.unbanUser({
    body: { userId: input.userId },
    headers: await headers(),
  })

  RETURN { success: true }
```

**Notes:**
- Sets banned = false, clears banReason and banExpires
- User can log in immediately after reactivation
- No additional checks needed (any banned user can be unbanned)

#### 3. Register Admin Router in App Router
**File**: `trpc/routers/_app.ts:13-18`

**Changes**:
Add admin router to the main app router exports.

**Current Structure**:
```typescript
export const appRouter = createTRPCRouter({
  chat: chatRouter,
  credits: creditsRouter,
  vote: voteRouter,
  document: documentRouter,
});
```

**New Structure**:
```typescript
import { adminRouter } from "./admin.router";

export const appRouter = createTRPCRouter({
  chat: chatRouter,
  credits: creditsRouter,
  vote: voteRouter,
  document: documentRouter,
  admin: adminRouter, // NEW
});
```

**Notes:**
- Import admin router at top of file
- Add to router definition
- TypeScript will automatically infer types for admin router procedures
- Client will access via `trpc.admin.listUsers.useQuery()`, etc.

---

## Phase 5: Frontend - Login UI (Email/Password)

### Overview
Replace the OAuth login form with an email/password login form using Better Auth's signIn method.

### Important Codebase Context

#### Files that won't be modified but are important to understand
- `components/ui/form.tsx:1-165` - Form component primitives (FormField, FormItem, FormLabel, etc.)
- `components/ui/input.tsx` - Input component with error styling
- `components/ui/button.tsx` - Button component with variants
- `app/(auth)/login/page.tsx:13-31` - Login page layout (wrapper around LoginForm)

#### Files that need to be modified or extended
- `components/login-form.tsx:14-44` - Replace OAuth form with email/password form

#### New Files that need to be created
None - replacing existing LoginForm implementation

#### Patterns, Conventions, and Design Decisions to Reuse
- Form pattern: `useForm` + `zodResolver` + Zod schema + Form components
- Error handling: `toast.error()` for operation errors, FormMessage for field errors
- Button loading state: `disabled={isPending}` + conditional text
- Card layout: CardHeader + CardTitle + CardDescription + CardContent
- Auth operations: `authClient.signIn.email()` from Better Auth

#### Key Constraints to work within
- Must maintain same visual design (Card-based layout)
- Must keep "Terms of Service" and "Privacy Policy" footer
- Must handle authentication errors gracefully
- Must redirect to "/" on successful login

### Changes Required:

#### 1. Replace OAuth Login Form with Email/Password Form
**File**: `components/login-form.tsx`

**Changes**:
Complete rewrite of component to use email/password authentication.

**New Component Structure**:

**Imports**:
```typescript
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import authClient from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
```

**Form Schema**:
```typescript
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
```

**Component Signature**:
```typescript
export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">)
```

**Component Implementation Approach**:

**Form Setup**:
- Initialize useForm with zodResolver and loginSchema
- Default values: empty email and password strings
- Use router for navigation after successful login

**Form Submission Handler**:
```
ASYNC FUNCTION onSubmit(values):
  TRY:
    result = authClient.signIn.email({
      email: values.email,
      password: values.password,
    })

    IF result.error:
      IF error is "invalid credentials":
        toast.error("Invalid email or password")
      ELSE IF error is "account inactive":
        toast.error("Your account has been deactivated")
      ELSE:
        toast.error("Login failed. Please try again.")
    ELSE:
      // Success - redirect to home
      router.push("/")
      router.refresh() // Refresh to update session
  CATCH error:
    toast.error("An unexpected error occurred")
```

**JSX Structure**:
```jsx
<div className={className} {...props}>
  <Card>
    <CardHeader className="text-center">
      <CardTitle>Welcome back</CardTitle>
      <CardDescription>Sign in to your account</CardDescription>
    </CardHeader>
    <CardContent>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Email Field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password Field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Form>
    </CardContent>
  </Card>

  {/* Terms and Privacy Footer - KEEP FROM ORIGINAL */}
  <div className="text-balance text-center text-muted-foreground text-xs [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
    By clicking continue, you agree to our{" "}
    <Link href="/terms">Terms of Service</Link> and{" "}
    <Link href="/privacy">Privacy Policy</Link>.
  </div>
</div>
```

**Notes:**
- Remove SocialAuthProviders component entirely
- Remove "Don't have an account? Sign up" link (per FR-020: no self-service registration)
- Keep terms/privacy footer from original (lines 37-41)
- Use authClient.signIn.email() from Better Auth (not custom API call)
- Handle inactive account error separately (banned users)
- Redirect to "/" on success (same as OAuth flow)
- Add autoComplete attributes for password managers

#### 2. Remove Unused OAuth Components
**File**: `components/social-auth-providers.tsx`

**Changes**: Delete this file (no longer needed)

**Notes:**
- Component only used by old login form
- Removing OAuth means this component is unused
- Clean up to reduce codebase clutter

---

## Phase 6: Frontend - Admin Dashboard

### Overview
Create the admin dashboard UI with user list table, create/edit/reset password dialogs, and search/filter functionality.

### Important Codebase Context

#### Files that won't be modified but are important to understand
- `components/ui/card.tsx` - Card layout components
- `components/ui/dialog.tsx` - Dialog/modal components
- `components/ui/table.tsx` - Table components
- `components/ui/badge.tsx` - Badge component for role/status indicators
- `components/ui/button.tsx` - Button variants (default, destructive, outline)
- `components/ui/input.tsx` - Input component
- `components/ui/checkbox.tsx` - Checkbox component
- `trpc/react.tsx:17-18` - useTRPC hook for accessing tRPC client

#### Files that need to be modified or extended
None - all new files

#### New Files that need to be created
- `app/admin/users/page.tsx` - Main admin dashboard page
- `app/admin/layout.tsx` - Admin section layout (optional, for consistent styling)
- `components/admin/user-list-table.tsx` - User list table component
- `components/admin/create-user-dialog.tsx` - Create user dialog
- `components/admin/edit-user-dialog.tsx` - Edit user dialog
- `components/admin/reset-password-dialog.tsx` - Reset password dialog
- `components/admin/user-actions.tsx` - Row actions (edit, reset password, deactivate)

#### Patterns, Conventions, and Design Decisions to Reuse
- Page pattern: Server component by default, "use client" only where needed
- Form pattern: useForm + zodResolver + Zod schema + Form components
- Dialog pattern: Dialog wrapper with DialogTrigger + DialogContent
- Table pattern: Table + TableHeader + TableBody + TableRow + TableCell
- tRPC usage: `const trpc = useTRPC()`, `trpc.admin.listUsers.useQuery()`, `trpc.admin.createUser.useMutation()`
- Error handling: toast.error/success for operations, FormMessage for field errors
- Optimistic updates: `utils.admin.listUsers.invalidate()` after mutations

#### Key Constraints to work within
- Admin dashboard only accessible to admin users (middleware handles)
- All operations require admin role (tRPC middleware handles)
- Forms must validate input before submission
- Generated passwords displayed only once
- Must handle loading and error states
- Must refresh user list after mutations

### Changes Required:

#### 1. Create Admin Dashboard Page
**File**: `app/admin/users/page.tsx` (new file)

**Component Signature**:
```typescript
export default function AdminUsersPage()
```

**Implementation Approach**:
- Server component (no "use client" directive)
- Simple layout with page title and UserListTable component
- UserListTable is client component (handles data fetching and state)

**JSX Structure**:
```jsx
import { UserListTable } from "@/components/admin/user-list-table";

export default function AdminUsersPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage user accounts and permissions
        </p>
      </div>
      <UserListTable />
    </div>
  );
}
```

**Notes:**
- Keep simple - delegate complexity to UserListTable component
- Could add metadata export for page title/description
- No authentication check needed (middleware handles)

#### 2. Create User List Table Component
**File**: `components/admin/user-list-table.tsx` (new file)

**Component Signature**:
```typescript
export function UserListTable()
```

**Implementation Approach**:
- Client component ("use client" directive)
- Use tRPC query to fetch users
- Local state for search input
- Table displays user info with action buttons
- Create User dialog in header
- Refresh list after mutations

**State Management**:
```typescript
const [searchValue, setSearchValue] = useState("");
const trpc = useTRPC();
const utils = trpc.useUtils();

const { data, isLoading, error } = trpc.admin.listUsers.useQuery({
  searchValue: searchValue || undefined,
  searchField: "email",
  limit: 50,
  offset: 0,
});
```

**JSX Structure**:
```jsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <div>
      <CardTitle>Users</CardTitle>
      <CardDescription>
        {data?.total ?? 0} total users
      </CardDescription>
    </div>
    <CreateUserDialog onSuccess={() => utils.admin.listUsers.invalidate()}>
      <Button>Add User</Button>
    </CreateUserDialog>
  </CardHeader>

  <CardContent>
    {/* Search Input */}
    <div className="mb-4">
      <Input
        type="search"
        placeholder="Search by email..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
      />
    </div>

    {/* Loading State */}
    {isLoading && <div>Loading users...</div>}

    {/* Error State */}
    {error && <div>Error loading users: {error.message}</div>}

    {/* Table */}
    {data && (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell>
                <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.status === "active" ? "default" : "destructive"}>
                  {user.status}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(user.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <UserActions
                  user={user}
                  onSuccess={() => utils.admin.listUsers.invalidate()}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}
  </CardContent>
</Card>
```

**Notes:**
- Search updates query input (debounce could be added for optimization)
- Badge colors distinguish admin/user roles and active/inactive status
- onSuccess callbacks invalidate query to refresh list
- UserActions component handles edit/reset/deactivate operations

#### 3. Create User Actions Component
**File**: `components/admin/user-actions.tsx` (new file)

**Component Signature**:
```typescript
type UserActionsProps = {
  user: AdminUserListItem;
  onSuccess: () => void;
};

export function UserActions({ user, onSuccess }: UserActionsProps)
```

**Implementation Approach**:
- Dropdown menu with edit, reset password, deactivate/reactivate actions
- Dialogs for each action
- Confirmation for destructive actions (deactivate)

**JSX Structure**:
```jsx
<div className="flex items-center gap-2">
  <EditUserDialog user={user} onSuccess={onSuccess}>
    <Button variant="outline" size="sm">Edit</Button>
  </EditUserDialog>

  <ResetPasswordDialog user={user} onSuccess={onSuccess}>
    <Button variant="outline" size="sm">Reset Password</Button>
  </ResetPasswordDialog>

  {user.status === "active" ? (
    <DeactivateUserButton userId={user.id} onSuccess={onSuccess} />
  ) : (
    <ReactivateUserButton userId={user.id} onSuccess={onSuccess} />
  )}
</div>
```

**Notes:**
- Could use DropdownMenu for cleaner UI (combine actions)
- Deactivate button should be destructive variant (red)
- Reactivate button should be default variant (blue)

#### 4. Create User Dialog Component
**File**: `components/admin/create-user-dialog.tsx` (new file)

**Component Signature**:
```typescript
type CreateUserDialogProps = {
  children: React.ReactNode; // Trigger button
  onSuccess: () => void;
};

export function CreateUserDialog({ children, onSuccess }: CreateUserDialogProps)
```

**Implementation Approach**:
- Dialog wraps form
- Form with email, name, password checkbox, custom password input
- Generate password if checkbox selected
- Show generated password in toast on success

**State Management**:
```typescript
const [open, setOpen] = useState(false);
const trpc = useTRPC();

const form = useForm<CreateUserFormValues>({
  resolver: zodResolver(createUserSchema),
  defaultValues: {
    email: "",
    name: "",
    generatePassword: true,
    password: "",
    role: "user",
  },
});

const createUserMutation = trpc.admin.createUser.useMutation({
  onSuccess: (data) => {
    if (data.generatedPassword) {
      // Show password in toast with long duration
      toast.success(
        `User created! Password: ${data.generatedPassword}`,
        { duration: 10000 }
      );
    } else {
      toast.success("User created successfully!");
    }
    onSuccess();
    setOpen(false);
    form.reset();
  },
  onError: (error) => {
    if (error.message.includes("email")) {
      form.setError("email", { message: "Email already exists" });
    } else {
      toast.error(error.message || "Failed to create user");
    }
  },
});
```

**Form Schema**:
```typescript
const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  generatePassword: z.boolean().default(true),
  password: z.string().min(8).optional(),
  role: z.enum(["user", "admin"]).default("user"),
}).refine(
  (data) => data.generatePassword || (data.password && data.password.length >= 8),
  {
    message: "Password must be at least 8 characters",
    path: ["password"],
  }
);
```

**JSX Structure**:
```jsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    {children}
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create New User</DialogTitle>
      <DialogDescription>
        Add a new user account. A secure password will be generated automatically.
      </DialogDescription>
    </DialogHeader>

    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <FormField name="email" ... />

        {/* Name Field */}
        <FormField name="name" ... />

        {/* Role Select */}
        <FormField name="role" ... />

        {/* Generate Password Checkbox */}
        <FormField
          name="generatePassword"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel>Generate password automatically</FormLabel>
            </FormItem>
          )}
        />

        {/* Custom Password Field (conditional) */}
        {!form.watch("generatePassword") && (
          <FormField name="password" type="password" ... />
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={createUserMutation.isPending}>
            {createUserMutation.isPending ? "Creating..." : "Create User"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  </DialogContent>
</Dialog>
```

**Notes:**
- Generated password shown in toast (10 second duration for copying)
- Form resets on success
- Dialog closes on success
- Duplicate email error shown on email field
- Refine validator ensures either generatePassword=true OR password provided

#### 5. Create Edit User Dialog Component
**File**: `components/admin/edit-user-dialog.tsx` (new file)

**Component Signature**:
```typescript
type EditUserDialogProps = {
  user: AdminUserListItem;
  children: React.ReactNode; // Trigger button
  onSuccess: () => void;
};

export function EditUserDialog({ user, children, onSuccess }: EditUserDialogProps)
```

**Implementation Approach**:
- Dialog with form to edit email only (per spec FR-027)
- Pre-populate form with current email
- Handle duplicate email error

**Form Schema**:
```typescript
const editUserSchema = z.object({
  email: z.string().email("Invalid email address"),
});
```

**State Management**:
```typescript
const [open, setOpen] = useState(false);
const trpc = useTRPC();

const form = useForm<EditUserFormValues>({
  resolver: zodResolver(editUserSchema),
  defaultValues: {
    email: user.email,
  },
});

const updateUserMutation = trpc.admin.updateUser.useMutation({
  onSuccess: () => {
    toast.success("User updated successfully!");
    onSuccess();
    setOpen(false);
  },
  onError: (error) => {
    if (error.message.includes("email")) {
      form.setError("email", { message: "Email already exists" });
    } else {
      toast.error(error.message || "Failed to update user");
    }
  },
});

const onSubmit = async (values: EditUserFormValues) => {
  await updateUserMutation.mutate({
    userId: user.id,
    email: values.email,
  });
};
```

**JSX Structure**:
```jsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    {children}
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit User</DialogTitle>
      <DialogDescription>
        Update email address for {user.name}
      </DialogDescription>
    </DialogHeader>

    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <FormField
          name="email"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateUserMutation.isPending}>
            {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  </DialogContent>
</Dialog>
```

**Notes:**
- Only email editable (name and role editing not in spec)
- Form pre-populated with current email
- Duplicate email error shown inline

#### 6. Create Reset Password Dialog Component
**File**: `components/admin/reset-password-dialog.tsx` (new file)

**Component Signature**:
```typescript
type ResetPasswordDialogProps = {
  user: AdminUserListItem;
  children: React.ReactNode; // Trigger button
  onSuccess: () => void;
};

export function ResetPasswordDialog({ user, children, onSuccess }: ResetPasswordDialogProps)
```

**Implementation Approach**:
- Dialog with form to enter new password
- Password strength indicator (optional enhancement)
- Show password toggle (optional enhancement)

**Form Schema**:
```typescript
const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
```

**State Management**:
```typescript
const [open, setOpen] = useState(false);
const trpc = useTRPC();

const form = useForm<ResetPasswordFormValues>({
  resolver: zodResolver(resetPasswordSchema),
  defaultValues: {
    newPassword: "",
    confirmPassword: "",
  },
});

const resetPasswordMutation = trpc.admin.resetUserPassword.useMutation({
  onSuccess: () => {
    toast.success("Password reset successfully!");
    onSuccess();
    setOpen(false);
    form.reset();
  },
  onError: (error) => {
    toast.error(error.message || "Failed to reset password");
  },
});

const onSubmit = async (values: ResetPasswordFormValues) => {
  await resetPasswordMutation.mutate({
    userId: user.id,
    newPassword: values.newPassword,
  });
};
```

**JSX Structure**:
```jsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    {children}
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Reset Password</DialogTitle>
      <DialogDescription>
        Set a new password for {user.name}
      </DialogDescription>
    </DialogHeader>

    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* New Password Field */}
        <FormField
          name="newPassword"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Confirm Password Field */}
        <FormField
          name="confirmPassword"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={resetPasswordMutation.isPending}>
            {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  </DialogContent>
</Dialog>
```

**Notes:**
- Confirm password field prevents typos
- Form resets after success
- Could add password visibility toggle icon
- Could add password strength indicator

#### 7. Create Deactivate/Reactivate User Buttons
**File**: `components/admin/user-actions.tsx` (add to existing file)

**DeactivateUserButton Component**:
```typescript
type DeactivateUserButtonProps = {
  userId: string;
  onSuccess: () => void;
};

function DeactivateUserButton({ userId, onSuccess }: DeactivateUserButtonProps)
```

**Implementation Approach**:
- AlertDialog for confirmation (destructive action)
- Call deactivateUser mutation
- Handle self-deactivation and last-admin errors

**State Management**:
```typescript
const [open, setOpen] = useState(false);
const trpc = useTRPC();

const deactivateMutation = trpc.admin.deactivateUser.useMutation({
  onSuccess: () => {
    toast.success("User deactivated successfully!");
    onSuccess();
    setOpen(false);
  },
  onError: (error) => {
    toast.error(error.message || "Failed to deactivate user");
  },
});

const handleDeactivate = async () => {
  await deactivateMutation.mutate({ userId });
};
```

**JSX Structure**:
```jsx
<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogTrigger asChild>
    <Button variant="destructive" size="sm">Deactivate</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Deactivate User?</AlertDialogTitle>
      <AlertDialogDescription>
        This user will no longer be able to log in. Their data will be retained.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleDeactivate}
        disabled={deactivateMutation.isPending}
      >
        {deactivateMutation.isPending ? "Deactivating..." : "Deactivate"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**ReactivateUserButton Component**:
```typescript
type ReactivateUserButtonProps = {
  userId: string;
  onSuccess: () => void;
};

function ReactivateUserButton({ userId, onSuccess }: ReactivateUserButtonProps)
```

**Implementation Approach**:
- Simple button (no confirmation needed)
- Call reactivateUser mutation

**State Management**:
```typescript
const trpc = useTRPC();

const reactivateMutation = trpc.admin.reactivateUser.useMutation({
  onSuccess: () => {
    toast.success("User reactivated successfully!");
    onSuccess();
  },
  onError: (error) => {
    toast.error(error.message || "Failed to reactivate user");
  },
});

const handleReactivate = async () => {
  await reactivateMutation.mutate({ userId });
};
```

**JSX Structure**:
```jsx
<Button
  variant="default"
  size="sm"
  onClick={handleReactivate}
  disabled={reactivateMutation.isPending}
>
  {reactivateMutation.isPending ? "Reactivating..." : "Reactivate"}
</Button>
```

**Notes:**
- Deactivate uses AlertDialog for confirmation (destructive action)
- Reactivate is simple button (non-destructive)
- Self-deactivation error shows in toast (handled by backend)
- Last-admin error shows in toast (handled by backend)

---

## Manual Tasks to be Completed

The following manual tasks must be completed by engineers as part of this feature implementation:

### 1. Generate Scrypt Hash for Default Admin Password

**Task**: Generate scrypt hash for password "password" to insert in migration SQL.

**Steps**:
1. Create temporary Node.js script:
   ```javascript
   import { scrypt } from "node:crypto";
   import { promisify } from "node:util";

   const scryptAsync = promisify(scrypt);

   async function hashPassword(password) {
     const salt = randomBytes(16).toString("hex");
     const derivedKey = await scryptAsync(password, salt, 64);
     return `${salt}:${derivedKey.toString("hex")}`;
   }

   console.log(await hashPassword("password"));
   ```
2. Run script to generate hash
3. Copy hash into migration SQL file at `XXXX_create_default_admin.sql`
4. Delete temporary script

**Alternative**: Use Better Auth CLI or utility if available.

**Context**: Better Auth stores scrypt hashes in format `salt:hash`. The migration needs pre-hashed password to avoid running Better Auth during migration.

### 2. Test Default Admin Login

**Task**: Verify default admin account works after migrations.

**Steps**:
1. Run migrations: `npm run db:migrate`
2. Start dev server: `npm run dev`
3. Navigate to `/login`
4. Login with email: `admin@example.com`, password: `password`
5. Verify redirect to `/`
6. Navigate to `/admin/users`
7. Verify admin dashboard loads

**Expected Result**: Default admin can log in and access admin dashboard.

### 3. Remove OAuth Environment Variables

**Task**: Clean up OAuth-related environment variables from `.env` and `.env.example`.

**Steps**:
1. Remove from `.env`:
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
   - `AUTH_GITHUB_ID`
   - `AUTH_GITHUB_SECRET`
2. Remove from `.env.example`:
   - Same variables
3. Verify `AUTH_SECRET` exists in both files
4. Update README if it documents OAuth setup

**Context**: OAuth providers removed from Better Auth config, so environment variables no longer needed.

### 4. Update Documentation

**Task**: Update any user-facing documentation about authentication.

**Steps**:
1. Search codebase for references to "Google login", "GitHub login", "OAuth"
2. Update README.md authentication section
3. Update any setup guides or onboarding docs
4. Document default admin credentials for initial setup
5. Add note about changing default admin password

**Context**: Authentication method changed from OAuth to email/password. Users need to know how to log in.

### 5. Security Hardening (Post-MVP)

**Task**: Consider implementing additional security measures after MVP launch.

**Recommendations**:
- Add rate limiting to login endpoint (prevent brute force)
- Add account lockout after failed login attempts
- Force password change on first login for default admin
- Add password complexity requirements
- Implement session timeout configuration
- Add audit logging for admin operations
- Add 2FA for admin accounts

**Context**: These are out of scope for MVP (per spec) but should be considered for production deployment.

### 6. Database Backup Before Migration

**Task**: Create database backup before running migrations.

**Steps**:
1. Stop application server
2. Create PostgreSQL dump: `pg_dump -U [user] -d [database] > backup_before_admin_feature.sql`
3. Verify backup file exists and is not empty
4. Run migrations
5. Test application
6. Keep backup for rollback if needed

**Context**: Adding NOT NULL columns and changing authentication could affect existing data. Backup ensures safe rollback.

---

## Implementation Notes

### Migration Order

Phases must be implemented in order:
1. Database schema changes first (migrations)
2. Auth configuration second (Better Auth setup)
3. Authorization middleware third (tRPC and Next.js)
4. Backend API fourth (tRPC router)
5. Frontend UI last (login and admin dashboard)

**Rationale**: Each phase depends on previous phase. Frontend needs backend API, backend needs auth config, auth config needs database schema.

### Testing Strategy

After each phase:
1. **Phase 1**: Run migrations, verify schema changes in database
2. **Phase 2**: Test login with default admin account
3. **Phase 3**: Test admin route protection (try accessing as non-admin)
4. **Phase 4**: Test each tRPC procedure via admin dashboard
5. **Phase 5**: Test login flow with various error scenarios
6. **Phase 6**: Test all admin operations end-to-end

### Rollback Plan

If issues occur:
1. **Database**: Restore from backup created before migrations
2. **Auth**: Revert `lib/auth.ts` and `lib/auth-client.ts` to OAuth config
3. **Frontend**: Revert login form to OAuth buttons
4. **Middleware**: Remove admin route checks

### Type Safety Validation

After implementation, verify:
- tRPC procedures have correct input/output types
- Form schemas match backend validation
- Session type includes role field
- All admin operations type-checked

### Performance Considerations

- User list query: No pagination in MVP (acceptable for small user bases)
- Search: Client-side filtering acceptable for MVP
- Future: Add pagination, server-side filtering, indexes if user base grows

### Security Considerations

- Passwords hashed automatically by Better Auth (scrypt)
- Admin operations protected by middleware (role check)
- Generated passwords cryptographically secure (crypto.randomBytes)
- Session cookies HTTP-only (nextCookies plugin)
- CSRF protection via SameSite cookies
- No password reset via email (admin-managed only)

### UI/UX Notes

- Generated passwords shown for 10 seconds (enough time to copy)
- Deactivate requires confirmation (destructive action)
- Reactivate is one-click (non-destructive)
- Error messages user-friendly (not technical)
- Loading states on all async operations
- Success feedback via toasts

### Future Enhancements (Out of Scope)

- Pagination for user list
- Advanced search/filtering (multiple fields, date ranges)
- Bulk operations (bulk deactivate, bulk role change)
- User activity tracking (last login, action history)
- Audit log (admin action history)
- Email notifications (account created, password reset)
- Self-service password reset
- Multiple admin permission levels
- User profile self-management
- Export/import user data
- Password complexity requirements UI
- Password expiration policies
- Session timeout configuration UI

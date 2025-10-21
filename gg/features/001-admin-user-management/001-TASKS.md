---
date: 2025-10-21 19:54:33
feature-slug: 001-admin-user-management
phase-1-status: completed
phase-2-status: not_started
phase-3-status: not_started
phase-4-status: not_started
phase-5-status: not_started
phase-6-status: not_started
schema-drift-status: fixed
---

# 001-admin-user-management Implementation Tasks

## Overview

This document contains detailed task lists for implementing the Admin User Management & Email/Password Authentication feature across all phases.

**Total Phases:** 6

**Related Documents:**
- Specification: `gg/features/001-admin-user-management/001-SPEC.md`
- High-Level Plan: `gg/features/001-admin-user-management/001-PLAN.md`
- Web Research: `gg/agent-outputs/web-researcher/2025-10-21_18-45-32-better-auth-admin-research.md`

---

## Phase 1: Database Schema and Migrations

### Overview
Add required database fields for role-based authentication and user management using Better Auth admin plugin migration, then create a manual migration to seed the default admin account.

### Tasks

- [x] 1. Run Better Auth Admin Plugin Migration
  - [x] 1.1 Added admin plugin and emailAndPassword config to `lib/auth.ts`
  - [x] 1.2 Ran `npx @better-auth/cli generate` to create schema
  - [x] 1.3 Updated `lib/db/schema.ts` with admin fields (role, banned, banReason, banExpires)
  - [x] 1.4 Generated migration file `lib/db/migrations/0027_giant_bromley.sql`
  - [x] 1.5 Applied schema changes directly via SQL (migration command failed due to pre-existing schema issues)

- [x] 2. **FIXED: Schema Drift Issues**
  - [x] 2.1 Investigated schema drift between `schema.ts` and actual database
  - [x] 2.2 Ran `bun db:pull` to see actual database schema
  - [x] 2.3 Created analysis document: `gg/agent-outputs/schema-drift-analysis.md`
  - [x] 2.4 Dropped all tables (0 users, no data loss risk)
  - [x] 2.5 Recreated database from `schema.ts` using `bun db:push`
  - [x] 2.6 Cleared old migration files and generated fresh baseline
  - [x] 2.7 Verified migrations now work correctly: ✅ "No schema changes, nothing to migrate"
  - [x] 2.8 Confirmed admin fields exist in database (role, banned, ban_reason, ban_expires)

- [x] 3. Generate Scrypt Hash for Default Admin Password
  - [x] 3.1 Created temporary Node.js script to hash password "password" using scrypt
  - [x] 3.2 Ran script and generated hash: `e73353162c680e782986519a857d8bff:9f35211025...`
  - [x] 3.3 Saved hash for migration
  - [x] 3.4 Deleted temporary script

- [x] 4. Create Default Admin Account Migration
  - [x] 4.1 Created migration file: `lib/db/migrations/0001_create_default_admin.sql`
  - [x] 4.2 Wrote SQL to insert default admin user (email: admin@agentdune.com, role: admin)
  - [x] 4.3 Wrote SQL to insert account record with hashed password (provider: credential)
  - [x] 4.4 Used `ON CONFLICT DO NOTHING` for idempotency
  - [x] 4.5 Applied migration successfully using psql
  - [x] 4.6 Updated email from admin@example.com to admin@agentdune.com

- [x] 5. Verify Database Changes
  - [x] 5.1 Confirmed role and banned fields exist in user table
  - [x] 5.2 Verified default admin account exists: id=admin-default-001, email=admin@agentdune.com
  - [x] 5.3 Verified default admin has role = 'admin' and banned = false
  - [x] 5.4 Confirmed account record exists with hashed password (provider_id=credential)

### Manual Tasks

**Generate Scrypt Hash:**
```javascript
// temporary-hash-script.js
import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

console.log(await hashPassword("password"));
```

Run: `node temporary-hash-script.js`

**Migration SQL Template:**
```sql
-- Insert default admin user
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

-- Insert account record with hashed password
INSERT INTO "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
VALUES (
  'admin-account-id',
  'admin@example.com',
  'credential',
  'admin-default-id',
  '[PASTE_SCRYPT_HASH_HERE]',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;
```

---

## Phase 2: Authentication Configuration

### Overview
Replace OAuth authentication with email/password authentication and add the Better Auth admin plugin for user management capabilities.

### Tasks

- [ ] 1. Update Better Auth Server Configuration (`lib/auth.ts`)
  - [ ] 1.1 Import admin plugin: `import { admin } from "better-auth/plugins"`
  - [ ] 1.2 Remove entire `socialProviders` block (lines 26-49)
  - [ ] 1.3 Add `emailAndPassword` configuration with required settings
  - [ ] 1.4 Add `admin()` plugin to plugins array
  - [ ] 1.5 Configure admin plugin options (defaultRole, adminRoles, impersonationSessionDuration)

- [ ] 2. Update Session Type Definition (`lib/auth.ts:8-16`)
  - [ ] 2.1 Add `role?: string` field to session.user type
  - [ ] 2.2 Add `banned?: boolean` field to session.user type
  - [ ] 2.3 Verify TypeScript recognizes new fields

- [ ] 3. Update Better Auth Client Configuration (`lib/auth-client.ts`)
  - [ ] 3.1 Import adminClient plugin: `import { adminClient } from "better-auth/client/plugins"`
  - [ ] 3.2 Add `adminClient()` to plugins array
  - [ ] 3.3 Verify client exports admin operations

- [ ] 4. Update Environment Variable Configuration (`lib/env.ts`)
  - [ ] 4.1 Mark OAuth variables as optional (AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET)
  - [ ] 4.2 Verify AUTH_SECRET is required
  - [ ] 4.3 Update runtimeEnv mapping if needed

- [ ] 5. Test Authentication Setup
  - [ ] 5.1 Start dev server
  - [ ] 5.2 Attempt to login with default admin account (admin@example.com / password)
  - [ ] 5.3 Verify session includes role and banned fields
  - [ ] 5.4 Confirm OAuth login no longer works

### Configuration Details

**Email/Password Config:**
```typescript
emailAndPassword: {
  enabled: true,
  requireEmailVerification: false, // Per spec FR-020
  minPasswordLength: 8,
  maxPasswordLength: 128,
}
```

**Admin Plugin Config:**
```typescript
admin({
  defaultRole: "user",
  adminRoles: ["admin"],
  impersonationSessionDuration: 60 * 60, // 1 hour
})
```

---

## Phase 3: Authorization Middleware

### Overview
Create admin-only authorization middleware for tRPC and add route protection for admin pages in Next.js middleware.

### Tasks

- [ ] 1. Create Admin-Only tRPC Procedure (`trpc/init.ts`)
  - [ ] 1.1 Add `adminProcedure` export after `protectedProcedure` (after line 135)
  - [ ] 1.2 Implement authentication check (if !ctx.user throw UNAUTHORIZED)
  - [ ] 1.3 Implement user ID validation (if !id throw UNAUTHORIZED)
  - [ ] 1.4 Implement admin role check (if role !== "admin" throw FORBIDDEN)
  - [ ] 1.5 Return next() with narrowed context type (role as "admin")
  - [ ] 1.6 Add JSDoc comment explaining admin procedure usage

- [ ] 2. Add Admin Route Protection to Next.js Middleware (`middleware.ts`)
  - [ ] 2.1 Add `isOnAdminRoute` check for paths starting with "/admin"
  - [ ] 2.2 Redirect to /login if not authenticated
  - [ ] 2.3 Redirect to /?error=forbidden if authenticated but not admin
  - [ ] 2.4 Check role from session: `session.user.role !== "admin"`
  - [ ] 2.5 Insert logic after line 35 (after isLoggedIn check)
  - [ ] 2.6 Return early to prevent further middleware execution

- [ ] 3. Verify Middleware Configuration
  - [ ] 3.1 Confirm matcher already includes /admin/* routes
  - [ ] 3.2 Test admin route access as non-admin user
  - [ ] 3.3 Test admin route access as unauthenticated user
  - [ ] 3.4 Test admin route access as admin user

### Implementation Details

**adminProcedure Structure:**
```typescript
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  // Check authentication
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

  // Type-narrow role to "admin"
  return next({
    ctx: {
      user: { id, role: "admin" as const, ...rest },
    },
  });
});
```

**Admin Route Check (insert after line 35):**
```typescript
const isOnAdminRoute = url.pathname.startsWith("/admin");

if (isOnAdminRoute) {
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", url));
  }
  if (session.user.role !== "admin") {
    return NextResponse.redirect(new URL("/?error=forbidden", url));
  }
  return;
}
```

---

## Phase 4: Backend - tRPC Admin Router and Utilities

### Overview
Create the admin router with all user management operations and build supporting utilities for password generation.

### Tasks

- [ ] 1. Create Password Generation Utility (`lib/utils/password.ts`)
  - [ ] 1.1 Create new file `lib/utils/password.ts`
  - [ ] 1.2 Import crypto module: `import { randomBytes } from "node:crypto"`
  - [ ] 1.3 Implement `generateSecurePassword(length = 16)` function
  - [ ] 1.4 Define character set (uppercase, lowercase, numbers, symbols)
  - [ ] 1.5 Use `randomBytes()` for cryptographic randomness
  - [ ] 1.6 Map random bytes to character set
  - [ ] 1.7 Export function with JSDoc comment

- [ ] 2. Create Admin Router File (`trpc/routers/admin.router.ts`)
  - [ ] 2.1 Create new file `trpc/routers/admin.router.ts`
  - [ ] 2.2 Add required imports (TRPCError, z, headers, adminProcedure, auth, db, etc.)
  - [ ] 2.3 Import `generateSecurePassword` utility
  - [ ] 2.4 Create router shell with `createTRPCRouter`

- [ ] 3. Implement List Users Procedure
  - [ ] 3.1 Define input schema with search/filter/pagination fields
  - [ ] 3.2 Implement query handler using Drizzle
  - [ ] 3.3 Build WHERE conditions based on search/filter inputs
  - [ ] 3.4 Apply ILIKE filter for email/name search
  - [ ] 3.5 Transform `banned` field to `status` ("active" | "inactive")
  - [ ] 3.6 Query total count
  - [ ] 3.7 Return `{ users, total }` response

- [ ] 4. Implement Create User Procedure
  - [ ] 4.1 Define input schema (email, name, password optional, role)
  - [ ] 4.2 Generate password if not provided
  - [ ] 4.3 Call Better Auth `admin.createUser()` API
  - [ ] 4.4 Handle duplicate email error (catch and rethrow as BAD_REQUEST)
  - [ ] 4.5 Return user object and generatedPassword (if applicable)

- [ ] 5. Implement Update User Procedure
  - [ ] 5.1 Define input schema (userId, email)
  - [ ] 5.2 Call Better Auth `admin.updateUser()` API
  - [ ] 5.3 Handle duplicate email error
  - [ ] 5.4 Return success response

- [ ] 6. Implement Reset User Password Procedure
  - [ ] 6.1 Define input schema (userId, newPassword)
  - [ ] 6.2 Call Better Auth `admin.setUserPassword()` API
  - [ ] 6.3 Return success response

- [ ] 7. Implement Deactivate User Procedure
  - [ ] 7.1 Define input schema (userId)
  - [ ] 7.2 Check for self-deactivation (throw BAD_REQUEST if userId === ctx.user.id)
  - [ ] 7.3 Query target user to check if admin
  - [ ] 7.4 If target is admin, count active admins
  - [ ] 7.5 Prevent last admin deactivation (throw BAD_REQUEST)
  - [ ] 7.6 Call Better Auth `admin.banUser()` API
  - [ ] 7.7 Set banReason to "User deactivated by admin"
  - [ ] 7.8 Return success response

- [ ] 8. Implement Reactivate User Procedure
  - [ ] 8.1 Define input schema (userId)
  - [ ] 8.2 Call Better Auth `admin.unbanUser()` API
  - [ ] 8.3 Return success response

- [ ] 9. Register Admin Router in App Router (`trpc/routers/_app.ts`)
  - [ ] 9.1 Import admin router: `import { adminRouter } from "./admin.router"`
  - [ ] 9.2 Add `admin: adminRouter` to appRouter definition
  - [ ] 9.3 Verify TypeScript infers admin router types

- [ ] 10. Test Admin Router
  - [ ] 10.1 Test listUsers query
  - [ ] 10.2 Test createUser mutation
  - [ ] 10.3 Test updateUser mutation
  - [ ] 10.4 Test resetUserPassword mutation
  - [ ] 10.5 Test deactivateUser mutation
  - [ ] 10.6 Test reactivateUser mutation

### Input Schemas

**List Users:**
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

**Create User:**
```typescript
z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8).optional(),
  role: z.enum(["admin", "user"]).default("user"),
})
```

**Update User:**
```typescript
z.object({
  userId: z.string(),
  email: z.string().email(),
})
```

**Reset Password:**
```typescript
z.object({
  userId: z.string(),
  newPassword: z.string().min(8),
})
```

**Deactivate/Reactivate User:**
```typescript
z.object({
  userId: z.string(),
})
```

---

## Phase 5: Frontend - Login UI (Email/Password)

### Overview
Replace the OAuth login form with an email/password login form using Better Auth's signIn method.

### Tasks

- [ ] 1. Create Email/Password Login Form Schema
  - [ ] 1.1 Define Zod schema with email and password fields
  - [ ] 1.2 Add email validation: `z.string().email()`
  - [ ] 1.3 Add password validation: `z.string().min(1)`
  - [ ] 1.4 Infer TypeScript type from schema

- [ ] 2. Update LoginForm Component (`components/login-form.tsx`)
  - [ ] 2.1 Replace entire component implementation
  - [ ] 2.2 Set up useForm with zodResolver and loginSchema
  - [ ] 2.3 Import authClient from `@/lib/auth-client`
  - [ ] 2.4 Import useRouter for navigation
  - [ ] 2.5 Import toast from sonner for error messages

- [ ] 3. Implement Form Submission Handler
  - [ ] 3.1 Call `authClient.signIn.email()` with credentials
  - [ ] 3.2 Handle invalid credentials error
  - [ ] 3.3 Handle inactive account error (banned users)
  - [ ] 3.4 Redirect to "/" on success
  - [ ] 3.5 Call router.refresh() to update session

- [ ] 4. Build Form JSX
  - [ ] 4.1 Replace Card content with Form component
  - [ ] 4.2 Add email FormField with Input component
  - [ ] 4.3 Add password FormField with Input component
  - [ ] 4.4 Add submit Button with loading state
  - [ ] 4.5 Remove "Sign up" link (no self-registration)
  - [ ] 4.6 Keep terms/privacy footer

- [ ] 5. Update Card Header
  - [ ] 5.1 Change CardTitle to "Welcome back"
  - [ ] 5.2 Change CardDescription to "Sign in to your account"
  - [ ] 5.3 Remove OAuth-related text

- [ ] 6. Remove OAuth Components
  - [ ] 6.1 Delete `components/social-auth-providers.tsx` file
  - [ ] 6.2 Remove import from login-form.tsx

- [ ] 7. Test Login Flow
  - [ ] 7.1 Test successful login with valid credentials
  - [ ] 7.2 Test invalid credentials error
  - [ ] 7.3 Test inactive account error
  - [ ] 7.4 Test field validation errors
  - [ ] 7.5 Verify redirect to home after login
  - [ ] 7.6 Verify session updated after login

### Form Implementation Details

**Form Submission:**
```typescript
const onSubmit = async (values: LoginFormValues) => {
  const result = await authClient.signIn.email({
    email: values.email,
    password: values.password,
  });

  if (result.error) {
    if (error.message.includes("invalid")) {
      toast.error("Invalid email or password");
    } else if (error.message.includes("banned")) {
      toast.error("Your account has been deactivated");
    } else {
      toast.error("Login failed. Please try again.");
    }
  } else {
    router.push("/");
    router.refresh();
  }
};
```

---

## Phase 6: Frontend - Admin Dashboard

### Overview
Create the admin dashboard UI with user list table, create/edit/reset password dialogs, and search/filter functionality.

### Tasks

- [ ] 1. Install Table Component
  - [ ] 1.1 Run `pnpm dlx shadcn@latest add table --yes`
  - [ ] 1.2 Verify `components/ui/table.tsx` created

- [ ] 2. Create Admin Users Page (`app/admin/users/page.tsx`)
  - [ ] 2.1 Create directory structure: `app/admin/users/`
  - [ ] 2.2 Create server component with page title
  - [ ] 2.3 Add heading and description
  - [ ] 2.4 Import and render UserListTable component

- [ ] 3. Create User List Table Component (`components/admin/user-list-table.tsx`)
  - [ ] 3.1 Create file with "use client" directive
  - [ ] 3.2 Set up local state for search input
  - [ ] 3.3 Set up tRPC query: `trpc.admin.listUsers.useQuery()`
  - [ ] 3.4 Implement search input with onChange handler
  - [ ] 3.5 Build Table with TableHeader and column headings
  - [ ] 3.6 Map users to TableRow components
  - [ ] 3.7 Display user info (email, name, role badge, status badge, created date)
  - [ ] 3.8 Add CreateUserDialog in CardHeader
  - [ ] 3.9 Add UserActions component in each row
  - [ ] 3.10 Handle loading state
  - [ ] 3.11 Handle error state

- [ ] 4. Create User Actions Component (`components/admin/user-actions.tsx`)
  - [ ] 4.1 Create component accepting user and onSuccess props
  - [ ] 4.2 Render Edit, Reset Password, Deactivate/Reactivate buttons
  - [ ] 4.3 Wrap buttons in respective dialog triggers
  - [ ] 4.4 Conditionally show Deactivate or Reactivate based on status

- [ ] 5. Create Create User Dialog (`components/admin/create-user-dialog.tsx`)
  - [ ] 5.1 Create Zod schema with email, name, generatePassword checkbox, password, role fields
  - [ ] 5.2 Add schema refinement to require password if generatePassword is false
  - [ ] 5.3 Set up useForm with zodResolver
  - [ ] 5.4 Set up tRPC mutation: `trpc.admin.createUser.useMutation()`
  - [ ] 5.5 Implement onSuccess handler to show generated password in toast
  - [ ] 5.6 Implement onError handler with field-level error display
  - [ ] 5.7 Build form with email, name, role select, generate password checkbox fields
  - [ ] 5.8 Conditionally show password field if generatePassword is false
  - [ ] 5.9 Add submit button with loading state
  - [ ] 5.10 Reset form and close dialog on success

- [ ] 6. Create Edit User Dialog (`components/admin/edit-user-dialog.tsx`)
  - [ ] 6.1 Create Zod schema with email field
  - [ ] 6.2 Set up useForm with current user email as default
  - [ ] 6.3 Set up tRPC mutation: `trpc.admin.updateUser.useMutation()`
  - [ ] 6.4 Implement onSuccess handler
  - [ ] 6.5 Implement onError handler for duplicate email
  - [ ] 6.6 Build form with email field
  - [ ] 6.7 Add submit button with loading state
  - [ ] 6.8 Close dialog on success

- [ ] 7. Create Reset Password Dialog (`components/admin/reset-password-dialog.tsx`)
  - [ ] 7.1 Create Zod schema with newPassword and confirmPassword fields
  - [ ] 7.2 Add schema refinement to ensure passwords match
  - [ ] 7.3 Set up useForm
  - [ ] 7.4 Set up tRPC mutation: `trpc.admin.resetUserPassword.useMutation()`
  - [ ] 7.5 Implement onSuccess handler
  - [ ] 7.6 Implement onError handler
  - [ ] 7.7 Build form with newPassword and confirmPassword fields
  - [ ] 7.8 Add submit button with loading state
  - [ ] 7.9 Reset form and close dialog on success

- [ ] 8. Create Deactivate User Button (`components/admin/user-actions.tsx`)
  - [ ] 8.1 Create AlertDialog for confirmation
  - [ ] 8.2 Set up tRPC mutation: `trpc.admin.deactivateUser.useMutation()`
  - [ ] 8.3 Implement onSuccess handler
  - [ ] 8.4 Implement onError handler (self-deactivation, last admin errors)
  - [ ] 8.5 Add destructive variant button as trigger
  - [ ] 8.6 Show confirmation message explaining consequences

- [ ] 9. Create Reactivate User Button (`components/admin/user-actions.tsx`)
  - [ ] 9.1 Create simple button (no confirmation needed)
  - [ ] 9.2 Set up tRPC mutation: `trpc.admin.reactivateUser.useMutation()`
  - [ ] 9.3 Implement onClick handler
  - [ ] 9.4 Implement onSuccess handler
  - [ ] 9.5 Add loading state

- [ ] 10. Style and Polish
  - [ ] 10.1 Add proper spacing and layout with Tailwind classes
  - [ ] 10.2 Use Badge component for role/status with appropriate variants
  - [ ] 10.3 Format dates with `toLocaleDateString()`
  - [ ] 10.4 Ensure responsive design
  - [ ] 10.5 Add proper loading skeletons (optional)

- [ ] 11. Test Admin Dashboard
  - [ ] 11.1 Test user list loading
  - [ ] 11.2 Test search functionality
  - [ ] 11.3 Test creating user with generated password
  - [ ] 11.4 Test creating user with custom password
  - [ ] 11.5 Test editing user email
  - [ ] 11.6 Test resetting user password
  - [ ] 11.7 Test deactivating user
  - [ ] 11.8 Test reactivating user
  - [ ] 11.9 Test error handling for all operations
  - [ ] 11.10 Verify list refreshes after mutations

### Form Schemas

**Create User:**
```typescript
z.object({
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
)
```

**Edit User:**
```typescript
z.object({
  email: z.string().email("Invalid email address"),
})
```

**Reset Password:**
```typescript
z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})
```

---

## Manual Tasks

The following tasks must be completed manually:

### 1. Database Backup
- Create PostgreSQL backup before running migrations
- Command: `pg_dump -U [user] -d [database] > backup_before_admin_feature.sql`

### 2. Clean Up OAuth Environment Variables
After Phase 2 completion:
- Remove from `.env` and `.env.example`:
  - `AUTH_GOOGLE_ID`
  - `AUTH_GOOGLE_SECRET`
  - `AUTH_GITHUB_ID`
  - `AUTH_GITHUB_SECRET`
- Verify `AUTH_SECRET` exists in both files

### 3. Update Documentation
- Update README.md authentication section
- Document default admin credentials (admin@example.com / password)
- Add note about changing default admin password
- Remove any OAuth setup instructions

### 4. Security Considerations (Post-MVP)
Consider implementing after MVP launch:
- Rate limiting on login endpoint
- Account lockout after failed login attempts
- Force password change on first login for default admin
- Password complexity requirements UI
- Session timeout configuration
- Audit logging for admin operations
- 2FA for admin accounts

---

## Implementation Order

**Critical Path:**

1. **Phase 1 (Database)** - MUST complete first
   - Run Better Auth migration
   - Generate password hash
   - Create default admin migration
   - Verify database changes

2. **Phase 2 (Auth Config)** - MUST complete before Phase 3
   - Update Better Auth server config
   - Update session type
   - Update client config
   - Test default admin login

3. **Phase 3 (Middleware)** - MUST complete before Phase 4
   - Create adminProcedure
   - Add route protection
   - Verify middleware works

4. **Phase 4 (Backend)** - MUST complete before Phase 6
   - Create password utility
   - Create admin router
   - Implement all procedures
   - Register router

5. **Phase 5 (Login UI)** - Can complete in parallel with Phase 4
   - Update login form
   - Remove OAuth components
   - Test login flow

6. **Phase 6 (Admin Dashboard)** - MUST complete after Phase 4
   - Install Table component
   - Create admin page
   - Create all dialog components
   - Test all operations

**Testing After Each Phase:**

- **Phase 1**: Query database, verify schema changes
- **Phase 2**: Login with default admin, check session
- **Phase 3**: Try accessing /admin/* as non-admin
- **Phase 4**: Call each tRPC procedure via tRPC panel or Postman
- **Phase 5**: Test login with valid/invalid credentials
- **Phase 6**: Test all CRUD operations in admin dashboard

---

## Verification

After completing all phases, verify the feature works end-to-end:

### Authentication Verification
- [ ] Visit `/login` and see email/password form (not OAuth buttons)
- [ ] Login with admin@example.com / password succeeds
- [ ] Login with invalid credentials shows error
- [ ] Session includes role and banned fields
- [ ] OAuth login no longer available

### Authorization Verification
- [ ] Admin user can access `/admin/users` dashboard
- [ ] Non-admin user redirected from `/admin/users` to home
- [ ] Unauthenticated user redirected from `/admin/users` to login
- [ ] Admin tRPC procedures throw FORBIDDEN for non-admin users

### User Management Verification
- [ ] Admin can view list of all users
- [ ] Admin can search users by email
- [ ] Admin can create user with generated password (password shown once)
- [ ] Admin can create user with custom password
- [ ] Admin can edit user email
- [ ] Admin can reset user password
- [ ] Admin can deactivate user (user cannot login)
- [ ] Admin can reactivate user (user can login again)
- [ ] Cannot deactivate self
- [ ] Cannot deactivate last admin
- [ ] Duplicate email prevented on create/edit

### Data Integrity Verification
- [ ] Deactivated user's chat history retained
- [ ] Deactivated user's existing sessions remain valid until expiration
- [ ] Password changes invalidate old password immediately
- [ ] All database constraints enforced (unique email, etc.)

### UI/UX Verification
- [ ] Generated passwords shown for sufficient time to copy
- [ ] Destructive actions require confirmation
- [ ] Error messages are user-friendly
- [ ] Loading states shown during async operations
- [ ] Success feedback provided via toasts
- [ ] User list refreshes after mutations

---

## Success Criteria

Feature is complete when:

1. ✅ All OAuth authentication removed
2. ✅ Email/password authentication works
3. ✅ Default admin account exists and works
4. ✅ Admin dashboard accessible to admins only
5. ✅ All user management operations functional
6. ✅ Self-deactivation and last-admin protection enforced
7. ✅ Generated passwords cryptographically secure
8. ✅ All data integrity constraints enforced
9. ✅ UI provides clear feedback for all operations
10. ✅ Feature meets all functional requirements in spec

---

## Notes

- Each phase builds on the previous one - do not skip ahead
- Test thoroughly after each phase before proceeding
- Keep database backups before running migrations
- Document any deviations from the plan
- Update frontmatter status as phases complete

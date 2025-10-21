---
date: 2025-10-21 19:35:00
feature-slug: 001-admin-user-management
---

# Admin User Management & Email/Password Authentication - Codebase Research

This document provides comprehensive research on the current state of the codebase and the specific patterns, dependencies, and architecture needed to implement admin user management with email/password authentication.

## Summary

The codebase uses a modern full-stack architecture with Next.js, tRPC for type-safe API calls, Better Auth for authentication, Drizzle ORM for database management, and react-hook-form with Zod for form validation. The admin user management feature will leverage Better Auth's admin plugin for user management operations, replace OAuth with email/password authentication, add role-based authorization middleware to tRPC, and implement a comprehensive admin dashboard UI.

**Key Architectural Components:**
- **Authentication**: Better Auth v1.3.27 with admin plugin and email/password authentication
- **Authorization**: tRPC middleware-based role checking (new `adminProcedure`)
- **Database**: PostgreSQL with Drizzle ORM migrations for schema changes
- **Forms**: react-hook-form + Zod validation pattern
- **UI**: shadcn/ui components with Radix UI primitives
- **API Layer**: tRPC routers with protected/admin procedures

---

## Detailed Findings

### 1. Authentication System (Better Auth)

#### Current Configuration (`lib/auth.ts:18-51`)

The application currently uses Better Auth with OAuth providers (GitHub and Google):

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: env.VERCEL_URL ? [env.VERCEL_URL] : undefined,
  secret: env.AUTH_SECRET,
  socialProviders: { google, github },
  plugins: [nextCookies()],
});
```

**Migration Requirements:**
1. Replace OAuth with email/password authentication
2. Add admin plugin for user management
3. Configure password hashing (scrypt by default)
4. Add role field to user table via migration

#### Better Auth Admin Plugin Integration

The admin plugin provides comprehensive user management capabilities:

**Installation Steps:**
1. Add admin plugin to server config
2. Run migration to add role, banned, banReason, banExpires fields
3. Add adminClient plugin to client config

**Configuration Example:**
```typescript
import { admin } from "better-auth/plugins";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secret: env.AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  plugins: [
    nextCookies(),
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
      impersonationSessionDuration: 60 * 60, // 1 hour
    })
  ],
});
```

**Admin Operations Available:**
- `createUser()` - Create users with email/password
- `setUserPassword()` - Set/reset user passwords
- `listUsers()` - List users with filtering and pagination
- `setRole()` - Assign admin/user roles
- `banUser()`/`unbanUser()` - Soft delete via ban system
- `removeUser()` - Hard delete (discouraged)
- `updateUser()` - Update user details

#### Email/Password Authentication

**Password Hashing:**
- Better Auth uses scrypt by default (OWASP recommended)
- No configuration needed - handled automatically
- Passwords stored in `account.password` field (hashed)

**Authentication Flow:**
1. User submits email/password via login form
2. Better Auth validates credentials against database
3. Creates session in `session` table
4. Sets HTTP-only cookie via `nextCookies()` plugin
5. Session available in tRPC context via `auth.api.getSession()`

**File References:**
- Admin plugin docs: [Better Auth Admin Plugin](https://www.better-auth.com/docs/plugins/admin)
- Email/password docs: [Better Auth Email/Password](https://www.better-auth.com/docs/authentication/email-password)

---

### 2. Database Schema & Migrations

#### Current User Schema (`lib/db/schema.ts:138-149`)

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

**Required Schema Changes:**

Add `role` and `status` fields:

```typescript
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  // NEW FIELDS:
  role: varchar("role", { enum: ["admin", "user"] })
    .default("user")
    .notNull(),
  status: varchar("status", { enum: ["active", "inactive"] })
    .default("active")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
```

**Note:** Better Auth admin plugin will also add `banned`, `banReason`, `banExpires` fields via its migration.

#### Migration Workflow

The project uses Drizzle ORM with automatic migration generation:

**Steps to Add Role & Status Fields:**

1. **Edit Schema** - Modify `lib/db/schema.ts` to add fields
2. **Generate Migration** - Run `npm run db:generate`
   - Creates SQL file in `lib/db/migrations/`
   - Example: `0027_add_user_role_status.sql`
3. **Review SQL** - Check generated migration for correctness
4. **Apply Migration** - Run `npm run db:migrate`
   - Executes pending migrations
   - Updates database schema

**Generated SQL Example:**
```sql
ALTER TABLE "user" ADD COLUMN "role" varchar DEFAULT 'user' NOT NULL;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "status" varchar DEFAULT 'active' NOT NULL;
```

**Migration Files Location:** `/lib/db/migrations/` (currently 26 files)

**Best Practices:**
- Always use `.default()` for new NOT NULL columns on existing tables
- Never edit SQL files directly - use schema + generate workflow
- Test migrations on development database first
- Use `npm run db:studio` to inspect database after migration

**File References:**
- `drizzle.config.ts` - Drizzle Kit configuration
- `lib/db/migrate.ts` - Migration runner script
- `lib/db/schema.ts:138-149` - User table definition

---

### 3. tRPC Router Structure & Authorization

#### Current Architecture

**Router Organization:**
- Main router: `trpc/routers/_app.ts` - Aggregates all domain routers
- Individual routers: `chat.router.ts`, `credits.router.ts`, `document.router.ts`, `vote.router.ts`
- API endpoint: `app/api/trpc/[trpc]/route.ts` - Handles all tRPC requests

**Middleware System (`trpc/init.ts`):**

1. **publicProcedure** (line 110) - No authentication required
2. **protectedProcedure** (lines 120-135) - Requires authentication

```typescript
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const { id, ...rest } = ctx.user;
  if (!id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      user: { id, ...rest }, // Guarantees non-nullable user
    },
  });
});
```

#### Creating Admin-Only Middleware

**New Middleware Pattern** (add to `trpc/init.ts` after line 135):

```typescript
/**
 * Admin-only procedure
 *
 * Verifies user is authenticated AND has admin role
 */
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const { id, role, ...rest } = ctx.user;

  if (!id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required"
    });
  }

  return next({
    ctx: {
      user: { id, role: "admin" as const, ...rest },
    },
  });
});
```

**Context Update Required:**

Update `createTRPCContext()` to include role from session:

```typescript
export const createTRPCContext = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return {
    user: session?.user,
  };
});
```

The session from Better Auth will automatically include the `role` field once added to the schema.

#### Creating Admin Router

**New Router File:** `trpc/routers/admin.router.ts`

```typescript
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/trpc/init";
import { auth } from "@/lib/auth";

export const adminRouter = createTRPCRouter({
  // List all users with filtering
  listUsers: adminProcedure
    .input(
      z.object({
        searchValue: z.string().optional(),
        searchField: z.enum(["email", "name"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        filterField: z.enum(["role", "status"]).optional(),
        filterValue: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await auth.api.listUsers({
        body: { query: input },
        headers: await headers(),
      });
      return result;
    }),

  // Create user with optional password generation
  createUser: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(1),
        password: z.string().min(8).optional(),
        role: z.enum(["admin", "user"]).default("user"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const password = input.password || generateSecurePassword(16);

      const result = await auth.api.createUser({
        body: {
          email: input.email,
          name: input.name,
          password,
          role: input.role,
        },
        headers: await headers(),
      });

      return {
        user: result.user,
        generatedPassword: input.password ? undefined : password,
      };
    }),

  // Edit user email
  updateUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        email: z.string().email(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await auth.api.updateUser({
        body: {
          userId: input.userId,
          data: { email: input.email },
        },
        headers: await headers(),
      });
      return { success: true };
    }),

  // Reset user password
  resetUserPassword: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await auth.api.setUserPassword({
        body: {
          userId: input.userId,
          newPassword: input.newPassword,
        },
        headers: await headers(),
      });
      return { success: true };
    }),

  // Deactivate user (soft delete)
  deactivateUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Prevent self-deactivation
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot deactivate yourself",
        });
      }

      // Use Better Auth ban system for soft delete
      await auth.api.banUser({
        body: {
          userId: input.userId,
          banReason: "User deactivated by admin",
        },
        headers: await headers(),
      });

      return { success: true };
    }),

  // Reactivate user
  reactivateUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await auth.api.unbanUser({
        body: { userId: input.userId },
        headers: await headers(),
      });
      return { success: true };
    }),
});
```

**Register in App Router** (`trpc/routers/_app.ts`):

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

**File References:**
- `trpc/init.ts:120-135` - protectedProcedure pattern
- `trpc/routers/chat.router.ts:57-74` - Query with input validation example
- `trpc/routers/vote.router.ts:23-49` - Authorization check pattern

---

### 4. Form Component Architecture

#### Form System Overview

The codebase uses **react-hook-form** + **Zod** validation with shadcn/ui components:

**Component Structure:**
```
Form (FormProvider from react-hook-form)
├── FormField - Controller wrapper with field context
├── FormItem - Container with unique ID generation
├── FormLabel - Accessible label with error styling
├── FormControl - Input wrapper (Radix Slot pattern)
├── FormMessage - Auto-displays validation errors
└── FormDescription - Optional field help text
```

**Key Files:**
- `components/ui/form.tsx:1-165` - Form component primitives
- `components/ui/input.tsx:5-21` - Input component
- `components/ui/button.tsx` - Button variants

#### Form Implementation Pattern

**Example: Create User Form**

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useTRPC } from "@/trpc/react";
import { toast } from "sonner";

const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8).optional(),
  generatePassword: z.boolean().default(true),
  role: z.enum(["user", "admin"]).default("user"),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

export function CreateUserForm() {
  const trpc = useTRPC();
  const utils = trpc.useUtils();

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
      generatePassword: true,
      role: "user",
    },
  });

  const createUserMutation = trpc.admin.createUser.useMutation({
    onSuccess: (data) => {
      if (data.generatedPassword) {
        toast.success(
          `User created! Password: ${data.generatedPassword}`,
          { duration: 10000 }
        );
      } else {
        toast.success("User created successfully!");
      }
      void utils.admin.listUsers.invalidate();
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

  const onSubmit = async (values: CreateUserFormValues) => {
    await createUserMutation.mutate({
      email: values.email,
      name: values.name,
      password: values.generatePassword ? undefined : values.password,
      role: values.role,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="user@example.com"
                  type="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
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

        {!form.watch("generatePassword") && (
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
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={createUserMutation.isPending}
        >
          {createUserMutation.isPending ? "Creating..." : "Create User"}
        </Button>
      </form>
    </Form>
  );
}
```

#### Error Handling Pattern

**Field-Level Errors:**
- Handled by `FormMessage` component automatically
- Zod validation errors displayed inline
- `aria-invalid` styling applied to inputs with errors

**Operation Errors:**
- Toast notifications via `sonner` library
- Success: `toast.success("User created!")`
- Error: `toast.error("Failed to create user")`
- Specific field errors: `form.setError("email", { message: "..." })`

**File References:**
- `components/ui/form.tsx:135-153` - FormMessage component
- `components/ui/input.tsx:11` - aria-invalid styling
- `trpc/init.ts:47-56` - Error formatter with Zod errors

---

### 5. Password Generation Implementation

#### Secure Password Generation

Better Auth does NOT auto-generate passwords - this must be implemented manually.

**Recommended Implementation:**

```typescript
import { randomBytes } from "crypto";

export function generateSecurePassword(length = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
  const randomBuffer = randomBytes(length);
  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = randomBuffer[i] % chars.length;
    password += chars[randomIndex];
  }

  return password;
}
```

**Alternative: Using `generate-password` Package**

```bash
npm install generate-password
npm install -D @types/generate-password
```

```typescript
import generator from "generate-password";

export function generateSecurePassword(): string {
  return generator.generate({
    length: 16,
    numbers: true,
    symbols: true,
    uppercase: true,
    lowercase: true,
    strict: true, // Ensures all character types are included
  });
}
```

**Best Practices:**
- Minimum 16 characters for admin-generated passwords
- Include uppercase, lowercase, numbers, and symbols
- Use cryptographically secure random generator (Node.js `crypto` module)
- Display generated password to admin only once
- Consider forcing password change on first login

**Password Display Strategy:**
- Return generated password in mutation response
- Display in toast notification with long duration (10 seconds)
- Show "Copy Password" button in confirmation dialog
- Never store plaintext password after display

---

### 6. User Deactivation (Soft Delete) Strategy

#### Option 1: Better Auth Ban System (Recommended)

Use Better Auth's built-in ban functionality:

**Deactivate User:**
```typescript
await auth.api.banUser({
  body: {
    userId: "user-id",
    banReason: "User deactivated by admin",
    // No banExpiresIn = permanent
  },
  headers: await headers(),
});
```

**Reactivate User:**
```typescript
await auth.api.unbanUser({
  body: { userId: "user-id" },
  headers: await headers(),
});
```

**Advantages:**
- Built-in to Better Auth admin plugin
- Automatically prevents login
- Includes ban reason and expiration tracking
- Database migration handled by plugin

**Schema Changes (via Better Auth migration):**
- `banned` (boolean)
- `banReason` (string)
- `banExpires` (timestamp)

#### Option 2: Custom Status Field

Add custom `status` field to user table:

```typescript
export const user = pgTable("user", {
  // ... existing fields
  status: varchar("status", { enum: ["active", "inactive"] })
    .default("active")
    .notNull(),
});
```

**Middleware Check:**
```typescript
// middleware.ts
const session = await auth.api.getSession({ headers: req.headers });

if (session?.user?.status !== "active") {
  // Revoke all sessions
  await auth.api.revokeUserSessions({
    body: { userId: session.user.id },
  });
  return Response.redirect("/login?error=inactive");
}
```

**Advantages:**
- Clear intent (status field)
- Flexible for additional statuses (suspended, pending, etc.)
- Audit trail via updatedAt timestamp

**Disadvantages:**
- Requires manual session revocation
- More implementation work

**Recommendation:** Use Option 1 (Ban System) for simplicity and built-in session handling.

---

### 7. UI Component Patterns

#### Available Components for Admin Dashboard

**Layout Components:**
- `Card` - Content grouping and sections
- `Sheet` - Side panel for forms
- `Dialog` - Modal dialogs for confirmations
- `AlertDialog` - Destructive action confirmations
- `Tabs` - Organize dashboard sections

**Data Display:**
- `Table` - User list display
- `ScrollArea` - Scrollable content containers
- `Badge` - Role/status indicators

**Form Components:**
- `Input` - Text inputs
- `Select` - Dropdowns (role selection)
- `Checkbox` - Toggle options
- `Button` - Actions with variants (default, destructive, outline)

**Feedback:**
- `Toaster` (sonner) - Success/error notifications
- `FormMessage` - Inline field errors

#### Admin Dashboard Layout Pattern

```typescript
// app/admin/users/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserListTable } from "@/components/admin/user-list-table";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";

export default function AdminUsersPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>User Management</CardTitle>
          <CreateUserDialog>
            <Button>Add User</Button>
          </CreateUserDialog>
        </CardHeader>
        <CardContent>
          <UserListTable />
        </CardContent>
      </Card>
    </div>
  );
}
```

**File References:**
- `components/ui/card.tsx` - Card components
- `components/ui/dialog.tsx` - Dialog components
- `components/ui/table.tsx` - Table components

---

## Code References

### Authentication & Authorization
- `lib/auth.ts:18-51` - Better Auth configuration with OAuth
- `trpc/init.ts:29-34` - tRPC context creation with session
- `trpc/init.ts:120-135` - protectedProcedure middleware pattern
- `middleware.ts:34-35` - Session validation in Next.js middleware

### Database Schema
- `lib/db/schema.ts:138-149` - User table schema
- `lib/db/schema.ts:151-164` - Session table schema
- `lib/db/schema.ts:166-184` - Account table schema (OAuth + passwords)
- `drizzle.config.ts` - Drizzle migration configuration

### Database Operations
- `lib/db/migrate.ts` - Migration runner
- `lib/db/queries.ts` - Query patterns with try-catch
- `lib/db/migrations/` - SQL migration files (26 existing)

### Forms & Validation
- `components/ui/form.tsx:1-165` - Form primitives
- `components/ui/input.tsx:5-21` - Input component
- `trpc/init.ts:47-56` - Zod error formatter

### tRPC Routers
- `trpc/routers/_app.ts` - Main router aggregation
- `trpc/routers/chat.router.ts:57-74` - Query with validation example
- `trpc/routers/vote.router.ts:23-49` - Authorization check pattern
- `app/api/trpc/[trpc]/route.ts` - tRPC API endpoint

### UI Components
- `components/ui/button.tsx` - Button variants
- `components/ui/card.tsx` - Card layout
- `components/ui/dialog.tsx` - Modal dialogs
- `components/ui/table.tsx` - Table display

---

## Architecture Insights

### 1. Type Safety Throughout the Stack

**End-to-End Type Safety:**
- Zod schemas validate input at runtime AND provide TypeScript types
- tRPC infers types from router definitions
- Drizzle ORM generates types from schema definitions
- react-hook-form uses Zod schema for form validation

**Example Type Flow:**
```
Schema (Zod) → Form (react-hook-form) → Mutation (tRPC) → Database (Drizzle)
     ↓              ↓                      ↓                ↓
   Types         Types                  Types            Types
```

### 2. Middleware Chain Pattern

**tRPC Middleware Composition:**
```
timingMiddleware (all procedures)
  → publicProcedure (no auth)
  → protectedProcedure (auth required)
    → adminProcedure (auth + role check)
```

Each middleware layer:
1. Validates requirements
2. Enhances context for next layer
3. Provides type safety guarantees

### 3. Session Management Flow

**Server-Side:**
```
Request → Middleware → auth.api.getSession()
  → tRPC Context → Procedures (ctx.user available)
```

**Client-Side:**
```
SessionProvider (server-rendered initial session)
  → authClient.useSession() (client-side sync)
  → useSession() hook (React context)
```

### 4. Error Handling Strategy

**Layered Error Handling:**
1. **Validation Errors** - Caught by Zod, formatted by tRPC
2. **Authorization Errors** - Thrown in middleware (UNAUTHORIZED, FORBIDDEN)
3. **Business Logic Errors** - Thrown in procedures (NOT_FOUND, BAD_REQUEST)
4. **Database Errors** - Caught in try-catch blocks in queries

**Client-Side Error Display:**
1. **Field Errors** - FormMessage component (inline)
2. **Operation Errors** - Toast notifications (global)
3. **Blocking Errors** - AlertDialog (confirmation required)

### 5. Database Migration Strategy

**Workflow:**
```
1. Modify schema.ts (TypeScript)
   ↓
2. npm run db:generate (SQL generation)
   ↓
3. Review SQL file
   ↓
4. npm run db:migrate (Apply to DB)
   ↓
5. Types auto-update in code
```

**Integration:**
- Migrations run automatically during build (`package.json:9`)
- Zero-downtime deployments via idempotent SQL
- Default values for new required columns

### 6. Form State Management

**React Hook Form Benefits:**
- Minimal re-renders (uncontrolled inputs)
- Built-in validation with Zod resolver
- Automatic error state management
- Integration with shadcn/ui components via Radix Slot pattern

### 7. Admin Role Enforcement

**Multiple Enforcement Layers:**
1. **Middleware** - Redirects non-admins at route level
2. **tRPC Middleware** - Throws FORBIDDEN for admin procedures
3. **UI** - Conditionally render admin-only components
4. **Database** - Role field enforces persistence

---

## Web Research Documents

<web-research-documents>

### Better Auth Admin Plugin & Email/Password Authentication
- **File**: `gg/agent-outputs/web-researcher/2025-10-21_18-45-32-better-auth-admin-research.md`
- **Purpose**: Understanding Better Auth's admin plugin for user management and email/password authentication
- **Key Findings**:
  - Admin plugin provides `createUser()`, `setUserPassword()`, `listUsers()`, `banUser()`, `unbanUser()` operations
  - Email/password authentication uses scrypt hashing by default (OWASP recommended)
  - Password generation NOT built-in - must implement using Node.js `crypto` module or `generate-password` package
  - Ban system can serve as soft delete mechanism
  - Custom user fields supported via `additionalFields` configuration
  - Database migration adds `role`, `banned`, `banReason`, `banExpires` fields
  - Role-based authorization with `adminRoles` and `adminUserIds` configuration
  - Pagination and filtering built into `listUsers()` API
- **Integration Notes**:
  - Replace OAuth configuration with `emailAndPassword: { enabled: true }`
  - Add `admin()` plugin to Better Auth server config
  - Add `adminClient()` plugin to client config
  - Run Better Auth migration: `npx @better-auth/cli migrate`
  - Password hashing handled automatically - just pass plaintext to `createUser()`
  - Session management via cookies (existing `nextCookies()` plugin)

**Security Best Practices from Research:**
- Always use HTTPS for password transmission
- Implement rate limiting on login endpoints
- Use cryptographically secure password generation (Node.js `crypto.randomBytes()`)
- Minimum 16 characters for admin-generated passwords
- Display generated password only once (no retrieval)
- Consider forcing password change on first login
- Audit log all admin operations (user creation, password resets, deactivations)

**Migration Strategy from OAuth to Email/Password:**
- Keep existing OAuth temporarily for gradual migration
- Use Better Auth account linking to connect OAuth and email/password accounts
- Default admin account: email "admin@example.com", password "password" (per spec FR-006)
- Send password reset emails for imported users

</web-research-documents>

---

## Implementation Checklist

Based on this research, the implementation will require:

### Database Layer
- [ ] Add `role` and `status` fields to user schema
- [ ] Generate and apply Drizzle migration
- [ ] Run Better Auth migration for admin plugin fields
- [ ] Create default admin user (admin@example.com)

### Authentication Layer
- [ ] Replace OAuth with email/password in Better Auth config
- [ ] Add admin plugin to Better Auth server
- [ ] Add adminClient plugin to client
- [ ] Update session type to include role field

### Authorization Layer
- [ ] Create `adminProcedure` middleware in tRPC
- [ ] Update `createTRPCContext()` to include role
- [ ] Add middleware to check user status (active/inactive)

### API Layer (tRPC)
- [ ] Create `admin.router.ts` with user management procedures
- [ ] Implement `listUsers` with filtering/pagination
- [ ] Implement `createUser` with optional password generation
- [ ] Implement `updateUser` for email changes
- [ ] Implement `resetUserPassword`
- [ ] Implement `deactivateUser` / `reactivateUser`
- [ ] Register admin router in `_app.ts`

### Utilities
- [ ] Create `generateSecurePassword()` utility
- [ ] Add password strength validation

### UI Components
- [ ] Create admin dashboard layout
- [ ] Create user list table with search/filter
- [ ] Create "Add User" dialog/form
- [ ] Create "Edit User" dialog/form
- [ ] Create "Reset Password" dialog/form
- [ ] Create confirmation dialogs for destructive actions
- [ ] Add role and status badge components

### Forms
- [ ] CreateUserForm with email, name, password/auto-generate
- [ ] EditUserForm with email editing
- [ ] ResetPasswordForm with new password input
- [ ] LoginForm (email/password) to replace OAuth buttons

### Routes
- [ ] Create `/admin/users` dashboard page
- [ ] Add middleware protection for `/admin/*` routes
- [ ] Update login page to use email/password form

### Testing & Validation
- [ ] Test admin user creation flow
- [ ] Test password generation and display
- [ ] Test user deactivation/reactivation
- [ ] Test role-based access (admin vs user)
- [ ] Test email uniqueness validation
- [ ] Test self-deactivation prevention
- [ ] Test last admin protection

---

## Notes

### Password Hashing
Better Auth uses **scrypt** by default (not bcrypt or Argon2). Scrypt is:
- Memory-hard and CPU-intensive
- OWASP recommended
- Built into Node.js (no additional dependencies)
- Automatically applied - just pass plaintext passwords to Better Auth APIs

### Session Persistence
Sessions are stored in the database (`session` table) and tracked via HTTP-only cookies. The `nextCookies()` plugin handles:
- Setting secure cookies on login
- Reading cookies on requests
- Cookie expiration (tied to session.expiresAt)
- CSRF protection via SameSite attribute

### Type Safety
The entire stack is type-safe:
- Drizzle generates types from database schema
- Better Auth provides typed session objects
- tRPC infers types from router definitions
- Zod provides runtime validation + TypeScript types
- React Hook Form integrates with Zod for form validation

### Migration Path
To avoid breaking existing users:
1. Keep OAuth providers active initially
2. Add email/password authentication alongside OAuth
3. Create default admin account manually
4. Gradually migrate users or support both auth methods
5. Remove OAuth providers in future phase if desired

### Future Enhancements (Out of Scope for This Feature)
- Email verification for new accounts
- Password reset via email
- Rate limiting on login attempts
- Audit logging of admin actions
- Bulk user operations
- User activity tracking
- Advanced permissions (beyond admin/user)
- Password complexity requirements
- Password expiration policies

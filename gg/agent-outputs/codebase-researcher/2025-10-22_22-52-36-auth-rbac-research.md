# Authentication and Role-Based Access Control (RBAC) Implementation Research

## Overview

This codebase implements a comprehensive authentication and role-based access control system using **Better Auth** as the authentication library with **Next.js middleware** for route protection and **tRPC** procedures with role-based middleware for API-level access control.

The system distinguishes between two role types:
- **admin**: Full administrative access
- **user**: Standard user access

---

## Architecture Summary

```
Authentication Flow:
  User Login/Register → Better Auth → Session Created
                                        ↓
                                    User Role Field
                                    (admin | user)
                                        ↓
                          ┌─────────────────────┐
                          ↓                     ↓
                    Route Protection    Procedure Protection
                    (Middleware)        (tRPC Procedures)
                          ↓                     ↓
                    Allow/Deny Route     Allow/Deny API Call
```

---

## 1. User Authentication Configuration

### Library: Better Auth
- **Location**: `/Users/ashray/code/amxv/rag/lib/auth.ts`
- **Type**: Server-side authentication library with database adapter

### Core Setup (`lib/auth.ts:21-44`)

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: env.VERCEL_URL ? [env.VERCEL_URL] : undefined,
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
      impersonationSessionDuration: 60 * 60,
    }),
  ],
});
```

**Key Configuration Details** (`lib/auth.ts`):
- **Database**: PostgreSQL via Drizzle ORM adapter
- **Authentication Method**: Email and password authentication
- **Session Management**: Handled via Next.js cookies plugin
- **Admin Plugin**: Enables admin-specific operations
  - Default role for new users: `"user"` (line 39)
  - Admin roles array: `["admin"]` (line 40)
  - Impersonation session duration: 3600 seconds (line 41)

### Session Type Definition (`lib/auth.ts:9-19`)

```typescript
export type Session = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null; // "admin" | "user"
    banned?: boolean | null;
  };
  expires?: string;
};
```

The session includes:
- User ID, name, email, image
- **Role field** (`role?: string | null`): Identifies if user is admin
- **Ban status** (`banned?: boolean | null`): For deactivating users

---

## 2. User Roles Definition and Storage

### Database Schema
- **Location**: `/Users/ashray/code/amxv/rag/lib/db/schema.ts`

### User Table Definition (`lib/db/schema.ts:138-153`)

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
  role: text("role"),                          // ← Role field
  banned: boolean("banned").default(false),    // ← Ban status
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});
```

**Role Storage**:
- **Field**: `role` (text column, nullable)
- **Values**: "admin" or "user" (defaulting to "user" at auth config level)
- **Default**: No explicit NOT NULL constraint in schema, but Better Auth plugin sets default to "user"

**Additional User Control**:
- **Banned field**: Boolean flag to deactivate users without deletion
- **Ban Reason**: Text field explaining deactivation reason
- **Ban Expires**: Timestamp for potential temporary bans

### Related Tables for Session Management
- **session table** (`lib/db/schema.ts:155-169`): Stores session tokens and metadata
- **account table** (`lib/db/schema.ts:171-189`): Stores user account details and oauth integration

---

## 3. Admin vs Non-Admin Differentiation

### Role Assignment in Better Auth

**Default Role** (`lib/auth.ts:39`):
```typescript
defaultRole: "user"
```
All new users created are assigned the "user" role by default.

**Admin Roles** (`lib/auth.ts:40`):
```typescript
adminRoles: ["admin"]
```
Only users with role = "admin" are considered administrators.

### Role-Based Capabilities

**Admin Users Can**:
1. List all users with filters (email, name, role, status) - `admin.router.ts:12-81`
2. Create new users and assign roles - `admin.router.ts:83-133`
3. Update user email addresses - `admin.router.ts:135-166`
4. Reset user passwords - `admin.router.ts:168-186`
5. Deactivate/ban users - `admin.router.ts:188-241`
6. Reactivate/unban users - `admin.router.ts:243-257`
7. Access `/admin` routes and admin dashboard

**Non-Admin (Regular) Users Can**:
1. Create and manage their own chats
2. Read documents
3. Vote on messages
4. Access standard chat functionality
5. Cannot access `/admin` routes or admin procedures

### Admin-Only Procedures
- **Location**: `/Users/ashray/code/amxv/rag/trpc/routers/admin.router.ts`

All procedures are protected by `adminProcedure` middleware (line 9):
```typescript
export const adminRouter = createTRPCRouter({
  listUsers: adminProcedure ... ,
  createUser: adminProcedure ... ,
  updateUser: adminProcedure ... ,
  resetUserPassword: adminProcedure ... ,
  deactivateUser: adminProcedure ... ,
  reactivateUser: adminProcedure ... ,
});
```

---

## 4. Route Protection Based on User Roles

### Middleware-Level Protection
- **Location**: `/Users/ashray/code/amxv/rag/middleware.ts`
- **Type**: Next.js middleware executed on all requests

### Admin Route Protection (`middleware.ts:37-54`)

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

**Flow for Admin Routes**:
1. Check if URL starts with `/admin` (line 38)
2. If not logged in → Redirect to `/login` (lines 42-43)
3. If logged in but not admin → Redirect to `/?error=forbidden` (lines 47-49)
4. If admin → Allow access (line 53)

### Session Retrieval in Middleware (`middleware.ts:34`)

```typescript
const session = await auth.api.getSession({ headers: req.headers });
const isLoggedIn = !!session?.user;
```

Session is fetched from Better Auth API using request headers.

### Public Routes (No Authentication Required)
Routes that bypass middleware checks:
- `/api/auth/...` (auth API routes) - Line 11-13
- `/api/trpc/...` (tRPC API) - Line 24-26
- `/api/chat` (chat API) - Line 29-31
- `/login`, `/register` (auth pages) - Lines 59-69
- `/share/...` (public sharing) - Line 71-72
- `/models`, `/compare` (public pages) - Lines 74-79
- `/privacy`, `/terms` (legal pages) - Lines 81-82

### Protected Routes (Authentication Required)
- `/` (chat home) - Requires login except for homepage itself
- `/chat/[id]` - Requires authentication

---

## 5. Middleware and RBAC Patterns

### tRPC Procedure-Level Access Control
- **Location**: `/Users/ashray/code/amxv/rag/trpc/init.ts`

#### Three Levels of Procedures

**1. Public Procedure** (`init.ts:110`)
```typescript
export const publicProcedure = t.procedure.use(timingMiddleware);
```
- No authentication required
- Available to everyone
- Used for non-sensitive operations

**2. Protected Procedure** (`init.ts:120-135`)
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
- Requires user to be logged in
- Throws `UNAUTHORIZED` error if no user
- Validates user ID exists (line 125-127)
- Used for user-specific operations (chat, documents, etc.)

**3. Admin Procedure** (`init.ts:143-170`)
```typescript
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

**Validation Chain**:
1. Check user is logged in (line 145-147)
2. Extract user ID and role (line 149)
3. Verify user ID exists (line 152-154)
4. **Verify role is "admin"** (line 157)
5. If not admin → Throw `FORBIDDEN` error with message (lines 158-161)
6. If admin → Pass through with type-guaranteed admin role (lines 165-169)

### Context with User Data
- **Location**: `/Users/ashray/code/amxv/rag/trpc/init.ts:29-34`

```typescript
export const createTRPCContext = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return {
    user: session?.user,
  };
});
```

Context is created on every request:
- Fetches session from Better Auth
- Extracts user information
- Makes user available in all procedures
- User includes role information via session

### tRPC Router Setup
- **Location**: `/Users/ashray/code/amxv/rag/trpc/routers/_app.ts`

```typescript
export const appRouter = createTRPCRouter({
  admin: adminRouter,
  chat: chatRouter,
  credits: creditsRouter,
  vote: voteRouter,
  document: documentRouter,
});
```

Admin router is mounted as a sub-router, with all its procedures requiring admin access.

---

## 6. Client-Side Authentication Management

### Auth Client Setup
- **Location**: `/Users/ashray/code/amxv/rag/lib/auth-client.ts`

```typescript
import { adminClient } from "better-auth/client/plugins";
import { nextCookies } from "better-auth/next-js";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  plugins: [nextCookies(), adminClient()],
});

export default authClient;
```

**Plugins**:
- **nextCookies()**: Enables Next.js cookie-based session management on client
- **adminClient()**: Provides admin-specific client methods

### Session Provider
- **Location**: `/Users/ashray/code/amxv/rag/providers/session-provider.tsx`

```typescript
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
```

Provides React context-based access to session:
- `data`: Current session (includes user role)
- `isPending`: Whether session is being loaded

### Admin Layout Integration
- **Location**: `/Users/ashray/code/amxv/rag/app/admin/layout.tsx`

```typescript
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        {children}
      </SessionProvider>
    </TRPCReactProvider>
  );
}
```

**Layout Features**:
- Fetches session server-side (line 11)
- Provides initial session to SessionProvider (line 30)
- Wraps with TRPCReactProvider for API access
- Enables server-side session initialization (no hydration mismatch)

---

## 7. Admin User Management Features

### Create User with Role
- **Location**: `/Users/ashray/code/amxv/rag/trpc/routers/admin.router.ts:83-133`

```typescript
createUser: adminProcedure
  .input(
    z.object({
      email: z.string().email(),
      name: z.string().min(1),
      password: z.string().min(8).optional(),
      role: z.enum(["admin", "user"]).default("user"),
    })
  )
  .mutation(async ({ input }) => {
    // Generate password if not provided
    const passwordWasGenerated = !input.password;
    const password = input.password || generateSecurePassword(16);

    try {
      // Call Better Auth admin API to create user
      const result = await auth.api.createUser({
        body: {
          email: input.email,
          name: input.name,
          password,
          role: input.role,  // ← Role can be set during creation
        },
        headers: await headers(),
      });

      return {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role || "user",
        },
        generatedPassword: passwordWasGenerated ? password : undefined,
      };
    } catch (error) {
      // Handle duplicate email error
      if (
        error instanceof Error &&
        (error.message.includes("duplicate") ||
          error.message.includes("unique") ||
          error.message.includes("email"))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email already exists",
        });
      }
      throw error;
    }
  })
```

**Features**:
- Admin can set role during user creation (line 89: "role": "admin" or "user")
- Generates secure password if not provided (line 95)
- Calls Better Auth admin API (line 99-107)
- Returns generated password if auto-generated (line 116)
- Prevents duplicate emails

### List Users with Filtering
- **Location**: `/Users/ashray/code/amxv/rag/trpc/routers/admin.router.ts:12-81`

```typescript
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
  .query(async ({ input }) => {
    // ... query logic with where conditions
    const whereConditions = [];

    // Apply search filter
    if (input.searchValue && input.searchField) {
      if (input.searchField === "email") {
        whereConditions.push(ilike(user.email, `%${input.searchValue}%`));
      } else if (input.searchField === "name") {
        whereConditions.push(ilike(user.name, `%${input.searchValue}%`));
      }
    }

    // Apply role filter
    if (input.filterField === "role" && input.filterValue) {
      whereConditions.push(eq(user.role, input.filterValue));
    }

    // Apply status filter
    if (input.filterField === "status" && input.filterValue) {
      if (input.filterValue === "active") {
        whereConditions.push(eq(user.banned, false));
      } else if (input.filterValue === "inactive") {
        whereConditions.push(eq(user.banned, true));
      }
    }

    // Query users with filters
    const users = await db
      .select()
      .from(user)
      .where(
        whereConditions.length > 0 ? and(...whereConditions) : undefined
      )
      .limit(input.limit)
      .offset(input.offset);

    // Transform users to include status field
    const transformedUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: (u.role || "user") as "admin" | "user",
      status: (u.banned ? "inactive" : "active") as "active" | "inactive",
      createdAt: u.createdAt,
      banned: u.banned || false,
      banReason: u.banReason,
    }));

    return {
      users: transformedUsers,
      total: totalResult?.count || 0,
    };
  })
```

**Filter Capabilities**:
- Search by email or name (case-insensitive)
- Filter by role ("admin" or "user")
- Filter by status ("active" or "inactive" = not banned)
- Pagination with limit and offset

### Deactivate User (Ban)
- **Location**: `/Users/ashray/code/amxv/rag/trpc/routers/admin.router.ts:188-241`

```typescript
deactivateUser: adminProcedure
  .input(
    z.object({
      userId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    // Prevent self-deactivation
    if (input.userId === ctx.user.id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot deactivate yourself",
      });
    }

    // Check if this is the last admin
    const [targetUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, input.userId));

    if (!targetUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    if (targetUser.role === "admin") {
      // Count active admins
      const [result] = await db
        .select({ count: count() })
        .from(user)
        .where(and(eq(user.role, "admin"), eq(user.banned, false)));

      if (result && result.count <= 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot deactivate the last admin",
        });
      }
    }

    // Deactivate via ban system
    await auth.api.banUser({
      body: {
        userId: input.userId,
        banReason: "User deactivated by admin",
      },
      headers: await headers(),
    });

    return { success: true };
  })
```

**Safety Checks**:
- Prevents self-deactivation (lines 196-201)
- Validates user exists (lines 204-213)
- Prevents deactivating the last admin (lines 216-228)
- Uses Better Auth ban system (lines 231-238)

---

## 8. Key Security Patterns

### 1. Role Verification at Multiple Layers

**Layer 1 - Route Middleware** (`middleware.ts`):
```typescript
if (session.user.role !== "admin") {
  return NextResponse.redirect(new URL("/?error=forbidden", url));
}
```

**Layer 2 - tRPC Procedure Middleware** (`init.ts`):
```typescript
if (role !== "admin") {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Admin access required",
  });
}
```

Both layers must pass for admin access.

### 2. Self-Protection Mechanisms

**Prevent Self-Deactivation** (`admin.router.ts:196-201`):
```typescript
if (input.userId === ctx.user.id) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Cannot deactivate yourself",
  });
}
```

**Prevent Removing Last Admin** (`admin.router.ts:216-228`):
Counts active admins and prevents deactivation if only one admin exists.

### 3. Validation and Error Handling

**Input Validation**:
- All admin procedures use Zod schemas
- Prevents invalid data from reaching database

**Duplicate Email Prevention** (`admin.router.ts:120-130`):
```typescript
if (
  error instanceof Error &&
  (error.message.includes("duplicate") ||
    error.message.includes("unique") ||
    error.message.includes("email"))
) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Email already exists",
  });
}
```

### 4. Session-Based Authentication

- Uses Better Auth session tokens stored in httpOnly cookies
- Session tokens validated on every request
- Role information retrieved from session on each API call
- No JWT leakage or client-side token storage

---

## 9. Data Flow Diagrams

### Admin Login and Route Access
```
1. User logs in via POST /api/auth/sign-in
         ↓
2. Better Auth creates session with role = "admin"
         ↓
3. Session token stored in httpOnly cookie
         ↓
4. User navigates to /admin
         ↓
5. Middleware (middleware.ts:34)
   - Fetches session from auth API
   - Checks role === "admin"
         ↓
6. If admin: Route handler executes
   If not admin: Redirect to /?error=forbidden
```

### Admin API Call
```
1. Client calls admin.listUsers via tRPC
         ↓
2. tRPC context (init.ts:29-34)
   - Fetches session from Better Auth
   - Extracts user and role
         ↓
3. adminProcedure middleware (init.ts:143-170)
   - Checks if user exists
   - Checks if role === "admin"
   - If not admin: Throws FORBIDDEN error
         ↓
4. Procedure executes with type-safe admin context
         ↓
5. Returns user list to admin dashboard
```

### Regular User Cannot Access Admin
```
1. User with role = "user" navigates to /admin
         ↓
2. Middleware checks role (middleware.ts:47)
         ↓
3. role !== "admin" is true
         ↓
4. Redirect to /?error=forbidden
         ↓
5. User sees home page with error message
```

---

## 10. Configuration and Environment

### Required Environment Variables
- `AUTH_SECRET`: Secret key for Better Auth (should be strong random string)
- `DATABASE_URL`: PostgreSQL connection string
- `VERCEL_URL`: For trusted origins in production

### Better Auth Plugin Configuration (`lib/auth.ts:38-42`)
```typescript
admin({
  defaultRole: "user",
  adminRoles: ["admin"],
  impersonationSessionDuration: 60 * 60, // 1 hour
}),
```

**Impersonation**: Admins can impersonate users for up to 1 hour.

---

## 11. Type Safety

### Session Type
```typescript
export type Session = {
  user?: {
    id?: string;
    role?: string | null; // "admin" | "user"
    // ... other fields
  };
  expires?: string;
};
```

### Admin Procedure Context
```typescript
return next({
  ctx: {
    user: { id, role: "admin" as const, ...rest },  // ← Type-guaranteed admin role
  },
});
```

The `as const` ensures TypeScript knows the role is specifically "admin", not just any string.

---

## 12. Summary Table

| Component | Location | Purpose | Role Check |
|-----------|----------|---------|-----------|
| Better Auth Config | `lib/auth.ts` | Authentication setup | Defines admin/user roles |
| User Schema | `lib/db/schema.ts:138-153` | Database structure | Stores role field |
| Route Middleware | `middleware.ts` | HTTP request filtering | Redirects non-admins from /admin |
| tRPC Context | `trpc/init.ts:29-34` | Request context | Extracts user and role |
| Protected Procedure | `trpc/init.ts:120-135` | Auth-required operations | Requires login |
| Admin Procedure | `trpc/init.ts:143-170` | Admin-only operations | Requires role === "admin" |
| Admin Router | `trpc/routers/admin.router.ts` | Admin APIs | All use adminProcedure |
| Session Provider | `providers/session-provider.tsx` | Client session access | Provides session context |
| Auth Client | `lib/auth-client.ts` | Client-side auth | Manages client sessions |
| Admin Layout | `app/admin/layout.tsx` | Admin page wrapper | Server-side session init |

---

## 13. Key Insights

1. **Dual-Layer Protection**: Admin features are protected at both the route level (middleware) and API level (tRPC procedures).

2. **Type Safety**: Admin role is guaranteed at the type level in procedure handlers (`role: "admin" as const`).

3. **Self-Protection**: The system prevents admins from deactivating themselves or removing the last admin from the system.

4. **Standard Auth Library**: Uses industry-standard Better Auth with PostgreSQL, making the system maintainable and scalable.

5. **Session-Based**: Authentication uses session tokens in httpOnly cookies, not JWTs, improving security by preventing token leakage.

6. **Role Field**: Single text field in user table stores role, allowing easy addition of new roles in future without schema migration.

7. **Ban System**: User deactivation uses a ban system rather than deletion, allowing historical tracking and reactivation.

8. **Server-Side Session**: Admin layout initializes session server-side, preventing hydration mismatches and improving security.

---

## Files Referenced

- `/Users/ashray/code/amxv/rag/lib/auth.ts` - Authentication configuration
- `/Users/ashray/code/amxv/rag/lib/auth-client.ts` - Client-side auth setup
- `/Users/ashray/code/amxv/rag/lib/db/schema.ts` - Database schema including user table
- `/Users/ashray/code/amxv/rag/middleware.ts` - Route protection middleware
- `/Users/ashray/code/amxv/rag/trpc/init.ts` - tRPC procedures and middleware
- `/Users/ashray/code/amxv/rag/trpc/routers/admin.router.ts` - Admin-only procedures
- `/Users/ashray/code/amxv/rag/trpc/routers/_app.ts` - Router setup
- `/Users/ashray/code/amxv/rag/providers/session-provider.tsx` - Session context provider
- `/Users/ashray/code/amxv/rag/app/admin/layout.tsx` - Admin page layout

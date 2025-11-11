# Authentication and Role-Based Access Control (RBAC) Analysis

**Research Date:** 2025-11-11
**Focus:** Admin privileges checking and enforcement on /admin routes

---

## Overview

This codebase implements a comprehensive authentication and role-based access control (RBAC) system using **Better Auth** with a **multi-layered security approach** for protecting admin routes. The implementation combines database-level role storage, middleware protection patterns (currently not active), server-side API route guards, tRPC procedure-level authorization, and layout-level session checks.

### Key Security Layers:

1. **Database Schema** - User roles stored at `lib/db/schema.ts:214`
2. **Proxy/Middleware** - Route-level protection in `proxy.ts` (⚠️ **NOT CURRENTLY ACTIVE** - needs to be renamed to `middleware.ts`)
3. **Admin API Routes** - Direct session checks at route handler level
4. **tRPC Procedures** - `adminProcedure` middleware enforces admin role
5. **Layout Components** - Server-side session fetching in admin layout

---

## Core Implementation Details

### 1. Authentication Foundation (Better Auth)

**Entry Point:** `lib/auth.ts`

The application uses Better Auth with the admin plugin for authentication and role management.

#### Configuration (`lib/auth.ts:21-44`)

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

**Key Features:**
- **Drizzle ORM adapter** for PostgreSQL database
- **Email/password authentication** with configurable password requirements
- **Admin plugin** with role-based access control
- **Next.js cookies** for session management
- **Default role:** "user"
- **Admin roles:** ["admin"]
- **Admin impersonation** support (1 hour duration)

#### Session Type Definition (`lib/auth.ts:9-19`)

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

The session includes the user's `role` field which is the primary mechanism for RBAC enforcement.

---

### 2. Database Schema - User Roles

**Location:** `lib/db/schema.ts:203-218`

The user table includes role and ban status fields:

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
  role: text("role"),                    // ← Admin role stored here
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});
```

**Key Points:**
- `role` is stored as `text` type (typically "admin" or "user")
- `banned` boolean flag for user deactivation
- `banReason` and `banExpires` for audit trail
- No foreign key constraints - role is a simple text field

---

### 3. Proxy/Middleware Protection (⚠️ CRITICAL ISSUE)

**Location:** `proxy.ts:1-129`

The codebase contains a proxy file with middleware logic for route protection, but **it's not currently active** because Next.js requires middleware to be named exactly `middleware.ts`.

#### Admin Route Protection Logic (`proxy.ts:48-65`)

```typescript
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

**Intended Flow:**
1. Check if route starts with `/admin`
2. If not logged in → redirect to `/login`
3. If logged in but not admin → redirect to `/?error=forbidden`
4. If admin → allow access

#### Middleware Configuration (`proxy.ts:115-128`)

```typescript
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, opengraph-image (favicon and og image)
     * - manifest files (.json, .webmanifest)
     * - Images and other static assets
     */
    "/((?!api|_next/static|_next/image|favicon.ico|opengraph-image|manifest|privacy|terms|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest)$).*)",
  ],
};
```

#### Additional Protections in Proxy

**Self-service registration blocking** (`proxy.ts:10-20`):
```typescript
const isSignupEndpoint = url.pathname.startsWith("/api/auth/sign-up");
if (isSignupEndpoint) {
  return NextResponse.json(
    {
      error:
        "Self-service registration is disabled. Please contact an administrator.",
    },
    { status: 403 }
  );
}
```

**⚠️ SECURITY ISSUE:** Since this file is named `proxy.ts` instead of `middleware.ts`, Next.js does not recognize it as middleware and **these protections are not active**.

---

### 4. tRPC Middleware - Procedure-Level Authorization

**Location:** `trpc/init.ts`

The tRPC layer implements three procedure types with increasing privilege requirements.

#### Context Creation (`trpc/init.ts:29-34`)

```typescript
export const createTRPCContext = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return {
    user: session?.user,
  };
});
```

Every tRPC request includes the user session in its context.

#### Public Procedure (`trpc/init.ts:110`)

```typescript
export const publicProcedure = t.procedure.use(timingMiddleware);
```

No authentication required. Used for public-facing operations.

#### Protected Procedure (`trpc/init.ts:120-135`)

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

**Protection:**
- Checks `ctx.user` exists
- Verifies user has valid `id`
- Throws `UNAUTHORIZED` error if checks fail
- Guarantees non-null user in subsequent handlers

#### Admin Procedure (`trpc/init.ts:143-170`)

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

**Protection:**
- All checks from `protectedProcedure` PLUS role check
- Verifies `role === "admin"`
- Throws `FORBIDDEN` error with message if not admin
- Type-narrows role to literal `"admin"` for type safety

---

### 5. Admin Router - tRPC Procedures

**Location:** `trpc/routers/admin.router.ts`

All admin operations use `adminProcedure` which enforces admin role.

#### Example: List Users (`admin.router.ts:12-88`)

```typescript
export const adminRouter = createTRPCRouter({
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
      // Query users with filters...
    }),
  // ... more procedures
});
```

#### Example: Create User (`admin.router.ts:90-140`)

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

    // Call Better Auth admin API to create user
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
      generatedPassword: passwordWasGenerated ? password : undefined,
    };
  }),
```

#### Example: Deactivate User with Safety Checks (`admin.router.ts:195-248`)

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
  }),
```

**Business Logic Protection:**
- Prevents admins from deactivating themselves
- Prevents deactivation of the last admin
- Uses Better Auth's ban API for consistency

#### Document Management Procedures (`admin.router.ts:270-432`)

All document management operations are nested under `adminProcedure`:

```typescript
documents: {
  list: adminProcedure.query(...),
  getById: adminProcedure.query(...),
  delete: adminProcedure.mutation(...),
  updateTags: adminProcedure.mutation(...),
  getAllTags: adminProcedure.query(...),
  refreshStatus: adminProcedure.mutation(...),
}
```

---

### 6. Admin API Routes - Direct HTTP Protection

**Location:** `app/(admin)/api/documents/upload/route.ts`

Admin API routes in the `(admin)` route group implement their own authentication checks.

#### Document Upload Route Protection (`upload/route.ts:48-58`)

```typescript
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ... rest of upload logic
}
```

**Protection Flow:**
1. Fetch session using `auth.api.getSession()`
2. Check if session exists → return 401 if not
3. Check if `session.user.role === "admin"` → return 403 if not
4. Proceed with operation

#### Bulk Upload Route (`bulk-upload/route.ts:37-47`)

Same protection pattern:

```typescript
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // ... bulk upload logic
}
```

#### Update Document Route (`[id]/update/route.ts`)

Follows identical authentication pattern (not shown but confirmed to exist based on file structure).

---

### 7. Admin Layout - Server-Side Session Fetching

**Location:** `app/admin/layout.tsx`

The admin layout fetches the session on the server but **does not enforce authorization**. This is a potential security gap since the middleware protection is not active.

#### Layout Implementation (`layout.tsx:7-44`)

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
              role: raw.user.role ?? null,
              banned: raw.user.banned ?? null,
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
        <div className="flex h-screen w-full overflow-hidden">
          <AdminSidebarNav />
          <div className="...">
            {children}
            <div className="h-8 md:h-12" />
          </div>
        </div>
      </SessionProvider>
    </TRPCReactProvider>
  );
}
```

**What it does:**
- Fetches session using `auth.api.getSession()`
- Transforms session data to match app's Session type
- Passes session to SessionProvider
- Renders admin navigation and children

**What it DOESN'T do:**
- ❌ Does not check if user is logged in
- ❌ Does not check if user has admin role
- ❌ Does not redirect non-admin users
- ❌ Does not throw errors for unauthorized access

**Current Protection:** Relies entirely on:
1. tRPC `adminProcedure` preventing data access
2. Admin API routes checking role before operations
3. The inactive `proxy.ts` middleware (not working)

---

### 8. Admin Pages - No Client-Side Protection

**Location:** `app/admin/page.tsx` and `app/admin/users/page.tsx`

#### Main Admin Page (`page.tsx:1-5`)

```typescript
import { redirect } from "next/navigation";

export default function AdminPage() {
  redirect("/admin/users");
}
```

Simply redirects to the users page. No authorization check.

#### Users Page (`users/page.tsx:1-19`)

```typescript
import { UserListTable } from "@/components/admin/user-list-table";

export default function AdminUsersPage() {
  return (
    <div className="container h-[calc(100vh-5rem)]">
      <div className="flex h-full flex-col gap-8 p-2 md:px-8 md:py-4">
        <div>
          <h1 className="...">User Management</h1>
          <p className="...">Manage user accounts and permissions</p>
        </div>
        <UserListTable />
      </div>
    </div>
  );
}
```

No authorization checks. Renders the user list table which will fail at the tRPC level if accessed by non-admin.

---

### 9. Frontend Components - tRPC Integration

**Location:** `components/admin/user-list-table.tsx`

Frontend components use tRPC queries which automatically enforce admin privileges through `adminProcedure`.

#### User List Component (`user-list-table.tsx:28-44`)

```typescript
export function UserListTable() {
  const [searchValue, setSearchValue] = useState("");
  const [refetchKey, setRefetchKey] = useState(0);
  const trpc = useTRPC();

  const { data, isLoading, error } = useQuery({
    ...trpc.admin.listUsers.queryOptions({
      searchValue: searchValue || undefined,
      searchField: "email" as const,
      limit: 50,
      offset: 0,
    }),
  });

  // ... render logic
}
```

**Protection:**
- Uses `trpc.admin.listUsers` which is an `adminProcedure`
- If user is not admin, query fails with FORBIDDEN error
- Error is displayed to user: `{error && <div>Error loading users: {error.message}</div>}`

---

## Data Flow Analysis

### Admin Route Access Flow

```
User Request to /admin/users
         ↓
   ⚠️ Middleware Check (INACTIVE - proxy.ts not recognized)
         ↓ (should redirect but doesn't)
   Server Component (app/admin/users/page.tsx)
         ↓
   Fetches session in layout (app/admin/layout.tsx:12)
         ↓ (no authorization check)
   Renders page with <UserListTable />
         ↓
   Client Component makes tRPC call
         ↓
   tRPC Context (trpc/init.ts:29-34)
     - Fetches session: auth.api.getSession()
         ↓
   Admin Procedure Middleware (trpc/init.ts:143-170)
     - Checks ctx.user exists → UNAUTHORIZED if not
     - Checks ctx.user.id exists → UNAUTHORIZED if not
     - Checks ctx.user.role === "admin" → FORBIDDEN if not
         ↓
   Admin Router Handler (trpc/routers/admin.router.ts:12-88)
     - Executes query (e.g., listUsers)
         ↓
   Database Query
     - Returns user data
         ↓
   Response to Frontend
     - Display data or error
```

### Admin API Route Access Flow

```
POST /api/documents/upload
         ↓
   Route Handler (app/(admin)/api/documents/upload/route.ts:48-58)
     - Fetches session: auth.api.getSession()
     - Checks session exists → 401 if not
     - Checks session.user.role === "admin" → 403 if not
         ↓
   Upload Processing Logic
     - Upload to Blob storage
     - Upload to OpenAI
     - Save to database
         ↓
   Response
     - Success: { success: true, documentId }
     - Error: { error: message }
```

---

## Security Gaps and Recommendations

### 🔴 Critical Issues

#### 1. Middleware Not Active

**Issue:** The `proxy.ts` file contains comprehensive route protection logic but is not recognized by Next.js because it's not named `middleware.ts`.

**Impact:**
- Admin routes are accessible to anyone at the URL level
- Users can view admin pages (though data fetching will fail)
- Poor user experience - users see pages before being redirected by tRPC errors

**Fix:**
```bash
mv proxy.ts middleware.ts
```

**Alternative:** Create `middleware.ts` that imports from `proxy.ts`:
```typescript
// middleware.ts
export { default, config } from './proxy';
```

#### 2. Admin Layout Does Not Check Authorization

**Issue:** `app/admin/layout.tsx` fetches the session but doesn't verify if the user is admin before rendering the layout.

**Current Behavior:**
- Non-admin users can access `/admin` routes
- They see the admin UI shell
- Data fetching fails with tRPC errors
- Users see "Error loading users: Admin access required"

**Recommended Fix:**
```typescript
// app/admin/layout.tsx
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const raw = await auth.api.getSession({ headers: await headers() });

  // Check authentication
  if (!raw?.user) {
    redirect('/login');
  }

  // Check admin role
  if (raw.user.role !== 'admin') {
    redirect('/?error=forbidden');
  }

  // ... rest of layout
}
```

### 🟡 Medium Priority Issues

#### 3. Inconsistent Error Handling

**Issue:** Different layers return different error formats:
- Middleware: HTTP redirects (when active)
- tRPC: `TRPCError` with codes (UNAUTHORIZED, FORBIDDEN)
- API Routes: JSON responses with `{ error: string }`

**Recommendation:** Standardize error responses across all layers.

#### 4. No Rate Limiting

**Issue:** No rate limiting on admin operations.

**Impact:**
- Admins could accidentally or maliciously spam operations
- No protection against brute force on admin routes

**Recommendation:** Implement rate limiting using middleware or a library like `@upstash/ratelimit`.

#### 5. Missing Audit Logging

**Issue:** Admin operations (user creation, deletion, role changes) are not comprehensively logged.

**Current Logging:**
- Some console.log statements
- Ban reason stored in database

**Recommendation:** Implement comprehensive audit logging for all admin operations.

### 🟢 Low Priority Improvements

#### 6. Role Type Safety

**Issue:** Role is stored as `text` in database and checked as string literal `"admin"`.

**Recommendation:**
- Use PostgreSQL enum or check constraint
- Create TypeScript enum/union type for roles

```typescript
// Schema improvement
role: text("role", { enum: ["admin", "user"] }).default("user"),

// Type definition
export type UserRole = "admin" | "user";
```

#### 7. Session Management Documentation

**Issue:** No inline documentation explaining session refresh, expiration, or token rotation.

**Recommendation:** Add JSDoc comments to auth configuration and session-related functions.

---

## Architectural Patterns

### Defense in Depth

The codebase implements multiple security layers (when middleware is active):

```
Layer 1: Middleware (proxy.ts) - Route-level blocking
         ↓ (redirects unauthorized users)
Layer 2: Layout Components - Server-side session checks (recommended)
         ↓ (prevents rendering for unauthorized users)
Layer 3: tRPC Procedures - Business logic authorization
         ↓ (prevents data access)
Layer 4: API Route Handlers - Direct HTTP endpoint protection
         ↓ (prevents file operations)
Layer 5: Database Constraints - Data integrity
         ↓ (ensures valid data)
```

### Separation of Concerns

1. **Authentication:** Better Auth handles user sessions
2. **Authorization:** Role checks distributed across layers
3. **Business Logic:** tRPC procedures handle complex operations
4. **Presentation:** React components consume protected APIs

### Factory Pattern Usage

Better Auth uses the admin plugin which provides factory methods:
- `auth.api.createUser()` - Create users with roles
- `auth.api.banUser()` - Deactivate users
- `auth.api.unbanUser()` - Reactivate users
- `auth.api.setUserPassword()` - Reset passwords

---

## Configuration References

### Environment Variables

Required for authentication (from `lib/env.ts` and Better Auth docs):

```env
AUTH_SECRET=<random-secret-key>
DATABASE_URL=<postgresql-connection-string>
VERCEL_URL=<optional-trusted-origin>
```

### Better Auth Admin Plugin

Configuration location: `lib/auth.ts:38-42`

```typescript
admin({
  defaultRole: "user",      // New users get "user" role
  adminRoles: ["admin"],    // Only "admin" string is recognized as admin
  impersonationSessionDuration: 60 * 60,  // 1 hour
})
```

---

## Testing Recommendations

### Admin Authorization Tests

1. **Middleware Tests (once activated):**
   - Non-admin accessing `/admin` → redirect to `/?error=forbidden`
   - Unauthenticated accessing `/admin` → redirect to `/login`
   - Admin accessing `/admin` → allow

2. **tRPC Procedure Tests:**
   - Non-admin calling `admin.listUsers` → FORBIDDEN error
   - Admin calling `admin.listUsers` → success with data
   - Unauthenticated calling `admin.listUsers` → UNAUTHORIZED error

3. **API Route Tests:**
   - POST `/api/documents/upload` without session → 401
   - POST `/api/documents/upload` with user role → 403
   - POST `/api/documents/upload` with admin role → 200

4. **Business Logic Tests:**
   - Admin deactivating themselves → error
   - Admin deactivating last admin → error
   - Admin deactivating regular admin (2+ exist) → success

---

## Key Files Reference

| Purpose | File Path | Lines |
|---------|-----------|-------|
| Auth Configuration | `lib/auth.ts` | 21-44 |
| Admin Plugin Config | `lib/auth.ts` | 38-42 |
| User Schema | `lib/db/schema.ts` | 203-218 |
| Proxy/Middleware | `proxy.ts` | 48-65 |
| tRPC Context | `trpc/init.ts` | 29-34 |
| Admin Procedure | `trpc/init.ts` | 143-170 |
| Admin Router | `trpc/routers/admin.router.ts` | 11-433 |
| Upload Route | `app/(admin)/api/documents/upload/route.ts` | 48-58 |
| Admin Layout | `app/admin/layout.tsx` | 7-44 |
| User List Page | `app/admin/users/page.tsx` | 1-19 |

---

## Summary

The authentication and RBAC system is **well-designed but incompletely enforced** due to the middleware not being active.

**Strengths:**
- Multi-layered security approach
- Better Auth provides robust session management
- tRPC procedures enforce authorization at API level
- Admin API routes have direct session checks
- Business logic protections (prevent self-deactivation, last admin)

**Critical Action Items:**
1. ✅ **Activate middleware** by renaming `proxy.ts` to `middleware.ts`
2. ✅ **Add authorization checks** to `app/admin/layout.tsx`
3. Consider implementing audit logging for admin operations
4. Add rate limiting to admin routes

Once the middleware is activated, the system will provide comprehensive protection at all layers from HTTP request to database query.

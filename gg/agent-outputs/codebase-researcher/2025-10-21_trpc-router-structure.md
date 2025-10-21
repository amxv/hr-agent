# tRPC Router Structure Research

## Overview

This codebase uses tRPC (TypeScript RPC) with a modular router architecture. The framework is built on the `@trpc/server` library with Next.js as the runtime. The structure separates concerns into initialization, context creation, middleware, and individual domain routers.

---

## 1. Router Organization and Architecture

### Directory Structure
```
trpc/
├── init.ts                 # Core tRPC initialization and middleware
├── query-client.ts         # Client-side query client setup
└── routers/
    ├── _app.ts            # Main app router (aggregates all routers)
    ├── chat.router.ts     # Chat domain router
    ├── credits.router.ts  # Credits/billing domain router
    ├── document.router.ts # Document management router
    └── vote.router.ts     # Voting/feedback router
```

### Router Files Location
- **Main router aggregation**: `/Users/ashray/code/amxv/rag/trpc/routers/_app.ts`
- **API endpoint**: `/Users/ashray/code/amxv/rag/app/api/trpc/[trpc]/route.ts`
- **tRPC initialization**: `/Users/ashray/code/amxv/rag/trpc/init.ts`

---

## 2. How tRPC is Initialized

### Step 1: Core Initialization (`/Users/ashray/code/amxv/rag/trpc/init.ts:1-57`)

The tRPC instance is created at lines 45-57:

```typescript
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});
```

**Key exports from init.ts:**
- `createTRPCRouter = t.router` (line 78) - Function to create routers
- `publicProcedure` (line 110) - Unauthenticated procedure type
- `protectedProcedure` (lines 120-135) - Authenticated procedure type
- `createCallerFactory` (line 64) - For server-side calls

### Step 2: Context Setup (`/Users/ashray/code/amxv/rag/trpc/init.ts:29-36`)

The context is created using React's `cache()` for request deduplication:

```typescript
export const createTRPCContext = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return {
    user: session?.user,
  };
});

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
```

**Context structure:**
- `user?: { id: string; name?: string | null; email?: string | null; image?: string | null }`
- Available in all procedures via `ctx.user`

### Step 3: API Endpoint Setup (`/Users/ashray/code/amxv/rag/app/api/trpc/[trpc]/route.ts:1-12`)

The tRPC route handler uses the Fetch adapter:

```typescript
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });

export { handler as GET, handler as POST };
```

The handler accepts both GET and POST requests at `/api/trpc`.

---

## 3. Main App Router Structure

### Aggregation File (`/Users/ashray/code/amxv/rag/trpc/routers/_app.ts:1-31`)

The main router aggregates all domain-specific routers:

```typescript
import { createCallerFactory, createTRPCRouter } from "@/trpc/init";
import { chatRouter } from "./chat.router";
import { creditsRouter } from "./credits.router";
import { documentRouter } from "./document.router";
import { voteRouter } from "./vote.router";

export const appRouter = createTRPCRouter({
  chat: chatRouter,
  credits: creditsRouter,
  vote: voteRouter,
  document: documentRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
```

**Pattern:**
1. Import each domain router from individual files (lines 2-5)
2. Create `appRouter` by passing an object with router namespaces (lines 13-18)
3. Export `AppRouter` type for client-side type inference (line 21)
4. Export `createCaller` factory for server-side RPC calls (line 30)

---

## 4. Middleware System

### Existing Middleware

#### 1. Timing Middleware (`/Users/ashray/code/amxv/rag/trpc/init.ts:86-101`)

Applied to all procedures:

```typescript
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});
```

Applied via: `publicProcedure = t.procedure.use(timingMiddleware)` (line 110)

#### 2. Authentication Middleware - protectedProcedure (`/Users/ashray/code/amxv/rag/trpc/init.ts:120-135`)

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

**Pattern:**
- Uses `t.procedure.use()` to add middleware
- Checks `ctx.user` existence
- Throws `TRPCError({ code: "UNAUTHORIZED" })` if not authenticated
- Returns `next()` to continue the procedure chain
- Modifies context to guarantee `user` is non-nullable for type safety

---

## 5. Creating Custom Middleware for Role-Based Authorization

### Pattern for Admin-Only Middleware

To create admin-only procedures, you need to:

1. **First, extend the User model to include role information**

   The current user schema at `/Users/ashray/code/amxv/rag/lib/db/schema.ts:138-149` doesn't have a role field. You would need to:
   - Add a `role` field to the user table (via migration)
   - Update the auth session to include the role
   - Extend the Context type

2. **Create an admin middleware in init.ts**

   Pattern (add to `/Users/ashray/code/amxv/rag/trpc/init.ts` after line 135):

   ```typescript
   /**
    * Admin-only (authorized admin) procedure
    *
    * Verifies user is authenticated AND has admin role
    */
   export const adminProcedure = t.procedure.use(({ ctx, next }) => {
     if (!ctx.user) {
       throw new TRPCError({ code: "UNAUTHORIZED" });
     }

     // Assuming role is added to user context
     if (ctx.user.role !== "admin") {
       throw new TRPCError({
         code: "FORBIDDEN",
         message: "Admin access required"
       });
     }

     const { id, ...rest } = ctx.user;
     if (!id) {
       console.error("User ID missing in session callback");
       throw new TRPCError({ code: "UNAUTHORIZED" });
     }

     return next({
       ctx: {
         user: { id, role: "admin", ...rest },
       },
     });
   });
   ```

3. **Update the Context type**

   Modify the context in `/Users/ashray/code/amxv/rag/trpc/init.ts:36`:

   ```typescript
   export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
   ```

   Should include the role information based on the session structure.

---

## 6. Router Pattern Examples

### Example 1: Simple Query Router (`/Users/ashray/code/amxv/rag/trpc/routers/credits.router.ts:1-15`)

```typescript
import { getUserCreditsInfo } from "@/lib/repositories/credits";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const creditsRouter = createTRPCRouter({
  getAvailableCredits: protectedProcedure.query(async ({ ctx }) => {
    const creditsInfo = await getUserCreditsInfo({ userId: ctx.user.id });
    return (
      creditsInfo || {
        totalCredits: 0,
        availableCredits: 0,
        reservedCredits: 0,
      }
    );
  }),
});
```

**Pattern:**
- Create router with `createTRPCRouter({...})`
- Use `protectedProcedure.query()` for read operations
- Access `ctx.user.id` for user-scoped data
- Async handler receives `{ ctx, input }`
- Return typed data

### Example 2: Query with Input Validation (`/Users/ashray/code/amxv/rag/trpc/routers/chat.router.ts:57-74`)

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

**Pattern:**
- Use `.input(z.object({...}))` for Zod validation
- Input is automatically type-safe
- Validate ownership: `chat.userId !== ctx.user.id`
- Throw `TRPCError` with appropriate error codes
- Return serializable data (superjson handles complex types)

### Example 3: Mutation with Multiple Validations (`/Users/ashray/code/amxv/rag/trpc/routers/chat.router.ts:96-115`)

```typescript
renameChat: protectedProcedure
  .input(
    z.object({
      chatId: z.string().uuid(),
      title: z.string().min(1).max(255),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Verify the chat belongs to the user
    const chat = await getChatById({ id: input.chatId });
    if (!chat || chat.userId !== ctx.user.id) {
      throw new Error("Chat not found or access denied");
    }

    const _res = await updateChatTitleById({
      chatId: input.chatId,
      title: input.title,
    });
    return;
  }),
```

**Pattern:**
- Use `.mutation()` for write operations
- Chain `.input()` before `.mutation()`
- Validate ownership before modification
- Can return void, objects, or any serializable type

### Example 4: Authorization Check Pattern (`/Users/ashray/code/amxv/rag/trpc/routers/vote.router.ts:23-49`)

```typescript
voteMessage: protectedProcedure
  .input(
    z.object({
      chatId: z.string(),
      messageId: z.string(),
      type: z.enum(["up", "down"]),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const chat = await getChatById({ id: input.chatId });

    if (!chat) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Chat not found" });
    }

    if (chat.userId !== ctx.user.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    await voteMessage({
      chatId: input.chatId,
      messageId: input.messageId,
      type: input.type,
    });

    return { success: true };
  }),
```

**Pattern:**
- Verify resource exists (check for null)
- Verify user authorization (ownership check)
- Throw appropriate errors:
  - `NOT_FOUND` for missing resources
  - `UNAUTHORIZED` for access violations
- Return success confirmation

---

## 7. How to Add a New Router

### Step 1: Create New Router File

Create `/Users/ashray/code/amxv/rag/trpc/routers/users.router.ts`:

```typescript
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "@/trpc/init";
import { getAllUsers, getUserById, updateUserRole, deleteUser } from "@/lib/db/queries";

export const usersRouter = createTRPCRouter({
  // Admin-only: list all users
  listAllUsers: adminProcedure.query(async ({ ctx }) => {
    const users = await getAllUsers();
    return users;
  }),

  // Admin-only: update user role
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["user", "admin"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await getUserById({ id: input.userId });
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      await updateUserRole({
        userId: input.userId,
        role: input.role,
      });

      return { success: true };
    }),

  // Admin-only: delete user
  deleteUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      await deleteUser({ id: input.userId });
      return { success: true };
    }),

  // Protected: get current user profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById({ id: ctx.user.id });
    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }
    return user;
  }),
});
```

### Step 2: Register in Main App Router

Update `/Users/ashray/code/amxv/rag/trpc/routers/_app.ts`:

```typescript
import { createCallerFactory, createTRPCRouter } from "@/trpc/init";
import { chatRouter } from "./chat.router";
import { creditsRouter } from "./credits.router";
import { documentRouter } from "./document.router";
import { voteRouter } from "./vote.router";
import { usersRouter } from "./users.router";  // NEW

export const appRouter = createTRPCRouter({
  chat: chatRouter,
  credits: creditsRouter,
  vote: voteRouter,
  document: documentRouter,
  users: usersRouter,  // NEW
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
```

### Step 3: Automatic Client Generation

The TypeScript types are automatically available on the client:

```typescript
// Client-side usage (tRPC client handles this automatically)
import type { AppRouter } from "@/trpc/routers/_app";

// Type-safe queries and mutations
trpc.users.listAllUsers.useQuery();
trpc.users.updateUserRole.useMutation();
```

---

## 8. How Routers Are Exposed to the Client

### Client Setup

The router types are exposed through the `AppRouter` export in `/Users/ashray/code/amxv/rag/trpc/routers/_app.ts:21`:

```typescript
export type AppRouter = typeof appRouter;
```

### Client-Side Query/Mutation Access

The client can access procedures via the namespace hierarchy:

```typescript
// Query example
const { data } = await trpc.chat.getAllChats.useQuery();

// Mutation example
const { mutate } = trpc.users.updateUserRole.useMutation();

// Public procedure (no auth required)
const { data } = await trpc.chat.generateTitle.useMutation({
  message: "Hello world"
});
```

### API Endpoint

The full API endpoint is accessible at:
- **URL**: `/api/trpc`
- **Methods**: GET, POST
- **Format**: tRPC JSON-RPC via superjson transformer

Raw API call example:
```typescript
// GET /api/trpc?batch=1&input=%7B%220%22%3A%7B%22chatId%22%3A%22123%22%7D%7D&procedurePath=chat.getChatById
// POST /api/trpc with JSON-RPC payload
```

---

## 9. Error Handling in Routers

### Standard Error Codes (from @trpc/server)

```typescript
throw new TRPCError({
  code: "UNAUTHORIZED",        // User not authenticated
  message: "Not authenticated"
});

throw new TRPCError({
  code: "FORBIDDEN",           // User authenticated but not authorized
  message: "Not authorized"
});

throw new TRPCError({
  code: "NOT_FOUND",          // Resource doesn't exist
  message: "Chat not found"
});

throw new TRPCError({
  code: "BAD_REQUEST",        // Invalid input
  message: "Invalid input"
});

throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: "Something went wrong"
});
```

### Error Formatter

All ZodError validation errors are automatically formatted with `zodError` in the response (`/Users/ashray/code/amxv/rag/trpc/init.ts:47-56`):

```typescript
errorFormatter({ shape, error }) {
  return {
    ...shape,
    data: {
      ...shape.data,
      zodError:
        error.cause instanceof ZodError ? error.cause.flatten() : null,
    },
  };
}
```

---

## 10. Data Type Safety with Zod

All inputs are validated with Zod schema before reaching procedure handlers:

```typescript
// Example from chat.router.ts:58-61
.input(
  z.object({
    chatId: z.string().uuid(),
  })
)
```

Features:
- Runtime validation
- TypeScript inference for `input` parameter
- Automatic error formatting
- Client-side type safety when using tRPC client

---

## Key Implementation Details for Admin User Management

### Prerequisites to Implement Admin Procedures:

1. **Database Schema Extension** (required migration):
   - Add `role` column to `user` table: `VARCHAR('user' | 'admin') DEFAULT 'user'`
   - Update `/Users/ashray/code/amxv/rag/lib/db/schema.ts:138-149`

2. **Session Extension**:
   - Update `createTRPCContext()` to include role from session
   - Modify `/Users/ashray/code/amxv/rag/lib/auth.ts` session structure

3. **Middleware Creation**:
   - Add `adminProcedure` to `/Users/ashray/code/amxv/rag/trpc/init.ts`
   - Use pattern similar to `protectedProcedure` (lines 120-135)

4. **Router Creation**:
   - Create `/Users/ashray/code/amxv/rag/trpc/routers/users.router.ts`
   - Register in `/Users/ashray/code/amxv/rag/trpc/routers/_app.ts`

---

## Summary: Router Registration Flow

```
1. User makes request to /api/trpc
   ↓
2. Handler in app/api/trpc/[trpc]/route.ts routes to appRouter
   ↓
3. appRouter delegates to specific router (users, chat, etc)
   ↓
4. Router applies middleware (.use())
   ↓
5. Middleware checks authentication/authorization
   ↓
6. Input validation via Zod schema
   ↓
7. Procedure handler executes with ctx + input
   ↓
8. Response serialized via superjson
   ↓
9. Client receives type-safe result
```

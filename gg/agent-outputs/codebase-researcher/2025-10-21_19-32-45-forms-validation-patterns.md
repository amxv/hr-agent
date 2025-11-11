# Research: Forms, Input Validation, and User Input Handling Patterns

**Date**: 2025-10-21
**Research Focus**: Comprehensive analysis of form components, validation approaches, error handling, and async operations for building an admin dashboard with user management

---

## Executive Summary

The codebase uses a modern, type-safe form architecture combining **react-hook-form**, **Zod**, and **tRPC** for client-side form handling with server-side mutations. Input validation is declarative using Zod schemas, error handling leverages react-hook-form's built-in error state management, and async operations are managed through tRPC mutations with React Query (TanStack Query).

---

## 1. Form Component Architecture

### 1.1 Form Component Library

The application uses **shadcn/ui** form components built on top of react-hook-form primitives.

**Key Files**:
- `/Users/ashray/code/amxv/agentdune-chat/components/ui/form.tsx` - Form component wrapper
- `/Users/ashray/code/amxv/agentdune-chat/components/ui/input.tsx` - Input component
- `/Users/ashray/code/amxv/agentdune-chat/components/ui/label.tsx` - Label component
- `/Users/ashray/code/amxv/agentdune-chat/components/ui/textarea.tsx` - Textarea component
- `/Users/ashray/code/amxv/agentdune-chat/components/ui/button.tsx` - Button component

### 1.2 Form Component Structure (form.tsx:1-165)

The form system provides a composable, accessible API:

```
FormProvider (from react-hook-form)
  ├── FormField - Individual field wrapper with Controller
  ├── FormItem - Container with unique ID generation
  ├── FormLabel - Accessible label with error state styling
  ├── FormControl - Controlled input wrapper (using Radix Slot)
  ├── FormDescription - Optional field description
  └── FormMessage - Error message display from validation
```

**Key Implementation Details**:

1. **FormField Component** (form.tsx:32-41)
   - Wraps react-hook-form's Controller
   - Provides FormFieldContext to child components
   - Enables type-safe field access

2. **useFormField Hook** (form.tsx:43-64)
   - Extracts field state from react-hook-form context
   - Returns field metadata: id, name, formItemId, formDescriptionId, formMessageId
   - Also returns fieldState with error, isDirty, isTouched, etc.

3. **FormControl** (form.tsx:105-120)
   - Uses Radix Slot pattern for flexible component composition
   - Connects aria-describedby to error/description IDs
   - Sets aria-invalid based on error state
   - Assigns the unique formItemId

4. **FormMessage** (form.tsx:135-153)
   - Automatically displays error?.message from field state
   - Only renders if error exists or custom children provided
   - Applies destructive styling (red color)

5. **FormLabel** (form.tsx:88-103)
   - Applies destructive styling when error present
   - Uses data-error attribute for CSS selectors
   - Associates htmlFor with formItemId

### 1.3 Input Component (input.tsx:5-21)

```typescript
const Input = ({ className, type, ...props }: React.ComponentProps<'input'>) => (
  <input
    className={cn(
      'flex h-9 w-full min-w-0 rounded-xl border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] ...',
      'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
      'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
      className,
    )}
    data-slot="input"
    type={type}
    {...props}
  />
);
```

**Features**:
- Rounded corners (rounded-xl)
- Focus ring styling with 3px width
- aria-invalid styling (red border/ring when error)
- Dark mode support with reduced opacity
- Placeholder text styling
- Disabled state styling
- File input styling for file uploads

---

## 2. Input Validation Approaches

### 2.1 Validation Library: Zod

**Package**: `zod@^4.1.4`
**Integration**: `@hookform/resolvers@^5.2.1` for react-hook-form integration

Zod is used throughout the codebase for declarative schema validation.

### 2.2 Validation Pattern in tRPC Routers

**File**: `/Users/ashray/code/amxv/agentdune-chat/trpc/routers/chat.router.ts`

Example from chat.router.ts (lines 58-61):
```typescript
getChatById: protectedProcedure
  .input(
    z.object({
      chatId: z.string().uuid(),
    })
  )
  .query(async ({ ctx, input }) => {
    // Handler implementation
  }),
```

Example from chat.router.ts (lines 96-100):
```typescript
renameChat: protectedProcedure
  .input(
    z.object({
      chatId: z.string().uuid(),
      title: z.string().min(1).max(255),
    })
  )
  // Mutation handler
```

**Zod Patterns Used**:
- `z.string()` - Basic string validation
- `z.string().uuid()` - UUID format validation
- `z.string().min(1).max(255)` - Length constraints
- `z.object({ ... })` - Object schema composition
- Type narrowing with discriminated unions

### 2.3 Error Handling in tRPC (init.ts:45-56)

The tRPC context includes error formatting for Zod validation:

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

**Flow**:
1. Zod validates input on mutation call
2. If validation fails, TRPCError is thrown with ZodError in cause
3. errorFormatter extracts zodError and flattens it
4. Client receives structured validation errors with field-level details

---

## 3. Form Implementation Pattern

### 3.1 Typical Form Structure

Based on existing patterns in the codebase (login-form.tsx, signup-form.tsx), forms follow this pattern:

**Basic Form Pattern**:
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Define schema
const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof formSchema>;

export function MyForm() {
  // Initialize form with validation
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Handle async submission
  const onSubmit = async (values: FormValues) => {
    try {
      // Call server action or tRPC mutation
      const result = await mutation(values);
      // Handle success
    } catch (error) {
      // Handle error
    }
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
                  placeholder="name@example.com"
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

        <Button type="submit" className="w-full">
          Submit
        </Button>
      </form>
    </Form>
  );
}
```

### 3.2 Key React Hook Form Concepts

**Resolver**:
- Connects Zod schema to react-hook-form
- Validates entire form against schema on submit/blur/change
- Returns field-level errors

**Field Control**:
- `form.control` - Form control instance passed to FormField
- `form.handleSubmit(onSubmit)` - Prevents submission if validation fails
- `form.formState` - Tracks form state (isSubmitting, isValid, errors, etc.)

**Field Rendering**:
- Uses render prop pattern for flexible field composition
- Each field gets a spread operator on the `field` object
- Includes value, onChange, onBlur, ref handlers

---

## 4. Error Handling and Display

### 4.1 Error Display in FormMessage Component

**File**: `components/ui/form.tsx` lines 135-153

The FormMessage component handles error display:
1. Extracts error from useFormField hook
2. Returns null if no error
3. Displays error?.message automatically
4. Applied destructive text styling (red)

### 4.2 aria-invalid Styling

Both Input and FormControl set aria-invalid based on error state:
- `aria-invalid={!!error}` on FormControl (form.tsx:114)
- `aria-invalid:border-destructive` styling on Input (input.tsx:11)

This provides visual feedback without custom error UI.

### 4.3 Toast Notifications for Async Errors

**Library**: `sonner@^2.0.7`

**Implementation** (layout.tsx):
```typescript
import { Toaster } from "sonner";
// In layout:
<Toaster position="top-center" />
```

**Usage Pattern**:
```typescript
import { toast } from "sonner";

// In component/mutation handler:
try {
  await mutation(data);
  toast.success("Operation successful!");
} catch (error) {
  toast.error("Failed to save. Please try again.");
}
```

**Examples in Codebase**:
- share-button.tsx: `toast.success("Share link copied to clipboard")`
- clone-chat-button.tsx: `toast.error("Failed to save chat. Please try again.")`
- providers/default-model-provider.tsx: `toast.error("Failed to save model preference")`

---

## 5. Submit Handlers and Async Operations

### 5.1 tRPC Mutation Pattern

**Library**: `@trpc/client@^11.1.2`, `@tanstack/react-query@5.75.1`

tRPC provides type-safe mutations for server operations.

**tRPC Router Example** (chat.router.ts:96-110):
```typescript
renameChat: protectedProcedure
  .input(
    z.object({
      chatId: z.string().uuid(),
      title: z.string().min(1).max(255),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Validate ownership
    const chat = await getChatById({ id: input.chatId });
    if (!chat || chat.userId !== ctx.user.id) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Chat not found",
      });
    }

    // Update database
    await updateChatTitleById({
      id: input.chatId,
      title: input.title,
    });

    return { success: true };
  }),
```

### 5.2 Protected Procedures and Authorization

**File**: `/Users/ashray/code/amxv/agentdune-chat/trpc/init.ts` lines 120-135

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
      user: { id, ...rest },
    },
  });
});
```

**Pattern**:
1. Middleware checks if user exists
2. Throws UNAUTHORIZED if not authenticated
3. Guarantees ctx.user is non-nullable inside procedure
4. All admin operations will use this for authorization

### 5.3 Context Access in Procedures

**File**: `/Users/ashray/code/amxv/agentdune-chat/trpc/init.ts` lines 29-34

```typescript
export const createTRPCContext = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return {
    user: session?.user,
  };
});
```

**Available in Procedures**:
- `ctx.user` - Current authenticated user (null if not logged in)
- `ctx.user.id` - User ID (guaranteed non-null in protectedProcedure)
- Any other context data needed

### 5.4 Client-Side Mutation Usage (React Component)

Using tRPC with React Query (from `trpc/react.tsx`):

```typescript
import { useTRPC } from '@/trpc/react';

export function ChatRenameForm() {
  const trpc = useTRPC();
  const utils = trpc.useUtils();

  // Create mutation
  const renameMutation = trpc.chat.renameChat.useMutation({
    onSuccess: () => {
      // Invalidate and refetch related queries
      void utils.chat.getAllChats.invalidate();
      toast.success("Chat renamed!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to rename chat");
    },
  });

  const handleSubmit = async (values: FormValues) => {
    await renameMutation.mutate({
      chatId: values.chatId,
      title: values.title,
    });
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      {/* Form fields */}
      <Button
        type="submit"
        disabled={renameMutation.isPending}
      >
        {renameMutation.isPending ? "Saving..." : "Rename"}
      </Button>
    </form>
  );
}
```

### 5.5 Server Actions Pattern

**File**: `/Users/ashray/code/amxv/agentdune-chat/app/(chat)/actions.ts`

Alternative to tRPC for server operations:

```typescript
"use server";

export async function generateTitleFromUserMessage({
  message,
}: {
  message: ChatMessage;
}) {
  const { text: title } = await generateText({
    model: getLanguageModel(DEFAULT_TITLE_MODEL),
    system: "...",
    prompt: JSON.stringify(message),
    experimental_telemetry: { isEnabled: true },
  });

  return title;
}
```

**Usage**:
- Mark function with "use server"
- Call directly from client components (implicit RPC)
- Returns promise that resolves with result

---

## 6. Authentication and Session Management

### 6.1 Authentication Setup

**Library**: `better-auth@^1.3.27`

**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/auth.ts`

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

**Currently Supports**:
- OAuth: Google, GitHub
- Password-based: Will be modified for admin-only email/password auth

### 6.2 Session Access in tRPC

**File**: `/Users/ashray/code/amxv/agentdune-chat/trpc/init.ts` lines 29-34

```typescript
export const createTRPCContext = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return {
    user: session?.user,
  };
});
```

**User Object Fields** (lib/auth.ts:8-15):
- `id` - Unique user identifier
- `name` - User display name
- `email` - User email
- `image` - User avatar URL

---

## 7. Database Schema for Users

### 7.1 User Table

**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` lines 138-149

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

**Current Structure**:
- id: Primary key (text from better-auth)
- email: Unique email address
- name: User display name
- emailVerified: Boolean flag
- image: Avatar URL
- createdAt/updatedAt: Timestamps with auto-updates

### 7.2 Account Table (for OAuth)

**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` lines 166-184

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
  password: text("password"), // ← Passwords stored here
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
});
```

**Note**: Password field exists here in account table, managed by better-auth

### 7.3 Session Table

**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` lines 151-164

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

---

## 8. UI Button Component (SubmitButton Pattern)

### 8.1 Submit Button with Loading State

**File**: `/Users/ashray/code/amxv/agentdune-chat/components/submit-button.tsx`

```typescript
'use client';

import { useFormStatus } from 'react-dom';
import { LoaderIcon } from '@/components/icons';
import { Button } from './ui/button';

export function SubmitButton({
  children,
  isSuccessful,
}: {
  children: React.ReactNode;
  isSuccessful: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      aria-disabled={pending || isSuccessful}
      className="relative"
      disabled={pending || isSuccessful}
      type={pending ? "button" : "submit"}
    >
      {children}

      {(pending || isSuccessful) && (
        <span className="absolute right-4 animate-spin">
          <LoaderIcon />
        </span>
      )}

      <output aria-live="polite" className="sr-only">
        {pending || isSuccessful ? "Loading" : "Submit form"}
      </output>
    </Button>
  );
}
```

**Features**:
- Uses React 19's useFormStatus hook for form submission state
- Disables button while pending
- Shows loading spinner
- Accessible live region for screen readers
- Conditionally sets type="button" while pending

### 8.2 Button Component (ui/button.tsx)

**Features**:
- CVA-based variants (default, destructive, outline, secondary, ghost, link)
- Multiple sizes (default, sm, lg, icon)
- Focus visible ring styling
- aria-invalid styling for error states
- Disabled state styling

---

## 9. Dashboard and Admin UI Patterns

### 9.1 Current UI Component Library

Available components for building admin dashboards:
- `Dialog` - For modal forms and confirmations
- `AlertDialog` - For confirmation dialogs
- `Sheet` - For side panel forms
- `Card` - For content grouping
- `Table` - For data display (note: react-data-grid is also available)
- `Button` - For actions
- `Input` - For form fields
- `Select` - For dropdowns
- `Checkbox` - For toggles
- `Tabs` - For organizing content
- `Scroll Area` - For scrollable content

### 9.2 Authentication Flow in Middleware

**File**: `/Users/ashray/code/amxv/agentdune-chat/middleware.ts`

Middleware is used for protecting routes and redirecting based on auth status.

**Current Setup** (based on better-auth):
- Routes under `(auth)/` handle login/signup
- Session check available via `auth.api.getSession()`
- Can redirect unauthenticated users to login

---

## 10. Dependencies Summary for Form Implementation

### Core Libraries
- **react-hook-form@^7.62.0** - Form state management
- **zod@^4.1.4** - Schema validation
- **@hookform/resolvers@^5.2.1** - Integration layer
- **better-auth@^1.3.27** - Authentication
- **@trpc/client@^11.1.2** - Type-safe RPC
- **@tanstack/react-query@5.75.1** - Server state management
- **sonner@^2.0.7** - Toast notifications

### UI Components
- **@radix-ui/react-*** - Headless UI primitives
- **lucide-react@^0.542.0** - Icons
- **tailwindcss@^4.1.12** - Styling

### Database
- **drizzle-orm@^0.34.0** - ORM
- **postgres@^3.4.4** - PostgreSQL driver

---

## 11. Key Patterns for Admin Dashboard Implementation

### 11.1 Protected Procedure Pattern

For admin-only mutations:
```typescript
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  // Check if user is admin (needs user.role field in DB)
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});
```

### 11.2 Form with Field-Level Validation

Example for user creation form:
```typescript
const createUserSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().optional(),
  name: z.string().min(1, "Name required"),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

export function CreateUserForm() {
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
  });

  // Form JSX with FormField components for each field
}
```

### 11.3 Mutation with Error Handling

```typescript
const createUserMutation = trpc.admin.createUser.useMutation({
  onSuccess: (newUser) => {
    toast.success(`User ${newUser.email} created successfully!`);
    utils.admin.getUsers.invalidate();
  },
  onError: (error) => {
    // Handle specific error codes
    if (error.data?.code === "BAD_REQUEST") {
      if (error.message.includes("email")) {
        form.setError("email", { message: "Email already exists" });
      }
    } else {
      toast.error(error.message || "Failed to create user");
    }
  },
});
```

---

## 12. Implementation Recommendations for Admin User Management

Based on the spec and codebase patterns:

### 12.1 Database Schema Additions Needed
- Add `role` field to user table (admin | user)
- Add `status` field to user table (active | inactive)
- Create password hashing for email/password auth

### 12.2 Form Components to Create
1. **LoginForm** - Email/password input (replace OAuth form)
2. **CreateUserForm** - Email, optional password, auto-generate option
3. **EditUserForm** - Edit email
4. **ResetPasswordForm** - Set new password
5. **UserListTable** - Display users with edit/delete/reset actions

### 12.3 tRPC Mutations Needed
```
admin.createUser(email, password?)
admin.editUser(userId, email)
admin.deleteUser(userId)
admin.resetPassword(userId, newPassword)
admin.getUsers()
```

### 12.4 Error Display Strategy
- Use FormMessage for field-level errors (email already exists)
- Use toast notifications for operation success/failure
- Use AlertDialog for destructive actions (delete user)

---

## References

### Key Files
- Form components: `/Users/ashray/code/amxv/agentdune-chat/components/ui/form.tsx`
- Auth setup: `/Users/ashray/code/amxv/agentdune-chat/lib/auth.ts`
- tRPC init: `/Users/ashray/code/amxv/agentdune-chat/trpc/init.ts`
- Chat router example: `/Users/ashray/code/amxv/agentdune-chat/trpc/routers/chat.router.ts`
- Database schema: `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts`
- Admin spec: `/Users/ashray/code/amxv/agentdune-chat/gg/features/001-admin-user-management/001-SPEC.md`

### Package Versions
- react-hook-form@7.62.0
- zod@4.1.4
- @hookform/resolvers@5.2.1
- better-auth@1.3.27
- @trpc/client@11.1.2
- @tanstack/react-query@5.75.1
- sonner@2.0.7

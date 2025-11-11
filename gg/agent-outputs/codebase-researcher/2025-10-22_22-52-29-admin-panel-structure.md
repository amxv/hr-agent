# Admin Panel Structure & Architecture Research

## Overview

The application has a fully functional admin panel located at the `/admin` route with a dedicated user management interface. The admin system is built using:

- **Next.js App Router** for page routing
- **tRPC** with custom admin procedures for backend API
- **Better Auth** with admin plugin for authentication and role management
- **Drizzle ORM** for database operations
- **shadcn/ui** component library for UI
- **React Hook Form + Zod** for form validation
- **Sonner** for toast notifications

## 1. Admin Routes & Structure

### Route Organization
- **Admin Layout**: `/Users/ashray/code/amxv/agentdune-chat/app/admin/layout.tsx` (lines 1-35)
  - Serves as the root layout for all admin pages
  - Wraps children with `TRPCReactProvider` and `SessionProvider`
  - Fetches session server-side using `auth.api.getSession()` for initial hydration

- **User Management Page**: `/Users/ashray/code/amxv/agentdune-chat/app/admin/users/page.tsx` (lines 1-15)
  - Simple page component that renders `UserListTable` component
  - Displays heading "User Management" with description
  - No explicit protection at the page level (relies on middleware and layout)

### URL Structure
```
/admin                      → Main admin route (protected by middleware)
/admin/users               → User management interface
```

## 2. Admin Route Protection

### Middleware-Level Protection
**File**: `/Users/ashray/code/amxv/agentdune-chat/middleware.ts` (lines 37-54)

The middleware enforces two-level authentication for `/admin` routes:

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

**Protection Flow**:
1. Check if user is logged in (line 42)
   - Redirect to `/login` if not authenticated
2. Check if user has "admin" role (line 47)
   - Redirect to `/?error=forbidden` if user is not an admin
3. Allow access if both conditions pass (line 53)

### tRPC Procedure-Level Protection
**File**: `/Users/ashray/code/amxv/agentdune-chat/trpc/init.ts` (lines 143-170)

The `adminProcedure` middleware ensures only authenticated admin users can call admin APIs:

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

**Protection Logic**:
- Line 145: Throws `UNAUTHORIZED` error if user is not logged in
- Line 149: Extracts user ID and role from context
- Line 157: Throws `FORBIDDEN` error if role is not "admin"
- Line 167: Returns narrowed context with role typed as literal "admin"

## 3. Admin Router & API Endpoints

**File**: `/Users/ashray/code/amxv/agentdune-chat/trpc/routers/admin.router.ts` (lines 1-259)

All procedures use `adminProcedure` for protection. The admin router provides 5 main operations:

### 3.1 List Users
**Lines 12-81**: `adminProcedure.query`

**Input Schema**:
- `searchValue?: string` - Text to search for
- `searchField?: "email" | "name"` - Which field to search
- `limit: 1-100` - Results per page (default 50)
- `offset: 0+` - Pagination offset (default 0)
- `filterField?: "role" | "status"` - Filter by role or status
- `filterValue?: string` - Value to filter by

**Output Format**:
```typescript
{
  users: Array<{
    id: string;
    email: string;
    name: string;
    role: "admin" | "user";
    status: "active" | "inactive";
    createdAt: Date;
    banned: boolean;
    banReason: string | null;
  }>;
  total: number;
}
```

**Implementation Details**:
- Uses Drizzle `ilike` operator for case-insensitive search (lines 29-32)
- Filters by role using `eq()` operator (line 37)
- Maps `banned` field to `status` "active"/"inactive" (lines 65-75)
- Returns total count for pagination (lines 58-63)

### 3.2 Create User
**Lines 83-133**: `adminProcedure.mutation`

**Input Schema**:
```typescript
{
  email: string (valid email)
  name: string (non-empty)
  password?: string (min 8 chars, optional)
  role: "admin" | "user" (default "user")
}
```

**Output**:
```typescript
{
  user: { id, email, name, role }
  generatedPassword?: string (if password was generated)
}
```

**Implementation Details**:
- Generates secure 16-character password if not provided (line 95)
- Calls `auth.api.createUser()` to integrate with Better Auth (line 99)
- Passes headers for Better Auth session context (line 106)
- Error handling for duplicate emails (lines 120-129)
- Returns generated password to admin if it was auto-generated (line 116)

### 3.3 Update User
**Lines 135-166**: `adminProcedure.mutation`

**Input Schema**:
```typescript
{
  userId: string
  email: string (valid email)
}
```

**Implementation Details**:
- Updates email directly via Drizzle ORM (line 146)
- Handles duplicate email errors (lines 152-164)
- Note: Name cannot be updated through this endpoint (limited functionality)

### 3.4 Deactivate User
**Lines 188-241**: `adminProcedure.mutation`

**Input**:
```typescript
{
  userId: string
}
```

**Business Logic**:
1. Prevent self-deactivation (lines 195-200)
   - Throws error if admin tries to deactivate themselves
2. Validate user exists (lines 204-214)
3. Last admin protection (lines 216-228)
   - Counts active admin users (line 220-221)
   - Prevents deactivating if only admin remains (line 223)
4. Uses ban system to deactivate (lines 232-238)
   - Calls `auth.api.banUser()` with reason

### 3.5 Reactivate User
**Lines 243-257**: `adminProcedure.mutation`

**Input**:
```typescript
{
  userId: string
}
```

**Implementation**:
- Calls `auth.api.unbanUser()` to reactivate (line 251)
- Simple reverse of deactivation process

### 3.6 Reset User Password
**Lines 168-186**: `adminProcedure.mutation`

**Input Schema**:
```typescript
{
  userId: string
  newPassword: string (min 8 chars)
}
```

**Implementation**:
- Calls `auth.api.setUserPassword()` from Better Auth admin API (line 177)
- Passes headers for session context (line 182)

## 4. Admin Components

### Component Library
All components use **shadcn/ui** with Tailwind CSS styling:
- Card, CardContent, CardDescription, CardHeader, CardTitle
- Button, Input, Dialog, AlertDialog, Badge, Table, Form
- Form validation via React Hook Form + Zod

### 4.1 User List Table
**File**: `/Users/ashray/code/amxv/agentdune-chat/components/admin/user-list-table.tsx`

**Purpose**: Main display component for users with search and actions

**Key Features**:
- Real-time search by email (line 28)
- Displays user count (line 50)
- "Add User" button that opens create dialog (line 52)
- Table columns: Email, Name, Role, Status, Created, Actions
- Uses TanStack React Query for data fetching (line 32)
- Manual refetch key pattern for invalidation (lines 29, 41-43)

**Data Flow**:
```
UserListTable renders
  → useQuery() fetches users via trpc.admin.listUsers
  → maps users to table rows
  → renders UserActions component for each row
  → invalidate() function triggers refetch on mutations
```

**Role & Status Badges** (lines 99-114):
- Role: "admin" = default variant, "user" = secondary variant
- Status: "active" = default variant, "inactive" = destructive variant

### 4.2 User Actions
**File**: `/Users/ashray/code/amxv/agentdune-chat/components/admin/user-actions.tsx`

**Purpose**: Action buttons for each user (Edit, Reset Password, Deactivate/Reactivate)

**UI Components**:
- Edit button → opens EditUserDialog
- Reset Password button → opens ResetPasswordDialog
- Deactivate/Reactivate button → conditional display
  - Shows "Deactivate" for active users (destructive variant)
  - Shows "Reactivate" for inactive users (default variant)

**Deactivate UX** (lines 86-111):
- Uses AlertDialog for confirmation
- Shows title and description
- Cancel/Confirm buttons
- Shows loading state during mutation (line 104)

**Error Handling**:
- Toast notifications on success/failure (lines 47, 52, 62, 66)
- Type-safe error handling (line 51, 65)

### 4.3 Create User Dialog
**File**: `/Users/ashray/code/amxv/agentdune-chat/components/admin/create-user-dialog.tsx`

**Purpose**: Form dialog to add new users

**Form Fields**:
1. Email (required, valid email)
2. Name (required, non-empty)
3. Role (dropdown: user/admin)
4. Generate Password checkbox (default true)
5. Custom Password field (hidden if generate=true, min 8 chars)

**Form Validation Schema** (lines 30-45):
- Uses Zod with conditional password validation
- Refine() to validate password length or generation checkbox
- Email and name are always required

**UI Pattern** (lines 174-208):
- Conditional rendering of password field
- Uses `form.watch("generatePassword")` to show/hide password input
- Dialog trigger accepts children for custom button

**Success Behavior** (lines 84-92):
- Shows generated password in toast with 10-second duration (line 85)
- Resets form after closing (line 93)
- Calls onSuccess callback to invalidate user list (line 91)

**Error Handling**:
- Maps email errors to form field error (line 97)
- Generic toast error fallback (line 99)

### 4.4 Edit User Dialog
**File**: `/Users/ashray/code/amxv/agentdune-chat/components/admin/edit-user-dialog.tsx`

**Purpose**: Update user email

**Form Fields**:
- Email field (required, valid email)

**Limitation**: Only allows editing email, not name or other fields

**Success Flow**:
- Toast success notification (line 76)
- Calls onSuccess to invalidate list (line 77)
- Closes dialog (line 78)

### 4.5 Reset Password Dialog
**File**: `/Users/ashray/code/amxv/agentdune-chat/components/admin/reset-password-dialog.tsx`

**Purpose**: Set new password for user

**Form Fields**:
1. New Password (required, min 8 chars)
2. Confirm Password (required, must match)

**Validation Schema** (lines 29-37):
- Uses Zod refine() to enforce password matching
- Error shows on confirmPassword field (line 36)

**Success Flow**:
- Toast notification (line 83)
- Resets form (line 86)
- Invalidates list (line 84)
- Closes dialog (line 85)

## 5. Authentication & Role Management

### Better Auth Configuration
**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/auth.ts`

**Admin Plugin Setup** (lines 38-42):
```typescript
plugins: [
  nextCookies(),
  admin({
    defaultRole: "user",           // New users get "user" role
    adminRoles: ["admin"],         // Define what roles are admin
    impersonationSessionDuration: 60 * 60,
  }),
],
```

**Session Type** (lines 9-19):
```typescript
export type Session = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;  // "admin" | "user"
    banned?: boolean | null;
  };
  expires?: string;
};
```

### Database Schema
**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` (lines 138-153)

**User Table Columns**:
```typescript
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")...notNull(),
  role: text("role"),              // Stores "admin" or "user"
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});
```

**Role Storage**:
- Stored as plain text in `role` column (line 149)
- Can be null (line 149)
- Better Auth handles setting role via admin API

### Context Creation
**File**: `/Users/ashray/code/amxv/agentdune-chat/trpc/init.ts` (lines 29-34)

```typescript
export const createTRPCContext = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return {
    user: session?.user,
  };
});
```

**Context includes full user object from Better Auth session**, including the `role` field populated from the database.

## 6. UI Patterns & Component Library

### Design System
- **Component Library**: shadcn/ui (Radix UI + Tailwind CSS)
- **Form Library**: React Hook Form + Zod validation
- **Toast Notifications**: Sonner
- **Data Fetching**: TanStack React Query + tRPC
- **Styling**: Tailwind CSS utility classes

### Common Patterns

#### 1. Dialog Pattern (Used in Create, Edit, Reset)
```typescript
<Dialog onOpenChange={setOpen} open={open}>
  <DialogTrigger asChild>{children}</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
    {/* Form content */}
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button type="submit">Action</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### 2. Form Pattern (All dialogs)
```typescript
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: {...},
});

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="fieldName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Label</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

#### 3. Data Fetching Pattern
```typescript
const trpc = useTRPC();
const { data, isLoading, error } = useQuery({
  ...trpc.admin.listUsers.queryOptions({...}),
});
```

#### 4. Mutation Pattern
```typescript
const trpcClient = useTRPCClient();
const handleAction = async () => {
  try {
    await trpcClient.admin.deactivateUser.mutate({...});
    toast.success("Success!");
    onSuccess(); // Invalidate list
  } catch (error) {
    toast.error(error.message);
  }
};
```

#### 5. Badge Pattern
```typescript
<Badge variant={condition ? "default" : "secondary"}>
  {value}
</Badge>
```

#### 6. Confirmation Dialog Pattern
```typescript
<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogTrigger asChild>
    <Button>Trigger</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirm?</AlertDialogTitle>
      <AlertDialogDescription>Description</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirm}>
        Confirm
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## 7. Data Flow Diagram

```
User navigates to /admin
  ↓
Middleware checks:
  1. Is user logged in? (No → redirect to /login)
  2. Does user have admin role? (No → redirect to /?error=forbidden)
  3. Allow access
  ↓
AdminLayout fetches session server-side
  ↓
Admin page renders UserListTable
  ↓
UserListTable:
  - useQuery() calls trpc.admin.listUsers
  - tRPC runs adminProcedure middleware:
    * Checks ctx.user exists
    * Checks ctx.user.role === "admin"
    * Throws FORBIDDEN if not admin
  - Returns user list + total count
  - Renders Table with BadgeRole/Status
  - Renders UserActions for each row
  ↓
User clicks action:
  - Edit: Opens EditUserDialog → calls admin.updateUser.mutate()
  - Reset Password: Opens ResetPasswordDialog → calls admin.resetUserPassword.mutate()
  - Deactivate: Shows AlertDialog → calls admin.deactivateUser.mutate()
  - Reactivate: Direct button → calls admin.reactivateUser.mutate()
  ↓
On mutation success:
  - Toast notification shown
  - onSuccess() callback triggers refetch of list
  - Dialog closes (if applicable)
```

## 8. Existing Admin Features Summary

| Feature | Location | Protection | Status |
|---------|----------|-----------|--------|
| User List | `/admin/users` | Middleware + tRPC | ✅ Implemented |
| Create User | Dialog in UserListTable | adminProcedure | ✅ Implemented |
| Edit User (Email) | Dialog in UserActions | adminProcedure | ✅ Implemented |
| Reset Password | Dialog in UserActions | adminProcedure | ✅ Implemented |
| Deactivate User | AlertDialog in UserActions | adminProcedure + business logic | ✅ Implemented |
| Reactivate User | Button in UserActions | adminProcedure | ✅ Implemented |
| Search by Email | Input in UserListTable | None (filtered client-side via query) | ✅ Implemented |

## 9. Key Architectural Decisions

### Protection Strategy (Defense in Depth)
1. **Middleware-level**: Blocks non-authenticated and non-admin users at request level
2. **tRPC-level**: Validates role again in adminProcedure
3. **Business-logic**: Additional checks (e.g., prevent self-deactivation, last admin protection)

### Reason for Multi-Layer Protection:
- Middleware prevents unauthorized access to pages
- tRPC validates API calls independently (in case of direct API calls)
- Business logic prevents dangerous operations (last admin deletion, self-deactivation)

### Error Handling Strategy
- **Authentication failures**: tRPC throws `UNAUTHORIZED`
- **Authorization failures**: tRPC throws `FORBIDDEN` with message
- **Business logic errors**: tRPC throws `BAD_REQUEST` with descriptive message
- **UI notifications**: All mutations show toast notifications (success or error)

### Data Invalidation Pattern
Manual refetch key pattern (lines 29, 41-43 in user-list-table.tsx):
```typescript
const [refetchKey, setRefetchKey] = useState(0);

const invalidate = () => {
  setRefetchKey((prev) => prev + 1);
};
```

This forces React Query to refetch because the query key changes.

## 10. Extension Points for New Admin Features

### To add a new admin feature:

1. **Create tRPC procedure** in `admin.router.ts`:
   ```typescript
   myNewFeature: adminProcedure
     .input(z.object({...}))
     .mutation/query(async ({ input, ctx }) => {
       // ctx.user is guaranteed to be admin
     })
   ```

2. **Create UI components** in `/components/admin/`:
   - Follow the Dialog pattern for forms
   - Use Form + Zod for validation
   - Use toasts for feedback

3. **Create page or section** in `/app/admin/`:
   - Components auto-protected by middleware

4. **Add router to app router** in `/trpc/routers/_app.ts`:
   ```typescript
   myFeature: myFeatureRouter
   ```

### No additional protection needed - automatically covered by:
- Middleware at `/admin/*` routes
- `adminProcedure` middleware on all tRPC calls
- Better Auth session integration

## 11. Current Limitations & Gaps

1. **Email-only user editing**: EditUserDialog only allows email updates
2. **No user role management UI**: Cannot change user role to/from admin
3. **No user deletion**: Only deactivation via ban system
4. **No pagination UI**: listUsers supports offset/limit but table shows all results
5. **No role/status filtering UI**: Backend supports filtering but no UI controls
6. **No admin impersonation**: Better Auth supports it but not exposed in UI
7. **No audit logs**: No tracking of admin actions
8. **No bulk operations**: All operations are single-user

These can be extended without changing the core architecture.

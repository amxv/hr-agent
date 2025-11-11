# Admin Panel Structure Analysis

## Analysis: AgentDune Chat Admin Panel

### Overview

The admin panel is a comprehensive management interface built with Next.js 15 App Router, tRPC for type-safe API calls, and shadcn/ui components. It provides full CRUD functionality for user and document management with role-based access control. The architecture follows modern React patterns with server components, client-side state management via TanStack Query, and real-time UI updates through optimistic mutations and invalidation strategies.

---

## 1. Routing Architecture

### Entry Points

- **Main Admin Route**: `/app/admin/page.tsx:3-5`
  - Redirects to `/admin/users` by default
  - Simple redirect implementation using Next.js `redirect()`

- **Users Management**: `/app/admin/users/page.tsx:1-19`
  - Route: `/admin/users`
  - Renders `UserListTable` component
  - Includes page header with title and description

- **Documents Management**: `/app/admin/documents/page.tsx:1-19`
  - Route: `/admin/documents`
  - Renders `DocumentListTable` component
  - Includes page header with title and description

### Route Group Structure

The admin panel uses Next.js route groups with the `(admin)` folder:
- `/app/(admin)/` - Contains admin-specific API routes
- `/app/admin/` - Contains admin UI pages

This separation allows for different middleware/layout handling between API routes and UI pages.

---

## 2. Layout Components

### Admin Layout (`/app/admin/layout.tsx`)

**Core Implementation** (lines 7-44):

```typescript
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const raw = await auth.api.getSession({ headers: await headers() });
  // Session transformation at lines 13-29

  return (
    <TRPCReactProvider>
      <SessionProvider initialSession={session}>
        <div className="flex h-screen w-full overflow-hidden">
          <AdminSidebarNav />
          <div className="mt-3 mr-3 flex h-[calc(100%-1.5rem)] w-full flex-1 flex-col gap-2 overflow-y-auto rounded-[2rem] border border-primary/40 bg-white/75 shadow-lg shadow-primary/60 md:px-4 md:pb-10 dark:border-neutral-700 dark:bg-neutral-900">
            {children}
            <div className="h-8 md:h-12" />
          </div>
        </div>
      </SessionProvider>
    </TRPCReactProvider>
  );
}
```

**Key Features**:
- Server-side session fetching at line 12 using Better Auth
- Session data transformation (lines 13-29) to match expected shape
- Providers wrapped around children (tRPC and Session)
- Two-column layout: sidebar + main content area
- Responsive design with mobile considerations

### Admin Sidebar Navigation (`/components/admin/admin-sidebar-nav.tsx`)

**Navigation Configuration** (lines 44-69):

```typescript
const links = [
  {
    label: "Users",
    href: "/admin/users" as Route,
    icon: <Users className="h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200" />
  },
  {
    label: "Documents",
    href: "/admin/documents" as Route,
    icon: <FileText className="h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200" />
  }
];

const bottomLinks = [
  {
    label: "Home",
    href: "/" as Route,
    icon: <Home className="h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200" />
  }
];
```

**Sidebar Component Architecture** (`/components/admin/admin-sidebar.tsx`):

1. **Context Pattern** (lines 23-35):
   - `AdminSidebarContext` provides sidebar state management
   - Custom hook `useAdminSidebar()` for accessing context
   - Enforces usage within provider boundary

2. **Desktop Sidebar** (lines 85-106):
   - Animated width transition using Framer Motion
   - Expands from 75px to 220px on hover
   - Auto-expand/collapse behavior
   - Hidden on mobile (md:flex)

3. **Mobile Sidebar** (lines 109-156):
   - Full-screen overlay drawer
   - Slide-in animation from left
   - Hamburger menu trigger
   - Only visible on mobile (<md)

4. **Active Link Detection** (lines 158-204):
   - Uses `usePathname()` to detect current route
   - Applies active styling with primary colors
   - Smart path matching: exact match for "/" or starts-with for nested routes

---

## 3. User Management CRUD Patterns

### List View (`/components/admin/user-list-table.tsx`)

**Data Fetching Pattern** (lines 33-40):

```typescript
const { data, isLoading, error } = useQuery({
  ...trpc.admin.listUsers.queryOptions({
    searchValue: searchValue || undefined,
    searchField: "email" as const,
    limit: 50,
    offset: 0,
  }),
});
```

**Features**:
- TanStack Query integration with tRPC query options
- Real-time search with debouncing via controlled input
- Skeleton loading states (lines 68-109)
- Pagination support (limit/offset parameters)
- Cache invalidation callback pattern (lines 42-44)

**Table Columns** (lines 116-123):
1. Email
2. Name
3. Role (admin/user badge)
4. Status (active/inactive badge)
5. Credits (formatted with locale string)
6. Created date
7. Actions dropdown

### Create User (`/components/admin/create-user-dialog.tsx`)

**Form Schema** (lines 30-45):

```typescript
const createUserSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    name: z.string().min(1, "Name is required"),
    generatePassword: z.boolean().default(true),
    password: z.string().min(8).optional(),
    role: z.enum(["user", "admin"]).default("user"),
  })
  .refine(
    (data) =>
      data.generatePassword || (data.password && data.password.length >= 8),
    {
      message: "Password must be at least 8 characters",
      path: ["password"],
    }
  );
```

**Form Features**:
- React Hook Form with Zod validation (line 62)
- Auto-generated secure passwords option (lines 173-188)
- Conditional password field rendering (lines 190-208)
- Role selection dropdown (lines 152-170)
- Success callback pattern for list refresh (line 91)

**Submission Flow** (lines 74-104):
1. Validate form data with Zod schema
2. Call `trpc.admin.createUser.mutate()` at line 77
3. Handle generated password display in toast (lines 84-87)
4. Show error with field-specific validation (lines 96-98)
5. Reset form and close dialog on success (lines 92-93)

### Update User (`/components/admin/edit-user-dialog.tsx`)

**Simplified Update Pattern** (lines 69-89):
- Only allows email updates currently
- Pre-populates form with existing data (lines 60-65)
- Mutation call at line 72: `trpc.admin.updateUser.mutate()`
- Duplicate email error handling (lines 80-83)

### Reset Password (`/components/admin/reset-password-dialog.tsx`)

**Password Reset Schema** (lines 29-37):

```typescript
const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
```

**Features**:
- Password confirmation validation
- Minimum 8 character requirement
- Clear UX with password/confirm fields
- Mutation at line 79: `trpc.admin.resetUserPassword.mutate()`

### User Actions (`/components/admin/user-actions.tsx`)

**Action Types** (lines 37-124):

1. **Edit** (lines 74-78):
   - Opens `EditUserDialog` with current user data
   - Uses render props pattern for trigger

2. **Reset Password** (lines 80-84):
   - Opens `ResetPasswordDialog`
   - Admin can set new password for user

3. **Deactivate/Reactivate** (lines 86-121):
   - Conditional rendering based on user status
   - Alert dialog for destructive action confirmation
   - Different mutations for deactivate vs reactivate
   - Loading states during mutation

**State Management**:
- Local state for dialogs and loading (lines 38-40)
- Separate loading states for deactivate/reactivate
- Success callback triggers parent re-fetch

---

## 4. Document Management CRUD Patterns

### List View (`/components/admin/document-list-table.tsx`)

**Data Fetching** (lines 38-44):

```typescript
const { data, isLoading, error } = useQuery({
  ...trpc.admin.documents.list.queryOptions({
    searchTerm: searchValue || undefined,
    limit: 50,
    offset: 0,
  }),
});
```

**Advanced Invalidation Pattern** (lines 46-63):

```typescript
const invalidate = async () => {
  // Invalidate all document queries (list and tags) to ensure UI updates
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as unknown[];
      // tRPC query keys are arrays like: [["admin", "documents", "list"], {...}]
      if (Array.isArray(queryKey) && queryKey.length > 0) {
        const path = queryKey[0] as string[];
        return (
          Array.isArray(path) &&
          path[0] === "admin" &&
          path[1] === "documents"
        );
      }
      return false;
    },
  });
};
```

This pattern invalidates ALL document-related queries, ensuring tags list and document list stay in sync.

**Refresh Status Feature** (lines 65-77):
- Manual status refresh button
- Calls `trpc.admin.documents.refreshStatus.mutate()`
- Shows loading spinner during refresh
- Updates processing documents to current status

**Table Columns** (lines 177-184):
1. Filename
2. Status (with badge and error tooltip)
3. Tags (array of badges or "No tags")
4. File size (formatted)
5. Upload date
6. Actions dropdown

### Upload Document (`/components/admin/upload-document-dialog.tsx`)

**File Upload Configuration** (lines 62-72):

```typescript
const { getRootProps, getInputProps, isDragActive } = useDropzone({
  onDrop,
  accept: {
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "text/plain": [".txt"],
    "text/markdown": [".md"],
  },
  maxSize: 512 * 1024 * 1024, // 512 MB
});
```

**Multi-File Upload Pattern** (lines 118-173):

1. **Initialization** (lines 126-132):
   - Creates initial status map for all files
   - Sets all to "pending" status

2. **Parallel Upload** (lines 135-138):
   - Uses `Promise.allSettled()` for concurrent uploads
   - Handles partial success scenarios

3. **Individual File Upload** (lines 74-116):
   - FormData construction at lines 84-86
   - Fetch to `/api/documents/upload` at line 88
   - Status updates during upload lifecycle
   - Error capture per file

4. **Results Handling** (lines 140-170):
   - Counts successes and failures
   - Different toast messages based on outcome
   - Auto-close dialog after full success
   - Keeps dialog open on partial failure for review

**Visual Progress Tracking** (lines 195-203):

```typescript
const getUploadProgress = () => {
  if (uploadStatuses.size === 0) return 0;
  const completed = Array.from(uploadStatuses.values()).filter(
    (status) => status.status === "success" || status.status === "error"
  ).length;
  return (completed / uploadStatuses.size) * 100;
};
```

**File Status Indicators** (lines 307-322):
- Pending: Empty circle
- Uploading: Spinning loader
- Success: Green checkmark
- Error: Red alert icon with error message

### Update Document (`/components/admin/update-document-dialog.tsx`)

**Update Flow** (lines 75-108):

1. **Pre-Update Validation** (lines 76-79):
   - Ensures file is selected before proceeding

2. **FormData Preparation** (lines 84-86):
   - New file
   - Tags (JSON stringified)

3. **API Call** (lines 88-96):
   - POST to `/api/documents/${documentId}/update`
   - Includes file and tags in FormData

4. **Success Handling** (lines 98-101):
   - Success toast
   - Triggers parent refresh via `onSuccess()`
   - Closes dialog
   - Clears file selection

**Warning Alert** (lines 132-139):
- Shows current filename being replaced
- Warns about vector store replacement
- Uses Alert component for visibility

### Document Actions (`/components/admin/document-actions.tsx`)

**Action Menu** (lines 110-146):

1. **View Document** (lines 119-128):
   - Opens document in new tab
   - Uses `blobUrl` from database
   - External link icon

2. **Update** (lines 129-132):
   - Opens update dialog
   - Passes current filename and tags

3. **Edit Tags** (lines 133-136):
   - Opens inline tags editor
   - Uses autocomplete with existing tags

4. **Delete** (lines 137-144):
   - Shows confirmation dialog
   - Destructive styling
   - Removes from vector store and deletes file

**Tags Editor Dialog** (lines 184-215):
- Temporary state for tag editing (line 62)
- `DocumentTagsInput` component for UX
- Save/Cancel actions
- Mutation at line 91: `trpc.admin.documents.updateTags.mutate()`

**Processing State Handling** (lines 105-106):
- Disables all actions during upload/processing
- Prevents concurrent modifications

### Document Tags Input (`/components/admin/document-tags-input.tsx`)

**Auto-Suggest Pattern** (lines 61-102):

1. **Filtered Suggestions** (lines 61-65):
   - Excludes already-selected tags
   - Case-insensitive search
   - Powered by Command component

2. **Popover Integration** (lines 69-102):
   - Opens on input
   - Shows matching suggestions
   - Click to add tag

**Keyboard Interaction** (lines 48-59):
- Enter or comma to add tag
- Backspace on empty input removes last tag
- Trim and deduplication logic

**Visual Tag Management** (lines 105-122):
- Badge display with remove button
- Flexbox wrapping for multiple tags
- Small X button for removal

### Document Status Badge (`/components/admin/document-status-badge.tsx`)

**Status Mapping** (lines 21-34):

```typescript
const getVariant = () => {
  switch (status) {
    case "uploading": return "secondary";
    case "processing": return "outline";
    case "ready": return "default";
    case "failed": return "destructive";
  }
};
```

**Error Tooltip** (lines 50-61):
- Shows error message on hover for failed documents
- Uses shadcn Tooltip component
- Only renders for failed status with error message

**Loading Indicators** (lines 36-41):
- Spinning loader for uploading/processing states
- Visual feedback for async operations

---

## 5. Admin API Routes

### Upload Document (`/app/(admin)/api/documents/upload/route.ts`)

**Authorization** (lines 49-58):

```typescript
const session = await auth.api.getSession({ headers: await headers() });

if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Check if user is admin
if (session.user.role !== "admin") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

**File Validation** (lines 37-46):

```typescript
const DocumentFileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 512 * 1024 * 1024, {
      message: "File size should be less than 512MB",
    })
    .refine((file) => SUPPORTED_DOCUMENT_TYPES.includes(file.type), {
      message: "File type not supported",
    }),
});
```

**Upload Pipeline** (lines 89-125):

1. **Vercel Blob Upload** (line 91):
   ```typescript
   const blobResult = await uploadFile(filename, fileBuffer);
   ```

2. **OpenAI File Upload** (line 94):
   ```typescript
   const openaiFileId = await uploadFileToOpenAI(filename, fileBuffer);
   ```

3. **Vector Store Management** (lines 97-100):
   ```typescript
   const vectorStoreId = await getOrCreateVectorStore();
   await addFileToVectorStore(vectorStoreId, openaiFileId);
   ```

4. **Database Record** (lines 103-114):
   - Saves document metadata
   - Links to blob and OpenAI resources
   - Sets status to "processing"
   - Associates with user via `uploadedBy`

5. **Background Status Polling** (lines 117-125):
   - Starts async polling (don't await)
   - Auto-updates status when processing completes
   - Error handling without blocking response

### Bulk Upload (`/app/(admin)/api/documents/bulk-upload/route.ts`)

**Schema** (lines 26-35):

```typescript
const BulkUploadSchema = z.object({
  documents: z.array(
    z.object({
      category: z.string(),
      title: z.string(),
      file_type: z.string(),
      url: z.string().url(),
    })
  ),
});
```

**Bulk Processing Loop** (lines 67-131):
- Downloads each file from URL
- Processes sequentially (for stability)
- Collects results for each document
- Auto-tags with category
- Continues on individual failures

**Response Format** (lines 136-145):

```typescript
return NextResponse.json({
  success: true,
  message: `Bulk upload completed: ${successCount} succeeded, ${failureCount} failed`,
  results,
  stats: {
    total: documents.length,
    succeeded: successCount,
    failed: failureCount,
  },
});
```

### Update Document (`/app/(admin)/api/documents/[id]/update/route.ts`)

**Update Pipeline** (lines 108-144):

1. **Remove Old File** (lines 108-115):
   ```typescript
   await removeFileFromVectorStore(
     existingDocument.vectorStoreId,
     existingDocument.openaiFileId
   );
   await deleteFileFromOpenAI(existingDocument.openaiFileId);
   ```

2. **Upload New File** (lines 118-122):
   - Upload to Vercel Blob
   - Upload to OpenAI Files

3. **Update Vector Store** (lines 124-127):
   ```typescript
   await addFileToVectorStore(
     existingDocument.vectorStoreId,
     newOpenaiFileId
   );
   ```

4. **Update Database** (lines 130-144):
   - Updates all file-related fields
   - Resets status to "processing"
   - Clears error message
   - Updates tags if provided
   - Sets `updatedAt` timestamp

**Next.js 15 Params Handling** (line 70):

```typescript
const params = await context.params;
```

Required for Next.js 15's async route params.

---

## 6. tRPC Admin Router

### Router Structure (`/trpc/routers/admin.router.ts`)

**Namespace Organization** (lines 11-433):

```typescript
export const adminRouter = createTRPCRouter({
  // User Management Procedures (lines 12-264)
  listUsers: adminProcedure...
  createUser: adminProcedure...
  updateUser: adminProcedure...
  resetUserPassword: adminProcedure...
  deactivateUser: adminProcedure...
  reactivateUser: adminProcedure...

  // Document Management Procedures (lines 270-432)
  documents: {
    list: adminProcedure...
    getById: adminProcedure...
    delete: adminProcedure...
    updateTags: adminProcedure...
    getAllTags: adminProcedure...
    refreshStatus: adminProcedure...
  }
});
```

### User Management Procedures

**List Users Query** (lines 12-88):

**Input Schema** (lines 13-22):
- `searchValue`: Optional search term
- `searchField`: "email" or "name"
- `limit`: 1-100 (default 50)
- `offset`: Min 0 (default 0)
- `filterField`: "role" or "status"
- `filterValue`: Filter value

**Dynamic Where Conditions** (lines 24-47):
- Search filter: ILIKE on email or name (lines 27-33)
- Role filter: Exact match on role (lines 36-38)
- Status filter: Maps to banned field (lines 41-46)

**Join Pattern** (lines 50-59):
- Left join with `userCredit` table
- Selects user and credits
- Applies filters with `and()` combinator
- Limit and offset for pagination

**Data Transformation** (lines 70-82):
- Maps database schema to API response
- Computes `status` from `banned` field
- Defaults role to "user"
- Defaults credits to 0 if null

**Create User Mutation** (lines 90-140):

**Password Generation** (lines 101-102):
- Auto-generates 16-character secure password if not provided
- Tracks whether password was generated for response

**Better Auth Integration** (lines 106-114):
- Uses `auth.api.createUser()` from Better Auth plugin
- Passes email, name, password, role
- Returns user object with generated password if applicable

**Duplicate Email Handling** (lines 126-138):
- Catches errors with "duplicate", "unique", or "email"
- Throws typed TRPCError with BAD_REQUEST code
- Client-friendly error message

**Update User Mutation** (lines 142-173):
- Direct database update (lines 152-155)
- Only updates email currently
- Same duplicate email error handling

**Reset User Password** (lines 175-193):
- Uses Better Auth `setUserPassword()` API (lines 184-190)
- Minimum 8 character validation in input schema

**Deactivate User Mutation** (lines 195-248):

**Self-Deactivation Prevention** (lines 202-208):
```typescript
if (input.userId === ctx.user.id) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Cannot deactivate yourself",
  });
}
```

**Last Admin Protection** (lines 223-235):
- Checks if target user is admin
- Counts active admins
- Prevents deactivating last admin
- Ensures at least one admin remains

**Deactivation Method** (lines 239-245):
- Uses Better Auth `banUser()` API
- Sets ban reason: "User deactivated by admin"

**Reactivate User** (lines 250-264):
- Uses Better Auth `unbanUser()` API
- Simple restoration of access

### Document Management Procedures

**List Documents** (lines 271-286):

**Input Schema** (lines 272-282):
- `searchTerm`: Filters by filename
- `tags`: Array of tags (AND filter)
- `status`: Filter by processing status
- `limit`: 1-100 (default 50)
- `offset`: Pagination offset

**Dynamic Import** (line 284):
```typescript
const { listDocuments } = await import("@/lib/db/queries");
```

Lazy loads query function to reduce bundle size.

**Get By ID** (lines 288-302):
- Retrieves single document by ID
- Throws NOT_FOUND if missing
- Dynamic import pattern

**Delete Document** (lines 304-346):

**Deletion Pipeline** (lines 325-336):
1. Remove from vector store (lines 327-330)
2. Delete from OpenAI Files (line 333)
3. Soft delete in database (line 336)

**Error Handling** (lines 339-345):
- Catches all errors during deletion
- Logs to console for debugging
- Returns INTERNAL_SERVER_ERROR to client

**Update Tags** (lines 348-359):
- Simple tag array update
- Dynamic import of update function
- No validation beyond schema

**Get All Tags** (lines 361-365):
- Fetches distinct tags from all documents
- Used for autocomplete in UI
- Returns array of unique tag strings

**Refresh Status** (lines 367-431):

**Status Refresh Logic** (lines 377-424):

1. **Fetch Processing Documents** (line 377):
   ```typescript
   const processingDocs = await getDocumentsRequiringStatusRefresh();
   ```

   Gets documents with status "processing" or "failed" (with timeout message).

2. **Check Each Document** (lines 391-424):
   - Calls OpenAI API for file status in vector store (lines 393-396)
   - Maps OpenAI status to database status:
     - `completed` → "ready" (lines 398-401)
     - `failed` → "failed" with error message (lines 402-407)
     - `in_progress` → "processing" (lines 409-417)

3. **Error Handling** (lines 418-423):
   - Logs errors per document
   - Continues processing other documents
   - Non-blocking failures

**Return Statistics** (lines 426-431):

```typescript
return {
  updated: completed + failed,
  completed,
  failed,
};
```

---

## 7. Authorization Patterns

### tRPC Middleware (`/trpc/init.ts`)

**Admin Procedure** (lines 143-170):

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

**Layered Security**:
1. Authentication check (user exists)
2. User ID validation (non-null)
3. Role authorization (must be "admin")
4. Type narrowing (role as const "admin")

**Error Codes**:
- `UNAUTHORIZED` (401): Not logged in or missing ID
- `FORBIDDEN` (403): Logged in but not admin

### Better Auth Configuration (`/lib/auth.ts`)

**Admin Plugin** (lines 36-43):

```typescript
plugins: [
  nextCookies(),
  admin({
    defaultRole: "user",
    adminRoles: ["admin"],
    impersonationSessionDuration: 60 * 60,
  }),
],
```

**Features**:
- Default role: "user" for new accounts
- Admin roles: Single "admin" role
- Impersonation: 1 hour session duration
- Provides admin-specific API methods:
  - `auth.api.createUser()`
  - `auth.api.setUserPassword()`
  - `auth.api.banUser()`
  - `auth.api.unbanUser()`

**Email & Password Authentication** (lines 29-34):

```typescript
emailAndPassword: {
  enabled: true,
  requireEmailVerification: false,
  minPasswordLength: 8,
  maxPasswordLength: 128,
},
```

### API Route Authorization

**Consistent Pattern Across All Routes**:

```typescript
// 1. Get session
const session = await auth.api.getSession({ headers: await headers() });

// 2. Check authentication
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// 3. Check admin role
if (session.user.role !== "admin") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// 4. Proceed with operation
```

**Applied In**:
- `/app/(admin)/api/documents/upload/route.ts:49-58`
- `/app/(admin)/api/documents/bulk-upload/route.ts:38-47`
- `/app/(admin)/api/documents/[id]/update/route.ts:54-63`

### Context Creation (`/trpc/init.ts:29-34`)

```typescript
export const createTRPCContext = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return {
    user: session?.user,
  };
});
```

**Key Features**:
- React `cache()` for request deduplication
- Async session fetching from Better Auth
- User data injected into all tRPC procedures
- Type-safe context via TypeScript inference

---

## 8. Data Flow Patterns

### User CRUD Flow

**Create**:
1. User fills form → `CreateUserDialog` (client)
2. Form submission → `trpc.admin.createUser.mutate()` (tRPC)
3. Procedure validates → `adminProcedure` middleware (auth check)
4. Better Auth API → `auth.api.createUser()` (database)
5. Response with generated password → Toast notification (UI)
6. Invalidate cache → `invalidate()` callback (refresh list)
7. Table re-renders → Shows new user

**Update**:
1. Click Edit → `EditUserDialog` opens with pre-filled data
2. Modify email → Form validation with Zod
3. Submit → `trpc.admin.updateUser.mutate()`
4. Direct database update → Drizzle ORM
5. Success → Close dialog + invalidate + toast
6. List auto-refreshes

**Reset Password**:
1. Click Reset → `ResetPasswordDialog` opens
2. Enter new password → Confirm password validation
3. Submit → `trpc.admin.resetUserPassword.mutate()`
4. Better Auth API → `auth.api.setUserPassword()`
5. Success → Toast + close dialog + refresh

**Deactivate**:
1. Click Deactivate → Confirmation dialog
2. Confirm → `trpc.admin.deactivateUser.mutate()`
3. Validation → Self-check + last admin check
4. Better Auth API → `auth.api.banUser()`
5. Success → Button switches to "Reactivate"

**Reactivate**:
1. Click Reactivate → No confirmation (reversible action)
2. Mutate → `trpc.admin.reactivateUser.mutate()`
3. Better Auth API → `auth.api.unbanUser()`
4. Success → Button switches to "Deactivate"

### Document CRUD Flow

**Upload**:
1. Drag/drop files → react-dropzone
2. Add optional tags → `DocumentTagsInput` with autocomplete
3. Click Upload → Parallel uploads via `Promise.allSettled()`
4. For each file:
   - FormData → `/api/documents/upload`
   - Vercel Blob upload
   - OpenAI Files upload
   - Vector Store indexing
   - Database record creation
   - Background status polling
5. Progress tracking → Individual file status indicators
6. Success → Auto-close dialog + invalidate queries
7. List shows new documents with "processing" status

**Update**:
1. Click Update → `UpdateDocumentDialog` opens
2. Select new file → react-dropzone (single file)
3. Optionally modify tags → `DocumentTagsInput`
4. Submit → FormData to `/api/documents/${id}/update`
5. Server-side:
   - Remove old file from vector store
   - Delete old file from OpenAI
   - Upload new file to Blob and OpenAI
   - Add to vector store
   - Update database record
6. Success → Close dialog + refresh list

**Delete**:
1. Click Delete → Confirmation dialog (destructive action)
2. Confirm → `trpc.admin.documents.delete.mutate()`
3. Server-side deletion pipeline:
   - Remove from vector store
   - Delete from OpenAI Files
   - Soft delete in database (set `deletedAt`)
4. Success → Row removed from table

**Update Tags**:
1. Click Edit Tags → Inline dialog
2. Modify tags → `DocumentTagsInput` with autocomplete
3. Save → `trpc.admin.documents.updateTags.mutate()`
4. Direct database update → Updates `tags` JSON field
5. Success → Badge updates in table row

**Refresh Status**:
1. Click Refresh → Manual trigger
2. `trpc.admin.documents.refreshStatus.mutate()`
3. Server fetches all processing/failed docs
4. Checks each file status via OpenAI API
5. Updates database statuses
6. Returns stats (completed, failed)
7. Toast shows results + table refreshes

### Cache Invalidation Strategy

**User List** (`/components/admin/user-list-table.tsx:42-44`):

```typescript
const invalidate = () => {
  setRefetchKey((prev) => prev + 1);
};
```

Simple key-based refetch. Increments key to trigger new query.

**Document List** (`/components/admin/document-list-table.tsx:46-63`):

```typescript
const invalidate = async () => {
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as unknown[];
      if (Array.isArray(queryKey) && queryKey.length > 0) {
        const path = queryKey[0] as string[];
        return (
          Array.isArray(path) &&
          path[0] === "admin" &&
          path[1] === "documents"
        );
      }
      return false;
    },
  });
};
```

Advanced predicate-based invalidation. Invalidates ALL document-related queries including:
- Document list
- Tag suggestions
- Individual document queries

This ensures UI consistency across related data.

---

## 9. Key Architectural Patterns

### 1. Server Components + Client Islands

**Pattern**:
- Pages are server components (fetch session, etc.)
- Interactive components are client components ("use client")
- Minimal client-side JavaScript

**Example**:
- `/app/admin/layout.tsx` - Server component (no "use client")
  - Fetches session server-side
  - Wraps children with providers
- `/components/admin/user-list-table.tsx` - Client component
  - Uses hooks (useQuery, useState)
  - Interactive table with actions

### 2. Dialog-Based CRUD

**Pattern**: All create/edit operations use dialogs instead of separate pages.

**Benefits**:
- No navigation required
- Context maintained (user stays on list)
- Better mobile UX
- Quick operations

**Implementation**:
- Shadcn Dialog component
- Trigger passed as children (render props)
- Controlled open state
- Success callback for invalidation

### 3. Optimistic UI Updates

**Not Currently Implemented**: Application uses invalidation strategy.

**Alternative Used**: Invalidation + React Query automatic refetch
- Simpler than optimistic updates
- Guarantees server state consistency
- Good for admin panels (not mission-critical UX)

### 4. Type-Safe API Layer

**tRPC Benefits**:
- End-to-end type safety
- Input validation with Zod
- Automatic API documentation
- React Query integration

**Example Type Flow**:
```
User Form → Zod Schema → tRPC Input → Procedure → Database → Response → React Component
          ✓ Type Safe    ✓ Validated   ✓ Typed     ✓ Typed    ✓ Typed
```

### 5. Composition Over Configuration

**Component Composition**:
- `UserListTable` composes `UserActions`
- `UserActions` composes dialogs (`EditUserDialog`, `ResetPasswordDialog`)
- Dialogs render triggers via `children` prop
- Flexible, reusable, testable

### 6. Progressive Enhancement

**Graceful Degradation**:
- Loading skeletons during fetch
- Error states with retry
- Disabled states during mutations
- Processing state handling (upload/processing documents can't be modified)

### 7. Colocated Concerns

**Admin Directory Structure**:
```
/app/admin/
  ├─ layout.tsx (layout + auth)
  ├─ page.tsx (redirect)
  ├─ users/page.tsx (users page)
  └─ documents/page.tsx (docs page)

/components/admin/
  ├─ admin-sidebar.tsx
  ├─ admin-sidebar-nav.tsx
  ├─ user-list-table.tsx
  ├─ user-actions.tsx
  ├─ create-user-dialog.tsx
  ├─ edit-user-dialog.tsx
  ├─ reset-password-dialog.tsx
  ├─ document-list-table.tsx
  ├─ document-actions.tsx
  ├─ upload-document-dialog.tsx
  ├─ update-document-dialog.tsx
  ├─ document-status-badge.tsx
  └─ document-tags-input.tsx

/trpc/routers/
  └─ admin.router.ts (all admin procedures)

/app/(admin)/api/documents/
  ├─ upload/route.ts
  ├─ bulk-upload/route.ts
  └─ [id]/update/route.ts
```

Related functionality grouped together for discoverability.

---

## 10. Database Schema

### User Table (`/lib/db/schema.ts:203`)

**Key Fields**:
- `id`: Primary key (text)
- `email`: Unique, required
- `name`: Required
- `role`: String (admin/user)
- `banned`: Boolean (used for active/inactive status)
- `banReason`: Text, nullable
- `createdAt`: Timestamp

### User Credit Table

**Relationship**: Left join in list query
- `userId`: Foreign key to user
- `credits`: Integer
- Used for display in admin panel

### Uploaded Document Table (`/lib/db/schema.ts:29`)

**Key Fields**:
- `id`: UUID, primary key
- `filename`: Text, required
- `fileSize`: Integer
- `contentType`: Text (MIME type)
- `blobUrl`: Text (Vercel Blob URL)
- `blobPathname`: Text
- `openaiFileId`: Text (OpenAI Files ID)
- `vectorStoreId`: Text (Vector Store ID)
- `status`: Enum ("uploading", "processing", "ready", "failed")
- `errorMessage`: Text, nullable
- `tags`: JSON array of strings
- `uploadedBy`: Text (user ID)
- `deletedAt`: Timestamp, nullable (soft delete)
- `uploadedAt`: Timestamp
- `updatedAt`: Timestamp

**Status Flow**:
1. "uploading" - Initial state during API call
2. "processing" - File added to vector store, indexing in progress
3. "ready" - Indexed and searchable
4. "failed" - Error during processing (with errorMessage)

**Soft Delete Pattern**:
- `deletedAt` field set on deletion
- Queries filter with `isNull(uploadedDocument.deletedAt)`
- Preserves data for audit trail

---

## 11. External Integrations

### Better Auth

**Purpose**: Authentication and user management

**Admin Plugin Features**:
- `auth.api.createUser()` - Create users with email/password
- `auth.api.setUserPassword()` - Reset passwords
- `auth.api.banUser()` - Deactivate users
- `auth.api.unbanUser()` - Reactivate users
- `auth.api.getSession()` - Fetch current session

**Usage Locations**:
- `/trpc/init.ts:30` - Context creation
- `/trpc/routers/admin.router.ts:106,184,239,258` - User management
- `/app/admin/layout.tsx:12` - Layout session fetch
- `/app/(admin)/api/documents/*` - API route authorization

### OpenAI Files & Vector Store

**Purpose**: Document storage and semantic search

**Key Operations**:

**Upload Flow**:
1. `uploadFileToOpenAI()` - Upload file to OpenAI Files
2. `getOrCreateVectorStore()` - Ensure vector store exists
3. `addFileToVectorStore()` - Index file for search

**Update Flow**:
1. `removeFileFromVectorStore()` - Remove old file
2. `deleteFileFromOpenAI()` - Delete old file
3. Upload new file (same as upload flow)

**Status Checking**:
- `getVectorStoreFileStatus()` - Check indexing progress
- Returns: "in_progress", "completed", "failed"

**Background Polling**:
- `pollDocumentStatus()` - Async status updates
- Checks periodically until complete/failed
- Updates database automatically

**Implementation Files**:
- `/lib/openai/files.ts` - File operations
- `/lib/openai/vector-store.ts` - Vector store operations
- `/lib/openai/status-polling.ts` - Background polling

### Vercel Blob

**Purpose**: File storage and CDN delivery

**Usage**:
- `uploadFile()` - Upload file, get URL
- Returns: `{ url, pathname }`
- Used for viewing documents in browser

**Locations**:
- `/app/(admin)/api/documents/upload/route.ts:91`
- `/app/(admin)/api/documents/bulk-upload/route.ts:84`
- `/app/(admin)/api/documents/[id]/update/route.ts:118`

---

## 12. Error Handling Patterns

### Form Validation Errors

**Pattern**: Field-specific error messages via React Hook Form + Zod

**Example** (`/components/admin/create-user-dialog.tsx:96-98`):

```typescript
if (err.message?.includes("email")) {
  form.setError("email", { message: "Email already exists" });
}
```

**Benefits**:
- Error appears below specific field
- User sees exactly what's wrong
- No need to read full error message

### Mutation Errors

**Pattern**: Toast notifications for operation failures

**Example** (`/components/admin/user-actions.tsx:50-53`):

```typescript
catch (error: unknown) {
  const err = error as { message?: string };
  toast.error(err.message || "Failed to deactivate user");
}
```

**Fallback Message**: Always provide generic fallback for unknown errors.

### API Route Errors

**Pattern**: Consistent JSON error responses

**Example** (`/app/(admin)/api/documents/upload/route.ts:69-70`):

```typescript
if (!file) {
  return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
}
```

**Status Codes**:
- 400: Bad request (validation errors)
- 401: Unauthorized (not logged in)
- 403: Forbidden (not admin)
- 404: Not found
- 500: Internal server error

### tRPC Errors

**Pattern**: Typed TRPCError with specific codes

**Example** (`/trpc/routers/admin.router.ts:133-136`):

```typescript
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Email already exists",
});
```

**Error Codes**:
- `UNAUTHORIZED` - Authentication failure
- `FORBIDDEN` - Authorization failure
- `BAD_REQUEST` - Validation/business logic error
- `NOT_FOUND` - Resource doesn't exist
- `INTERNAL_SERVER_ERROR` - Unexpected error

### Background Task Errors

**Pattern**: Silent logging, no user notification

**Example** (`/app/(admin)/api/documents/upload/route.ts:118-124`):

```typescript
pollDocumentStatus(document.id, vectorStoreId, openaiFileId).catch(
  (error) => {
    console.error(
      `Background status polling failed for document ${document.id}:`,
      error
    );
  }
);
```

**Rationale**: Background tasks shouldn't interrupt user flow. Status can be manually refreshed.

---

## 13. Performance Optimizations

### 1. Dynamic Imports (`/trpc/routers/admin.router.ts`)

**Pattern**: Lazy load database queries only when needed

```typescript
const { listDocuments } = await import("@/lib/db/queries");
```

**Benefits**:
- Reduces initial bundle size
- Faster tRPC router initialization
- Code splitting at function level

### 2. React Query Caching

**Default Configuration**:
- `staleTime`: 0 (always refetch on mount)
- `cacheTime`: 5 minutes (keep unused data)

**Custom Invalidation**: Predicates for targeted cache busting

### 3. Request Deduplication

**React `cache()` in Context** (`/trpc/init.ts:29`):

```typescript
export const createTRPCContext = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return { user: session?.user };
});
```

**Benefit**: Single session fetch per request, even if multiple components need it.

### 4. Parallel File Uploads

**Promise.allSettled Pattern** (`/components/admin/upload-document-dialog.tsx:135-138`):

```typescript
const uploadResults = await Promise.allSettled(
  files.map((file) => uploadSingleFile(file))
);
```

**Benefits**:
- Multiple files upload simultaneously
- Partial success handling
- Faster bulk uploads

### 5. Skeleton Loading States

**Pattern**: Immediate UI feedback, smooth perceived performance

**Example** (`/components/admin/user-list-table.tsx:82-106`):
- Shows 5 skeleton rows during load
- Matches final table structure
- No layout shift when data arrives

### 6. Optimized Re-renders

**Local State for Dialogs**: Prevents parent re-renders

```typescript
const [open, setOpen] = useState(false);
```

**Callback Pattern**: Parent passes `onSuccess` callback instead of state

### 7. Pagination Support

**Schema** (`/trpc/routers/admin.router.ts:17-18`):

```typescript
limit: z.number().min(1).max(100).default(50),
offset: z.number().min(0).default(0),
```

**Benefits**:
- Limits query size
- Faster response times
- Scalable to large datasets

**Note**: UI currently shows all results without pagination controls. Offset/limit prepared for future implementation.

---

## 14. Security Considerations

### 1. Multi-Layer Authorization

**Layer 1 - Middleware** (`/trpc/init.ts:143-170`):
- Checks authentication
- Validates admin role
- Applied to ALL admin procedures

**Layer 2 - API Routes** (all `/app/(admin)/api/documents/*`):
- Re-checks session
- Re-validates admin role
- Defense in depth

### 2. Self-Protection Guards

**Prevent Self-Deactivation** (`/trpc/routers/admin.router.ts:202-208`):

```typescript
if (input.userId === ctx.user.id) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Cannot deactivate yourself",
  });
}
```

**Prevents Lockout**: Admin can't accidentally lock themselves out.

### 3. Last Admin Protection

**Prevent System Lockout** (`/trpc/routers/admin.router.ts:223-235`):

```typescript
if (targetUser.role === "admin") {
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
```

**Guarantees**: At least one active admin always exists.

### 4. Input Validation

**Zod Schemas**: All inputs validated

**Examples**:
- Email format validation
- Password min/max length
- File size limits (512 MB max)
- File type restrictions

### 5. SQL Injection Prevention

**Drizzle ORM**: Parameterized queries by default

**Example** (`/trpc/routers/admin.router.ts:29`):

```typescript
whereConditions.push(ilike(user.email, `%${input.searchValue}%`));
```

Drizzle safely escapes `searchValue`.

### 6. Soft Delete Pattern

**Preservation**: Deleted documents set `deletedAt` instead of hard delete

**Benefits**:
- Audit trail
- Recovery option
- Safer for production

**Implementation** (`/lib/db/queries.ts:943-951`):

```typescript
export async function softDeleteDocument(id: string): Promise<void> {
  await db
    .update(uploadedDocument)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(uploadedDocument.id, id));
}
```

### 7. Error Message Sanitization

**Pattern**: Generic client messages, detailed server logs

**Example** (`/app/(admin)/api/documents/upload/route.ts:131-133`):

```typescript
catch (error) {
  console.error("Failed to upload document:", error);
  return NextResponse.json({ error: "Upload failed" }, { status: 500 });
}
```

**Prevents**: Information leakage through error messages.

---

## 15. Future Enhancement Opportunities

### 1. Pagination UI

**Current State**: Limit/offset in queries but no UI controls

**Additions Needed**:
- Page number controls
- Items per page selector
- Total pages indicator
- Previous/Next buttons

### 2. Advanced Filtering

**User List**:
- Filter by role (admin/user)
- Filter by status (active/inactive)
- Date range filters

**Document List**:
- Filter by status (ready/processing/failed)
- Filter by tags (multi-select)
- Filter by upload date

### 3. Bulk Actions

**User Management**:
- Select multiple users
- Bulk deactivate/reactivate
- Bulk role changes

**Document Management**:
- Bulk tag updates
- Bulk delete
- Bulk status refresh

### 4. Audit Logging

**Track Admin Actions**:
- Who performed action
- What was changed
- When it occurred
- IP address/user agent

**Storage**: Separate audit log table

### 5. Export Functionality

**CSV Exports**:
- User list export
- Document list export
- Filtered results export

### 6. Advanced Search

**User Search**:
- Search by ID
- Search by email domain
- Search by name

**Document Search**:
- Full-text search in content (requires vector store integration)
- Search by uploader
- Search by date range

### 7. Real-time Updates

**WebSocket Integration**:
- Live status updates for processing documents
- No manual refresh needed
- Better UX for bulk uploads

### 8. User Impersonation

**Better Auth Support**: Already configured (1-hour sessions)

**UI Needed**:
- "Login as User" button
- Impersonation indicator banner
- Easy return to admin account

### 9. Role Management

**Multiple Roles**:
- Super Admin
- Admin
- Moderator
- User

**Permissions**:
- Granular permissions per role
- Feature flags

### 10. Document Preview

**In-App Preview**:
- PDF viewer
- DOCX preview (converted to PDF)
- Text/Markdown rendering

**Library**: React-PDF or similar

---

## 16. Testing Strategy Recommendations

### Unit Tests

**Components**:
- Dialog open/close behavior
- Form validation
- Error state rendering
- Success state rendering

**Example Test Structure**:

```typescript
describe('CreateUserDialog', () => {
  it('validates email format', async () => {
    // Render component
    // Enter invalid email
    // Assert error message appears
  });

  it('generates password when checkbox checked', async () => {
    // Render component
    // Check "generate password"
    // Submit form
    // Assert password field not visible
  });
});
```

### Integration Tests

**tRPC Procedures**:
- Test full request/response cycle
- Mock database calls
- Verify authorization checks

**Example**:

```typescript
describe('admin.createUser', () => {
  it('creates user with admin role', async () => {
    const caller = createCaller({ user: { id: 'admin-1', role: 'admin' } });
    const result = await caller.admin.createUser({
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin'
    });
    expect(result.user.role).toBe('admin');
  });

  it('throws FORBIDDEN for non-admin', async () => {
    const caller = createCaller({ user: { id: 'user-1', role: 'user' } });
    await expect(
      caller.admin.createUser(...)
    ).rejects.toThrow('FORBIDDEN');
  });
});
```

### E2E Tests

**Critical Flows**:
- Admin login → Create user → Verify in list
- Upload document → Check status → Delete document
- Deactivate user → Verify can't login → Reactivate

**Tool**: Playwright or Cypress

---

## 17. Documentation

### Code Comments

**Current State**: Minimal inline comments

**Improvement Opportunities**:
- Document complex algorithms (status polling)
- Explain business logic decisions (last admin check)
- Add JSDoc for exported functions

### API Documentation

**tRPC Advantage**: Self-documenting via types

**Enhancement**: Generate OpenAPI spec from tRPC for external consumers

### Admin Guide

**User-Facing Documentation**:
- How to create users
- How to upload documents
- How to manage tags
- Troubleshooting common errors

---

## Conclusion

The AgentDune Chat admin panel demonstrates modern Next.js best practices with a clean separation of concerns, type-safe APIs via tRPC, and comprehensive CRUD functionality. The architecture is scalable, maintainable, and follows React Server Components patterns effectively. Authorization is multi-layered and secure, with proper guard rails against admin lockout scenarios. The document management system integrates seamlessly with OpenAI's vector store for semantic search capabilities.

### Key Strengths

1. **Type Safety**: End-to-end TypeScript with tRPC and Zod
2. **User Experience**: Dialog-based CRUD, loading states, error handling
3. **Security**: Multi-layer auth, input validation, soft deletes
4. **Maintainability**: Colocated concerns, composition patterns, clean code
5. **Performance**: Dynamic imports, caching, parallel uploads
6. **Scalability**: Pagination support, predicate-based cache invalidation

### Architecture Highlights

- **tRPC Router**: Centralized admin procedures with `adminProcedure` middleware
- **Better Auth Integration**: Leverages admin plugin for user management
- **Dual API Layers**: tRPC for queries, Next.js API routes for file uploads
- **React Query**: Intelligent caching and invalidation
- **Server Components**: Efficient server-side data fetching
- **Shadcn UI**: Consistent, accessible component library

The codebase is production-ready and provides a solid foundation for future enhancements such as advanced filtering, bulk actions, audit logging, and real-time updates.

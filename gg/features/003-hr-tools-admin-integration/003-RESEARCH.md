---
date: 2025-11-11 21:55:00
feature-slug: 003-hr-tools-admin-integration
---

# HR Tools Admin Integration Codebase Research

Here is a comprehensive research document of the current state of the codebase and the specific patterns, dependencies, and architecture that the proposed feature will touch.

## Summary

The codebase is well-prepared for implementing the HR Tools Admin Integration feature. It has:

1. **Established Admin Panel Architecture** - Complete admin UI at `/admin` with CRUD patterns for users and documents
2. **5 HR Tools with Mock Data** - Leave Balance, Benefits Info, HR Case, Team Availability, and People Search tools are fully implemented with hardcoded mock data
3. **Mature Database Layer** - Drizzle ORM with PostgreSQL, comprehensive query patterns, and repository pattern for complex logic
4. **Robust RBAC System** - Multi-layered authentication using Better Auth with admin role enforcement
5. **Type-Safe tRPC Layer** - Full type safety from API to database with Zod validation

The feature will extend existing patterns by:
- Creating new database tables for HR entities (employee, leave balance, benefits, cases, etc.)
- Adding new admin router procedures following the existing `adminProcedure` pattern
- Building admin UI pages following the dialog-based CRUD pattern
- Replacing mock data constants in tool files with database queries
- Implementing a data seeding system for initial demo data

## Detailed Findings

### 1. Existing Admin Panel Architecture

**Location:** `/app/admin/*` and `/components/admin/*`

The admin panel provides a complete reference implementation for our HR data admin interface:

#### Routing Structure
- **Admin Layout** (`app/admin/layout.tsx:7-44`) - Server component that fetches session and wraps children with providers
- **Navigation** (`components/admin/admin-sidebar-nav.tsx:44-101`) - Expandable sidebar with links array
- **Route Pattern** - `/admin/users` and `/admin/documents` serve as templates for `/admin/hr-data`

#### CRUD UI Patterns

**Dialog-Based CRUD** - All operations use dialogs instead of separate pages:
- `CreateUserDialog` (`components/admin/create-user-dialog.tsx:62-210`) - Form with React Hook Form + Zod
- `EditUserDialog` (`components/admin/edit-user-dialog.tsx:60-136`) - Pre-populated form
- `UserActions` (`components/admin/user-actions.tsx:37-124`) - Dropdown menu with edit/delete/etc.

**List View Pattern** (`components/admin/user-list-table.tsx:28-156`):
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

Key Features:
- TanStack Query integration with tRPC
- Search with debouncing
- Skeleton loading states
- Pagination support (limit/offset)
- Invalidation callbacks for cache refresh

**Form Patterns:**
- Zod schemas for validation (`create-user-dialog.tsx:30-45`)
- React Hook Form for state management
- Field-specific error messages
- Success toasts with callbacks
- Auto-generated secure passwords

#### Component Composition

The admin panel uses a layered composition pattern:
1. **Page** (`app/admin/users/page.tsx`) - Server component, renders list
2. **List Component** (`user-list-table.tsx`) - Client component with tRPC query
3. **Action Component** (`user-actions.tsx`) - Dropdown menu with dialogs
4. **Dialog Components** - Individual forms for each operation

This pattern will be replicated for HR data sections (Employee Directory, Leave Balances, etc.).

**Code References:**
- `app/admin/layout.tsx:7-44` - Layout structure with sidebar
- `components/admin/user-list-table.tsx:28-156` - List view with search
- `components/admin/create-user-dialog.tsx:62-210` - Create dialog pattern
- `trpc/routers/admin.router.ts:12-88` - tRPC query pattern

---

### 2. Current HR Tools Implementation

**Location:** `/lib/ai/tools/*`

The 5 HR tools are fully implemented with mock data stored as constants within each tool file:

#### Tool Files and Mock Data Locations

1. **Leave Balance** (`lib/ai/tools/leave-balance.ts:58-115`)
   - `MOCK_EMPLOYEE_DATA` constant with balances, blackout dates, policies
   - Current balances: Vacation (18.5 days), Sick (12 days), Personal (3 days)
   - Accrual rates and carryover limits included

2. **Benefits Info** (`lib/ai/tools/benefits-info.ts:83-251`)
   - `MOCK_EMPLOYEE_BENEFITS` with current enrollments and dependents
   - `MOCK_PLAN_OPTIONS` with 3 medical plan comparison data
   - Current enrollments: Medical ($450/mo), Dental ($85/mo), Vision ($18/mo), 401k

3. **HR Case** (`lib/ai/tools/hr-case.ts:95-220`)
   - `MOCK_EXISTING_CASES` array with 2 sample cases
   - `SLA_CONFIG` for resolution timelines by category
   - `TEAM_ASSIGNMENT` mapping categories to teams
   - Auto-classification logic for categorizing cases

4. **Team Availability** (`lib/ai/tools/team-availability.ts:92-175`)
   - `MOCK_MANAGER` context (manager ID, team members)
   - `TEAM_DIRECTORY` with 5 employee profiles
   - `APPROVED_ABSENCES` array with 3 absence records
   - `PENDING_REQUESTS` array with 2 leave requests
   - Coverage calculation helper function

5. **People Search** (`lib/ai/tools/people-search.ts:102-290`)
   - `MOCK_HR_USER` context for RBAC
   - `EMPLOYEE_DIRECTORY` array with 5 employee profiles
   - Includes work authorization status, visa expiry dates
   - Employment statuses: active, probation, leave_of_absence, notice_period

#### Tool Integration Pattern

All tools follow a consistent structure:

```typescript
export const toolName = ({ dataStream }: ToolProps) =>
  tool({
    description: "Tool description for AI",
    inputSchema: z.object({ /* Zod schema */ }),
    execute: async (input) => {
      // 1. Log start
      log.info({ ...input }, "toolName: start");

      // 2. Send loading update to UI
      dataStream.write({ type: "data-researchUpdate", ... });

      // 3. Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 700-1000));

      // 4. Retrieve MOCK_DATA
      const data = MOCK_DATA;

      // 5. Process and return
      return { results: data };
    }
  });
```

**Key Insight:** To replace mock data with database queries, we need to:
1. Create database tables matching the mock data structure
2. Replace constants like `MOCK_EMPLOYEE_DATA` with database queries
3. Remove simulated delays
4. Keep the same return structure for UI compatibility

**RBAC Enforcement:**
- Team Availability: `if (!manager.isManager)` check in execute function (`team-availability.ts:287-296`)
- People Search: `if (!hrUser.isHR)` check in execute function (`people-search.ts:359-366`)

**Code References:**
- `lib/ai/tools/leave-balance.ts:58-115` - Mock leave balance data
- `lib/ai/tools/benefits-info.ts:83-251` - Mock benefits data
- `lib/ai/tools/hr-case.ts:95-220` - Mock cases and SLA config
- `lib/ai/tools/team-availability.ts:92-175` - Mock team data
- `lib/ai/tools/people-search.ts:102-290` - Mock employee directory

---

### 3. Database & ORM Architecture

**Database:** PostgreSQL with Vercel Postgres
**ORM:** Drizzle ORM v0.34.1
**Location:** Schema at `lib/db/schema.ts`, Queries at `lib/db/queries.ts`

#### Schema Definition Pattern

Tables are defined using Drizzle's `pgTable` with TypeScript type inference:

```typescript
export const tableName = pgTable("TableName", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // ... other fields
});

export type TableName = InferSelectModel<typeof tableName>;
export type InsertTableName = InferInsertModel<typeof tableName>;
```

**Key Patterns:**
- UUID primary keys with `defaultRandom()`
- Foreign key relationships with cascade deletes
- Timestamps with `defaultNow()`
- Type inference using `InferSelectModel` and `InferInsertModel`
- JSON columns for flexible data: `json("tags").$type<string[]>()`

#### Existing Tables Relevant to HR Feature

**User Table** (`lib/db/schema.ts:203-218`):
```typescript
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role"),  // "admin" | "user"
  banned: boolean("banned").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // ...
});
```

The existing `user` table has basic fields but lacks HR-specific data like:
- Employee ID, job title, department
- Manager relationships, direct reports
- Location, work authorization
- Start date, years of service
- Employment status

**Decision:** Create a new `employee` table with one-to-one relationship to `user` table, or replace/extend the user table for HR data.

#### Query Organization

Queries are centralized in `lib/db/queries.ts` (1,028 lines):

**CRUD Patterns:**
- **Create:** `saveChat()` (lines 45-66) - Insert with explicit timestamps
- **Read:** `getUserByEmail()` (lines 36-43) - Select with where filter
- **Update:** `updateMessage()` (lines 155-172) - Selective field updates
- **Delete:** `deleteChatById()` (lines 68-86) - Manual cleanup + cascade

**Advanced Patterns:**
- **Pagination:** `listDocuments()` (lines 778-839) - Dynamic WHERE, limit/offset, total count
- **Soft Delete:** `softDeleteDocument()` (lines 943-956) - Set `deletedAt` timestamp
- **Upsert:** `setVectorStoreId()` (lines 745-766) - `onConflictDoUpdate()`
- **Joins:** `getDocumentsById()` (lines 274-320) - Multi-table joins for visibility checks

**Repository Pattern** (`lib/repositories/credits.ts`):
- Used for complex domain logic (credit reservation system)
- Atomic operations with optimistic locking
- Two-phase commit pattern for credits

**For HR Feature:**
- Use centralized queries for simple CRUD
- Consider repository pattern for complex operations (leave request approvals, coverage calculation)

#### Migration System

**Configuration:** `drizzle.config.ts`
```typescript
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.POSTGRES_URL! },
});
```

**Workflow:**
1. Modify `lib/db/schema.ts`
2. Run `bun run db:generate` - Creates SQL migration
3. Review generated SQL in `lib/db/migrations/`
4. Run `bun run db:migrate` - Apply migration

**Seeding Strategy:**
- Create a seed script at `lib/db/seeds/hr-data.ts`
- Check if data exists before seeding (prevent duplicates)
- Called during first deployment or via "Reset to Defaults" button

**Code References:**
- `lib/db/schema.ts:29-77` - UploadedDocument table with indexes
- `lib/db/client.ts:6-27` - Singleton database client
- `lib/db/queries.ts:778-839` - Pagination query pattern
- `lib/repositories/credits.ts:44-106` - Repository pattern example

---

### 4. Authentication & RBAC Implementation

**Authentication:** Better Auth with Drizzle adapter
**Location:** `lib/auth.ts`, middleware at `proxy.ts` (⚠️ not active)

#### Multi-Layer Security

The codebase implements 5 security layers (though middleware is currently inactive):

**Layer 1: Database Schema** (`lib/db/schema.ts:214`)
```typescript
role: text("role"),  // Stores "admin" or "user"
```

**Layer 2: Proxy/Middleware** (`proxy.ts:48-65`)
```typescript
if (isOnAdminRoute) {
  if (!isLoggedIn) return NextResponse.redirect(new URL("/login", url));
  if (session.user.role !== "admin") return NextResponse.redirect(new URL("/?error=forbidden", url));
}
```
⚠️ **CRITICAL:** This file is named `proxy.ts` and not `middleware.ts`, so it's not active! The admin routes are currently protected only by tRPC/API checks.

**Layer 3: tRPC Admin Procedure** (`trpc/init.ts:143-170`)
```typescript
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (!ctx.user.id) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx: { user: { id, role: "admin" as const, ...rest } } });
});
```

**Layer 4: Admin API Routes** (`app/(admin)/api/documents/upload/route.ts:48-58`)
```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

**Layer 5: Better Auth Admin Plugin** (`lib/auth.ts:38-42`)
```typescript
admin({
  defaultRole: "user",
  adminRoles: ["admin"],
  impersonationSessionDuration: 60 * 60,
})
```

#### Admin Router Authorization

All admin operations in `trpc/routers/admin.router.ts` use `adminProcedure`:

```typescript
export const adminRouter = createTRPCRouter({
  listUsers: adminProcedure.query(async ({ input }) => { /* ... */ }),
  createUser: adminProcedure.mutation(async ({ input }) => { /* ... */ }),
  // ... all procedures use adminProcedure
});
```

**Business Logic Protections:**
- Self-deactivation prevention (`admin.router.ts:202-208`)
- Last admin protection (`admin.router.ts:223-235`) - Prevents system lockout

#### For HR Feature

The HR data admin routes will follow the same pattern:
1. Create procedures in `trpc/routers/admin.router.ts` using `adminProcedure`
2. Add API routes (if needed for file uploads) with session checks
3. Tool RBAC enforcement remains in execute functions (Team Availability for managers, People Search for HR)
4. Consider fixing the middleware issue by renaming `proxy.ts` to `middleware.ts`

**Code References:**
- `lib/auth.ts:21-44` - Better Auth configuration
- `trpc/init.ts:143-170` - adminProcedure middleware
- `trpc/routers/admin.router.ts:90-140` - Create user example
- `proxy.ts:48-65` - Middleware admin check (not active)

---

### 5. AI Agent Tool Integration

**Location:** Tool registration at `lib/ai/tools/tools.ts`, individual tools in `lib/ai/tools/`

#### Tool Registration System

The `getTools()` function (`lib/ai/tools/tools.ts:25-108`) serves as the tool registry:

```typescript
export function getTools({
  dataStream,
  session,
  messageId,
  selectedModel,
  attachments,
  lastGeneratedImage,
  contextForLLM,
}: ToolsProps): ChatTools {
  return {
    // HR Tools (always available)
    leaveBalance: leaveBalance({ dataStream }),
    benefitsInfo: benefitsInfo({ dataStream }),
    hrCase: hrCase({ dataStream }),
    teamAvailability: teamAvailability({ dataStream }),  // RBAC in execute
    peopleSearch: peopleSearch({ dataStream }),  // RBAC in execute

    // Other tools...
  };
}
```

**Tool Metadata** (`lib/ai/tools/tools-definitions.ts:74-98`):
```typescript
leaveBalance: { name: "leaveBalance", description: "Check leave balances", cost: 2 },
benefitsInfo: { name: "benefitsInfo", description: "Query benefits info", cost: 2 },
hrCase: { name: "hrCase", description: "Create/manage HR cases", cost: 3 },
teamAvailability: { name: "teamAvailability", description: "Team availability", cost: 3 },
peopleSearch: { name: "peopleSearch", description: "Employee search", cost: 2 },
```

#### Tool Implementation Pattern

All tools follow the Vercel AI SDK pattern:

```typescript
export const toolName = ({ dataStream }: ToolProps) =>
  tool({
    description: "Description for the AI model about when to use this tool",
    inputSchema: z.object({
      query: z.string().describe("Search query"),
      limit: z.number().min(1).max(20).optional(),
    }),
    execute: async ({ query, limit = 5 }) => {
      // 1. Start logging
      log.info({ query, limit }, "toolName: start");

      // 2. Stream update to UI
      dataStream.write({
        type: "data-researchUpdate",
        data: { title: "Starting...", timestamp: Date.now(), type: "started" }
      });

      try {
        // 3. Perform operation (currently mock data, will be DB queries)
        const results = await databaseQuery(query, limit);

        // 4. Stream completion to UI
        dataStream.write({
          type: "data-researchUpdate",
          data: { title: "Complete", timestamp: Date.now(), type: "completed" }
        });

        // 5. Return structured output
        return { results, totalResults: results.length };
      } catch (error) {
        log.error({ error }, "toolName: failure");
        return { error: error.message };
      }
    }
  });
```

#### Integration with Chat API

Tools are invoked via `streamText()` in `app/(chat)/api/chat/route.ts:549-564`:

```typescript
const result = streamText({
  model: getLanguageModel(modelDefinition.apiModelId),
  system: systemPrompt(),
  messages: contextForLLM,
  activeTools,  // Budget-filtered tool names
  tools: getTools({ dataStream, session, ... }),  // Full tool registry
  // ...
});
```

**Budget-Based Filtering:**
- Tools have associated credit costs
- `filterAffordableTools()` removes tools user can't afford
- Prevents expensive operations without sufficient credits

#### For HR Feature

The tool integration remains mostly unchanged:
1. Keep tool structure (description, inputSchema, execute)
2. Replace mock data constants with database queries
3. Remove artificial delays
4. Maintain same return structure for UI compatibility
5. Keep RBAC checks in execute functions
6. Keep streaming updates for real-time feedback

**Example Transformation:**
```typescript
// BEFORE (mock data)
const data = MOCK_EMPLOYEE_DATA;
await new Promise(resolve => setTimeout(resolve, 800));
return data.balances;

// AFTER (database)
const { getLeaveBalanceByUserId } = await import("@/lib/db/queries");
const balances = await getLeaveBalanceByUserId(userId);
return balances;
```

**Code References:**
- `lib/ai/tools/tools.ts:100-106` - HR tool registration
- `lib/ai/tools/leave-balance.ts:117-241` - Tool structure example
- `lib/ai/tools/team-availability.ts:287-296` - RBAC check pattern
- `app/(chat)/api/chat/route.ts:381-403` - Budget filtering

---

## Code References

### Admin Panel
- `app/admin/layout.tsx:7-44` - Admin layout with session and providers
- `app/admin/users/page.tsx:1-19` - Users page structure
- `components/admin/admin-sidebar-nav.tsx:44-101` - Navigation configuration
- `components/admin/user-list-table.tsx:28-156` - List view with tRPC
- `components/admin/create-user-dialog.tsx:30-210` - Dialog form pattern
- `components/admin/user-actions.tsx:37-124` - Actions dropdown

### HR Tools
- `lib/ai/tools/leave-balance.ts:58-115` - Leave balance mock data
- `lib/ai/tools/benefits-info.ts:83-251` - Benefits mock data
- `lib/ai/tools/hr-case.ts:95-220` - HR case mock data
- `lib/ai/tools/team-availability.ts:92-175` - Team availability mock data
- `lib/ai/tools/people-search.ts:102-290` - Employee directory mock data

### Database Layer
- `lib/db/schema.ts:203-218` - User table definition
- `lib/db/schema.ts:29-77` - UploadedDocument with indexes
- `lib/db/queries.ts:778-839` - Pagination query pattern
- `lib/db/client.ts:6-27` - Database client singleton
- `lib/repositories/credits.ts:44-106` - Repository pattern
- `drizzle.config.ts:1-16` - Drizzle configuration

### Authentication & Authorization
- `lib/auth.ts:21-44` - Better Auth configuration
- `lib/auth.ts:38-42` - Admin plugin config
- `trpc/init.ts:143-170` - adminProcedure middleware
- `trpc/routers/admin.router.ts:12-88` - List users query
- `trpc/routers/admin.router.ts:90-140` - Create user mutation
- `proxy.ts:48-65` - Middleware admin check (not active)

### Tool Integration
- `lib/ai/tools/tools.ts:25-108` - getTools() registry
- `lib/ai/tools/tools-definitions.ts:74-98` - Tool metadata
- `app/(chat)/api/chat/route.ts:381-403` - Budget filtering
- `app/(chat)/api/chat/route.ts:549-564` - streamText invocation

## Architecture Insights

### Patterns to Reuse

1. **Dialog-Based CRUD Pattern**
   - All create/edit operations in dialogs (not separate pages)
   - React Hook Form + Zod for validation
   - Success callbacks for cache invalidation
   - Consistent UI/UX across all admin sections

2. **tRPC Procedure Pattern**
   - All admin operations use `adminProcedure`
   - Input validation with Zod schemas
   - Dynamic imports for query functions
   - Consistent error handling with TRPCError

3. **Centralized Queries Pattern**
   - Most CRUD in `lib/db/queries.ts`
   - Complex domain logic in `lib/repositories/`
   - Separation of concerns: routers handle auth, queries handle data

4. **Type Inference Pattern**
   - Schema-first with Drizzle
   - `InferSelectModel` and `InferInsertModel` for types
   - No manual type maintenance

5. **Soft Delete Pattern**
   - `deletedAt` timestamp for recoverable deletion
   - All queries filter `isNull(deletedAt)`
   - Audit trail and data recovery

6. **Tool Factory Pattern**
   - Tools as factory functions accepting config
   - Close over context (dataStream, session)
   - Consistent execute function structure

### Database Design Recommendations

Based on existing patterns, here's the recommended table structure:

**Core Tables:**
1. `employee` - Extended user info with HR fields
2. `leaveBalance` - One-to-one with employee
3. `benefitsPlan` - Available plan options
4. `benefitsEnrollment` - One-to-one with employee, references plans
5. `dependent` - One-to-many with employee
6. `hrCase` - Support tickets
7. `caseUpdate` - One-to-many with hrCase
8. `absence` - Approved time off
9. `leaveRequest` - Pending requests

**Relationships:**
- `employee` has foreign key to `user.id`
- `employee.managerId` references `employee.id` (self-referential)
- All HR tables reference `employee.id` with cascade delete
- Use JSON columns for flexible data (e.g., plan details, coverage options)
- Indexes on frequently queried fields (employeeId, status, department)

**Seeding Strategy:**
- Create `lib/db/seeds/hr-data.ts` with seed functions
- Check for existing data before inserting
- Match current mock data structure exactly
- Include "Reset to Defaults" functionality in admin UI

### UI Structure Recommendations

Following the existing admin panel pattern:

**Routes:**
- `/admin/hr-data` - Dashboard with section cards
- `/admin/hr-data/employees` - Employee directory list
- `/admin/hr-data/leave-balances` - Leave balance management
- `/admin/hr-data/benefits` - Benefits plans and enrollments
- `/admin/hr-data/cases` - HR case management
- `/admin/hr-data/availability` - Team availability calendar

**Components:**
- `HRDataDashboard` - Main dashboard with stats
- `EmployeeListTable` - Employee directory with search
- `CreateEmployeeDialog` - Add employee form
- `EditEmployeeDialog` - Update employee form
- `EmployeeActions` - Dropdown with edit/delete/view
- Similar patterns for each HR data section

**Navigation:**
Update `components/admin/admin-sidebar-nav.tsx` to add "HR Data" link.

### Tool Refactoring Strategy

For each of the 5 HR tools:

1. **Create Database Queries** (`lib/db/queries.ts`):
   ```typescript
   export async function getLeaveBalanceByUserId(userId: string) {
     // Query leaveBalance table joined with employee
   }
   ```

2. **Update Tool Execute Function**:
   ```typescript
   execute: async ({ query, employeeId }) => {
     // Replace: const data = MOCK_EMPLOYEE_DATA;
     // With: const { getLeaveBalanceByUserId } = await import("@/lib/db/queries");
     //       const data = await getLeaveBalanceByUserId(employeeId);

     // Remove simulated delay

     // Keep same return structure
     return { balances: data.balances, ... };
   }
   ```

3. **Handle RBAC Context**:
   - Team Availability needs `session.user.managerId` to load team
   - People Search needs `session.user.role === "hr"` check
   - Pass session context to tool execute functions

4. **Test Tool Output**:
   - Ensure return structure matches current mock data
   - Verify UI components still render correctly
   - Test all RBAC scenarios

## Web Research Documents

No external dependencies or framework-specific features required for this feature so no web research documents were created.

All necessary technology is already in use in the codebase:
- **Next.js 15** - App Router, Server Components, API Routes
- **Drizzle ORM** - PostgreSQL database with migrations
- **tRPC** - Type-safe API layer with React Query integration
- **Better Auth** - Authentication and RBAC
- **shadcn/ui** - UI components (dialogs, forms, tables)
- **Zod** - Schema validation
- **React Hook Form** - Form state management

The implementation will follow existing architectural patterns without requiring new external packages.

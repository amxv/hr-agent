# Database Migrations and Schema Changes Research

## Overview

This project uses **Drizzle ORM** with **PostgreSQL** for database management. Migrations are handled through Drizzle Kit, which generates SQL migration files based on schema changes defined in TypeScript. The system is designed for strong type safety, with automatic generation of migration files and a straightforward running process.

### Key Technologies:
- **ORM**: Drizzle ORM v0.34.0 (`/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts`)
- **Migration Tool**: Drizzle Kit v0.25.0 (`drizzle.config.ts`)
- **Database**: PostgreSQL
- **Connection Driver**: postgres v3.4.4
- **Migration Runner**: Custom script (`/Users/ashray/code/amxv/agentdune-chat/lib/db/migrate.ts`)

---

## Architecture Overview

### 1. Configuration (`/Users/ashray/code/amxv/agentdune-chat/drizzle.config.ts`)

```typescript
export default defineConfig({
  schema: "./lib/db/schema.ts",           // Source of truth for schema
  out: "./lib/db/migrations",             // Output directory for migrations
  dialect: "postgresql",                  // Database type
  dbCredentials: {
    url: process.env.POSTGRES_URL!,       // Connection string from .env.local
  },
});
```

**Key Points:**
- Schema source: `/lib/db/schema.ts` (lines 1-199)
- Migrations output: `/lib/db/migrations/` directory
- Connection string: `POSTGRES_URL` environment variable from `.env.local`
- Uses Drizzle Kit's built-in generators

### 2. Database Connection (`/Users/ashray/code/amxv/agentdune-chat/lib/db/client.ts`)

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";

const client = postgres(env.POSTGRES_URL);
export const db = drizzle(client);
```

**Details:**
- Single export: `db` instance (line 9)
- Used throughout the application via direct imports
- Establishes connection pool with default settings (see `migrate.ts` line 15: `{ max: 1 }` for migrations)

### 3. Migration Runner (`/Users/ashray/code/amxv/agentdune-chat/lib/db/migrate.ts`)

```typescript
const runMigrate = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  console.log("⏳ Running migrations...");

  const start = Date.now();
  await migrate(db, { migrationsFolder: "./lib/db/migrations" });
  const end = Date.now();

  console.log("✅ Migrations completed in", end - start, "ms");
  process.exit(0);
};
```

**Key Features:**
- Validates `POSTGRES_URL` environment variable (line 11-13)
- Uses connection with `max: 1` pool size to prevent concurrent issues (line 15)
- Runs migrations from `./lib/db/migrations` folder (line 21)
- Provides timing feedback (lines 20-24)
- Exits with status code for CI/CD integration (lines 25, 31)
- Error handling with descriptive output (lines 28-31)

---

## Schema Definition System

### Main Schema File (`/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts`)

**Structure:**
- Uses `pgTable()` from `drizzle-orm/pg-core` to define tables
- Each table exports a TypeScript type using `InferSelectModel<typeof table>`
- Supports column constraints, relationships, and default values

**Example from Current Schema:**

```typescript
// User table - line 138-149
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

export type User = InferSelectModel<typeof user>;
```

**Column Definition Patterns:**
- `pgTable("tableName", {...})` - Define table with name and columns
- Column modifiers:
  - `.primaryKey()` - Set as primary key
  - `.notNull()` - Column is required
  - `.unique()` - Unique constraint
  - `.default(value)` - Default value on insert
  - `.defaultNow()` - Use current timestamp
  - `.$onUpdate(fn)` - Update function on modification
  - `.references(() => otherTable.column)` - Foreign key
  - `.enum([...])` - Restrict to enum values
  - `{ length: 256 }` - String length limit

**Available Column Types:**
- `text()` - Unlimited text
- `varchar({ enum: [...] })` or `varchar({ length: N })` - Limited text/enum
- `uuid()` - UUID type
- `integer()` - Integer values
- `boolean()` - True/false
- `timestamp()` - Date/time
- `json()` - JSON data
- `foreignKey()` - Complex composite foreign keys

**Related Tables in Schema:**
- `user` (lines 138-149) - Main user table
- `userCredit` (lines 17-26) - User credit tracking with foreign key to user
- `session` (lines 151-164) - Authentication sessions
- `account` (lines 166-184) - OAuth accounts
- `verification` (lines 186-196) - Email/OTP verification
- `chat` (lines 28-42) - Chat conversations
- `message` (lines 44-61) - Messages in chats
- `vote` (lines 65-85) - Message voting
- `document` (lines 87-111) - AI-generated documents
- `suggestion` (lines 113-137) - Document suggestions

---

## Migration Files System

### File Location & Storage

**Path:** `/Users/ashray/code/amxv/agentdune-chat/lib/db/migrations/`

**Current Migration Files (26 total):**
```
0000_keen_devos.sql                      - Initial schema (User, Chat tables)
0001_sparkling_blue_marvel.sql          - Suggestion and Document tables
0002_wandering_riptide.sql              - ...
...
0026_slippery_aaron_stack.sql           - Latest migration
```

**File Naming Convention:**
- Format: `{NNNN}_{random_name}.sql`
- NNNN: Sequential 4-digit number starting from 0000
- Random name: Auto-generated by Drizzle Kit (comic character names)
- Generated automatically by `drizzle-kit generate` command

### Migration Metadata (`/Users/ashray/code/amxv/agentdune-chat/lib/db/migrations/schema.ts`)

```typescript
// Extracted from migration runner - tracks applied migrations
export const chat = pgTable("Chat", {...});
export const message = pgTable("Message", {...});
// ... other tables
```

This file stores the schema definitions used during migration generation, allowing Drizzle Kit to compare against current schema and detect changes.

---

## Migration Examples from Current Codebase

### Example 1: Adding a Column with Default Value

**File:** `/Users/ashray/code/amxv/agentdune-chat/lib/db/migrations/0003_cloudy_glorian.sql`

```sql
ALTER TABLE "Chat" ADD COLUMN "visibility" varchar DEFAULT 'private' NOT NULL;
```

**Pattern Used:**
- `ALTER TABLE "TableName"` - Modify existing table
- `ADD COLUMN "columnName" type` - Add new column
- `DEFAULT 'value'` - Set default for existing rows
- `NOT NULL` - Make column required

### Example 2: Adding Multiple Columns with Update

**File:** `/Users/ashray/code/amxv/agentdune-chat/lib/db/migrations/0020_strange_senator_kelly.sql`

```sql
-- Add updatedAt column if it doesn't exist
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
-- Update existing rows to have updatedAt = createdAt for consistency
UPDATE "Chat" SET "updatedAt" = "createdAt" WHERE "updatedAt" != "createdAt";
```

**Pattern Used:**
- `ADD COLUMN IF NOT EXISTS` - Idempotent column addition
- Data migration with `UPDATE` statement
- `statement-breakpoint` - Drizzle separator between SQL statements

### Example 3: Complex Schema Restructuring

**File:** `/Users/ashray/code/amxv/agentdune-chat/lib/db/migrations/0025_keen_blackheart.sql` (87 lines)

```sql
-- Create new tables
CREATE TABLE IF NOT EXISTS "account" (...)
CREATE TABLE IF NOT EXISTS "session" (...)

-- Rename table
ALTER TABLE "User" RENAME TO "user";

-- Rename columns
ALTER TABLE "user" RENAME COLUMN "createdAt" TO "created_at";

-- Drop foreign keys
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_userId_User_id_fk";

-- Change column type
ALTER TABLE "Chat" ALTER COLUMN "userId" SET DATA TYPE text;

-- Drop column default
ALTER TABLE "user" ALTER COLUMN "id" DROP DEFAULT;

-- Add constraints
ALTER TABLE "user" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;

-- Recreate foreign keys with exception handling
DO $$ BEGIN
 ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk"
   FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create unique constraints
ALTER TABLE "user" ADD CONSTRAINT "user_email_unique" UNIQUE("email");
```

**Pattern Used:**
- Drizzle wraps foreign key additions in `DO $$ BEGIN ... EXCEPTION ... END $$;` for idempotency
- Handles `duplicate_object` exceptions gracefully
- Supports cascading deletes with `ON DELETE cascade`
- Column type conversions with `ALTER COLUMN ... SET DATA TYPE`
- Comprehensive table restructuring in single migration

### Example 4: Creating New Table with Foreign Keys

**File:** `/Users/ashray/code/amxv/agentdune-chat/lib/db/migrations/0010_wide_invisible_woman.sql`

```sql
CREATE TABLE IF NOT EXISTS "CreditTransaction" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL,
  "amount" integer NOT NULL,
  "type" varchar NOT NULL,
  "description" text NOT NULL,
  "relatedChatId" uuid,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_User_id_fk"
   FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
```

**Pattern Used:**
- `DEFAULT gen_random_uuid()` for UUID columns
- `CREATE TABLE IF NOT EXISTS` for idempotency
- Foreign keys wrapped in exception handling
- Separate constraints from table creation

---

## Workflow: Adding New Fields to Existing Tables

### Step 1: Update TypeScript Schema Definition

Modify `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts`:

```typescript
// Example: Adding 'role' field to user table
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  // NEW FIELD:
  role: varchar("role", { enum: ["admin", "user", "moderator"] })
    .default("user")
    .notNull(),
  // NEW FIELD:
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

**Key Considerations:**
- Add column definitions to the table definition object
- Include default values for existing rows: `.default("user")`
- Use `.notNull()` for required fields
- Use `varchar({ enum: [...] })` for enum fields
- Maintain consistent naming convention (camelCase in code, snake_case in DB)

### Step 2: Generate Migration File

```bash
npm run db:generate
```

Or using direct command:

```bash
drizzle-kit generate
```

**What Happens:**
- Drizzle Kit compares current schema in `/lib/db/schema.ts` against `/lib/db/migrations/schema.ts`
- Detects new fields in `user` table
- Generates new SQL migration file in `/lib/db/migrations/`
- File name: `{NNNN}_descriptive_name.sql` (auto-generated)
- Updates `/lib/db/migrations/schema.ts` with new schema

**Generated Migration File (Example):**

```sql
-- File: 0027_add_user_fields.sql
ALTER TABLE "user" ADD COLUMN "role" varchar DEFAULT 'user' NOT NULL;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "status" varchar DEFAULT 'active' NOT NULL;
```

### Step 3: Run Migration

```bash
npm run db:migrate
```

Or using direct script:

```bash
npx tsx lib/db/migrate.ts
```

**What Happens (from `migrate.ts` lines 10-26):**
1. Validates `POSTGRES_URL` is set in `.env.local`
2. Creates connection with limited pool (`max: 1`)
3. Runs migrator from `./lib/db/migrations` directory
4. Executes all pending migrations in order
5. Prints timing: `✅ Migrations completed in XXX ms`
6. Exits with code 0 (success) or 1 (failure)

**Integration in Build Process (from `package.json` line 9):**
```bash
"build": "(cd packages/models && bun run build) && tsx lib/db/migrate && next build"
```

Migrations run automatically during the build process before Next.js build starts.

### Step 4: Use Updated Schema in Code

```typescript
import { db } from "@/lib/db/client";
import { user, type User } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Create user with new fields
await db.insert(user).values({
  id: "user-123",
  name: "John Doe",
  email: "john@example.com",
  role: "admin",        // NEW
  status: "active",     // NEW
});

// Query users with new fields
const admins = await db
  .select()
  .from(user)
  .where(eq(user.role, "admin"));

// Filter by status
const activeUsers = await db
  .select()
  .from(user)
  .where(eq(user.status, "active"));
```

---

## Available npm Scripts for Database Operations

From `/Users/ashray/code/amxv/agentdune-chat/package.json` lines 12-18:

```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "npx tsx lib/db/migrate.ts",
  "db:studio": "drizzle-kit studio",
  "db:push": "drizzle-kit push",
  "db:pull": "drizzle-kit pull",
  "db:check": "drizzle-kit check",
  "db:up": "drizzle-kit up"
}
```

### Script Descriptions

| Script | Purpose | Usage |
|--------|---------|-------|
| `npm run db:generate` | Generate SQL migration files from schema changes | After modifying `/lib/db/schema.ts` |
| `npm run db:migrate` | Run all pending migrations | Before deploying or during build |
| `npm run db:studio` | Open Drizzle Studio GUI for database inspection | Debugging: `npm run db:studio` |
| `npm run db:push` | Push schema directly to database (no migration files) | Quick development only, not recommended for production |
| `npm run db:pull` | Pull existing database schema into Drizzle | When working with existing database |
| `npm run db:check` | Validate schema consistency without applying | Dry-run to catch issues |
| `npm run db:up` | Apply migrations with interactive UI | Alternative to db:migrate |

### Recommended Workflow

**Development:**
```bash
# 1. Modify schema
# 2. Generate migration
npm run db:generate

# 3. Review generated SQL in /lib/db/migrations/
# 4. Run migration locally
npm run db:migrate

# 5. Test changes
npm run dev
```

**Pre-deployment:**
```bash
# Verify no pending migrations
npm run db:check

# Run migrations
npm run db:migrate

# Deploy application
```

---

## Best Practices for Schema Changes

### 1. Always Generate Migrations, Never Edit SQL Directly

**DO:**
```typescript
// Modify schema.ts, then run db:generate
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  // Add new fields here
  role: varchar("role").default("user").notNull(),
});
```

**DON'T:**
```sql
-- Don't write SQL manually
ALTER TABLE "user" ADD COLUMN "role" varchar;
```

**Why:** Drizzle Kit ensures idempotency, handles edge cases, and keeps schema.ts as single source of truth.

### 2. Use Default Values for New Required Columns

**DO:**
```typescript
status: varchar("status", { enum: ["active", "inactive"] })
  .default("active")
  .notNull(),
```

**DON'T:**
```typescript
status: varchar("status", { enum: ["active", "inactive"] })
  .notNull(), // No default - will fail on existing rows
```

**Why:** When adding `.notNull()` column to table with existing rows, default is needed to populate existing records.

### 3. Include Error Handling in Application Code

```typescript
export async function saveUser(userData: {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}) {
  try {
    return await db.insert(user).values(userData);
  } catch (error) {
    console.error("Failed to save user:", error);
    throw error;
  }
}
```

From queries.ts pattern (lines 17-21), all database operations wrap in try-catch.

### 4. Use Enums for Limited Values

**DO:**
```typescript
varchar("role", { enum: ["admin", "user", "moderator"] })
  .notNull()
```

**DON'T:**
```typescript
text("role").notNull() // No type safety
```

**Why:** Provides database-level validation and TypeScript type narrowing.

### 5. Test Migrations on Development Database First

```bash
# 1. Generate
npm run db:generate

# 2. Review generated SQL
cat lib/db/migrations/[latest].sql

# 3. Test locally
npm run db:migrate

# 4. Verify with Drizzle Studio
npm run db:studio

# 5. Test application
npm run dev
```

### 6. Keep Migration Files Immutable

**Once committed to version control, never modify migration files.**

If migration has issues:
1. Create a new migration to fix
2. Don't edit the existing SQL file
3. This ensures deployment consistency across environments

### 7. Document Complex Migrations

Add SQL comments:

```typescript
// In schema.ts, add comments before generating
export const user = pgTable("user", {
  // ... existing fields ...

  // NEW: Added for role-based access control (feature #123)
  role: varchar("role", { enum: ["admin", "user", "moderator"] })
    .default("user")
    .notNull(),
});
```

This will appear in generated SQL.

### 8. Use Composite Foreign Keys Carefully

**Pattern from migration 0025 (lines 75-85):**

```typescript
export const suggestion = pgTable(
  "Suggestion",
  {
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    // ...
  },
  (table) => ({
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);
```

Use this pattern when:
- Multiple columns form the foreign key relationship
- Composite primary keys exist
- Document example: references both `id` and `createdAt` from document table

---

## Query Examples Using Updated Schema

### From `/Users/ashray/code/amxv/agentdune-chat/lib/db/queries.ts`

**Pattern 1: Insert with New Fields**

```typescript
export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
      title,
      // Could add new fields here:
      // role: "admin",
      // status: "active",
    });
  } catch (error) {
    console.error("Failed to save chat in database");
    throw error;
  }
}
```

**Pattern 2: Query with Filters on New Fields**

```typescript
import { eq } from "drizzle-orm";

export async function getActiveAdminUsers() {
  try {
    return await db
      .select()
      .from(user)
      .where(
        and(
          eq(user.role, "admin"),
          eq(user.status, "active")
        )
      );
  } catch (error) {
    console.error("Failed to get admin users");
    throw error;
  }
}
```

From imports (line 3):
```typescript
import { and, asc, desc, eq, gt, gte, inArray } from "drizzle-orm";
```

---

## Environment Configuration

### Required Environment Variable

**File:** `.env.local` (not committed to git)

```
POSTGRES_URL=postgresql://user:password@host:port/database
```

**Validation:**
- Checked in `migrate.ts` line 11-13
- Checked in `drizzle.config.ts` line 14
- Must be valid PostgreSQL connection string
- Format: `postgresql://[user[:password]@][host][:port][/db-name]`

**Example values:**
```
# Local development
POSTGRES_URL=postgresql://postgres:password@localhost:5432/rag_db

# Vercel PostgreSQL (Postgres.js style)
POSTGRES_URL=postgresql://user:password@ec2-1-2-3-4.compute-1.amazonaws.com:5432/dbname?sslmode=require
```

---

## Integration with Build Process

**From `package.json` line 9:**

```json
{
  "build": "(cd packages/models && bun run build) && tsx lib/db/migrate && next build"
}
```

**Execution Order:**
1. Build AI models package
2. Run migrations via `tsx lib/db/migrate.ts`
3. Next.js build process
4. If migrations fail, build fails (exit code 1)

**Build Stages:**
- Migrations run BEFORE Next.js build
- All schema changes applied before application starts
- Ensures fresh database state in production

---

## Troubleshooting Guide

### Issue: "POSTGRES_URL is not defined"

**Cause:** Missing `.env.local` file or environment variable not set

**Solution:**
```bash
# Create .env.local
echo "POSTGRES_URL=postgresql://..." > .env.local

# Or set environment variable
export POSTGRES_URL=postgresql://...

# Then run migration
npm run db:migrate
```

### Issue: Migration File Not Generated

**Cause:** Schema change not detected or already applied

**Solution:**
```bash
# Verify schema.ts has changes
cat lib/db/schema.ts

# Check migrations/schema.ts is older
cat lib/db/migrations/schema.ts

# Force check
npm run db:check

# Generate with verbose output
npx drizzle-kit generate --verbose
```

### Issue: "duplicate_object" Error

**Cause:** Migration already applied or constraint already exists

**Solution:** This is handled by Drizzle with:
```sql
DO $$ BEGIN
  -- Add constraint
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
```

Safe to re-run migrations.

### Issue: Type Mismatch in Queries

**Cause:** Schema changed but code not updated

**Solution:**
```typescript
// After schema change, TypeScript will show errors
const user = await db.select().from(user).where(...);
user.role  // TS error if role doesn't exist in type
           // TS auto-suggestion if added to schema

// Update queries to use new fields
```

---

## Summary Table: Migration Workflow

| Step | Command | Purpose | Output |
|------|---------|---------|--------|
| 1 | Edit `schema.ts` | Define schema change | Modified TypeScript file |
| 2 | `npm run db:generate` | Create SQL migration | New file: `/lib/db/migrations/{NNNN}_{name}.sql` |
| 3 | Review SQL | Validate generated migration | Check for correctness |
| 4 | `npm run db:migrate` | Apply to database | ✅ Migrations completed |
| 5 | Test in code | Use new fields in queries | Updated queries with new fields |
| 6 | Commit | Version control | `.sql` files and `schema.ts` in git |

---

## Files Referenced in This Document

### Configuration Files
- `/Users/ashray/code/amxv/agentdune-chat/drizzle.config.ts` - Drizzle Kit configuration
- `/Users/ashray/code/amxv/agentdune-chat/package.json` - npm scripts and dependencies

### Schema & Migrations
- `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts` - TypeScript schema definitions (199 lines)
- `/Users/ashray/code/amxv/agentdune-chat/lib/db/migrations/schema.ts` - Migration schema metadata
- `/Users/ashray/code/amxv/agentdune-chat/lib/db/migrations/` - SQL migration files (26 total)

### Database Operations
- `/Users/ashray/code/amxv/agentdune-chat/lib/db/client.ts` - Database connection client
- `/Users/ashray/code/amxv/agentdune-chat/lib/db/migrate.ts` - Migration runner script (33 lines)
- `/Users/ashray/code/amxv/agentdune-chat/lib/db/queries.ts` - Query functions with patterns

### Example Migrations
- `/Users/ashray/code/amxv/agentdune-chat/lib/db/migrations/0003_cloudy_glorian.sql` - Simple ADD COLUMN
- `/Users/ashray/code/amxv/agentdune-chat/lib/db/migrations/0020_strange_senator_kelly.sql` - ADD with UPDATE
- `/Users/ashray/code/amxv/agentdune-chat/lib/db/migrations/0025_keen_blackheart.sql` - Complex restructuring (87 lines)
- `/Users/ashray/code/amxv/agentdune-chat/lib/db/migrations/0010_wide_invisible_woman.sql` - CREATE TABLE with FKs


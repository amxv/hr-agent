# Database Schema Drift Analysis

**Date**: 2025-10-21
**Status**: Schema drift identified - migrations currently broken

## Executive Summary

The database schema has drifted from `lib/db/schema.ts`, causing migration commands to fail. The main issues are related to table naming conventions (PascalCase vs snake_case) and potential differences in primary key definitions for some tables.

## Good News First

✅ **User table is correct**: The database `user.id` is `text` type (not `uuid`), matching our schema
✅ **Admin columns already applied**: `role`, `banned`, `ban_reason`, `ban_expires` columns exist in database
✅ **Session table updated**: `impersonated_by` column already exists

## Key Differences Found

### 1. Table Naming Conventions

**Database** (from `db:pull`):
- Uses **PascalCase** for some tables: `Chat`, `Message`, `Document`, `Suggestion`, `Vote`, `UserCredit`
- Uses **snake_case** for auth tables: `user`, `session`, `account`, `verification`

**schema.ts**:
- Need to verify if export names match database table names

### 2. Chat Table

**Actual Database** (`lib/db/migrations/schema.ts:7-24`):
```typescript
export const chat = pgTable("Chat", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  // ...
  userId: text().notNull(),  // ✅ text type - correct
});
```

**Expected in schema.ts**:
- Should use PascalCase `"Chat"` as table name
- `id` should be `uuid().defaultRandom()`
- Foreign key references `user.id` (text) - this should work

### 3. Document Table

**Actual Database** (`lib/db/migrations/schema.ts:187-209`):
```typescript
export const document = pgTable("Document", {
  id: uuid().defaultRandom().notNull(),  // NOT primary key alone
  createdAt: timestamp({ mode: 'string' }).notNull(),
  // ...
},
(table) => {
  return {
    documentIdCreatedAtPk: primaryKey({
      columns: [table.createdAt, table.id],
      name: "Document_id_createdAt_pk"
    }),
  }
});
```

**Key Issue**:
- Composite primary key: `(createdAt, id)`
- This is different from most tables which have single-column primary keys
- Error message: `constraint "document_id_createdat_pk" of relation "Document" does not exist`
- This suggests the constraint definition might have changed

### 4. Timestamp Modes

**Actual Database**:
```typescript
timestamp({ mode: 'string' })  // Returns strings
```

**Our schema.ts**:
```typescript
timestamp("created_at")  // Default mode (Date objects)
```

**Impact**: Type mismatch in returned values (strings vs Date objects)

## Root Cause Analysis

The migration errors occurred because:

1. **Constraint mismatch on Document table**: The migration system expected a constraint that doesn't exist or was named differently
2. **Pre-existing migrations**: The `__drizzle_migrations` table shows migrations were already applied, creating potential conflicts
3. **Schema definition drift**: The actual schema evolved separately from the tracked migrations

## Recommendations

### Option 1: Update schema.ts to match database (Quick Fix)
**Pros**: Fast, minimal risk, allows migrations to work
**Cons**: May require updating TypeScript types throughout codebase

**Steps**:
1. Copy the pulled schema from `lib/db/migrations/schema.ts` to `lib/db/schema.ts`
2. Merge in any custom types/relations we need
3. Run `bun db:generate` to create a baseline migration
4. Mark it as already applied (if needed)

### Option 2: Fix database to match schema.ts (Risky)
**Pros**: Maintains our intended schema design
**Cons**: Requires manual SQL, risk of data loss, complex

**Steps**:
1. Analyze differences in detail
2. Write manual SQL to fix each issue
3. Test thoroughly on staging database first

### Option 3: Hybrid Approach (Recommended)
**Pros**: Balances safety and correctness
**Cons**: Takes more time

**Steps**:
1. Accept the pulled schema as source of truth for existing tables
2. Update `lib/db/schema.ts` to match the pulled schema
3. Verify all foreign keys and constraints work
4. Test that the app still works with the corrected types
5. Going forward, all changes go through proper migrations

## Action Items

1. **Immediate**: Use Option 3 (Hybrid Approach)
2. **Short-term**: Update `lib/db/schema.ts` with corrections
3. **Medium-term**: Establish migration workflow documentation
4. **Long-term**: Add pre-commit hook to detect drift

## Impact on Feature 001 Implementation

**Current Status**: Phase 1 partially complete
- ✅ Admin columns added to database (via direct SQL)
- ✅ Schema.ts updated with admin fields
- ❌ Cannot run migrations normally
- ⏸️ Paused before creating default admin account

**To Resume**:
1. Fix schema drift (choose option above)
2. Verify migrations work: `bun db:generate` && `bun db:migrate`
3. Continue with Phase 1: Create default admin account migration
4. Proceed to Phase 2

## Files to Review

1. **Pulled Schema**: `lib/db/migrations/schema.ts` (actual database)
2. **Current Schema**: `lib/db/schema.ts` (our definition)
3. **Generated Migration**: `lib/db/migrations/0027_giant_bromley.sql` (admin fields)
4. **Migration Config**: `drizzle.config.ts`

## Notes

- The error about "text vs uuid" foreign key was misleading - both sides are actually text
- The real issue is likely constraint name mismatches and table structure differences
- Database is functional despite drift - app is running fine
- This is a tooling/DX issue, not a runtime issue

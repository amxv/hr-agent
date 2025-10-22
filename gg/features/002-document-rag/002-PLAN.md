---
date: 2025-10-22 23:47:00
feature-slug: 002-document-rag
---

# 002-document-rag Implementation Plan

## Overview

We're transforming the AI chat application into an intelligent document-aware agent that can search and retrieve information from a library of uploaded documents. Admins will manage documents through an admin panel, while all users benefit from an agent that can intelligently search across documents, cite sources with clickable links to specific pages, and provide direct access to reference materials.

### Current State Analysis

**What exists:**
- ✅ Robust admin panel at `/admin` with role-based access control (two-layer: middleware + tRPC)
- ✅ Sophisticated chat infrastructure with AI SDK v5, tool integration, and streaming UI
- ✅ File upload system using Vercel Blob for images/PDFs (max 5MB)
- ✅ OpenAI client setup via Vercel AI Gateway Provider using `AI_GATEWAY_API_KEY`
- ✅ Secondary direct OpenAI client for image generation using `OPENAI_API_KEY`
- ✅ Message parts system with tool state lifecycle (`input-available` → `output-available`)
- ✅ Database schema with JSON fields for flexibility, composite keys for versioning
- ✅ Credit-based tool execution system with cost tracking

**What's missing:**
- ❌ OpenAI Vector Store API integration for semantic search
- ❌ Document management database tables and queries
- ❌ Admin UI for document upload, update, delete, and tag management
- ❌ Semantic search and file retrieve tools for the AI agent
- ❌ Citation rendering in chat UI with clickable PDF links
- ❌ Document processing status tracking and error handling

**Key constraints discovered:**
- OpenAI Vector Store supports max 10,000 files, 100 GB total storage, 512 MB per file
- File processing can take minutes to days (< 1 MB: 1-5 min, 200-512 MB: 8+ hours to days)
- No direct file update API - must delete old and upload new
- Browser PDF `#page=N` fragments work in Chrome/Firefox/Edge but NOT Safari
- Message parts stored as JSON array in database - must maintain structure
- Tools write intermediate updates via `dataStream`, final results returned directly

### Desired End State

**After implementation:**
1. ✅ Admins can upload documents (PDF, DOCX, TXT, etc.) through `/admin/documents`
2. ✅ Documents are automatically indexed in OpenAI's vector store for semantic search
3. ✅ Admins can view document library with status (uploading, processing, ready, failed)
4. ✅ Admins can update documents (replace with new version) and delete documents
5. ✅ Admins can organize documents with free-form tags (auto-suggest from existing)
6. ✅ AI agent has semantic search tool to query documents by natural language
7. ✅ AI agent has file retrieve tool to load entire documents into context
8. ✅ Agent autonomously decides when to use each tool based on query characteristics
9. ✅ Tool invocations visible in chat UI ("Searching documents...")
10. ✅ Agent responses include citations with clickable links to source PDFs at specific pages
11. ✅ All users (admin and non-admin) benefit from document search in chat
12. ✅ Non-admin users cannot view document library or access management features
13. ✅ System handles processing failures, API errors, and concurrent operations gracefully

**Verification:**
- Admin uploads PDF → Status shows "processing" → Changes to "ready" after indexing
- User asks "What's our return policy?" → Agent uses semantic search → Returns answer with citation
- Click citation → Opens PDF in new tab at correct page (if browser supports)
- Admin clicks "Update" on document → Uploads new version → Old version removed from vector store
- Upload same filename twice → System allows with suffix (-1, -2, etc.)
- Non-admin user visits `/admin/documents` → Redirected to home with "forbidden" error

### What We're NOT Doing

**Explicitly out of scope:**
- ❌ Multi-tenant document isolation (single organization, shared vector store)
- ❌ Document permissions or row-level security (all documents visible to all users)
- ❌ Document versioning history (update replaces completely, no rollback)
- ❌ Advanced search filters (date ranges, file types) - basic search by name/tags only
- ❌ Custom chunking strategies per document type
- ❌ Document analytics (view counts, search frequency)
- ❌ Email notifications for processing completion
- ❌ Bulk document operations (upload multiple files at once)
- ❌ PDF.js custom viewer with highlighting (use browser native viewer + fragments)
- ❌ Named destinations in PDFs (use page numbers only)
- ❌ Safari fallback detection for PDF fragments (graceful degradation - link without fragment)
- ❌ Document expiration policies or auto-cleanup
- ❌ Storage usage dashboard or alerts
- ❌ Reconciliation job for database/OpenAI sync (manual retry only)
- ❌ Document preview thumbnails in admin UI
- ❌ Full-text search with keyword highlighting (semantic search only)

### Implementation Approach

**High-Level Strategy:**

1. **Database-First:** Establish schema for document metadata and vector store config before any API integration
2. **OpenAI Integration:** Build vector store management layer with robust error handling and status tracking
3. **Admin Backend:** Create tRPC procedures following existing `adminProcedure` pattern for automatic protection
4. **Admin UI:** Extend `/admin` with document management following established Dialog + Table patterns
5. **Agent Tools:** Implement semantic search and file retrieve as AI SDK v5 tools with proper streaming
6. **Chat UI:** Add citation rendering and tool part displays following existing message parts architecture

**Key Design Decisions:**

- **Single Shared Vector Store:** One vector store ID for entire organization (stored in singleton table)
- **Dual Storage:** Documents stored in both Vercel Blob (serving) and OpenAI Files (indexing)
- **Tag Storage:** JSON array in document table (no separate tags table, auto-suggest from distinct query)
- **Update Strategy:** Delete old + upload new (explicit admin action, clear version separation)
- **Status Tracking:** Enum with states: `uploading`, `processing`, `ready`, `failed`
- **Citation Format:** `{ documentId, documentName, pageNumber, excerpt }` → Link: `${blobUrl}#page=${pageNumber}`
- **Soft Deletes:** `deletedAt` timestamp for audit trail, `status` field for processing state
- **Concurrent Updates:** Last-write-wins (no locking, spec FR-045)
- **Error Handling:** Exponential backoff for OpenAI API, graceful degradation in chat, clear error messages in admin UI

**Dependencies:**
- OpenAI SDK v5.8.2 (already installed for image generation)
- AI SDK v5.0.39 (already installed for chat)
- Existing Vercel Blob integration
- Existing tRPC router and admin procedures
- Existing shadcn/ui components

**Integration Points:**
- `lib/ai/providers.ts` - Add OpenAI Files/Vector Store client initialization
- `lib/env.ts` - Verify `OPENAI_API_KEY` available (already exists, optional)
- `lib/db/schema.ts` - Add new tables
- `trpc/routers/admin.router.ts` - Add document procedures
- `lib/ai/tools/` - Add new tools
- `components/message-parts.tsx` - Add tool part renderers
- `app/admin/` - Add new documents page

---

## Database Schema

### New Tables

#### UploadedDocument

Stores metadata for all documents uploaded by admins, including OpenAI references and processing status.

```typescript
export const uploadedDocument = pgTable("UploadedDocument", {
  // Identity
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  filename: text("filename").notNull(),

  // Ownership and timestamps
  uploadedBy: text("uploaded_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"), // Soft delete for audit trail

  // File metadata
  fileSize: integer("file_size").notNull(), // Bytes
  contentType: text("content_type").notNull(), // e.g., "application/pdf"

  // Storage references
  blobUrl: text("blob_url").notNull(), // Vercel Blob URL for serving
  blobPathname: text("blob_pathname").notNull(), // Path in blob storage

  // OpenAI references
  openaiFileId: text("openai_file_id").notNull().unique(), // OpenAI File ID
  vectorStoreId: text("vector_store_id").notNull(), // Shared vector store ID

  // Processing status
  status: varchar("status", {
    enum: ["uploading", "processing", "ready", "failed"]
  }).notNull().default("uploading"),
  errorMessage: text("error_message"), // Set when status = "failed"

  // Organization (tags as JSON array)
  tags: json("tags").$type<string[]>().notNull().default([]),
});

// Index for common queries
export const uploadedDocumentIndexes = {
  uploadedByIdx: index("uploaded_document_uploaded_by_idx").on(uploadedDocument.uploadedBy),
  statusIdx: index("uploaded_document_status_idx").on(uploadedDocument.status),
  vectorStoreIdx: index("uploaded_document_vector_store_id_idx").on(uploadedDocument.vectorStoreId),
  deletedAtIdx: index("uploaded_document_deleted_at_idx").on(uploadedDocument.deletedAt),
};
```

#### VectorStoreConfig

Singleton table storing the shared vector store ID for the organization.

```typescript
export const vectorStoreConfig = pgTable("VectorStoreConfig", {
  id: text("id").primaryKey().default("singleton"), // Always "singleton"
  vectorStoreId: text("vector_store_id").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

### Existing Tables (No Changes)

- `user` - User accounts with role field (admin/user)
- `session` - User sessions
- `Message` - Chat messages with parts JSON field
- `Chat` - Conversation threads
- Other tables remain unchanged

---

## Shared Type Definitions

### Document Types

```typescript
// Document upload and metadata
export type UploadedDocument = {
  id: string;
  filename: string;
  uploadedBy: string;
  uploadedAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  fileSize: number;
  contentType: string;
  blobUrl: string;
  blobPathname: string;
  openaiFileId: string;
  vectorStoreId: string;
  status: "uploading" | "processing" | "ready" | "failed";
  errorMessage: string | null;
  tags: string[];
};

// Vector store singleton config
export type VectorStoreConfig = {
  id: string; // Always "singleton"
  vectorStoreId: string;
  createdAt: Date;
  updatedAt: Date;
};

// Document list query input
export type ListDocumentsInput = {
  searchTerm?: string;
  tags?: string[];
  status?: "uploading" | "processing" | "ready" | "failed";
  limit?: number;
  offset?: number;
};

// Document list query output
export type ListDocumentsOutput = {
  documents: UploadedDocument[];
  total: number;
  hasMore: boolean;
};

// Upload document input
export type UploadDocumentInput = {
  filename: string;
  fileSize: number;
  contentType: string;
  fileBuffer: Buffer;
  tags?: string[];
};

// Update document input
export type UpdateDocumentInput = {
  id: string; // Document to replace
  filename: string;
  fileSize: number;
  contentType: string;
  fileBuffer: Buffer;
  tags?: string[];
};

// Delete document input
export type DeleteDocumentInput = {
  id: string;
};

// Update tags input
export type UpdateTagsInput = {
  id: string;
  tags: string[];
};

// Get all unique tags output
export type GetAllTagsOutput = {
  tags: string[];
};
```

### Citation Types

```typescript
// Citation embedded in agent response
export type Citation = {
  documentId: string;
  documentName: string;
  pageNumber: number | null;
  excerpt: string;
  blobUrl: string;
};

// Citation link props
export type CitationLinkProps = {
  citation: Citation;
  index: number;
};
```

### Tool Types

```typescript
// Semantic search tool input
export type SemanticSearchInput = {
  query: string;
  limit?: number; // Default: 5, max: 20
};

// Semantic search result item
export type SearchResultItem = {
  documentId: string;
  documentName: string;
  chunkContent: string;
  pageNumber: number | null;
  relevanceScore: number;
};

// Semantic search tool output
export type SemanticSearchOutput = {
  results: SearchResultItem[];
  totalResults: number;
};

// File retrieve tool input
export type FileRetrieveInput = {
  documentId: string;
};

// File retrieve tool output
export type FileRetrieveOutput = {
  documentId: string;
  documentName: string;
  content: string;
  pageCount: number | null;
  fileSize: number;
};
```

---

## Phase 1: Database Schema and Environment Setup

### Overview

Establish the database foundation for document management by creating two new tables: `UploadedDocument` for document metadata and `VectorStoreConfig` for the shared vector store ID. Verify environment variables are configured for OpenAI API access.

### Important Codebase Context

#### Files that won't be modified but are important to understand

- `lib/env.ts:1-88` - Environment variable configuration with `@t3-oss/env-nextjs`
  - `OPENAI_API_KEY` already defined at line 25 (optional)
  - Pattern: Server variables in `server` object, client variables in `client` object

- `lib/db/client.ts` - Drizzle client setup
  - Single database connection pool
  - Used by all queries via `import { db } from '@/lib/db/client'`

- `lib/db/migrations/` - Migration files directory
  - Generated via `db:generate` script
  - Applied via `db:migrate` script

#### Files that need to be modified or extended

- `lib/db/schema.ts:1-203` - Database schema definitions
  - Add `uploadedDocument` table after existing tables
  - Add `vectorStoreConfig` table after `uploadedDocument`
  - Export both table definitions

- `drizzle.config.ts` - Drizzle configuration
  - No changes needed, auto-detects new tables

#### New Files that need to be created

- None in this phase (migration file auto-generated)

#### Patterns, Conventions, and Design Decisions to Reuse

- **Table Naming:** PascalCase for table names in pgTable (e.g., `"UploadedDocument"`)
- **Primary Keys:** UUID with `defaultRandom()` for auto-generation
- **Timestamps:** `timestamp()` type with `defaultNow()` for creation, manual update on changes
- **Foreign Keys:** Use `.references()` with `onDelete` cascade behavior
- **JSON Fields:** Use `.json().$type<T>()` for type-safe JSON columns
- **Indexes:** Create index objects for common query patterns (uploaded by, status, etc.)
- **Enums:** Use varchar with enum array for status fields (better than pgEnum for small enums)

#### Key Constraints to work within

- Database connection limits: Single pool, shared across application
- Migration system: Must be idempotent, reversible if needed
- Type inference: Drizzle infers types from schema, use `InferSelectModel` and `InferInsertModel`
- PostgreSQL limits: Max column name length 63 chars, index name length 63 chars

### Changes Required

#### 1. Verify Environment Configuration

**File:** `lib/env.ts`

**Changes:** Verify `OPENAI_API_KEY` is available (already exists at line 25, 64)

**Notes:**
- `OPENAI_API_KEY` is optional server variable
- Used for direct OpenAI client (Files, Vector Store APIs)
- If not set, document upload features will be unavailable (display error in admin UI)
- Feature flag `NEXT_PUBLIC_OPENAI_AVAILABLE` auto-derived at line 81

#### 2. Add Database Tables

**File:** `lib/db/schema.ts`

**Changes:**

Add the following table definitions after the existing `UserCredit` table (after line 26):

1. **UploadedDocument Table** - Document metadata with OpenAI references

```typescript
export const uploadedDocument = pgTable("UploadedDocument", {
  // Identity
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  filename: text("filename").notNull(),

  // Ownership and timestamps
  uploadedBy: text("uploaded_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),

  // File metadata
  fileSize: integer("file_size").notNull(),
  contentType: text("content_type").notNull(),

  // Storage references
  blobUrl: text("blob_url").notNull(),
  blobPathname: text("blob_pathname").notNull(),

  // OpenAI references
  openaiFileId: text("openai_file_id").notNull().unique(),
  vectorStoreId: text("vector_store_id").notNull(),

  // Processing status
  status: varchar("status", {
    enum: ["uploading", "processing", "ready", "failed"]
  }).notNull().default("uploading"),
  errorMessage: text("error_message"),

  // Organization
  tags: json("tags").$type<string[]>().notNull().default([]),
}, (table) => ({
  uploadedByIdx: index("uploaded_document_uploaded_by_idx").on(table.uploadedBy),
  statusIdx: index("uploaded_document_status_idx").on(table.status),
  vectorStoreIdx: index("uploaded_document_vector_store_id_idx").on(table.vectorStoreId),
  deletedAtIdx: index("uploaded_document_deleted_at_idx").on(table.deletedAt),
}));
```

2. **VectorStoreConfig Table** - Singleton for shared vector store ID

```typescript
export const vectorStoreConfig = pgTable("VectorStoreConfig", {
  id: text("id").primaryKey().default("singleton"),
  vectorStoreId: text("vector_store_id").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

**Type Exports:** Add type inference exports after table definitions

```typescript
export type UploadedDocument = InferSelectModel<typeof uploadedDocument>;
export type InsertUploadedDocument = InferInsertModel<typeof uploadedDocument>;
export type VectorStoreConfig = InferSelectModel<typeof vectorStoreConfig>;
export type InsertVectorStoreConfig = InferInsertModel<typeof vectorStoreConfig>;
```

#### 3. Generate and Apply Migration

**Commands:**

1. Generate migration: `pnpm db:generate`
2. Review generated SQL in `lib/db/migrations/`
3. Apply migration: `pnpm db:migrate`

**Verification:**
- Check migration SQL includes CREATE TABLE statements
- Verify indexes are created
- Confirm foreign key constraints are correct
- Test rollback if needed

**Notes:**
- Migration system auto-detects schema changes
- Generated migration file will include both table creations
- Indexes created inline with table definition
- Foreign key to `user.id` ensures cascade delete behavior

---

## Phase 2: OpenAI Vector Store Integration

### Overview

Build the integration layer with OpenAI's Files and Vector Store APIs. This includes initializing a shared vector store for the organization, uploading files to OpenAI, adding files to the vector store, tracking processing status, and handling deletions.

### Important Codebase Context

#### Files that won't be modified but are important to understand

- `lib/ai/tools/generate-image.ts:15-17` - Direct OpenAI client instantiation pattern
  ```typescript
  const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  ```

- `lib/env.ts:25,64` - `OPENAI_API_KEY` environment variable (optional)

- `lib/ai/errors.ts:37-75` - Custom error handling with `ChatSDKError` class
  - Pattern: Error types with surfaces for visibility control
  - Used for API error handling

#### Files that need to be modified or extended

- None (only new files created)

#### New Files that need to be created

- `lib/openai/vector-store.ts` - Vector store management functions
- `lib/openai/files.ts` - File upload and management functions
- `lib/openai/client.ts` - OpenAI client initialization for Files/Vector Store APIs

#### Patterns, Conventions, and Design Decisions to Reuse

- **Client Initialization:** Module-level singleton like `generate-image.ts:15-17`
- **Error Handling:** Try-catch with comprehensive logging, re-throw for upstream handling
- **Exponential Backoff:** For transient API errors (429, 500, 503)
- **Logging:** Use `console.error()` for errors with context object
- **Type Safety:** Import OpenAI types from `openai` package

#### Key Constraints to work within

- OpenAI API rate limits (implement exponential backoff)
- File processing asynchronous (poll status via vector store file counts)
- No direct file update API (must delete old + upload new)
- Vector store capacity: 10,000 files, 100 GB storage
- File size limit: 512 MB per file
- Supported file formats: 20+ types (PDF, DOCX, TXT, MD, code files, etc.)

### Changes Required

#### 1. OpenAI Client Initialization

**File:** `lib/openai/client.ts` (new file)

**Purpose:** Initialize direct OpenAI client for Files and Vector Store APIs

**Implementation:**

```typescript
import OpenAI from "openai";
import { env } from "@/lib/env";

export const openaiClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});
```

**Notes:**
- Module-level singleton pattern (same as `generate-image.ts`)
- Throws if `OPENAI_API_KEY` not set (feature unavailable)
- Shared by files.ts and vector-store.ts

#### 2. Vector Store Management

**File:** `lib/openai/vector-store.ts` (new file)

**Purpose:** Manage vector store lifecycle: create, retrieve, add files, remove files, poll status

**Key Functions:**

1. **`getOrCreateVectorStore()`**
   - **Signature:** `async function getOrCreateVectorStore(): Promise<string>`
   - **Description:** Retrieves existing vector store ID from database singleton, or creates new vector store and saves ID
   - **Implementation Pattern:**
     - Query `VectorStoreConfig` table for singleton record
     - If exists, return `vectorStoreId`
     - If not exists, call `openaiClient.beta.vectorStores.create({ name: "Organization Documents" })`
     - Insert new record in `VectorStoreConfig` with returned ID
     - Return vector store ID
   - **Error Handling:** Catch OpenAI API errors, log, re-throw

2. **`addFileToVectorStore(vectorStoreId: string, fileId: string)`**
   - **Signature:** `async function addFileToVectorStore(vectorStoreId: string, fileId: string): Promise<void>`
   - **Description:** Adds a file to the vector store and initiates indexing (non-blocking)
   - **Implementation Pattern:**
     - Call `openaiClient.beta.vectorStores.files.create(vectorStoreId, { file_id: fileId })`
     - Returns immediately (indexing happens asynchronously)
   - **Error Handling:** Retry on 429 with exponential backoff, throw on other errors

3. **`removeFileFromVectorStore(vectorStoreId: string, fileId: string)`**
   - **Signature:** `async function removeFileFromVectorStore(vectorStoreId: string, fileId: string): Promise<void>`
   - **Description:** Removes a file from the vector store (does not delete the file itself)
   - **Implementation Pattern:**
     - Call `openaiClient.beta.vectorStores.files.del(vectorStoreId, fileId)`
   - **Error Handling:** Ignore 404 errors (file already removed), retry on 429

4. **`pollVectorStoreStatus(vectorStoreId: string)`**
   - **Signature:** `async function pollVectorStoreStatus(vectorStoreId: string): Promise<{ inProgress: number; completed: number; failed: number }>`
   - **Description:** Retrieves current file processing counts from vector store
   - **Implementation Pattern:**
     - Call `openaiClient.beta.vectorStores.retrieve(vectorStoreId)`
     - Extract `file_counts.in_progress`, `file_counts.completed`, `file_counts.failed`
     - Return counts object
   - **Usage:** Called by background job or manual refresh to update document statuses

**Notes:**
- All functions use `openaiClient` from `client.ts`
- Implement exponential backoff for 429 rate limits
- Log all API calls with timing information
- Type-safe with OpenAI SDK types

#### 3. File Upload and Management

**File:** `lib/openai/files.ts` (new file)

**Purpose:** Upload files to OpenAI, retrieve file content, delete files

**Key Functions:**

1. **`uploadFileToOpenAI(filename: string, fileBuffer: Buffer)`**
   - **Signature:** `async function uploadFileToOpenAI(filename: string, fileBuffer: Buffer): Promise<string>`
   - **Description:** Uploads a file to OpenAI's Files API and returns the file ID
   - **Implementation Pattern:**
     - Convert buffer to Blob: `new Blob([fileBuffer])`
     - Call `openaiClient.files.create({ file: blob, purpose: "assistants" })`
     - Return `file.id`
   - **Error Handling:** Retry on 429, throw on 400 (invalid format/size)

2. **`retrieveFileContent(fileId: string)`**
   - **Signature:** `async function retrieveFileContent(fileId: string): Promise<string>`
   - **Description:** Retrieves full file content from OpenAI (used by file retrieve tool)
   - **Implementation Pattern:**
     - Call `openaiClient.files.content(fileId)`
     - Read response as text
     - Return content string
   - **Error Handling:** Handle large files (may exceed context limits)

3. **`deleteFileFromOpenAI(fileId: string)`**
   - **Signature:** `async function deleteFileFromOpenAI(fileId: string): Promise<void>`
   - **Description:** Permanently deletes a file from OpenAI (removes from all vector stores)
   - **Implementation Pattern:**
     - Call `openaiClient.files.del(fileId)`
   - **Error Handling:** Ignore 404 (already deleted)

**Notes:**
- File upload returns OpenAI file ID immediately (indexing async)
- File content retrieval may be large (handle streaming if needed)
- File deletion is permanent and cascades to all vector stores

#### 4. Error Handling and Retry Logic

**File:** `lib/openai/retry.ts` (new file)

**Purpose:** Exponential backoff utility for OpenAI API calls

**Key Function:**

1. **`withRetry<T>(fn: () => Promise<T>, maxRetries: number)`**
   - **Signature:** `async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T>`
   - **Description:** Wraps an async function with exponential backoff retry logic
   - **Implementation Pattern:**
     - Attempt function call
     - On error, check if retryable (429, 500, 503 status codes)
     - Wait with exponential backoff: `2^attempt * 1000ms`
     - Retry up to `maxRetries` times
     - Throw error if max retries exceeded
   - **Usage:** `await withRetry(() => openaiClient.beta.vectorStores.create(...))`

**Notes:**
- Only retry transient errors (rate limits, server errors)
- Don't retry client errors (400, 403, 404)
- Log each retry attempt with context

---

## Phase 3: Document Management Backend (Admin)

### Overview

Implement the backend logic for document management: database queries, tRPC admin procedures, and file upload API endpoint. This includes listing documents with filters, uploading new documents (dual storage + vector store), updating existing documents, deleting documents with cleanup, and managing tags.

### Important Codebase Context

#### Files that won't be modified but are important to understand

- `lib/db/queries.ts:1-700` - Database query patterns
  - Pattern: Try-catch with re-throw, type-safe with `InferSelectModel`
  - Named parameter objects for clarity
  - Server-only directive at top

- `trpc/routers/admin.router.ts:12-259` - Admin procedures using `adminProcedure`
  - Pattern: All procedures protected with `adminProcedure` middleware
  - Access to `ctx.user.id` (guaranteed admin)
  - Zod input validation

- `app/(chat)/api/files/upload/route.ts:23-75` - File upload API pattern
  - Pattern: FormData extraction, validation, Vercel Blob upload
  - Returns `{ url, pathname, contentType }`

#### Files that need to be modified or extended

- `lib/db/queries.ts` - Add document query functions
- `trpc/routers/admin.router.ts` - Add document procedures

#### New Files that need to be created

- `app/(admin)/api/documents/upload/route.ts` - Document upload API endpoint

#### Patterns, Conventions, and Design Decisions to Reuse

- **Query Pattern:** Try-catch, console.error, re-throw (from `queries.ts`)
- **tRPC Pattern:** Use `adminProcedure`, Zod input validation, type-safe returns
- **Upload Pattern:** FormData → Validation → Dual storage (Blob + OpenAI) → Database
- **Soft Delete:** Set `deletedAt` timestamp, don't hard delete

#### Key Constraints to work within

- tRPC procedures auto-validated with Zod schemas
- Admin procedures require admin role (enforced by middleware)
- File upload endpoint must handle large files (streaming if needed)
- Dual storage: Vercel Blob (serving) + OpenAI Files (indexing)
- Document status transitions: uploading → processing → ready/failed

### Changes Required

#### 1. Database Queries

**File:** `lib/db/queries.ts`

**Changes:** Add document management query functions after existing queries

**New Functions:**

1. **`listDocuments(input: ListDocumentsInput)`**
   - **Signature:** `async function listDocuments(input: ListDocumentsInput): Promise<ListDocumentsOutput>`
   - **Description:** Lists documents with optional filters (search term, tags, status), pagination, excluding soft-deleted
   - **Implementation Pattern:**
     - Build query with filters: `where(and(...conditions))`
     - Search term: `ilike(uploadedDocument.filename, %${searchTerm}%)`
     - Tags filter: Use Postgres JSON operators for array contains
     - Status filter: `eq(uploadedDocument.status, status)`
     - Exclude soft-deleted: `isNull(uploadedDocument.deletedAt)`
     - Order by: `uploadedAt DESC`
     - Pagination: `limit(input.limit).offset(input.offset)`
     - Count total: Separate query with same filters
     - Return: `{ documents, total, hasMore: offset + limit < total }`

2. **`getDocumentById(id: string)`**
   - **Signature:** `async function getDocumentById(id: string): Promise<UploadedDocument | null>`
   - **Description:** Retrieves a single document by ID, excluding soft-deleted
   - **Implementation Pattern:**
     - Query: `select().from(uploadedDocument).where(and(eq(id, id), isNull(deletedAt))).limit(1)`
     - Return first result or null

3. **`saveDocument(input: Omit<InsertUploadedDocument, 'id' | 'uploadedAt' | 'updatedAt'>)`**
   - **Signature:** `async function saveDocument(input): Promise<UploadedDocument>`
   - **Description:** Inserts a new document record after successful upload
   - **Implementation Pattern:**
     - Insert with `defaultRandom()` ID and `defaultNow()` timestamps
     - Return inserted document

4. **`updateDocumentStatus(id: string, status: string, errorMessage?: string)`**
   - **Signature:** `async function updateDocumentStatus(id: string, status: "uploading" | "processing" | "ready" | "failed", errorMessage?: string | null): Promise<void>`
   - **Description:** Updates document processing status and optional error message
   - **Implementation Pattern:**
     - Update: `update(uploadedDocument).set({ status, errorMessage, updatedAt: new Date() }).where(eq(id, id))`

5. **`softDeleteDocument(id: string)`**
   - **Signature:** `async function softDeleteDocument(id: string): Promise<void>`
   - **Description:** Soft deletes a document by setting `deletedAt` timestamp
   - **Implementation Pattern:**
     - Update: `update(uploadedDocument).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(id, id))`

6. **`updateDocumentTags(id: string, tags: string[])`**
   - **Signature:** `async function updateDocumentTags(id: string, tags: string[]): Promise<void>`
   - **Description:** Updates the tags array for a document
   - **Implementation Pattern:**
     - Update: `update(uploadedDocument).set({ tags, updatedAt: new Date() }).where(eq(id, id))`

7. **`getAllTags()`**
   - **Signature:** `async function getAllTags(): Promise<string[]>`
   - **Description:** Retrieves all unique tags from non-deleted documents for auto-suggest
   - **Implementation Pattern:**
     - Query all documents: `select({ tags: uploadedDocument.tags }).from(uploadedDocument).where(isNull(deletedAt))`
     - Flatten arrays: `documents.flatMap(d => d.tags)`
     - Deduplicate: `[...new Set(allTags)]`
     - Sort alphabetically
     - Return unique tags array

8. **`getVectorStoreId()`**
   - **Signature:** `async function getVectorStoreId(): Promise<string | null>`
   - **Description:** Retrieves the shared vector store ID from singleton table
   - **Implementation Pattern:**
     - Query: `select().from(vectorStoreConfig).where(eq(id, "singleton")).limit(1)`
     - Return `vectorStoreId` or null if not exists

9. **`setVectorStoreId(vectorStoreId: string)`**
   - **Signature:** `async function setVectorStoreId(vectorStoreId: string): Promise<void>`
   - **Description:** Creates or updates the vector store ID in singleton table
   - **Implementation Pattern:**
     - Upsert: `insert(vectorStoreConfig).values({ id: "singleton", vectorStoreId }).onConflictDoUpdate({ target: id, set: { vectorStoreId, updatedAt: new Date() } })`

**Notes:**
- Add `"use server";` directive at top of file
- All functions use try-catch with console.error and re-throw
- Type-safe with Drizzle inferred types
- Follow existing query patterns in the file

#### 2. tRPC Admin Procedures

**File:** `trpc/routers/admin.router.ts`

**Changes:** Add document management procedures under `documents` namespace

**New Procedures:**

Add after existing procedures (after line 259):

```typescript
documents: {
  list: adminProcedure
    .input(z.object({
      searchTerm: z.string().optional(),
      tags: z.array(z.string()).optional(),
      status: z.enum(["uploading", "processing", "ready", "failed"]).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      // Call listDocuments(input)
      // Return { documents, total, hasMore }
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      // Call getDocumentById(input.id)
      // Return document or throw NOT_FOUND if null
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      // 1. Get document by ID
      // 2. Remove from vector store: removeFileFromVectorStore(vectorStoreId, openaiFileId)
      // 3. Delete from OpenAI: deleteFileFromOpenAI(openaiFileId)
      // 4. Soft delete in database: softDeleteDocument(id)
      // 5. Return success
    }),

  updateTags: adminProcedure
    .input(z.object({
      id: z.string(),
      tags: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      // Call updateDocumentTags(input.id, input.tags)
      // Return success
    }),

  getAllTags: adminProcedure
    .query(async () => {
      // Call getAllTags()
      // Return { tags: string[] }
    }),

  refreshStatus: adminProcedure
    .mutation(async () => {
      // 1. Get vector store ID
      // 2. Poll vector store status: pollVectorStoreStatus(vectorStoreId)
      // 3. Update document statuses based on OpenAI file counts
      // 4. Return updated counts
    }),
}
```

**Notes:**
- All procedures use `adminProcedure` for automatic protection
- Input validation with Zod schemas
- Error handling: Use `TRPCError` with appropriate codes
- Delete procedure performs cleanup in order: vector store → OpenAI → database
- Refresh status procedure syncs database with OpenAI processing state

#### 3. Document Upload API Endpoint

**File:** `app/(admin)/api/documents/upload/route.ts` (new file)

**Purpose:** Handle document file uploads with dual storage (Vercel Blob + OpenAI Files)

**Implementation:**

```typescript
export async function POST(request: Request) {
  // 1. Authenticate user (check session and admin role)
  // 2. Extract FormData: filename, file buffer, tags
  // 3. Validate file: size <= 512 MB, supported content type
  // 4. Upload to Vercel Blob: uploadFile(filename, buffer)
  // 5. Upload to OpenAI Files: uploadFileToOpenAI(filename, buffer)
  // 6. Get or create vector store: getOrCreateVectorStore()
  // 7. Add file to vector store: addFileToVectorStore(vectorStoreId, openaiFileId)
  // 8. Save document to database: saveDocument({ filename, fileSize, contentType, blobUrl, blobPathname, openaiFileId, vectorStoreId, status: "processing", uploadedBy: userId, tags })
  // 9. Return: { success: true, documentId: id }
}
```

**Validation Schema:**

```typescript
const documentFileSchema = z.object({
  file: z.instanceof(Blob)
    .refine(file => file.size <= 512 * 1024 * 1024, "Max 512 MB")
    .refine(file => SUPPORTED_DOCUMENT_TYPES.includes(file.type)),
});

const SUPPORTED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "text/plain",
  "text/markdown",
  // ... 20+ more from OpenAI supported list
];
```

**Error Handling:**
- Catch Vercel Blob errors → Return 500 with message
- Catch OpenAI API errors → Return 500, log error, cleanup blob
- Catch database errors → Return 500, log error, cleanup blob and OpenAI file

**Notes:**
- Follow pattern from `app/(chat)/api/files/upload/route.ts`
- Admin-only endpoint (check session role before processing)
- Return document ID for immediate UI update
- Status starts as "processing" (OpenAI indexes asynchronously)

#### 4. Document Update Flow

**File:** `app/(admin)/api/documents/[id]/update/route.ts` (new file)

**Purpose:** Replace an existing document with a new version

**Implementation:**

```typescript
export async function POST(request: Request, { params }: { params: { id: string } }) {
  // 1. Authenticate user (admin role)
  // 2. Get existing document by ID
  // 3. Extract FormData: filename, file buffer, tags
  // 4. Remove old file from vector store: removeFileFromVectorStore(vectorStoreId, oldOpenaiFileId)
  // 5. Delete old file from OpenAI: deleteFileFromOpenAI(oldOpenaiFileId)
  // 6. Upload new file to Vercel Blob (keep same filename or new)
  // 7. Upload new file to OpenAI Files
  // 8. Add new file to vector store
  // 9. Update document record: openaiFileId, blobUrl, blobPathname, fileSize, contentType, status: "processing", updatedAt
  // 10. Return: { success: true, documentId: id }
}
```

**Notes:**
- Old file must be removed from vector store before adding new file
- Database record updated (not replaced) to maintain upload history
- Tags can be updated during replacement

---

## Phase 4: Admin UI for Document Management

### Overview

Build the admin UI for document management at `/admin/documents`. This includes a document list table with search/filters, upload dialog with drag-drop, update dialog for replacing documents, tag management with auto-suggest, and action buttons for delete/update/tags.

### Important Codebase Context

#### Files that won't be modified but are important to understand

- `app/admin/users/page.tsx` - Admin page pattern
  - Imports tRPC provider, session provider from layout
  - Simple page component with heading and table

- `components/admin/user-list-table.tsx` - Table pattern
  - Uses tRPC `useQuery` for data fetching
  - Search input with debounce
  - Pagination with limit/offset
  - Manual refetch key for list invalidation
  - Badge components for status display

- `components/admin/create-user-dialog.tsx` - Dialog pattern
  - React Hook Form + Zod validation
  - Toast notifications (success/error)
  - Form submission with tRPC mutation
  - Dialog close on success

#### Files that need to be modified or extended

- `app/admin/layout.tsx` - Add navigation link for documents page (optional)

#### New Files that need to be created

- `app/admin/documents/page.tsx` - Main documents page
- `components/admin/document-list-table.tsx` - Document table with search/filters
- `components/admin/upload-document-dialog.tsx` - Upload dialog with drag-drop
- `components/admin/update-document-dialog.tsx` - Replace document dialog
- `components/admin/document-actions.tsx` - Action buttons (update, delete, tags)
- `components/admin/document-tags-input.tsx` - Tag input with auto-suggest
- `components/admin/document-status-badge.tsx` - Status badge component

#### Patterns, Conventions, and Design Decisions to Reuse

- **Page Structure:** Simple component with heading, description, and table
- **Table Pattern:** shadcn/ui Table with tRPC queries, search, pagination
- **Dialog Pattern:** shadcn/ui Dialog + AlertDialog for confirmations
- **Form Validation:** React Hook Form + Zod schemas
- **Toast Notifications:** Sonner for success/error messages
- **Badge Components:** shadcn/ui Badge for status/tags
- **Manual Refetch:** `refetchKey` state to force refetch after mutations

#### Key Constraints to work within

- tRPC queries auto-refetch on mutations (use `queryClient.invalidateQueries`)
- File upload via `fetch` to API endpoint (not tRPC, due to FormData)
- Drag-drop with `react-dropzone` or HTML5 drag events
- Tag input with `cmdk` or `react-select` for auto-suggest

### Changes Required

#### 1. Documents Page

**File:** `app/admin/documents/page.tsx` (new file)

**Component:** `DocumentsPage`

**Description:** Main admin page for document management

**Implementation Pattern:**

```typescript
export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Document Management</h1>
        <p className="text-muted-foreground">
          Upload and manage documents for semantic search in the AI chat
        </p>
      </div>
      <DocumentListTable />
    </div>
  );
}
```

**Notes:**
- Follow pattern from `app/admin/users/page.tsx`
- No auth check needed (middleware handles it)
- Simple layout with heading and table component

#### 2. Document List Table

**File:** `components/admin/document-list-table.tsx` (new file)

**Component:** `DocumentListTable`

**Props:** None (self-contained state)

**Description:** Main table component showing documents with search, filters, pagination, and actions

**Key Features:**
- Search by filename (debounced input)
- Filter by tags (multi-select dropdown)
- Filter by status (dropdown: all, uploading, processing, ready, failed)
- Pagination (50 per page)
- Sort by upload date (desc)
- Refresh button to poll OpenAI status
- Upload button (opens UploadDocumentDialog)

**Columns:**
- Filename (with content type icon)
- Status (badge component)
- Tags (badge array)
- File Size (formatted bytes)
- Uploaded By (user name)
- Uploaded At (formatted date)
- Actions (update, delete, tags buttons)

**State Management:**
- Search term (useState with debounce)
- Tag filter (useState)
- Status filter (useState)
- Page offset (useState)
- Refetch key (useState, incremented on mutations)

**tRPC Queries:**
- `trpc.admin.documents.list.useQuery({ searchTerm, tags, status, limit: 50, offset })`
- `trpc.admin.documents.getAllTags.useQuery()` for tag filter dropdown

**Notes:**
- Follow table pattern from `user-list-table.tsx`
- Use `Badge` for status and tags
- Use `DocumentStatusBadge` for color-coded status
- Use `DocumentActions` component for action buttons
- Manual refetch on refresh button click

#### 3. Upload Document Dialog

**File:** `components/admin/upload-document-dialog.tsx` (new file)

**Component:** `UploadDocumentDialog`

**Props:**
```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
```

**Description:** Dialog for uploading new documents with drag-drop, tag input, file validation

**Key Features:**
- Drag-and-drop file zone
- File picker button
- File type/size validation (client-side)
- Tag input with auto-suggest
- Upload progress indicator
- Error display

**Implementation Pattern:**
- React Hook Form with Zod validation
- `fetch` to `/api/documents/upload` with FormData
- Show upload progress (if API supports)
- Toast notification on success/error
- Close dialog and call `onSuccess()` callback

**Validation:**
- File required
- Max 512 MB
- Supported file types only
- Tags optional (array of strings)

**Notes:**
- Use `react-dropzone` for drag-drop
- Display file preview (icon + name + size)
- Show validation errors inline
- Use `DocumentTagsInput` component for tag management

#### 4. Update Document Dialog

**File:** `components/admin/update-document-dialog.tsx` (new file)

**Component:** `UpdateDocumentDialog`

**Props:**
```typescript
{
  documentId: string;
  currentFilename: string;
  currentTags: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
```

**Description:** Dialog for replacing an existing document with a new version

**Key Features:**
- Show current filename
- File picker for new version
- Option to update filename
- Update tags
- Warning about replacing old version
- Upload progress

**Implementation Pattern:**
- Similar to UploadDocumentDialog
- `fetch` to `/api/documents/${documentId}/update`
- Display warning: "This will replace the existing document in the vector store"
- Show current file info before upload

**Notes:**
- Use same validation as UploadDocumentDialog
- Pre-populate tags from current document
- Confirmation step before upload

#### 5. Document Actions Component

**File:** `components/admin/document-actions.tsx` (new file)

**Component:** `DocumentActions`

**Props:**
```typescript
{
  document: UploadedDocument;
  onUpdate: () => void;
  onDelete: () => void;
  onTagsUpdate: () => void;
}
```

**Description:** Action buttons for each document row (update, delete, tags)

**Buttons:**
- **Update:** Opens UpdateDocumentDialog
- **Delete:** Opens confirmation AlertDialog, calls `trpc.admin.documents.delete.useMutation()`
- **Tags:** Opens popover with DocumentTagsInput for quick tag editing

**Implementation Pattern:**
- DropdownMenu with actions
- AlertDialog for delete confirmation
- Popover for tag editing
- Toast notifications on success/error

**Notes:**
- Disable actions when status is "uploading" or "processing"
- Show loading state during delete mutation

#### 6. Document Tags Input Component

**File:** `components/admin/document-tags-input.tsx` (new file)

**Component:** `DocumentTagsInput`

**Props:**
```typescript
{
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
}
```

**Description:** Tag input with auto-suggest from existing tags

**Key Features:**
- Free-form text input for new tags
- Auto-suggest dropdown showing existing tags
- Multi-select interface
- Remove tag buttons
- Create new tags on Enter or comma

**Implementation Pattern:**
- Use `cmdk` or custom combobox component
- Filter suggestions by input text
- Show selected tags as badges with remove button
- Call `onChange` on tag add/remove

**Notes:**
- Fetch suggestions from `trpc.admin.documents.getAllTags.useQuery()`
- Allow creating tags not in suggestions
- Keyboard navigation for accessibility

#### 7. Document Status Badge Component

**File:** `components/admin/document-status-badge.tsx` (new file)

**Component:** `DocumentStatusBadge`

**Props:**
```typescript
{
  status: "uploading" | "processing" | "ready" | "failed";
  errorMessage?: string | null;
}
```

**Description:** Color-coded badge for document processing status

**Badge Colors:**
- `uploading`: Blue (secondary)
- `processing`: Yellow (outline)
- `ready`: Green (success)
- `failed`: Red (destructive)

**Implementation Pattern:**
- Use shadcn/ui Badge component
- Tooltip on hover showing error message (if status is "failed")
- Spinner icon for uploading/processing states

**Notes:**
- Use `Tooltip` component for error message display
- Use `Loader2` icon with spin animation for processing states

---

## Phase 5: AI Agent Tools (Semantic Search & File Retrieve)

### Overview

Implement two AI SDK v5 tools for the agent: `semanticSearch` for querying the vector store and `fileRetrieve` for loading entire documents. Register tools in the chat API, add to tools definitions registry, and integrate with existing tool infrastructure.

### Important Codebase Context

#### Files that won't be modified but are important to understand

- `lib/ai/tools/web-search.ts:32-94` - Tool pattern with `dataStream` writing
  - Pattern: `tool({ description, inputSchema, execute })` from AI SDK v5
  - Uses `dataStream.write()` for intermediate updates
  - Returns final result directly

- `lib/ai/tools/tools-definitions.ts:3-64` - Tool registry with costs
  - Pattern: Object with tool name → `{ name, cost }` mapping
  - Used for credit calculation and UI display

- `lib/ai/tools/tools.ts` - Tool exports and initialization
  - Pattern: Import tools, export `getTools()` function
  - Tools receive `dataStream`, `session`, `messageId`, etc.

- `app/(chat)/api/chat/route.ts:549-564` - Tool registration in chat route
  - Pattern: `tools: getTools({ dataStream, session, messageId, ... })`
  - Tools filtered by affordability before passing to `streamText()`

#### Files that need to be modified or extended

- `lib/ai/tools/tools-definitions.ts` - Add semantic search and file retrieve
- `lib/ai/tools/tools.ts` - Export new tools
- `app/(chat)/api/chat/route.ts` - Register tools (automatic via `tools.ts` export)

#### New Files that need to be created

- `lib/ai/tools/semantic-search.ts` - Semantic search tool
- `lib/ai/tools/file-retrieve.ts` - File retrieve tool

#### Patterns, Conventions, and Design Decisions to Reuse

- **Tool Definition:** `tool({ description, inputSchema: z.object(...), execute: async ({ input }) => { ... } })`
- **Input Streaming:** AI SDK v5 automatically streams tool inputs to UI
- **Data Stream Writing:** Use `dataStream.write({ type: "data-X", data: { ... } })` for progress updates
- **Return Format:** Return plain object (AI SDK wraps in tool part)
- **Error Handling:** Return `{ error: string }` object instead of throwing

#### Key Constraints to work within

- Tools must work with AI SDK v5 `streamText()` function
- Tool inputs must have Zod schemas with descriptions
- Tool outputs must be JSON-serializable
- Citations must be extracted from tool output in UI rendering phase

### Changes Required

#### 1. Semantic Search Tool

**File:** `lib/ai/tools/semantic-search.ts` (new file)

**Tool Name:** `semanticSearch`

**Description:** "Search the organization's document library using semantic similarity to find relevant information. Returns text passages with citations to source documents."

**Input Schema:**

```typescript
inputSchema: z.object({
  query: z.string().describe("The search query in natural language"),
  limit: z.number().min(1).max(20).optional().describe("Maximum number of results to return (default: 5)"),
})
```

**Execute Function Pseudocode:**

```
1. Write data-stream update: Search started
2. Get vector store ID from database
3. If no vector store, return { results: [], totalResults: 0 }
4. Create OpenAI assistant (temporary) with file_search tool:
   - tools: [{ type: "file_search", file_search: { max_num_results: limit || 5 } }]
   - tool_resources: { file_search: { vector_store_ids: [vectorStoreId] } }
5. Create thread with user message (query)
6. Run assistant on thread
7. Poll run status until completed
8. Retrieve messages from thread
9. Extract annotations (file citations) from assistant message
10. For each citation:
    - Get document by openaiFileId from database
    - Extract page number from citation (if available)
    - Extract text quote
    - Build SearchResultItem: { documentId, documentName, chunkContent, pageNumber, relevanceScore }
11. Delete assistant and thread (cleanup)
12. Write data-stream update: Search completed
13. Return { results: SearchResultItem[], totalResults: results.length }
```

**Error Handling:**
- Catch OpenAI API errors → Return `{ error: string, results: [] }`
- Log errors with context
- Clean up assistant/thread even on error

**Notes:**
- Use OpenAI Assistants API (not deprecated for vector store queries yet)
- Annotations format: `【18:0†source】` with file_id reference
- Page numbers may not be available in all citations (return null)
- Relevance scores not exposed by OpenAI API (can use annotation index as proxy)

#### 2. File Retrieve Tool

**File:** `lib/ai/tools/file-retrieve.ts` (new file)

**Tool Name:** `fileRetrieve`

**Description:** "Retrieve the complete content of a specific document from the library. Use this when you need full context from a document rather than just search results."

**Input Schema:**

```typescript
inputSchema: z.object({
  documentId: z.string().describe("The ID of the document to retrieve"),
})
```

**Execute Function Pseudocode:**

```
1. Write data-stream update: Retrieving document
2. Get document by ID from database
3. If not found or deleted, return { error: "Document not found" }
4. If status is not "ready", return { error: "Document not ready (still processing or failed)" }
5. Retrieve file content from OpenAI: retrieveFileContent(openaiFileId)
6. Extract page count from content (if PDF, parse metadata)
7. Write data-stream update: Document retrieved
8. Return {
     documentId,
     documentName: filename,
     content: fileContent,
     pageCount: extractedPageCount or null,
     fileSize,
   }
```

**Error Handling:**
- Document not found → Return `{ error: "Document not found" }`
- Document not ready → Return `{ error: "Document is still processing" }`
- OpenAI API error → Return `{ error: "Failed to retrieve document content" }`

**Notes:**
- Content may be very large (multiple MB of text)
- Agent must decide if document fits in context window
- Page count extraction is best-effort (may not work for all formats)

#### 3. Tools Definition Registry

**File:** `lib/ai/tools/tools-definitions.ts`

**Changes:** Add semantic search and file retrieve to `toolsDefinitions` object

```typescript
export const toolsDefinitions = {
  // ... existing tools
  semanticSearch: {
    name: "Semantic Search",
    cost: 3, // Higher cost due to assistant creation + vector search
  },
  fileRetrieve: {
    name: "File Retrieve",
    cost: 1, // Lower cost, simple file read
  },
} as const;
```

**Notes:**
- Costs chosen to incentivize semantic search over full retrieval when appropriate
- Agent will consider costs when deciding which tool to use

#### 4. Tools Export

**File:** `lib/ai/tools/tools.ts`

**Changes:** Import and export new tools in `getTools()` function

```typescript
import { semanticSearchTool } from "./semantic-search";
import { fileRetrieveTool } from "./file-retrieve";

export const getTools = ({ dataStream, session, /* ... */ }) => ({
  // ... existing tools
  semanticSearch: semanticSearchTool({ dataStream }),
  fileRetrieve: fileRetrieveTool({ dataStream }),
});
```

**Notes:**
- Tools automatically registered in chat route via `getTools()`
- No changes needed to chat route (auto-detected)

---

## Phase 6: Chat UI for Citations and Tool Rendering

### Overview

Build the UI components for rendering tool invocations and citations in the chat interface. This includes tool part renderers for semantic search and file retrieve, citation extraction from tool outputs, clickable citation links with PDF page navigation, and integration with the existing message parts system.

### Important Codebase Context

#### Files that won't be modified but are important to understand

- `components/message-parts.tsx:519-592` - Message parts rendering entry point
  - Pattern: Switch statement on `part.type`
  - Tool parts: `case 'tool-{toolName}'`
  - States: `input-available`, `output-available`

- `components/assistant-message.tsx:15` - Assistant message wrapper
  - Renders `PureMessageParts` component
  - Handles message-level logic

- `lib/stores/hooks-message-parts.ts` - Message part hooks
  - `useMessagePartByPartIdx(messageId, partIdx)` for single part
  - `useMessagePartsByPartRange(messageId, start, end)` for ranges

#### Files that need to be modified or extended

- `components/message-parts.tsx` - Add cases for new tool parts
- `lib/ai/types.ts` - Add tool types to `ChatTools` union

#### New Files that need to be created

- `components/semantic-search-result.tsx` - Semantic search tool result renderer
- `components/file-retrieve-result.tsx` - File retrieve tool result renderer
- `components/citation-link.tsx` - Clickable citation link component
- `components/citations.tsx` - Citation list component

#### Patterns, Conventions, and Design Decisions to Reuse

- **Tool Part Rendering:** Check state, render differently for `input-available` vs `output-available`
- **Loading States:** Show skeleton or spinner during `input-available`
- **Error Handling:** Check for `error` key in output, display error message
- **Structured Output:** Use Card, Badge, and other shadcn/ui components

#### Key Constraints to work within

- Tool part types must match tool names: `tool-semanticSearch`, `tool-fileRetrieve`
- Citations must be extracted from tool output (not automatic)
- PDF links use `#page=N` fragment (browser support varies)
- Message parts are read-only (no mutations, only subscriptions)

### Changes Required

#### 1. Add Tool Types

**File:** `lib/ai/types.ts`

**Changes:** Add new tool names to `toolNameSchema` and `ChatTools` union

```typescript
export const toolNameSchema = z.enum([
  // ... existing tools
  "semanticSearch",
  "fileRetrieve",
]);

export type ToolName = z.infer<typeof toolNameSchema>;

// ChatTools union auto-updated via tool registry
```

**Notes:**
- Tool names must exactly match tool keys in `getTools()`
- Type safety ensures correct part types in message rendering

#### 2. Semantic Search Result Renderer

**File:** `components/semantic-search-result.tsx` (new file)

**Component:** `SemanticSearchResult`

**Props:**
```typescript
{
  state: "input-available" | "output-available";
  input: SemanticSearchInput;
  output?: SemanticSearchOutput | { error: string };
}
```

**Description:** Renders semantic search tool invocation and results

**Rendering Logic:**

**Input Available State:**
- Show "Searching documents..." with query text
- Display spinner icon
- Show limit parameter if specified

**Output Available State (Success):**
- Show result count: "Found X results"
- Display results as cards:
  - Document name
  - Text excerpt (chunk content)
  - Page number (if available)
  - Relevance indicator (could use position as proxy)
- Each result is a clickable card that navigates to citation

**Output Available State (Error):**
- Show error message in red
- Display retry suggestion

**Notes:**
- Use Card component for result items
- Truncate long excerpts with "Read more" expansion
- Highlight query terms in excerpts (optional enhancement)

#### 3. File Retrieve Result Renderer

**File:** `components/file-retrieve-result.tsx` (new file)

**Component:** `FileRetrieveResult`

**Props:**
```typescript
{
  state: "input-available" | "output-available";
  input: FileRetrieveInput;
  output?: FileRetrieveOutput | { error: string };
}
```

**Description:** Renders file retrieve tool invocation and results

**Rendering Logic:**

**Input Available State:**
- Show "Loading document..." with document ID
- Display spinner icon

**Output Available State (Success):**
- Show document name as heading
- Display metadata: page count, file size
- Show content preview (first 500 chars with "..." if truncated)
- Button to view full document (opens blob URL in new tab)

**Output Available State (Error):**
- Show error message
- Suggest alternative action (e.g., "Try semantic search instead")

**Notes:**
- Don't display full content (too large, context window only)
- Preview gives user confidence that document was loaded
- Link to blob URL for full document viewing

#### 4. Citation Link Component

**File:** `components/citation-link.tsx` (new file)

**Component:** `CitationLink`

**Props:**
```typescript
{
  citation: Citation;
  index: number;
}
```

**Description:** Clickable citation link that opens PDF at specific page

**Rendering:**
- Format: `[Document Name, p. 3]` as superscript link
- Click behavior: Opens `${citation.blobUrl}#page=${citation.pageNumber}` in new tab
- Tooltip on hover: Shows excerpt text

**Implementation Pattern:**

```
- Render as Link or Button with superscript styling
- href: `${blobUrl}#page=${pageNumber || 1}`
- target: "_blank"
- rel: "noopener noreferrer"
- Wrap in Tooltip with excerpt content
- Index number in brackets: [1], [2], etc.
```

**Notes:**
- Page number may be null (open at page 1 as fallback)
- Safari doesn't support `#page=` fragments (graceful degradation: opens at beginning)
- Use monospace styling for citation numbers

#### 5. Citations Component

**File:** `components/citations.tsx` (new file)

**Component:** `Citations`

**Props:**
```typescript
{
  citations: Citation[];
}
```

**Description:** List of citations at the end of an assistant message

**Rendering:**
- Heading: "Sources" or "References"
- Numbered list of CitationLink components
- Grouped by document (if multiple citations to same document)

**Implementation Pattern:**

```
- Show heading "Sources" if citations.length > 0
- Map citations to CitationLink components
- Optional: Group by documentId and show as nested list
- Style as footnotes section at bottom of message
```

**Notes:**
- Citations extracted from tool output in message-parts.tsx
- Displayed after all message text content

#### 6. Message Parts Integration

**File:** `components/message-parts.tsx`

**Changes:** Add cases for new tool parts in `MessagePart` switch statement

Add after existing tool cases (around line 400):

```typescript
case 'tool-semanticSearch': {
  const { state, input, output } = part as ToolPart<"semanticSearch">;
  return (
    <SemanticSearchResult
      key={`tool-${toolCallId}`}
      state={state}
      input={input}
      output={output}
    />
  );
}

case 'tool-fileRetrieve': {
  const { state, input, output } = part as ToolPart<"fileRetrieve">;
  return (
    <FileRetrieveResult
      key={`tool-${toolCallId}`}
      state={state}
      input={input}
      output={output}
    />
  );
}
```

**Citation Extraction:** Add helper function to extract citations from tool outputs

```typescript
function extractCitationsFromMessage(parts: MessagePart[]): Citation[] {
  const citations: Citation[] = [];

  for (const part of parts) {
    if (part.type === 'tool-semanticSearch' && part.state === 'output-available') {
      const { output } = part;
      if ('results' in output) {
        for (const result of output.results) {
          citations.push({
            documentId: result.documentId,
            documentName: result.documentName,
            pageNumber: result.pageNumber,
            excerpt: result.chunkContent,
            blobUrl: result.blobUrl, // Note: Need to fetch blob URL from database
          });
        }
      }
    }
  }

  return citations;
}
```

**Display Citations:** In `PureMessageParts` component, add citation rendering after all parts

```typescript
// After rendering all parts, check if there are citations
const citations = extractCitationsFromMessage(parts);
if (citations.length > 0) {
  return (
    <>
      {/* Existing part rendering */}
      <Citations citations={citations} />
    </>
  );
}
```

**Notes:**
- Tool part types are type-safe via `ToolPart<ToolName>` generic
- Citation extraction happens at render time (could optimize with memoization)
- Blob URLs must be fetched from database (not included in tool output) - consider adding to SearchResultItem type

---

## Manual Tasks to be Completed

### OpenAI API Key Configuration

**Task:** Ensure `OPENAI_API_KEY` environment variable is set in production

**Steps:**
1. Generate OpenAI API key from platform.openai.com
2. Add to Vercel environment variables: `OPENAI_API_KEY=sk-...`
3. Redeploy application for variable to take effect
4. Verify key is available by checking admin UI (should not show "API key not configured" error)

**Context:**
- Key is optional in codebase (already defined in `lib/env.ts:25`)
- Without key, document upload features will be unavailable
- Feature flag `NEXT_PUBLIC_OPENAI_AVAILABLE` auto-set based on key presence

### Initial Vector Store Creation

**Task:** Create initial vector store on first document upload

**Steps:**
1. First admin uploads a document
2. System calls `getOrCreateVectorStore()` which creates new vector store
3. Vector store ID saved to database singleton table
4. All subsequent documents use same vector store ID

**Context:**
- No manual creation needed (handled automatically by code)
- Vector store persists across deployments
- If vector store ID is lost, new one created on next upload (old documents orphaned)

### Supported File Types Documentation

**Task:** Document supported file types in admin UI

**Steps:**
1. Add info tooltip to upload dialog explaining supported formats
2. List common types: PDF, DOCX, TXT, MD, code files
3. Link to OpenAI documentation for full list
4. Add file type validation error messages

**Context:**
- 20+ file types supported by OpenAI Files API
- Most common: PDF, DOCX, TXT, MD, JS, TS, PY, etc.
- Validation happens on both client (immediate feedback) and server (security)

### Testing Document Processing Flow

**Task:** Test complete document lifecycle in staging environment

**Test Cases:**
1. Upload PDF → Verify status transitions: uploading → processing → ready
2. Upload unsupported file → Verify validation error
3. Upload file > 512 MB → Verify size error
4. Update existing document → Verify old version removed, new version indexed
5. Delete document → Verify removal from vector store, blob storage, database
6. Search with semantic query → Verify results with citations
7. Retrieve full document → Verify content loaded
8. Click citation link → Verify PDF opens at correct page (in supported browsers)
9. Concurrent uploads → Verify both process correctly
10. OpenAI API failure → Verify error handling and status update

**Context:**
- Processing times vary (small PDFs: minutes, large files: hours)
- Monitor database for status transitions
- Check OpenAI dashboard for file/vector store sync

### Safari PDF Navigation Fallback

**Task:** Inform users that Safari doesn't support direct page navigation

**Steps:**
1. Add browser detection (optional)
2. Show tooltip in Safari: "Page navigation not supported in Safari. PDF will open at beginning."
3. Consider displaying page number in citation for manual navigation
4. Test in Safari, Chrome, Firefox, Edge

**Context:**
- Chrome, Firefox, Edge support `#page=N` fragments
- Safari ignores fragments, opens at page 1
- Graceful degradation (still functional, just less precise)
- No need for PDF.js custom viewer unless advanced features needed

### Database Backup Before Migration

**Task:** Backup production database before running schema migration

**Steps:**
1. Create database snapshot in hosting provider dashboard
2. Verify backup integrity
3. Run migration in staging first
4. Test thoroughly in staging
5. Run migration in production
6. Monitor for errors

**Context:**
- New tables are additive (low risk)
- Indexes may cause brief locks during creation
- No existing data modified (only new tables added)

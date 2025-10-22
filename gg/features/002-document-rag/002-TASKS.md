---
date: 2025-10-22 23:59:00
feature-slug: 002-document-rag
phase-1-status: not_started
phase-2-status: not_started
phase-3-status: not_started
phase-4-status: not_started
phase-5-status: not_started
phase-6-status: not_started
---

# 002-document-rag Implementation Tasks

## Overview

This document contains detailed task lists for implementing the Document RAG System feature across all phases.

**Total Phases:** 6

**Related Documents:**
- Specification: `gg/features/002-document-rag/002-SPEC.md`
- High-Level Plan: `gg/features/002-document-rag/002-PLAN.md`

---

## Phase 1: Database Schema and Environment Setup

### Overview
Establish the database foundation for document management by creating two new tables: `UploadedDocument` for document metadata and `VectorStoreConfig` for the shared vector store ID. Verify environment variables are configured for OpenAI API access.

### Tasks

- [ ] 1. Verify Environment Configuration
  - [ ] 1.1 Confirm `OPENAI_API_KEY` is defined in `lib/env.ts:25` as optional server variable
  - [ ] 1.2 Verify `OPENAI_API_KEY` is included in `runtimeEnv` object at `lib/env.ts:64`
  - [ ] 1.3 Confirm `NEXT_PUBLIC_OPENAI_AVAILABLE` feature flag auto-derives from key presence at `lib/env.ts:81`
  - [ ] 1.4 Document that document upload features will be unavailable if `OPENAI_API_KEY` is not set

- [ ] 2. Add UploadedDocument Table to Schema
  - [ ] 2.1 Add table definition in `lib/db/schema.ts` after `UserCredit` table (after line 26)
  - [ ] 2.2 Define identity columns: `id` (UUID, primaryKey, defaultRandom), `filename` (text)
  - [ ] 2.3 Define ownership columns: `uploadedBy` (text, references user.id with cascade delete), `uploadedAt` (timestamp, defaultNow), `updatedAt` (timestamp, defaultNow), `deletedAt` (timestamp, nullable)
  - [ ] 2.4 Define file metadata columns: `fileSize` (integer), `contentType` (text)
  - [ ] 2.5 Define storage reference columns: `blobUrl` (text), `blobPathname` (text)
  - [ ] 2.6 Define OpenAI reference columns: `openaiFileId` (text, notNull, unique), `vectorStoreId` (text, notNull)
  - [ ] 2.7 Define processing status columns: `status` (varchar enum: "uploading", "processing", "ready", "failed", default "uploading"), `errorMessage` (text, nullable)
  - [ ] 2.8 Define organization column: `tags` (json, $type<string[]>(), default [])
  - [ ] 2.9 Add indexes in second parameter callback: `uploadedByIdx`, `statusIdx`, `vectorStoreIdx`, `deletedAtIdx`

- [ ] 3. Add VectorStoreConfig Table to Schema
  - [ ] 3.1 Add table definition in `lib/db/schema.ts` after `UploadedDocument` table
  - [ ] 3.2 Define singleton primary key: `id` (text, primaryKey, default "singleton")
  - [ ] 3.3 Define vector store reference: `vectorStoreId` (text, notNull, unique)
  - [ ] 3.4 Define timestamp columns: `createdAt` (timestamp, defaultNow), `updatedAt` (timestamp, defaultNow)

- [ ] 4. Add Type Inference Exports
  - [ ] 4.1 Export `UploadedDocument` type using `InferSelectModel<typeof uploadedDocument>`
  - [ ] 4.2 Export `InsertUploadedDocument` type using `InferInsertModel<typeof uploadedDocument>`
  - [ ] 4.3 Export `VectorStoreConfig` type using `InferSelectModel<typeof vectorStoreConfig>`
  - [ ] 4.4 Export `InsertVectorStoreConfig` type using `InferInsertModel<typeof vectorStoreConfig>`

- [ ] 5. Generate and Apply Database Migration
  - [ ] 5.1 Run `pnpm db:generate` to create migration file
  - [ ] 5.2 Review generated SQL in `lib/db/migrations/` directory
  - [ ] 5.3 Verify CREATE TABLE statements for both tables
  - [ ] 5.4 Confirm all indexes are included in migration
  - [ ] 5.5 Verify foreign key constraint to `user.id` with cascade delete
  - [ ] 5.6 Run `pnpm db:migrate` to apply migration
  - [ ] 5.7 Test migration rollback if needed

### Manual Tasks
- Ensure production database backup is created before running migration
- Verify `OPENAI_API_KEY` is set in Vercel environment variables for production deployment

---

## Phase 2: OpenAI Vector Store Integration

### Overview
Build the integration layer with OpenAI's Files and Vector Store APIs. This includes initializing a shared vector store for the organization, uploading files to OpenAI, adding files to the vector store, tracking processing status, and handling deletions.

### Tasks

- [ ] 1. Create OpenAI Client Initialization
  - [ ] 1.1 Create new file `lib/openai/client.ts`
  - [ ] 1.2 Import `OpenAI` from "openai" package
  - [ ] 1.3 Import `env` from "@/lib/env"
  - [ ] 1.4 Export module-level singleton: `export const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY })`
  - [ ] 1.5 Add JSDoc comment explaining this client is for Files and Vector Store APIs (separate from AI SDK gateway)

- [ ] 2. Create Exponential Backoff Retry Utility
  - [ ] 2.1 Create new file `lib/openai/retry.ts`
  - [ ] 2.2 Define `withRetry<T>` async function accepting `fn: () => Promise<T>` and `maxRetries: number = 3`
  - [ ] 2.3 Implement try-catch loop with exponential backoff (wait time: `2^attempt * 1000ms`)
  - [ ] 2.4 Check error status codes: retry on 429, 500, 503; throw immediately on 400, 403, 404
  - [ ] 2.5 Log each retry attempt with context (attempt number, error message)
  - [ ] 2.6 Throw error after max retries exceeded
  - [ ] 2.7 Export `withRetry` function

- [ ] 3. Implement Vector Store Management Functions
  - [ ] 3.1 Create new file `lib/openai/vector-store.ts`
  - [ ] 3.2 Import `openaiClient` from "./client"
  - [ ] 3.3 Import `withRetry` from "./retry"
  - [ ] 3.4 Import database queries: `getVectorStoreId`, `setVectorStoreId` from "@/lib/db/queries"
  - [ ] 3.5 Import logger: `createModuleLogger` from "@/lib/logger"

- [ ] 4. Implement getOrCreateVectorStore Function
  - [ ] 4.1 Define `async function getOrCreateVectorStore(): Promise<string>`
  - [ ] 4.2 Query `VectorStoreConfig` table for singleton record using `getVectorStoreId()`
  - [ ] 4.3 If record exists, return `vectorStoreId` immediately
  - [ ] 4.4 If not exists, call `openaiClient.beta.vectorStores.create({ name: "Organization Documents" })` with retry wrapper
  - [ ] 4.5 Insert new record using `setVectorStoreId(vectorStore.id)`
  - [ ] 4.6 Log vector store creation with ID
  - [ ] 4.7 Return vector store ID
  - [ ] 4.8 Wrap entire function in try-catch, log errors, re-throw

- [ ] 5. Implement addFileToVectorStore Function
  - [ ] 5.1 Define `async function addFileToVectorStore(vectorStoreId: string, fileId: string): Promise<void>`
  - [ ] 5.2 Wrap OpenAI API call in `withRetry` for rate limit handling
  - [ ] 5.3 Call `openaiClient.beta.vectorStores.files.create(vectorStoreId, { file_id: fileId })`
  - [ ] 5.4 Log successful file addition with vectorStoreId and fileId
  - [ ] 5.5 Catch and log errors, re-throw for upstream handling
  - [ ] 5.6 Add JSDoc comment noting this initiates async indexing (non-blocking)

- [ ] 6. Implement removeFileFromVectorStore Function
  - [ ] 6.1 Define `async function removeFileFromVectorStore(vectorStoreId: string, fileId: string): Promise<void>`
  - [ ] 6.2 Wrap API call in try-catch
  - [ ] 6.3 Call `openaiClient.beta.vectorStores.files.del(vectorStoreId, fileId)`
  - [ ] 6.4 Ignore 404 errors (file already removed)
  - [ ] 6.5 Retry on 429 rate limits using `withRetry`
  - [ ] 6.6 Log successful removal
  - [ ] 6.7 Add JSDoc comment noting this only removes from vector store, not the underlying file

- [ ] 7. Implement pollVectorStoreStatus Function
  - [ ] 7.1 Define `async function pollVectorStoreStatus(vectorStoreId: string): Promise<{ inProgress: number; completed: number; failed: number }>`
  - [ ] 7.2 Call `openaiClient.beta.vectorStores.retrieve(vectorStoreId)` with retry wrapper
  - [ ] 7.3 Extract file counts: `file_counts.in_progress`, `file_counts.completed`, `file_counts.failed`
  - [ ] 7.4 Return counts object
  - [ ] 7.5 Log polling operation with counts
  - [ ] 7.6 Add JSDoc comment explaining usage for background status updates

- [ ] 8. Implement File Upload and Management Functions
  - [ ] 8.1 Create new file `lib/openai/files.ts`
  - [ ] 8.2 Import `openaiClient` from "./client"
  - [ ] 8.3 Import `withRetry` from "./retry"
  - [ ] 8.4 Import logger: `createModuleLogger`

- [ ] 9. Implement uploadFileToOpenAI Function
  - [ ] 9.1 Define `async function uploadFileToOpenAI(filename: string, fileBuffer: Buffer): Promise<string>`
  - [ ] 9.2 Convert buffer to Blob: `new Blob([fileBuffer])`
  - [ ] 9.3 Wrap API call in `withRetry` for rate limits
  - [ ] 9.4 Call `openaiClient.files.create({ file: blob, purpose: "assistants" })`
  - [ ] 9.5 Extract and return `file.id`
  - [ ] 9.6 Log successful upload with filename and file ID
  - [ ] 9.7 Catch validation errors (400 for invalid format/size) and re-throw with clear message
  - [ ] 9.8 Add JSDoc comment noting file upload is synchronous but indexing is async

- [ ] 10. Implement retrieveFileContent Function
  - [ ] 10.1 Define `async function retrieveFileContent(fileId: string): Promise<string>`
  - [ ] 10.2 Wrap API call in `withRetry`
  - [ ] 10.3 Call `openaiClient.files.content(fileId)`
  - [ ] 10.4 Read response as text
  - [ ] 10.5 Return content string
  - [ ] 10.6 Log retrieval with fileId and content length
  - [ ] 10.7 Add JSDoc warning about large files potentially exceeding context limits

- [ ] 11. Implement deleteFileFromOpenAI Function
  - [ ] 11.1 Define `async function deleteFileFromOpenAI(fileId: string): Promise<void>`
  - [ ] 11.2 Wrap in try-catch
  - [ ] 11.3 Call `openaiClient.files.del(fileId)`
  - [ ] 11.4 Ignore 404 errors (already deleted)
  - [ ] 11.5 Log successful deletion
  - [ ] 11.6 Add JSDoc warning that deletion is permanent and cascades to all vector stores

- [ ] 12. Export All Functions
  - [ ] 12.1 Export all vector store functions from `vector-store.ts`
  - [ ] 12.2 Export all file functions from `files.ts`
  - [ ] 12.3 Add comprehensive JSDoc comments to all exported functions
  - [ ] 12.4 Add type annotations for all parameters and return values

### Manual Tasks
- Test integration with OpenAI API in development environment
- Verify OpenAI SDK version is compatible (5.8.2 or later)
- Monitor OpenAI API rate limits during testing

---

## Phase 3: Document Management Backend (Admin)

### Overview
Implement the backend logic for document management: database queries, tRPC admin procedures, and file upload API endpoint. This includes listing documents with filters, uploading new documents (dual storage + vector store), updating existing documents, deleting documents with cleanup, and managing tags.

### Tasks

- [ ] 1. Add Document Query Functions to queries.ts
  - [ ] 1.1 Open `lib/db/queries.ts`
  - [ ] 1.2 Import new table definitions: `uploadedDocument`, `vectorStoreConfig` from "./schema"
  - [ ] 1.3 Add "use server" directive at top if not present
  - [ ] 1.4 Import Drizzle operators needed: `and`, `eq`, `isNull`, `ilike`, `sql` from "drizzle-orm"

- [ ] 2. Implement listDocuments Query Function
  - [ ] 2.1 Define `async function listDocuments(input: { searchTerm?: string; tags?: string[]; status?: "uploading" | "processing" | "ready" | "failed"; limit?: number; offset?: number }): Promise<{ documents: UploadedDocument[]; total: number; hasMore: boolean }>`
  - [ ] 2.2 Build where conditions array
  - [ ] 2.3 Add search term filter: `if (input.searchTerm) whereConditions.push(ilike(uploadedDocument.filename, \`%\${input.searchTerm}%\`))`
  - [ ] 2.4 Add tags filter using Postgres JSON contains operator: `if (input.tags && input.tags.length > 0) whereConditions.push(sql\`\${uploadedDocument.tags}::jsonb @> \${JSON.stringify(input.tags)}::jsonb\`)`
  - [ ] 2.5 Add status filter: `if (input.status) whereConditions.push(eq(uploadedDocument.status, input.status))`
  - [ ] 2.6 Always exclude soft-deleted: `whereConditions.push(isNull(uploadedDocument.deletedAt))`
  - [ ] 2.7 Query documents with filters, ordering by `uploadedAt DESC`, with limit/offset
  - [ ] 2.8 Count total with same filters (separate query)
  - [ ] 2.9 Calculate `hasMore: input.offset + input.limit < total`
  - [ ] 2.10 Return object with documents, total, hasMore
  - [ ] 2.11 Wrap in try-catch, log errors, re-throw

- [ ] 3. Implement getDocumentById Query Function
  - [ ] 3.1 Define `async function getDocumentById(id: string): Promise<UploadedDocument | null>`
  - [ ] 3.2 Query: `db.select().from(uploadedDocument).where(and(eq(uploadedDocument.id, id), isNull(uploadedDocument.deletedAt))).limit(1)`
  - [ ] 3.3 Return first result or null
  - [ ] 3.4 Wrap in try-catch, log errors, re-throw

- [ ] 4. Implement saveDocument Query Function
  - [ ] 4.1 Define `async function saveDocument(input: Omit<InsertUploadedDocument, 'id' | 'uploadedAt' | 'updatedAt'>): Promise<UploadedDocument>`
  - [ ] 4.2 Insert with auto-generated ID and timestamps
  - [ ] 4.3 Return inserted document (use `.returning()`)
  - [ ] 4.4 Wrap in try-catch, log errors, re-throw

- [ ] 5. Implement updateDocumentStatus Query Function
  - [ ] 5.1 Define `async function updateDocumentStatus(id: string, status: "uploading" | "processing" | "ready" | "failed", errorMessage?: string | null): Promise<void>`
  - [ ] 5.2 Update: `db.update(uploadedDocument).set({ status, errorMessage, updatedAt: new Date() }).where(eq(uploadedDocument.id, id))`
  - [ ] 5.3 Wrap in try-catch, log errors, re-throw

- [ ] 6. Implement softDeleteDocument Query Function
  - [ ] 6.1 Define `async function softDeleteDocument(id: string): Promise<void>`
  - [ ] 6.2 Update: `db.update(uploadedDocument).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(uploadedDocument.id, id))`
  - [ ] 6.3 Wrap in try-catch, log errors, re-throw

- [ ] 7. Implement updateDocumentTags Query Function
  - [ ] 7.1 Define `async function updateDocumentTags(id: string, tags: string[]): Promise<void>`
  - [ ] 7.2 Update: `db.update(uploadedDocument).set({ tags, updatedAt: new Date() }).where(eq(uploadedDocument.id, id))`
  - [ ] 7.3 Wrap in try-catch, log errors, re-throw

- [ ] 8. Implement getAllTags Query Function
  - [ ] 8.1 Define `async function getAllTags(): Promise<string[]>`
  - [ ] 8.2 Query all non-deleted documents: `db.select({ tags: uploadedDocument.tags }).from(uploadedDocument).where(isNull(uploadedDocument.deletedAt))`
  - [ ] 8.3 Flatten tags arrays: `documents.flatMap(d => d.tags || [])`
  - [ ] 8.4 Deduplicate: `[...new Set(allTags)]`
  - [ ] 8.5 Sort alphabetically: `.sort()`
  - [ ] 8.6 Return unique sorted tags array
  - [ ] 8.7 Wrap in try-catch, log errors, re-throw

- [ ] 9. Implement Vector Store Config Query Functions
  - [ ] 9.1 Define `async function getVectorStoreId(): Promise<string | null>`
  - [ ] 9.2 Query: `db.select().from(vectorStoreConfig).where(eq(vectorStoreConfig.id, "singleton")).limit(1)`
  - [ ] 9.3 Return vectorStoreId or null
  - [ ] 9.4 Define `async function setVectorStoreId(vectorStoreId: string): Promise<void>`
  - [ ] 9.5 Upsert: `db.insert(vectorStoreConfig).values({ id: "singleton", vectorStoreId }).onConflictDoUpdate({ target: vectorStoreConfig.id, set: { vectorStoreId, updatedAt: new Date() } })`
  - [ ] 9.6 Wrap both in try-catch, log errors, re-throw

- [ ] 10. Export All Query Functions
  - [ ] 10.1 Export all new functions from `lib/db/queries.ts`

- [ ] 11. Add Document Procedures to Admin Router
  - [ ] 11.1 Open `trpc/routers/admin.router.ts`
  - [ ] 11.2 Import new query functions from "@/lib/db/queries"
  - [ ] 11.3 Import OpenAI integration functions from "@/lib/openai/vector-store" and "@/lib/openai/files"
  - [ ] 11.4 Add `documents` namespace to router export after existing procedures

- [ ] 12. Implement documents.list Procedure
  - [ ] 12.1 Use `adminProcedure` for automatic admin protection
  - [ ] 12.2 Define input schema with Zod: `searchTerm` (string, optional), `tags` (array of strings, optional), `status` (enum, optional), `limit` (number, min 1, max 100, default 50), `offset` (number, min 0, default 0)
  - [ ] 12.3 Use `.query()` method
  - [ ] 12.4 Call `listDocuments(input)` and return result
  - [ ] 12.5 Handle errors with TRPCError

- [ ] 13. Implement documents.getById Procedure
  - [ ] 13.1 Use `adminProcedure`
  - [ ] 13.2 Define input: `id` (string)
  - [ ] 13.3 Use `.query()` method
  - [ ] 13.4 Call `getDocumentById(input.id)`
  - [ ] 13.5 Throw `NOT_FOUND` TRPCError if null
  - [ ] 13.6 Return document

- [ ] 14. Implement documents.delete Procedure
  - [ ] 14.1 Use `adminProcedure`
  - [ ] 14.2 Define input: `id` (string)
  - [ ] 14.3 Use `.mutation()` method
  - [ ] 14.4 Get document by ID (throw NOT_FOUND if doesn't exist)
  - [ ] 14.5 Remove from vector store: `await removeFileFromVectorStore(doc.vectorStoreId, doc.openaiFileId)`
  - [ ] 14.6 Delete from OpenAI Files: `await deleteFileFromOpenAI(doc.openaiFileId)`
  - [ ] 14.7 Soft delete in database: `await softDeleteDocument(id)`
  - [ ] 14.8 Return `{ success: true }`
  - [ ] 14.9 Wrap in try-catch, convert errors to TRPCError

- [ ] 15. Implement documents.updateTags Procedure
  - [ ] 15.1 Use `adminProcedure`
  - [ ] 15.2 Define input: `id` (string), `tags` (array of strings)
  - [ ] 15.3 Use `.mutation()` method
  - [ ] 15.4 Call `updateDocumentTags(input.id, input.tags)`
  - [ ] 15.5 Return `{ success: true }`

- [ ] 16. Implement documents.getAllTags Procedure
  - [ ] 16.1 Use `adminProcedure`
  - [ ] 16.2 No input needed
  - [ ] 16.3 Use `.query()` method
  - [ ] 16.4 Call `getAllTags()`
  - [ ] 16.5 Return `{ tags: result }`

- [ ] 17. Implement documents.refreshStatus Procedure
  - [ ] 17.1 Use `adminProcedure`
  - [ ] 17.2 No input needed
  - [ ] 17.3 Use `.mutation()` method
  - [ ] 17.4 Get vector store ID: `const vsId = await getVectorStoreId()`
  - [ ] 17.5 If no vector store, return early with zero counts
  - [ ] 17.6 Poll status: `const counts = await pollVectorStoreStatus(vsId)`
  - [ ] 17.7 Update document statuses in database based on counts (implementation detail: may require additional logic to match file IDs)
  - [ ] 17.8 Return counts object
  - [ ] 17.9 Add TODO comment noting this is a simplified implementation

- [ ] 18. Create Document Upload API Endpoint
  - [ ] 18.1 Create new file `app/(admin)/api/documents/upload/route.ts`
  - [ ] 18.2 Import `auth` from "@/lib/auth"
  - [ ] 18.3 Import upload functions from OpenAI integration layer
  - [ ] 18.4 Import `uploadFile` from "@/lib/blob"
  - [ ] 18.5 Import database queries

- [ ] 19. Implement POST Handler for Document Upload
  - [ ] 19.1 Define `async function POST(request: Request)`
  - [ ] 19.2 Check session and verify admin role: `const session = await auth.api.getSession({ headers: await headers() }); if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: "Unauthorized" }, { status: 401 })`
  - [ ] 19.3 Extract FormData from request
  - [ ] 19.4 Get file from FormData: `const file = formData.get("file") as Blob`
  - [ ] 19.5 Get filename from FormData: `const filename = (formData.get("file") as File).name`
  - [ ] 19.6 Get tags from FormData (optional): `const tags = JSON.parse(formData.get("tags") as string || "[]")`
  - [ ] 19.7 Validate file size <= 512 MB
  - [ ] 19.8 Validate file type against supported list (PDF, DOCX, TXT, MD, etc.)
  - [ ] 19.9 Convert file to buffer: `const fileBuffer = await file.arrayBuffer()`

- [ ] 20. Implement Dual Storage Upload Logic
  - [ ] 20.1 Upload to Vercel Blob: `const blobResult = await uploadFile(filename, fileBuffer)`
  - [ ] 20.2 Upload to OpenAI Files: `const openaiFileId = await uploadFileToOpenAI(filename, Buffer.from(fileBuffer))`
  - [ ] 20.3 Get or create vector store: `const vectorStoreId = await getOrCreateVectorStore()`
  - [ ] 20.4 Add file to vector store: `await addFileToVectorStore(vectorStoreId, openaiFileId)`
  - [ ] 20.5 Save to database: `const doc = await saveDocument({ filename, fileSize: file.size, contentType: file.type, blobUrl: blobResult.url, blobPathname: blobResult.pathname, openaiFileId, vectorStoreId, status: "processing", uploadedBy: session.user.id, tags })`
  - [ ] 20.6 Return success response: `NextResponse.json({ success: true, documentId: doc.id })`

- [ ] 21. Implement Error Handling for Upload
  - [ ] 21.1 Catch Vercel Blob errors → Return 500 with message
  - [ ] 21.2 Catch OpenAI API errors → Return 500, log error, cleanup blob if needed
  - [ ] 21.3 Catch database errors → Return 500, log error, cleanup blob and OpenAI file
  - [ ] 21.4 Add comprehensive logging for debugging

- [ ] 22. Create Document Update API Endpoint
  - [ ] 22.1 Create new file `app/(admin)/api/documents/[id]/update/route.ts`
  - [ ] 22.2 Follow same authentication pattern as upload route
  - [ ] 22.3 Get existing document by ID from route params
  - [ ] 22.4 Extract new file and tags from FormData
  - [ ] 22.5 Remove old file from vector store
  - [ ] 22.6 Delete old file from OpenAI
  - [ ] 22.7 Upload new file to both Vercel Blob and OpenAI
  - [ ] 22.8 Add new file to vector store
  - [ ] 22.9 Update database record (not replace) with new file IDs and metadata
  - [ ] 22.10 Return success response
  - [ ] 22.11 Add error handling with cleanup

### Manual Tasks
- Test upload flow with various file types
- Verify error handling with invalid files
- Test concurrent uploads by different admins
- Monitor OpenAI file processing status

---

## Phase 4: Admin UI for Document Management

### Overview
Build the admin UI for document management at `/admin/documents`. This includes a document list table with search/filters, upload dialog with drag-drop, update dialog for replacing documents, tag management with auto-suggest, and action buttons for delete/update/tags.

### Tasks

- [ ] 1. Create Documents Page Component
  - [ ] 1.1 Create new file `app/admin/documents/page.tsx`
  - [ ] 1.2 Define `DocumentsPage` component following pattern from `app/admin/users/page.tsx`
  - [ ] 1.3 Add page heading: "Document Management"
  - [ ] 1.4 Add description: "Upload and manage documents for semantic search in the AI chat"
  - [ ] 1.5 Import and render `DocumentListTable` component
  - [ ] 1.6 Use container with proper spacing (follow existing admin page pattern)

- [ ] 2. Create Document List Table Component
  - [ ] 2.1 Create new file `components/admin/document-list-table.tsx`
  - [ ] 2.2 Add "use client" directive at top
  - [ ] 2.3 Import necessary dependencies: `useQuery`, `useState`, shadcn/ui components
  - [ ] 2.4 Import `useTRPC` from "@/trpc/react"

- [ ] 3. Set Up Table State Management
  - [ ] 3.1 Define `useState` for search term with empty string initial value
  - [ ] 3.2 Define `useState` for tag filter (array of strings)
  - [ ] 3.3 Define `useState` for status filter (enum or null)
  - [ ] 3.4 Define `useState` for page offset (number, default 0)
  - [ ] 3.5 Define `useState` for refetch key (number, default 0) for manual invalidation

- [ ] 4. Implement tRPC Query for Document List
  - [ ] 4.1 Use `useQuery` with `trpc.admin.documents.list.queryOptions`
  - [ ] 4.2 Pass search term, tags, status, limit (50), offset as query params
  - [ ] 4.3 Destructure `data`, `isLoading`, `error` from query result
  - [ ] 4.4 Create `invalidate` callback that increments refetch key

- [ ] 5. Build Table Header UI
  - [ ] 5.1 Use Card component with CardHeader
  - [ ] 5.2 Add CardTitle: "Documents"
  - [ ] 5.3 Add CardDescription showing total count from query result
  - [ ] 5.4 Add "Upload Document" button that opens UploadDocumentDialog
  - [ ] 5.5 Add "Refresh Status" button that calls `trpc.admin.documents.refreshStatus.mutate()`

- [ ] 6. Build Search and Filter UI
  - [ ] 6.1 Add search Input with debounce (use setTimeout pattern)
  - [ ] 6.2 Placeholder: "Search by filename..."
  - [ ] 6.3 Add tags multi-select dropdown (fetch available tags from `trpc.admin.documents.getAllTags`)
  - [ ] 6.4 Add status filter dropdown (All, Uploading, Processing, Ready, Failed)
  - [ ] 6.5 Style filters in horizontal layout with gap

- [ ] 7. Build Table Structure
  - [ ] 7.1 Use shadcn/ui Table component
  - [ ] 7.2 Define TableHeader with columns: Filename, Status, Tags, File Size, Uploaded By, Uploaded At, Actions
  - [ ] 7.3 Render loading state when `isLoading` is true
  - [ ] 7.4 Render error state when `error` exists
  - [ ] 7.5 Map over `data.documents` to render TableRow for each document

- [ ] 8. Implement Table Row Rendering
  - [ ] 8.1 Render filename with content type icon (use icon based on contentType)
  - [ ] 8.2 Render status using `DocumentStatusBadge` component
  - [ ] 8.3 Render tags as array of Badge components
  - [ ] 8.4 Format file size with bytes → KB/MB conversion
  - [ ] 8.5 Render uploaded by user name (may need to join with user data)
  - [ ] 8.6 Format upload date with `toLocaleDateString()`
  - [ ] 8.7 Render `DocumentActions` component in Actions column

- [ ] 9. Add Pagination UI
  - [ ] 9.1 Add pagination controls below table
  - [ ] 9.2 Show current page and total pages
  - [ ] 9.3 Add Previous/Next buttons
  - [ ] 9.4 Update offset state on page change
  - [ ] 9.5 Disable buttons appropriately based on `hasMore` and current page

- [ ] 10. Create Upload Document Dialog
  - [ ] 10.1 Create new file `components/admin/upload-document-dialog.tsx`
  - [ ] 10.2 Add "use client" directive
  - [ ] 10.3 Define props: `open`, `onOpenChange`, `onSuccess`
  - [ ] 10.4 Set up React Hook Form with Zod schema
  - [ ] 10.5 Define validation: file required, max 512 MB, supported types only

- [ ] 11. Implement Drag-Drop File Zone
  - [ ] 11.1 Use `react-dropzone` or HTML5 drag events
  - [ ] 11.2 Show drop zone with dashed border when idle
  - [ ] 11.3 Highlight drop zone on drag over
  - [ ] 11.4 Display selected file with icon, name, size
  - [ ] 11.5 Add "Choose File" button as alternative to drag-drop
  - [ ] 11.6 Show file type/size validation errors inline

- [ ] 12. Add Tag Input to Upload Dialog
  - [ ] 12.1 Import and render `DocumentTagsInput` component
  - [ ] 12.2 Pass empty array as initial value
  - [ ] 12.3 Fetch available tags for auto-suggest from tRPC
  - [ ] 12.4 Handle tag changes with form state

- [ ] 13. Implement Upload Form Submission
  - [ ] 13.1 Create FormData object with file and tags
  - [ ] 13.2 Use `fetch` to POST to `/api/documents/upload`
  - [ ] 13.3 Show upload progress indicator (if API supports progress events)
  - [ ] 13.4 Handle success: show toast notification, close dialog, call `onSuccess()`
  - [ ] 13.5 Handle errors: display error message, keep dialog open
  - [ ] 13.6 Disable submit button during upload

- [ ] 14. Create Update Document Dialog
  - [ ] 14.1 Create new file `components/admin/update-document-dialog.tsx`
  - [ ] 14.2 Follow similar pattern as upload dialog
  - [ ] 14.3 Define props: `documentId`, `currentFilename`, `currentTags`, `open`, `onOpenChange`, `onSuccess`
  - [ ] 14.4 Show current filename and metadata
  - [ ] 14.5 Display warning: "This will replace the existing document in the vector store"
  - [ ] 14.6 Allow selecting new file (same drag-drop pattern)
  - [ ] 14.7 Pre-populate tags from current document
  - [ ] 14.8 Submit to `/api/documents/[id]/update`
  - [ ] 14.9 Add confirmation step before upload

- [ ] 15. Create Document Actions Component
  - [ ] 15.1 Create new file `components/admin/document-actions.tsx`
  - [ ] 15.2 Define props: `document`, `onUpdate`, `onDelete`, `onTagsUpdate`
  - [ ] 15.3 Use DropdownMenu for action buttons
  - [ ] 15.4 Add "Update" action that opens UpdateDocumentDialog
  - [ ] 15.5 Add "Delete" action with AlertDialog confirmation
  - [ ] 15.6 Add "Edit Tags" action that opens Popover with tag input
  - [ ] 15.7 Disable actions when status is "uploading" or "processing"
  - [ ] 15.8 Show loading state during mutations

- [ ] 16. Implement Delete Confirmation Flow
  - [ ] 16.1 Use AlertDialog for delete confirmation
  - [ ] 16.2 Show warning message with document name
  - [ ] 16.3 Explain consequences: "This will remove the document from the vector store and delete the file"
  - [ ] 16.4 Add "Cancel" and "Delete" buttons
  - [ ] 16.5 Call `trpc.admin.documents.delete.mutate()` on confirm
  - [ ] 16.6 Show toast on success
  - [ ] 16.7 Show toast on error
  - [ ] 16.8 Call `onDelete()` callback to refresh table

- [ ] 17. Create Document Tags Input Component
  - [ ] 17.1 Create new file `components/admin/document-tags-input.tsx`
  - [ ] 17.2 Define props: `value` (string array), `onChange` (callback), `suggestions` (optional string array)
  - [ ] 17.3 Use `cmdk` or custom combobox for auto-suggest
  - [ ] 17.4 Show selected tags as badges with remove buttons
  - [ ] 17.5 Allow typing new tags (create on Enter or comma)
  - [ ] 17.6 Filter suggestions by input text
  - [ ] 17.7 Support keyboard navigation for accessibility
  - [ ] 17.8 Call `onChange` whenever tags are added/removed

- [ ] 18. Fetch Tag Suggestions
  - [ ] 18.1 Use `trpc.admin.documents.getAllTags.useQuery()` in tag input component
  - [ ] 18.2 Pass tags to suggestions prop
  - [ ] 18.3 Handle loading state while fetching
  - [ ] 18.4 Allow creating tags not in suggestions list

- [ ] 19. Create Document Status Badge Component
  - [ ] 19.1 Create new file `components/admin/document-status-badge.tsx`
  - [ ] 19.2 Define props: `status`, `errorMessage` (optional)
  - [ ] 19.3 Map status to badge variant: uploading (secondary), processing (outline), ready (success), failed (destructive)
  - [ ] 19.4 Show spinner icon for uploading/processing states
  - [ ] 19.5 Add Tooltip on hover showing error message if status is "failed"
  - [ ] 19.6 Use `Loader2` icon with spin animation for active states

- [ ] 20. Style and Polish UI
  - [ ] 20.1 Ensure consistent spacing throughout document list page
  - [ ] 20.2 Add responsive design for mobile views
  - [ ] 20.3 Test keyboard navigation for all dialogs
  - [ ] 20.4 Verify proper focus management in modals
  - [ ] 20.5 Add proper loading skeletons during data fetch
  - [ ] 20.6 Test with empty state (no documents uploaded yet)
  - [ ] 20.7 Add empty state message with "Upload your first document" CTA

- [ ] 21. Add Navigation Link (Optional)
  - [ ] 21.1 Open `app/admin/layout.tsx` if admin navigation exists
  - [ ] 21.2 Add link to `/admin/documents` in navigation menu
  - [ ] 21.3 Use appropriate icon (DocumentIcon or FileTextIcon)

### Manual Tasks
- Test upload with drag-and-drop on various browsers
- Verify file size/type validation works correctly
- Test tag auto-suggest with large numbers of tags
- Test concurrent document operations by multiple admins

---

## Phase 5: AI Agent Tools (Semantic Search & File Retrieve)

### Overview
Implement two AI SDK v5 tools for the agent: `semanticSearch` for querying the vector store and `fileRetrieve` for loading entire documents. Register tools in the chat API, add to tools definitions registry, and integrate with existing tool infrastructure.

### Tasks

- [ ] 1. Create Semantic Search Tool File
  - [ ] 1.1 Create new file `lib/ai/tools/semantic-search.ts`
  - [ ] 1.2 Import `tool` from "ai"
  - [ ] 1.3 Import `z` from "zod"
  - [ ] 1.4 Import OpenAI client: `openaiClient` from "@/lib/openai/client"
  - [ ] 1.5 Import database queries: `getDocumentById` from "@/lib/db/queries"
  - [ ] 1.6 Import `createModuleLogger` from "@/lib/logger"
  - [ ] 1.7 Import `StreamWriter` type from "@/lib/ai/types"

- [ ] 2. Define Semantic Search Tool Input Schema
  - [ ] 2.1 Create Zod object schema with `query` (string, describe: "The search query in natural language")
  - [ ] 2.2 Add optional `limit` (number, min 1, max 20, describe: "Maximum number of results to return (default: 5)")
  - [ ] 2.3 Set default for limit to 5 in execute function

- [ ] 3. Implement Semantic Search Execute Function - Setup
  - [ ] 3.1 Define tool with `tool({ description, inputSchema, execute })`
  - [ ] 3.2 Set description: "Search the organization's document library using semantic similarity to find relevant information. Returns text passages with citations to source documents."
  - [ ] 3.3 Accept `dataStream` parameter in tool factory function (similar to existing tools)
  - [ ] 3.4 Create logger instance in execute function
  - [ ] 3.5 Write data stream update: "Search started"

- [ ] 4. Implement Semantic Search Execute Function - Vector Store Query
  - [ ] 4.1 Get vector store ID from database: `const vsId = await getVectorStoreId()`
  - [ ] 4.2 If no vector store, return `{ results: [], totalResults: 0 }` early
  - [ ] 4.3 Create temporary OpenAI assistant with file_search tool: `await openaiClient.beta.assistants.create({ model: "gpt-4o", tools: [{ type: "file_search", file_search: { max_num_results: limit || 5 } }], tool_resources: { file_search: { vector_store_ids: [vsId] } } })`
  - [ ] 4.4 Create thread with user message: `await openaiClient.beta.threads.create({ messages: [{ role: "user", content: query }] })`
  - [ ] 4.5 Run assistant on thread: `await openaiClient.beta.threads.runs.create(threadId, { assistant_id: assistantId })`

- [ ] 5. Implement Semantic Search Execute Function - Poll and Extract Results
  - [ ] 5.1 Poll run status until completed (use simple interval polling)
  - [ ] 5.2 Retrieve messages from thread: `await openaiClient.beta.threads.messages.list(threadId)`
  - [ ] 5.3 Extract assistant message (first message in response)
  - [ ] 5.4 Get annotations from message text (format: `【18:0†source】`)
  - [ ] 5.5 For each annotation with file citation:
    - [ ] 5.5.1 Extract file_id from citation
    - [ ] 5.5.2 Query database for document by openaiFileId
    - [ ] 5.5.3 Extract page number from citation if available (may be null)
    - [ ] 5.5.4 Extract text quote/excerpt
    - [ ] 5.5.5 Build SearchResultItem: `{ documentId, documentName: filename, chunkContent: excerpt, pageNumber, relevanceScore: annotationIndex }` (use annotation index as proxy for relevance)

- [ ] 6. Implement Semantic Search Execute Function - Cleanup and Return
  - [ ] 6.1 Delete temporary assistant: `await openaiClient.beta.assistants.del(assistantId)`
  - [ ] 6.2 Delete thread: `await openaiClient.beta.threads.del(threadId)`
  - [ ] 6.3 Write data stream update: "Search completed"
  - [ ] 6.4 Return `{ results: SearchResultItem[], totalResults: results.length }`
  - [ ] 6.5 Wrap entire execute in try-catch, return `{ error: string, results: [] }` on failure
  - [ ] 6.6 Ensure cleanup happens even on error (use finally block)
  - [ ] 6.7 Log errors with context (query, error message)

- [ ] 7. Create File Retrieve Tool File
  - [ ] 7.1 Create new file `lib/ai/tools/file-retrieve.ts`
  - [ ] 7.2 Import necessary dependencies (same as semantic search)
  - [ ] 7.3 Import `retrieveFileContent` from "@/lib/openai/files"

- [ ] 8. Define File Retrieve Tool Input Schema
  - [ ] 8.1 Create Zod object schema with `documentId` (string, describe: "The ID of the document to retrieve")

- [ ] 9. Implement File Retrieve Execute Function
  - [ ] 9.1 Define tool with description: "Retrieve the complete content of a specific document from the library. Use this when you need full context from a document rather than just search results."
  - [ ] 9.2 Accept `dataStream` parameter
  - [ ] 9.3 Write data stream update: "Retrieving document"
  - [ ] 9.4 Get document by ID: `const doc = await getDocumentById(documentId)`
  - [ ] 9.5 If not found or deletedAt is set, return `{ error: "Document not found" }`
  - [ ] 9.6 If status !== "ready", return `{ error: "Document not ready (still processing or failed)" }`
  - [ ] 9.7 Retrieve file content: `const content = await retrieveFileContent(doc.openaiFileId)`
  - [ ] 9.8 Extract page count from content (best effort, may return null)
  - [ ] 9.9 Write data stream update: "Document retrieved"
  - [ ] 9.10 Return `{ documentId, documentName: doc.filename, content, pageCount: extractedPageCount || null, fileSize: doc.fileSize }`
  - [ ] 9.11 Add error handling with clear messages

- [ ] 10. Add Tools to Tools Definitions Registry
  - [ ] 10.1 Open `lib/ai/tools/tools-definitions.ts`
  - [ ] 10.2 Add to `toolsDefinitions` object:
    - [ ] 10.2.1 `semanticSearch: { name: "Semantic Search", cost: 3 }`
    - [ ] 10.2.2 `fileRetrieve: { name: "File Retrieve", cost: 1 }`
  - [ ] 10.3 Add comment explaining cost rationale (semantic search higher due to assistant creation)

- [ ] 11. Update Tool Name Schema in Types
  - [ ] 11.1 Open `lib/ai/types.ts`
  - [ ] 11.2 Add "semanticSearch" and "fileRetrieve" to `toolNameSchema` enum (line 24-36)
  - [ ] 11.3 Import tool types at top of file
  - [ ] 11.4 Add to `ChatTools` type definition:
    - [ ] 11.4.1 `semanticSearch: InferUITool<ReturnType<typeof semanticSearch>>`
    - [ ] 11.4.2 `fileRetrieve: InferUITool<ReturnType<typeof fileRetrieve>>`

- [ ] 12. Export Tools from Tools Module
  - [ ] 12.1 Open `lib/ai/tools/tools.ts`
  - [ ] 12.2 Import semantic search and file retrieve tools at top
  - [ ] 12.3 Add to `getTools()` function return object:
    - [ ] 12.3.1 `semanticSearch: semanticSearchTool({ dataStream })`
    - [ ] 12.3.2 `fileRetrieve: fileRetrieveTool({ dataStream })`
  - [ ] 12.4 Conditionally export based on `env.NEXT_PUBLIC_OPENAI_AVAILABLE` flag (similar to generateImage pattern)
  - [ ] 12.5 Verify tools auto-register in chat route (no changes needed to chat route)

- [ ] 13. Test Tool Integration
  - [ ] 13.1 Verify tools appear in chat API tools object
  - [ ] 13.2 Test semantic search with sample query
  - [ ] 13.3 Verify file retrieve with sample document ID
  - [ ] 13.4 Check tool invocation appears in chat UI
  - [ ] 13.5 Verify credit deduction works for tool usage

### Manual Tasks
- Test semantic search with various query types
- Verify file retrieve handles large documents properly
- Monitor OpenAI API usage and costs
- Test tool execution timeout scenarios

---

## Phase 6: Chat UI for Citations and Tool Rendering

### Overview
Build the UI components for rendering tool invocations and citations in the chat interface. This includes tool part renderers for semantic search and file retrieve, citation extraction from tool outputs, clickable citation links with PDF page navigation, and integration with the existing message parts system.

### Tasks

- [ ] 1. Create Semantic Search Result Renderer Component
  - [ ] 1.1 Create new file `components/semantic-search-result.tsx`
  - [ ] 1.2 Add "use client" directive
  - [ ] 1.3 Define props: `state`, `input`, `output` (following existing tool part pattern)
  - [ ] 1.4 Import necessary UI components: Card, Badge, Loader2 icon

- [ ] 2. Implement Input Available State Rendering
  - [ ] 2.1 When `state === "input-available"`, show "Searching for: [query]"
  - [ ] 2.2 Display Loader2 spinner icon
  - [ ] 2.3 Show limit parameter if specified
  - [ ] 2.4 Style with blue background/border (similar to other tool parts)

- [ ] 3. Implement Output Available State Rendering - Success
  - [ ] 3.1 When `state === "output-available"` and no error, show result count
  - [ ] 3.2 Map over `output.results` array
  - [ ] 3.3 For each result, render Card with:
    - [ ] 3.3.1 Document name as heading
    - [ ] 3.3.2 Text excerpt (chunk content)
    - [ ] 3.3.3 Page number if available
    - [ ] 3.3.4 Relevance indicator (could use position/score)
  - [ ] 3.4 Truncate long excerpts with "Read more" expansion (optional)
  - [ ] 3.5 Make each result card clickable (store for later citation linking)

- [ ] 4. Implement Output Available State Rendering - Error
  - [ ] 4.1 When `state === "output-available"` and `error` exists, show error message in red
  - [ ] 4.2 Display retry suggestion or fallback action
  - [ ] 4.3 Style consistently with other tool error states

- [ ] 5. Create File Retrieve Result Renderer Component
  - [ ] 5.1 Create new file `components/file-retrieve-result.tsx`
  - [ ] 5.2 Add "use client" directive
  - [ ] 5.3 Define props: `state`, `input`, `output`
  - [ ] 5.4 Import UI components

- [ ] 6. Implement File Retrieve Input/Loading State
  - [ ] 6.1 When `state === "input-available"`, show "Loading document..."
  - [ ] 6.2 Display spinner icon
  - [ ] 6.3 Show document ID being loaded

- [ ] 7. Implement File Retrieve Output State - Success
  - [ ] 7.1 When `state === "output-available"` and no error, show document name
  - [ ] 7.2 Display metadata: page count, file size (formatted)
  - [ ] 7.3 Show content preview (first 500 characters with "...")
  - [ ] 7.4 Add "View full document" button that opens blob URL in new tab
  - [ ] 7.5 Style with green accent (similar to document tool parts)
  - [ ] 7.6 Note: Don't display full content (too large), preview is sufficient

- [ ] 8. Implement File Retrieve Output State - Error
  - [ ] 8.1 When error exists, show error message
  - [ ] 8.2 Suggest alternative: "Try semantic search instead"
  - [ ] 8.3 Style consistently with error states

- [ ] 9. Create Citation Link Component
  - [ ] 9.1 Create new file `components/citation-link.tsx`
  - [ ] 9.2 Define props: `citation` (object with documentId, documentName, pageNumber, excerpt, blobUrl), `index` (number)
  - [ ] 9.3 Render as Link or Button styled as superscript
  - [ ] 9.4 Format: `[Document Name, p. 3]` with index number in brackets [1], [2], etc.
  - [ ] 9.5 Set href: `${citation.blobUrl}#page=${citation.pageNumber || 1}`
  - [ ] 9.6 Set target="_blank" and rel="noopener noreferrer"
  - [ ] 9.7 Wrap in Tooltip showing excerpt text on hover
  - [ ] 9.8 Use monospace styling for citation numbers

- [ ] 10. Create Citations Component
  - [ ] 10.1 Create new file `components/citations.tsx`
  - [ ] 10.2 Define props: `citations` (array of Citation objects)
  - [ ] 10.3 Render heading: "Sources" or "References"
  - [ ] 10.4 Map citations to CitationLink components
  - [ ] 10.5 Optional: Group citations by document (show nested list)
  - [ ] 10.6 Style as footnotes section at bottom of message
  - [ ] 10.7 Only render if citations array has length > 0

- [ ] 11. Add Tool Part Cases to Message Parts
  - [ ] 11.1 Open `components/message-parts.tsx`
  - [ ] 11.2 Find switch statement on `part.type` (around line 140)
  - [ ] 11.3 Add case for `'tool-semanticSearch'`:
    - [ ] 11.3.1 Extract `state`, `input`, `output`, `toolCallId` from part
    - [ ] 11.3.2 Return `<SemanticSearchResult key={toolCallId} state={state} input={input} output={output} />`
  - [ ] 11.4 Add case for `'tool-fileRetrieve'`:
    - [ ] 11.4.1 Extract `state`, `input`, `output`, `toolCallId` from part
    - [ ] 11.4.2 Return `<FileRetrieveResult key={toolCallId} state={state} input={input} output={output} />`

- [ ] 12. Implement Citation Extraction Helper
  - [ ] 12.1 In `message-parts.tsx`, add helper function `extractCitationsFromMessage(parts: MessagePart[]): Citation[]`
  - [ ] 12.2 Iterate over all parts
  - [ ] 12.3 For parts with `type === "tool-semanticSearch"` and `state === "output-available"`:
    - [ ] 12.3.1 Extract results from output
    - [ ] 12.3.2 For each result, create Citation object: `{ documentId, documentName, pageNumber, excerpt: chunkContent, blobUrl }`
    - [ ] 12.3.3 Note: blobUrl needs to be fetched from database by documentId (add to SearchResultItem type or fetch in UI)
  - [ ] 12.4 Return array of all citations found

- [ ] 13. Add Citations to Message Rendering
  - [ ] 13.1 In `PureMessageParts` component (around line 519), after rendering all parts
  - [ ] 13.2 Call `extractCitationsFromMessage(parts)` to get citations
  - [ ] 13.3 If citations array has length > 0, render `<Citations citations={citations} />`
  - [ ] 13.4 Ensure citations appear at end of message (after all other parts)

- [ ] 14. Update SearchResultItem Type to Include BlobUrl
  - [ ] 14.1 Open semantic search tool file
  - [ ] 14.2 Update SearchResultItem type to include `blobUrl: string`
  - [ ] 14.3 In execute function, when building result items, fetch document from database to get blobUrl
  - [ ] 14.4 Include blobUrl in each SearchResultItem returned
  - [ ] 14.5 Update type exports in shared types if needed

- [ ] 15. Handle Browser Compatibility for PDF Fragments
  - [ ] 15.1 Add comment in CitationLink component noting `#page=N` works in Chrome, Firefox, Edge but not Safari
  - [ ] 15.2 Implement graceful degradation: link opens PDF even if browser doesn't support page navigation
  - [ ] 15.3 Optional: Add browser detection and show warning tooltip for Safari users
  - [ ] 15.4 Test in multiple browsers (Chrome, Firefox, Edge, Safari)

- [ ] 16. Style and Polish Citation UI
  - [ ] 16.1 Ensure citation links are keyboard accessible (tab navigation)
  - [ ] 16.2 Add focus styles for citation links
  - [ ] 16.3 Ensure tooltip text is readable with good contrast
  - [ ] 16.4 Test citation rendering with multiple citations
  - [ ] 16.5 Verify citation numbering is sequential [1], [2], [3], etc.
  - [ ] 16.6 Add hover effect to citation links (underline, color change)

- [ ] 17. Add Loading States for Tool Parts
  - [ ] 17.1 Ensure skeleton or spinner shows during `input-available` state
  - [ ] 17.2 Use consistent loading animation across all tool parts
  - [ ] 17.3 Test that loading states transition smoothly to output states

- [ ] 18. Implement Error State Consistency
  - [ ] 18.1 Ensure all tool error states use consistent styling (red border, error icon)
  - [ ] 18.2 Display helpful error messages (not raw error objects)
  - [ ] 18.3 Provide actionable suggestions when tools fail

- [ ] 19. Test Tool Part Rendering
  - [ ] 19.1 Test semantic search result rendering with multiple results
  - [ ] 19.2 Test file retrieve with small and large documents
  - [ ] 19.3 Verify tool parts display correctly in conversation history
  - [ ] 19.4 Test citation links open PDFs correctly
  - [ ] 19.5 Verify PDF page navigation works (in supported browsers)

- [ ] 20. Add Analytics or Tracking (Optional)
  - [ ] 20.1 Track citation click-through rates
  - [ ] 20.2 Log which documents are most frequently cited
  - [ ] 20.3 Monitor tool usage frequency

### Manual Tasks
- Test citation links with various PDF files
- Verify PDF page navigation in different browsers
- Test with documents that have many pages (e.g., page 150)
- Verify mobile experience for citation viewing

---

## Implementation Order

1. **Phase 1**: Complete all database schema tasks first (run migration once all tables defined)
2. **Phase 2**: Build OpenAI integration layer completely before using in Phase 3
3. **Phase 3**: Implement backend queries and API endpoints (test with Postman/curl)
4. **Phase 4**: Build admin UI components (test document upload/management)
5. **Phase 5**: Implement AI tools (test tools independently before UI integration)
6. **Phase 6**: Add chat UI rendering (integrate with existing message parts system)

**Important**: Verify each phase works before moving to the next. Use manual tasks section for environment setup and testing.

---

## Verification

After completing all phases, verify the feature works end-to-end by:

1. **Admin Upload Flow**:
   - Log in as admin user
   - Navigate to `/admin/documents`
   - Upload a PDF document
   - Verify status transitions: uploading → processing → ready
   - Check document appears in list with correct metadata

2. **Document Management**:
   - Add tags to a document
   - Update an existing document (replace with new version)
   - Verify old version is removed from vector store
   - Delete a document and confirm cleanup

3. **Search and Retrieval**:
   - Start a chat conversation
   - Ask a question that requires document search
   - Verify agent uses semantic search tool
   - Check that tool invocation is visible in UI
   - Verify agent response includes citations

4. **Citation Navigation**:
   - Click a citation link in agent response
   - Verify PDF opens in new tab
   - Check that PDF navigates to correct page (in supported browsers)
   - Test with multiple citations in single response

5. **Access Control**:
   - Log in as non-admin user
   - Verify cannot access `/admin/documents` (redirected with error)
   - Verify can use chat and benefit from document search
   - Confirm agent searches documents uploaded by admins

6. **Error Handling**:
   - Upload invalid file type (should show validation error)
   - Upload file > 512 MB (should show size error)
   - Test with OpenAI API unavailable (should show graceful error)
   - Delete document then click old citation (should show error message)

7. **Edge Cases**:
   - Upload same filename twice (should allow with -1, -2 suffix)
   - Search for content not in any document (agent acknowledges no results)
   - Concurrent uploads by different admins (both should succeed)

8. **Performance**:
   - Verify semantic search completes within 5 seconds
   - Check document list loads quickly with 50+ documents
   - Test chat with multiple document searches in single conversation

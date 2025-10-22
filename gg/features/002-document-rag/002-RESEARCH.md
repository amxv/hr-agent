---
date: 2025-10-22 22:57:00
feature-slug: 002-document-rag
---

# 002-document-rag Codebase Research

Comprehensive research document analyzing the current state of the codebase and external dependencies relevant to implementing a Document RAG System with semantic search capabilities.

## Summary

The application has a solid foundation for implementing the Document RAG feature:

- **Authentication & Authorization**: Fully functional admin/user role-based system with two-layer protection (middleware + tRPC)
- **Admin Panel**: Complete UI at `/admin/users` with user management, ready to be extended with document management
- **Chat Infrastructure**: Sophisticated streaming architecture with AI SDK v5, tool integration, and real-time UI updates
- **File Handling**: Existing upload system for images/PDFs via Vercel Blob (max 5MB) that can be extended
- **Database**: Drizzle ORM with PostgreSQL, flexible schema design with JSON fields and composite keys for versioning
- **External APIs**: OpenAI Vector Store API supports 20+ file formats with automatic chunking and semantic search

## Detailed Findings

### 1. Authentication and Role-Based Access Control

**Research File**: `gg/agent-outputs/codebase-researcher/2025-10-22_22-52-36-auth-rbac-research.md`

#### Current Implementation

**Authentication Library**: Better Auth v1.x with PostgreSQL Drizzle adapter
- Session management via httpOnly cookies (Next.js plugin)
- Email/password authentication (8-128 char length)
- Admin plugin with default role: "user", admin roles: ["admin"]

**Key Locations**:
- `lib/auth.ts:21-44` - Better Auth configuration
- `lib/db/schema.ts:138-153` - User table with role field
- `middleware.ts:37-54` - Route protection for `/admin`
- `trpc/init.ts:143-170` - Admin procedure middleware

#### Two-Layer Protection System

**Layer 1: Middleware** (`middleware.ts:37-54`)
```typescript
// Checks URL starts with /admin
if (isOnAdminRoute) {
  if (!isLoggedIn) return NextResponse.redirect("/login");
  if (session.user.role !== "admin") return NextResponse.redirect("/?error=forbidden");
}
```

**Layer 2: tRPC Procedures** (`trpc/init.ts:143-170`)
```typescript
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx: { user: { id, role: "admin" as const, ...rest } } });
});
```

#### Role Storage and Management

**Database**: `user.role` text field (nullable)
- Values: "admin" | "user"
- Default: "user" (set by Better Auth plugin)
- Type-safe context in tRPC procedures with `role: "admin" as const`

**Admin Capabilities** (via `trpc/routers/admin.router.ts`):
- List users with search and filtering
- Create users with role assignment
- Update user emails
- Reset passwords
- Deactivate/reactivate users (with self-protection and last-admin checks)

#### Integration Points for Document RAG

**Extending Admin Features**:
1. Admin router already exists at `trpc/routers/admin.router.ts`
2. New procedures can use `adminProcedure` for automatic protection
3. `/admin` routes automatically protected by middleware
4. Session context provides user ID for document ownership tracking

**Pattern to Follow**:
```typescript
// In admin.router.ts
export const adminRouter = createTRPCRouter({
  // ... existing procedures

  listDocuments: adminProcedure
    .input(z.object({ /* ... */ }))
    .query(async ({ input }) => {
      // Access to ctx.user.id guaranteed
    }),

  uploadDocument: adminProcedure
    .input(z.object({ /* ... */ }))
    .mutation(async ({ input, ctx }) => {
      // ctx.user.role === "admin" guaranteed
    }),
});
```

---

### 2. Chat Interface and AI Tool Integration

**Research File**: `gg/agent-outputs/codebase-researcher/2025-10-22_22-52-32-chat-interface-structure.md`

#### Architecture Overview

**State Management**: Zustand with multi-layer composition
- `chat-store-base.tsx` - Core state (messages, status, helpers)
- `with-message-parts.ts` - Granular part-level updates
- `with-markdown-memo.ts` - Rendering optimization
- 100ms throttle on message updates to prevent excessive re-renders

**Key Locations**:
- `components/chat-system.tsx` - Provider wrapper
- `components/messages.tsx` - Message list renderer
- `components/assistant-message.tsx` - Tool part rendering
- `app/(chat)/api/chat/route.ts:161` - Streaming endpoint

#### Existing Tool Infrastructure

**Tool Registry** (`lib/ai/tools/tools-definitions.ts:3-64`):
- 11 tools currently implemented
- Each has: name, description, cost (in credits)
- Examples: weather (1), webSearch (3), deepResearch (50), codeInterpreter (10)

**Tool Execution Flow** (`app/(chat)/api/chat/route.ts`):
1. User selects tool via `multimodal-input.tsx:267` (stored in message metadata)
2. Server filters affordable tools based on credit budget (lines 381-388)
3. AI SDK's `streamText()` manages tool calling loop (max 5 steps, line 528)
4. Tool results streamed as message parts with type-safe rendering

#### Message Parts Rendering

**Part Types** (`components/message-parts.tsx:519`):
- `text` - Markdown text
- `tool-{toolName}` - Type-safe tool parts (e.g., `tool-getWeather`, `tool-createDocument`)
- `dynamic-tool` - Runtime-defined tools
- `reasoning` - Model thinking process
- `step-start` - Multi-step boundaries

**Tool Part States**:
- `input-streaming` - Tool input being generated
- `input-available` - Full input ready
- `output-available` - Tool executed, result ready
- `output-error` - Tool execution failed

#### Integration Points for Document RAG

**Adding New Tools**:
1. Define tool in `lib/ai/tools/` directory
2. Register in `tools-definitions.ts` with cost
3. Add to `tools.ts` export
4. Create UI component in `components/` for rendering
5. Map in `message-parts.tsx` switch statement

**Pattern to Follow** (based on existing tools):
```typescript
// lib/ai/tools/semantic-search.ts
export const semanticSearchTool = tool({
  description: 'Search vector store using semantic similarity...',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    limit: z.number().optional(),
  }),
  execute: async ({ query, limit }) => {
    // Call OpenAI Vector Store API
    return { results: [...] };
  },
});

// Register in tools-definitions.ts
toolsDefinitions: {
  semanticSearch: { name: "Semantic Search", cost: 3 },
  fileRetrieve: { name: "File Retrieve", cost: 1 },
}

// Render in message-parts.tsx
case 'tool-semanticSearch': {
  const { state, input, output } = part;
  if (state === 'output-available') {
    return <SemanticSearchResults results={output.results} />;
  }
}
```

**Streaming and Real-Time Updates**:
- `DataStreamHandler` (`components/data-stream-handler.tsx:27`) processes incoming stream parts
- Custom data parts via `dataStream.write()` in tool execution
- Artifact system for displaying complex outputs (documents, code) in sidebar

---

### 3. Database Schema and Data Persistence

**Research File**: `gg/agent-outputs/codebase-researcher/2025-10-22_22-52-34-database-schema-analysis.md`

#### Technology Stack

**ORM**: Drizzle ORM v0.34.0 with PostgreSQL
- Config: `drizzle.config.ts`
- Schema: `lib/db/schema.ts` (203 lines, 9 tables)
- Migrations: `lib/db/migrations/`
- Queries: `lib/db/queries.ts` (700 lines)

#### Existing Schema

**Core Tables**:
1. `user` - User accounts with role/ban management (schema.ts:138-153)
2. `session` - User sessions with IP/user-agent (schema.ts:155-169)
3. `account` - OAuth/password credentials (schema.ts:171-189)
4. `verification` - Email/OTP tokens (schema.ts:191-201)
5. `Chat` - Conversation threads (schema.ts:28-42)
6. `Message` - Chat messages with JSON fields (schema.ts:44-61)
7. `Document` - Generated artifacts with versioning (schema.ts:87-111)
8. `Suggestion` - Edit suggestions (schema.ts:113-137)
9. `Vote` - Message ratings (schema.ts:65-85)
10. `UserCredit` - Per-user credit tracking (schema.ts:17-26)

**Relevant Patterns for Document RAG**:

**JSON Fields for Flexibility** (`Message` table):
```typescript
parts: json("parts").notNull(),           // Multi-part content
attachments: json("attachments").notNull(), // File URLs
annotations: json("annotations"),          // AI-generated metadata
lastContext: json("lastContext"),          // Conversation context
```

**Composite Primary Keys** (`Document` table):
```typescript
{
  pk: primaryKey({ columns: [table.id, table.createdAt] })
}
// Enables versioning: same ID, different createdAt timestamps
```

**Foreign Key Relationships**:
- Cascade deletes configured (e.g., Message → Chat with `onDelete: "cascade"`)
- Self-referencing for threaded conversations (`parentMessageId`)

#### Data Access Patterns

**Location**: `lib/db/queries.ts`

**Common Patterns**:
- Try-catch with console.error and re-throw
- Type-safe with `InferSelectModel<typeof table>`
- Named parameter objects for clarity
- Server-only directive at top of file

**Query Examples**:
```typescript
// Single item with limit
.select().from(table).where(eq(table.id, id)).limit(1)

// Pagination
.select().from(table).limit(input.limit).offset(input.offset)

// Joins for access control
.innerJoin(message, eq(document.messageId, message.id))
.innerJoin(chat, eq(message.chatId, chat.id))
.where(and(eq(document.id, id), eq(chat.visibility, "public")))
```

#### Integration Points for Document RAG

**New Tables Needed**:
```typescript
// Suggested schema for Document RAG
export const uploadedDocument = pgTable("UploadedDocument", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  filename: text("filename").notNull(),
  uploadedBy: text("uploaded_by").notNull().references(() => user.id),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  fileSize: integer("file_size").notNull(),

  // OpenAI references
  openaiFileId: text("openai_file_id").notNull(),
  vectorStoreId: text("vector_store_id").notNull(), // Shared across all docs

  // Status tracking
  status: varchar("status", {
    enum: ["uploading", "processing", "ready", "failed"]
  }).notNull().default("uploading"),
  errorMessage: text("error_message"),

  // Tags (JSON array)
  tags: json("tags").notNull().default([]),

  // Soft delete
  deletedAt: timestamp("deleted_at"),
});

// Vector store configuration (singleton)
export const vectorStoreConfig = pgTable("VectorStoreConfig", {
  id: text("id").primaryKey().default("singleton"),
  vectorStoreId: text("vector_store_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

**Queries to Implement**:
- `listDocuments({ searchTerm?, tags?, status? })` - With pagination
- `saveDocument({ filename, openaiFileId, ... })` - Insert
- `updateDocumentStatus({ id, status, errorMessage? })` - Status tracking
- `softDeleteDocument({ id })` - Set deletedAt
- `getVectorStoreId()` - Retrieve shared vector store ID

---

### 4. File Upload Implementation

**Research File**: `gg/agent-outputs/codebase-researcher/2025-10-22_22-53-07-file-upload-handling.md`

#### Current File Upload System

**Storage**: Vercel Blob (`@vercel/blob` v0.24.1)
- Public access with prefix: `agentdune/files/`
- Random suffix to prevent collisions
- API endpoint: `app/(chat)/api/files/upload/route.ts:23-75`

**Supported Files** (current):
- Images: JPEG, PNG (max 1MB)
- Documents: PDF (max 5MB)

**Upload Flow**:
1. Client-side compression (`browser-image-compression` v2.0.2)
2. FormData POST to `/api/files/upload`
3. Server-side validation (Zod schema)
4. Upload to Vercel Blob via `lib/blob.ts:uploadFile()`
5. Return `{ url, pathname, contentType }`

#### Frontend Components

**MultimodalInput** (`components/multimodal-input.tsx:64-625`):
- File picker, drag-and-drop, clipboard paste support
- Attachment state management via `ChatInputProvider`
- Upload progress indicators
- Preview with remove buttons

**File Processing** (`lib/files/upload-prep.ts`):
- `compressImageIfNeeded()` - Client-side optimization
- `processFilesForUpload()` - Categorizes: processed, oversized, unsupported
- Max image dimension: 2048px

**Attachment Storage**:
- URLs stored in `message.attachments` JSON field
- Cleanup via `deleteAttachmentsFromMessages()` before message deletion
- Binary conversion before sending to AI models

#### Integration Points for Document RAG

**Extending File Upload for Documents**:

1. **New API Endpoint** (`app/(admin)/api/documents/upload/route.ts`):
   - Accept broader file types (PDF, DOCX, TXT, MD, etc.)
   - Larger size limit (512 MB per OpenAI)
   - Admin-only access control
   - Upload to both Vercel Blob (for serving) AND OpenAI Files API

2. **Validation Schema**:
```typescript
const documentFileSchema = z.object({
  file: z.instanceof(Blob)
    .refine(file => file.size <= 512 * 1024 * 1024, "Max 512 MB")
    .refine(file => SUPPORTED_DOCUMENT_TYPES.includes(file.type)),
});

const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
  'text/markdown',
  // ... 20+ more from OpenAI supported list
];
```

3. **Upload Process**:
```typescript
// 1. Upload to Vercel Blob (for user download/preview)
const blobResult = await uploadFile(filename, fileBuffer);

// 2. Upload to OpenAI Files API
const openaiFile = await openai.files.create({
  file: new Blob([fileBuffer]),
  purpose: "assistants",
});

// 3. Add to vector store
await openai.vectorStores.files.createAndPoll(
  vectorStoreId,
  openaiFile.id
);

// 4. Save to database
await saveDocument({
  filename,
  fileSize: fileBuffer.byteLength,
  openaiFileId: openaiFile.id,
  vectorStoreId,
  status: "processing",
});
```

**Reusable Patterns**:
- Zod validation
- Authentication checks (`auth.api.getSession()`)
- Error handling with generic messages
- Toast notifications on client

---

### 5. Admin Panel Structure

**Research File**: `gg/agent-outputs/codebase-researcher/2025-10-22_22-52-29-admin-panel-structure.md`

#### Current Implementation

**Routes**:
- Layout: `app/admin/layout.tsx` - TRPCReactProvider + SessionProvider wrapper
- Page: `app/admin/users/page.tsx` - User management interface

**UI Components** (`components/admin/`):
- `user-list-table.tsx` - Main table with search and actions
- `user-actions.tsx` - Edit, reset password, deactivate/reactivate buttons
- `create-user-dialog.tsx` - Form dialog with role selection
- `edit-user-dialog.tsx` - Email update form
- `reset-password-dialog.tsx` - Password reset form

**Component Library**: shadcn/ui
- Card, Table, Dialog, AlertDialog, Badge, Button, Input, Form
- React Hook Form + Zod for validation
- Sonner for toast notifications
- TanStack React Query for data fetching

#### Admin API Endpoints

**Router**: `trpc/routers/admin.router.ts` (259 lines)

**Procedures**:
1. `listUsers` - Pagination, search (email/name), filter (role/status)
2. `createUser` - With password generation option
3. `updateUser` - Email updates
4. `resetUserPassword` - Password reset
5. `deactivateUser` - With self-protection checks
6. `reactivateUser` - Unban user

**All procedures use `adminProcedure` for automatic role validation**

#### Integration Points for Document RAG

**New Admin Page** (`app/admin/documents/page.tsx`):
```typescript
export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Document Management</h1>
        <p className="text-muted-foreground">
          Upload and manage documents for semantic search
        </p>
      </div>
      <DocumentListTable />
    </div>
  );
}
```

**New Components to Create**:
- `components/admin/document-list-table.tsx` - List with upload, update, delete
- `components/admin/upload-document-dialog.tsx` - File upload with drag-drop
- `components/admin/update-document-dialog.tsx` - Replace document version
- `components/admin/document-actions.tsx` - Update, delete, tag buttons
- `components/admin/document-tags-input.tsx` - Tag management with autocomplete

**New Admin Procedures**:
```typescript
// In admin.router.ts
export const adminRouter = createTRPCRouter({
  // ... existing procedures

  documents: {
    list: adminProcedure
      .input(z.object({
        searchTerm: z.string().optional(),
        tags: z.array(z.string()).optional(),
        status: z.enum(["ready", "processing", "failed"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => { /* ... */ }),

    delete: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        // 1. Remove from vector store
        // 2. Delete from OpenAI files
        // 3. Soft delete in database
      }),

    updateTags: adminProcedure
      .input(z.object({
        id: z.string(),
        tags: z.array(z.string()),
      }))
      .mutation(async ({ input }) => { /* ... */ }),
  },
});
```

**UI Patterns to Reuse**:
- Dialog pattern for modals
- Form validation with Zod
- Toast notifications (success/error)
- Manual refetch key pattern for list invalidation
- Badge components for status/tags

---

## Web Research Documents

<web-research-documents>

### OpenAI Vector Store API and File Upload API

**Research File**: `gg/agent-outputs/web-researcher/2025-10-22_16-21-38-openai-vector-store-research.md`

**Purpose**: Document indexing, chunking, and semantic search infrastructure

#### Key Findings

**Supported File Formats** (20+ types):
- Documents: PDF, DOCX, PPTX, TXT, MD
- Code: JS, TS, PY, JAVA, C, CPP, CS, GO, PHP, RB, SH
- Data: JSON, HTML, CSS, TEX
- **Not supported**: CSV, JSONL, images within documents

**File Size and Limits**:
- Maximum file size: **512 MB per file**
- Maximum tokens per file: **5,000,000 tokens**
- Vector store capacity: **10,000 files**
- Organization storage: **100 GB total**
- Batch operations: **500 files per batch**

**Upload and Indexing Flow**:
```python
# 1. Upload file
file = client.files.create(
    file=open("document.pdf", "rb"),
    purpose="assistants"
)

# 2. Create vector store (or use existing)
vs = client.vector_stores.create(name="Docs")

# 3. Add file to vector store
batch = client.vector_stores.file_batches.create_and_poll(
    vector_store_id=vs.id,
    file_ids=[file.id]
)
```

**Automatic Document Processing**:
- **Chunking**: Default 800 tokens, 400 overlap (configurable 100-4096)
- **Embedding**: Uses `text-embedding-3-large` at 256 dimensions
- **Indexing**: Both keyword AND semantic search
- **Processing time**: Minutes to days depending on file size
  - < 1 MB: 1-5 minutes
  - 1-10 MB: 5-30 minutes
  - 10-50 MB: 30 min - 2 hours
  - 50-200 MB: 2-8 hours
  - 200-512 MB: 8+ hours to days

**Semantic Search**:
- Query rewriting and optimization (automatic)
- Parallel searches for complex queries
- Keyword + semantic hybrid search
- Relevance ranking with configurable threshold (0.0-1.0)
- Default max results: 20 for gpt-4*, 5 for gpt-3.5-turbo

**Configuration Options**:
```python
assistant = client.beta.assistants.create(
    model="gpt-4o",
    tools=[{
        "type": "file_search",
        "file_search": {
            "max_num_results": 20,
            "ranking_options": {
                "ranker": "auto",
                "score_threshold": 0.5  # 0.0 to 1.0
            }
        }
    }]
)
```

**Citations and Results**:
- File citations include: `file_id` and position markers
- Annotations embedded in response text: `【18:0†source】`
- Retrieve chunk content via `include` parameter in API calls
- Full document retrieval: `client.files.content(file_id).read()`

**Document Lifecycle**:
- **Update**: No direct update - must delete old, upload new
- **Delete from vector store**: `vectorStores.files.delete(vs_id, file_id)`
- **Delete file entirely**: `files.delete(file_id)` - removes from ALL vector stores
- **Status tracking**: "in_progress", "completed", "failed"

**Cost**:
- First 1 GB: Free
- Beyond 1 GB: **$0.10/GB/day**
- Expiration policies available (auto-cleanup after N days)

**Rate Limits and Error Handling**:
- Standard OpenAI API rate limits apply
- Implement exponential backoff for retries
- Common errors: 400 (invalid format/size), 429 (rate limit), 500 (server error)

**Integration Notes**:
- Store `openai_file_id` and `vector_store_id` in database
- Poll `file_counts` in vector store to check processing status
- Maintain synchronization between app DB and OpenAI
- Use soft deletes for audit trails
- Batch operations for bulk uploads (max 500)

**Deprecation Warning**: Assistants API deprecated after August 26, 2026 - use Responses API for new implementations

---

### AI SDK v5 Tools Implementation with OpenAI Provider

**Research File**: `gg/agent-outputs/web-researcher/2025-10-22_15-30-45-ai-sdk-v5-tools-research.md`

**Purpose**: Building AI agent tools with streaming, type safety, and UI integration

#### Key Findings

**Tool Definition Structure**:
```typescript
import { tool } from 'ai';
import { z } from 'zod';

const semanticSearchTool = tool({
  description: 'Search vector store using semantic similarity to find relevant documents',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
    limit: z.number().optional().describe('Max results (default: 5)'),
  }),
  execute: async ({ query, limit = 5 }) => {
    // Implementation
    return { results: [...] };
  },
});
```

**Key Changes from v4**:
- `inputSchema` replaces `parameters` (now uses Zod directly)
- Type-safe tool parts: `tool-TOOLNAME` instead of generic `tool-invocation`
- Tool input streaming enabled by default
- Improved multi-step calls with `stopWhen` and `prepareStep`

**Tool Registration**:
```typescript
const result = streamText({
  model: openai('gpt-4o'),
  tools: {
    semanticSearch: semanticSearchTool,
    fileRetrieve: fileRetrieveTool,
  },
  messages: convertToModelMessages(messages),
});
```

**Tool Part States** (for UI rendering):
- `'input-streaming'` - Tool input being generated
- `'input-available'` - Full input ready, not yet executed
- `'output-available'` - Tool executed, result available
- `'output-error'` - Tool execution failed

**Streaming Tool Invocations**:
- Tool calls stream as they're generated by the model
- Partial inputs visible in UI during generation
- Access tool call ID in execute function
- Preliminary results via generator functions (`async *execute`)

**Multi-Step Tool Calls**:
```typescript
import { stepCountIs } from 'ai';

const result = await generateText({
  model: openai('gpt-4o'),
  tools: { search: searchTool, retrieve: fileTool },
  stopWhen: stepCountIs(5), // Allow up to 5 steps
  prompt: 'Find and summarize relevant documents',
});
```

**Client-Side vs Server-Side Tools**:
- **Server-side**: Include `execute` function (auto-executed)
- **Client-side**: Omit `execute`, handle via `onToolCall` callback
```typescript
const { addToolResult } = useChat({
  onToolCall: ({ toolCall }) => {
    if (toolCall.toolName === 'getUserConfirmation') {
      // Show UI, collect response
      addToolResult({
        tool: 'getUserConfirmation',
        toolCallId: toolCall.toolCallId,
        output: userResponse,
      });
    }
  },
});
```

**UI Integration Pattern**:
```typescript
{message.parts.map((part, idx) => {
  switch (part.type) {
    case 'text':
      return <p>{part.text}</p>;

    case 'tool-semanticSearch': {
      const { state, input, output } = part;

      if (state === 'input-streaming') {
        return <div>Searching: {JSON.stringify(input)}</div>;
      }

      if (state === 'output-available') {
        return <div>Found {output.results.length} results</div>;
      }

      if (state === 'output-error') {
        return <div>Error: {part.errorText}</div>;
      }
    }
  }
})}
```

**Error Handling**:
```typescript
import { NoSuchToolError, InvalidToolInputError } from 'ai';

try {
  const result = await generateText({ /* ... */ });
} catch (error) {
  if (NoSuchToolError.isInstance(error)) {
    // Model called non-existent tool
  } else if (InvalidToolInputError.isInstance(error)) {
    // Model provided invalid inputs
  }
}
```

**Best Practices**:
1. **Tool Descriptions**: Be specific about purpose and use cases (1-2 sentences)
2. **Input Schema**: Use `.describe()` on each parameter for model guidance
3. **Tool Ordering**: Register more specific/common tools first
4. **Graceful Failures**: Return error objects instead of throwing
5. **Type Safety**: Use `TypedToolCall<typeof tools>` for type inference

**Agent Decision-Making**:
- Models choose tools based on description, schema, system prompt, and context
- Use `toolChoice` parameter: `'auto'`, `'required'`, `'none'`, or specific tool
- Active tools to limit available tools dynamically
- Combine with `prepareStep` for sophisticated agent loops

**Integration Notes for Document RAG**:
- Create `semanticSearch` tool with query parameter
- Create `fileRetrieve` tool with documentId parameter
- Register both in chat route's `tools` object
- Render tool invocations with custom components
- Display citations from tool results
- Use multi-step calls for search → retrieve → answer pattern

---

### PDF Citations and Browser Handling

**Status**: Research not completed (interrupted)

**Basic Knowledge** (to be verified with full research):
- PDFs can be opened at specific pages using URL fragments: `file.pdf#page=3`
- Browser support: Most modern browsers support PDF page navigation
- Fallback strategies: Open at beginning if page doesn't exist
- Alternative: Use PDF.js for client-side rendering with page control
- Citations could link to:
  1. Direct blob storage URL with page fragment
  2. Client-side viewer with page parameter
  3. Download link with page reference in filename

**Note**: Full research on PDF citation handling should be completed before implementation phase.

</web-research-documents>

## Code References

### Authentication & Authorization
- `lib/auth.ts:21-44` - Better Auth configuration with admin plugin
- `lib/db/schema.ts:138-153` - User table with role field
- `middleware.ts:37-54` - Admin route protection
- `trpc/init.ts:143-170` - adminProcedure middleware with type narrowing
- `trpc/routers/admin.router.ts` - Admin-only API procedures

### Chat Infrastructure
- `components/chat-system.tsx:15` - Root provider composition
- `components/messages.tsx:19` - Message list with tool part rendering
- `components/assistant-message.tsx:15` - Assistant message with tool display
- `components/message-parts.tsx:519` - Tool part type switching and rendering
- `app/(chat)/api/chat/route.ts:161` - POST handler with streaming
- `lib/ai/tools/tools.ts` - Tool implementations
- `lib/ai/tools/tools-definitions.ts:3-64` - Tool registry with costs

### Database
- `lib/db/schema.ts` - Complete schema (9 tables, 203 lines)
- `lib/db/queries.ts` - All CRUD operations (700 lines)
- `lib/db/client.ts` - Drizzle client setup
- `drizzle.config.ts` - Drizzle configuration
- `lib/db/migrations/` - Migration files

### File Upload
- `app/(chat)/api/files/upload/route.ts:23-75` - Upload API endpoint
- `components/multimodal-input.tsx:64-625` - Upload UI with drag-drop
- `lib/blob.ts:13-27` - Vercel Blob upload function
- `lib/files/upload-prep.ts` - Client-side file processing

### Admin Panel
- `app/admin/layout.tsx` - Admin layout with providers
- `app/admin/users/page.tsx` - User management page
- `components/admin/user-list-table.tsx` - Main admin table
- `components/admin/create-user-dialog.tsx` - Dialog pattern example
- `trpc/routers/admin.router.ts:12-259` - Admin procedures

## Architecture Insights

### 1. Two-Layer Security Pattern

The codebase implements defense-in-depth for admin features:
- **Layer 1 (Middleware)**: Blocks unauthorized route access early
- **Layer 2 (tRPC)**: Validates API calls independently
- **Layer 3 (Business Logic)**: Additional checks (e.g., prevent last admin deletion)

**Pattern to Reuse**:
All document management features should use `adminProcedure` and rely on automatic middleware protection for `/admin/documents` routes.

### 2. Composable State Management

Zustand store composition enables granular subscriptions:
- Base state layer for core functionality
- Message parts layer for fine-grained updates
- Markdown memo layer for rendering optimization

**Pattern to Reuse**:
Document-related state could follow similar composition if complex UI updates needed.

### 3. Type-Safe Tool Integration

AI SDK v5 provides end-to-end type safety:
- Tool definitions with Zod schemas
- Type-safe part rendering (`tool-TOOLNAME`)
- Tool states for UI lifecycle management

**Pattern to Reuse**:
New document RAG tools (semantic search, file retrieve) should follow this pattern for type safety and maintainability.

### 4. JSON Fields for Flexibility

Database uses JSON columns strategically:
- Message parts, attachments, annotations
- Document tags
- Allows schema evolution without migrations

**Pattern to Reuse**:
Store document tags as JSON array, enabling free-form tagging without separate tag table.

### 5. Composite Keys for Versioning

Document table uses `(id, createdAt)` composite primary key:
- Same document ID, different timestamps
- Enables version history tracking

**Pattern to Consider**:
If document versioning becomes a requirement, this pattern is already established in the codebase.

### 6. Streaming-First Architecture

Chat system built for real-time updates:
- SSE streaming with resumable streams (Redis)
- Throttled state updates (100ms)
- Progressive rendering of tool invocations

**Pattern to Reuse**:
Document processing status could stream updates to admin UI during indexing.

### 7. Server-Only Data Layer

All database queries marked with `"use server"`:
- Prevents client-side database access
- Enforces server-side validation
- Works seamlessly with tRPC

**Pattern to Maintain**:
All document queries must be in `lib/db/queries.ts` with server-only directive.

### 8. Dialog-Based Admin UI

All admin actions use Dialog pattern:
- Modal forms with shadcn/ui Dialog
- React Hook Form + Zod validation
- Toast notifications for feedback
- Manual refetch key for list updates

**Pattern to Reuse**:
Upload document, update document, and manage tags should all use Dialog components with this established pattern.

### 9. Cost-Based Tool Selection

Tools have defined costs, filtered by user budget:
- Credit reservation before execution
- Affordable tools calculated at runtime
- Actual cost deducted after completion

**Pattern to Extend**:
Document RAG tools (semantic search: 3 credits, file retrieve: 1 credit) should integrate with existing credit system.

### 10. Soft Deletes for Audit Trails

User table has `banned` field and ban metadata:
- Deactivation rather than deletion
- Reactivation capability
- Audit trail preserved

**Pattern to Consider**:
Document deletions should use `deletedAt` timestamp for soft deletes, maintaining audit history.

---

## Implementation Recommendations

### Phase 1: Database and Backend Foundation

1. **Create Database Schema**:
   - Add `UploadedDocument` table with OpenAI references
   - Add `VectorStoreConfig` singleton table
   - Create migration with `db:generate` and `db:migrate`

2. **Implement Database Queries** (`lib/db/queries.ts`):
   - `saveDocument()`, `updateDocumentStatus()`, `listDocuments()`
   - `getVectorStoreId()`, `setVectorStoreId()`
   - `softDeleteDocument()`, `getDocumentById()`

3. **Create Admin tRPC Procedures** (`trpc/routers/admin.router.ts`):
   - `documents.list` with pagination and filtering
   - `documents.delete` with OpenAI cleanup
   - `documents.updateTags`
   - All using `adminProcedure` for protection

### Phase 2: OpenAI Integration

1. **Vector Store Setup**:
   - Create/retrieve shared vector store ID
   - Store in database singleton
   - Implement polling mechanism for file processing status

2. **File Upload Integration**:
   - Create `/api/admin/documents/upload` endpoint
   - Upload to both Vercel Blob (serving) and OpenAI Files (search)
   - Add file to vector store with batch operation
   - Track status in database

3. **Document Management**:
   - Implement update flow (remove old, upload new)
   - Implement delete flow (vector store → OpenAI → database)
   - Add error handling with exponential backoff

### Phase 3: Admin UI

1. **Create Admin Page** (`app/admin/documents/page.tsx`):
   - Follow pattern from `/admin/users`
   - Document list table with upload button
   - Search and filter UI

2. **Build Admin Components**:
   - `DocumentListTable` - Main table with actions
   - `UploadDocumentDialog` - File upload with drag-drop
   - `UpdateDocumentDialog` - Replace document version
   - `DocumentActions` - Update, delete, tags buttons
   - `DocumentTagsInput` - Tag management with autocomplete

3. **Status Display**:
   - Processing indicators during indexing
   - Error messages for failed uploads
   - Success confirmations

### Phase 4: AI Agent Tools

1. **Create Semantic Search Tool** (`lib/ai/tools/semantic-search.ts`):
   - Call OpenAI Assistants/Responses API with vector store
   - Return document chunks with citations
   - Handle errors gracefully

2. **Create File Retrieve Tool** (`lib/ai/tools/file-retrieve.ts`):
   - Load full document content by ID
   - Return formatted content for context

3. **Register Tools**:
   - Add to `tools-definitions.ts` with costs
   - Export from `tools.ts`
   - Register in chat route

### Phase 5: Chat UI Integration

1. **Tool Part Rendering** (`components/message-parts.tsx`):
   - Add cases for `tool-semanticSearch` and `tool-fileRetrieve`
   - Create display components for search results
   - Create display components for retrieved documents

2. **Citation Display**:
   - Extract file citations from annotations
   - Render clickable citation links
   - Open PDFs in new tab with page navigation (if supported)

3. **Tool Invocation UI**:
   - Show "Searching documents..." during input-streaming
   - Display query during input-available
   - Show results during output-available
   - Handle errors with clear messages

### Phase 6: Testing and Polish

1. **Test Upload Flow**:
   - Various file types and sizes
   - Error scenarios (too large, unsupported format)
   - Concurrent uploads

2. **Test Search Quality**:
   - Query relevance
   - Citation accuracy
   - Performance with many documents

3. **Polish UI**:
   - Loading states
   - Error messages
   - Success confirmations
   - Responsive design

---

## Key Decision Points

### Single vs. Multiple Vector Stores
**Decision**: Use single shared vector store for all documents
**Rationale**:
- Spec requirement: FR-015 states "single shared vector store ID"
- Simpler to manage and query
- OpenAI limits: 10,000 files per store (sufficient for requirements)
- No need for document segmentation by user/category

### Document Storage Strategy
**Decision**: Dual storage (Vercel Blob + OpenAI Files)
**Rationale**:
- Vercel Blob: User downloads, preview, direct access
- OpenAI Files: Required for vector store indexing
- Allows serving PDFs with page navigation
- Provides backup if OpenAI file deleted

### Tag Storage
**Decision**: JSON array in document table
**Rationale**:
- Follows existing pattern (message.attachments)
- No need for separate tags table
- Auto-suggestions can query distinct tags from JSON
- Simpler schema, easier migrations

### Update Strategy
**Decision**: Remove old, upload new (no in-place update)
**Rationale**:
- OpenAI doesn't support file content updates
- Clear version separation
- Maintains audit trail with timestamps
- Explicit admin action required

### Status Tracking
**Decision**: Enum with states: uploading, processing, ready, failed
**Rationale**:
- Matches OpenAI's file processing lifecycle
- Clear UI feedback at each stage
- Enables retry logic for failed files
- Polling can check transitions

### Citation Implementation
**Decision**: File ID + page reference, link to blob URL
**Rationale**:
- OpenAI provides file_id in citations
- Page numbers available in search results
- Browser PDF viewers support #page= fragment
- Fallback: open at beginning if page unavailable

---

## Risks and Mitigations

### Risk: Long Processing Times
**Impact**: Admins may wait hours/days for large files to index
**Mitigation**:
- Display clear status with estimated time
- Allow admins to navigate away (async processing)
- Email notification when processing complete
- Start with smaller document limits

### Risk: OpenAI API Failures
**Impact**: Documents fail to index, search becomes unavailable
**Mitigation**:
- Exponential backoff with retry logic
- Store error messages in database
- Provide manual retry button in UI
- Graceful degradation (agent still works without docs)

### Risk: Database/OpenAI Desync
**Impact**: Database shows document as ready, but not in vector store
**Mitigation**:
- Implement reconciliation job (periodic)
- Verify file exists in vector store before marking ready
- Soft deletes for audit trail
- Status checks before search queries

### Risk: Cost Overruns
**Impact**: Vector store storage costs exceed budget
**Mitigation**:
- Display storage usage in admin panel
- Set expiration policies for temp documents
- Implement file size limits (512 MB per OpenAI)
- Monitor and alert on threshold (e.g., 50 GB)

### Risk: Search Quality Issues
**Impact**: Agent returns irrelevant results or misses relevant docs
**Mitigation**:
- Configurable relevance threshold (score_threshold)
- Allow admins to test search queries
- Provide feedback mechanism for bad results
- Consider custom chunking strategies per document type

### Risk: Concurrent Update Conflicts
**Impact**: Two admins update same document simultaneously
**Mitigation**:
- Spec states: last-write-wins (FR-045)
- No locking mechanism required
- Database updates are atomic
- Display timestamp of last update

---

## Next Steps

1. **Complete PDF Citations Research**: Verify browser support for #page= fragments and fallback strategies

2. **Design Database Schema**: Finalize table structure for documents and vector store config

3. **Create Migration**: Generate and review migration SQL before applying

4. **Setup OpenAI Integration**: Test vector store creation, file upload, and search locally

5. **Build Admin UI Mockups**: Review with stakeholders before implementation

6. **Define Tool Schemas**: Finalize Zod schemas for semantic search and file retrieve tools

7. **Write Integration Tests**: Test upload flow, search quality, citation accuracy

---

## Conclusion

The codebase provides excellent foundations for implementing the Document RAG system:

- ✅ **Authentication ready**: Admin/user roles with two-layer protection
- ✅ **Admin UI established**: Patterns and components ready to extend
- ✅ **Chat infrastructure mature**: Streaming, tools, real-time UI updates
- ✅ **Database flexible**: JSON fields, composite keys, migration system
- ✅ **File upload working**: Extend existing upload system
- ✅ **External APIs researched**: OpenAI Vector Store API fully understood

**Confidence Level**: High - All major architectural patterns exist and can be extended without breaking changes.

**Recommended Approach**: Incremental implementation following established patterns, starting with database and admin backend, then UI, then agent integration.

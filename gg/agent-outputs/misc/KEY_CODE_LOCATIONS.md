# Key Code Locations - File & Document Features

## File Upload Flow

### 1. Frontend - File Selection & Upload
**File**: `/Users/ashray/code/amxv/agentdune-chat/components/multimodal-input.tsx`
- Lines 63-150: Main input component
- Handles file drag-drop via `react-dropzone`
- Auto-switches to PDF/image compatible models
- Shows upload queue and attachments

### 2. File Validation & Compression
**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/files/upload-prep.ts`
```typescript
- compressImageIfNeeded() - Client-side image optimization
- processFilesForUpload() - Categorizes files (images/PDFs/unsupported)
- Validates: type (JPEG/PNG/PDF), size (<5MB), dimensions (<2048px)
```

### 3. Upload UI Components
**Files**:
- `/Users/ashray/code/amxv/agentdune-chat/components/attachment-list.tsx` - Display list
- `/Users/ashray/code/amxv/agentdune-chat/components/preview-attachment.tsx` - Individual preview
- Shows upload progress, PDF icon, open/download buttons

### 4. Backend Upload Endpoint
**File**: `/Users/ashray/code/amxv/agentdune-chat/app/(chat)/api/files/upload/route.ts`
```typescript
POST /api/chat/api/files/upload
- Validates session (Better Auth)
- Checks file type and size
- Uploads to Vercel Blob
- Returns public URL
```

### 5. Blob Storage Utilities
**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/blob.ts`
```typescript
- uploadFile() - Store in Vercel Blob with prefix
- listFiles() - List stored files
- deleteFilesByUrls() - Cleanup
- extractFilenameFromUrl() - Parse blob URLs
```

---

## Message Handling & Conversion

### 6. Message Types & Attachments
**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/types.ts` (Lines 123-127)
```typescript
type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
```

### 7. Message Conversion
**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/message-conversion.ts`
- `dbMessageToChatMessage()` - DB to UI format
- `chatMessageToDbMessage()` - UI to DB format
- Maintains attachment metadata

### 8. Asset Download (URL to Binary)
**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/utils/download-assets.ts`
```typescript
- downloadAssetsFromModelMessages() - Fetch files from URLs
- replaceFilePartUrlByBinaryDataInMessages() - Convert URLs to binary
- Used in chat route before sending to model
```

---

## AI Chat & Tool Integration

### 9. Main Chat Route
**File**: `/Users/ashray/code/amxv/agentdune-chat/app/(chat)/api/chat/route.ts`
- Converts messages to model format via `convertToModelMessages()`
- Downloads binary data from blob URLs
- Selects appropriate model and tools
- Streams response via SSE

### 10. Tools Definition & Registration
**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/tools-definitions.ts`
```typescript
All available tools:
- getWeather, createDocument, updateDocument
- requestSuggestions, readDocument, retrieve
- webSearch, stockChart, codeInterpreter
- generateImage, deepResearch
```

**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/tools.ts` (Lines 18-88)
- `getTools()` function - Configures available tools based on environment
- Only includes tools if API keys present

---

## Document & Search Tools

### 11. Firecrawl Integration (URL Retrieval)
**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/retrieve.ts`
```typescript
- Tool name: "retrieve"
- Input: URL string
- Output: Markdown content + metadata
- Uses: @mendable/firecrawl-js
```

### 12. Web Search Tool
**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/web-search.ts`
```typescript
- Tool name: "webSearch"
- Supports multi-query search (max 2 queries)
- Search depth: basic/advanced
- Topic filtering: general/news
- Domain exclusion support
- Uses: Tavily API + Firecrawl for extraction
```

### 13. Deep Research Tool
**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/deep-research/deep-research.ts`
```typescript
- Tool name: "deepResearch"
- Autonomous multi-step research agent
- Clarifying questions if needed
- Uses: leadResearcherTools, web search, content extraction
```

**Supporting Files**:
- `deep-researcher.ts` - Main research execution
- `state.ts` - Research state management
- `prompts.ts` - System/research prompts
- `configuration.ts` - Research settings

---

## Database & Persistence

### 14. Database Schema
**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts`

**Message Table** (Lines 44-61):
```typescript
const message = pgTable("Message", {
  id: uuid("id").primaryKey(),
  chatId: uuid("chatId").notNull(),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),  // Message content
  attachments: json("attachments").notNull(),  // Metadata
  createdAt: timestamp("createdAt").notNull(),
  // ... other fields
});
```

**Document Table** (Lines 87-109):
```typescript
const document = pgTable("Document", {
  id: uuid("id").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  kind: varchar("text", { enum: ["text", "code", "sheet"] }),
  // ... other fields
});
```

### 15. Database Queries
**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/db/queries.ts`
- `getChatById()` - Fetch conversation
- `getMessageById()` - Get specific message
- `saveMessage()` - Store user/assistant message
- `updateMessage()` - Update existing message

---

## File-Related Frontend Components

### 16. Multimodal Input
**File**: `/Users/ashray/code/amxv/agentdune-chat/components/multimodal-input.tsx`
- Main input container (Lines 63-77)
- Attachment state management (Lines 85-98)
- File input ref handling (Lines 122-132)
- Model compatibility checking (Lines 104-120)

### 17. Image Modal
**File**: `/Users/ashray/code/amxv/agentdune-chat/components/image-modal.tsx`
- Full-screen image preview
- Used when clicking attachment previews

### 18. Model Selector with File Support
**File**: `/Users/ashray/code/amxv/agentdune-chat/components/model-selector.tsx`
- Shows model capabilities
- Filters based on attachment types
- Prompts model switch for PDF/image support

---

## Configuration & Initialization

### 19. Environment Variables
**File**: `/Users/ashray/code/amxv/agentdune-chat/.env.example`
```
BLOB_READ_WRITE_TOKEN=    # Required for file upload
FIRECRAWL_API_KEY=        # Required for web scraping
TAVILY_API_KEY=           # Required for web search
POSTGRES_URL=             # Required for DB
REDIS_URL=                # Optional, for resumable streams
```

### 20. AI Models Definition
**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/app-models.ts`
- Model configurations and capabilities
- Vision model detection
- PDF support detection

---

## Type Definitions

### 21. AI/Chat Types
**File**: `/Users/ashray/code/amxv/agentdune-chat/lib/ai/types.ts`
- `Attachment` type (Lines 123-127)
- `ChatMessage` type (Lines 112-117)
- `ChatTools` type (Lines 77-89)
- Tool schema definitions

---

## Request/Response Flow

### Complete Flow Map:

```
User Selects File
    ↓
components/multimodal-input.tsx
    ↓
lib/files/upload-prep.ts (compress & validate)
    ↓
POST /api/files/upload
    ↓
lib/blob.ts (uploadFile)
    ↓
@vercel/blob storage
    ↓
Return public URL
    ↓
Create Attachment { name, url, contentType }
    ↓
User sends message
    ↓
POST /api/chat
    ↓
lib/message-conversion.ts (format message)
    ↓
lib/utils/download-assets.ts (fetch binary)
    ↓
convertToModelMessages (create ModelMessage with FilePart/ImagePart)
    ↓
lib/ai/tools/tools.ts (add tools)
    ↓
streamText (Vercel AI SDK)
    ↓
getLanguageModel() selects provider
    ↓
AI Model processes file + message
    ↓
Response streamed back as SSE
    ↓
Save to PostgreSQL
```

---

## Key Utility Functions

### File Processing
- `compressImageIfNeeded()` - Image optimization
- `processFilesForUpload()` - File categorization
- `uploadFile()` - Blob storage
- `extractFilenameFromUrl()` - Parse URLs
- `replaceFilePartUrlByBinaryDataInMessages()` - Binary conversion

### Message Handling
- `convertToModelMessages()` - UI to model format (Vercel AI SDK)
- `dbMessageToChatMessage()` - Database to UI format
- `chatMessageToDbMessage()` - UI to database format
- `getTextContentFromModelMessage()` - Extract text

### Search & Research
- `tavilyWebSearch()` - Web search tool factory
- `retrieve()` - URL content extraction
- `deepResearch()` - Autonomous research
- `multiQueryWebSearchStep()` - Multi-query execution

---

## No RAG Components

**These do NOT exist in the codebase**:
- No embedding calculation
- No vector store client
- No semantic search
- No document chunking
- No RAG chain orchestration
- No LangChain or LlamaIndex
- No FAISS or similar indices
- No knowledge base schema

---

## Quick File Paths Reference

```
Core Upload:
  - /Users/ashray/code/amxv/agentdune-chat/app/(chat)/api/files/upload/route.ts
  - /Users/ashray/code/amxv/agentdune-chat/lib/blob.ts

Frontend Components:
  - /Users/ashray/code/amxv/agentdune-chat/components/multimodal-input.tsx
  - /Users/ashray/code/amxv/agentdune-chat/components/attachment-list.tsx
  - /Users/ashray/code/amxv/agentdune-chat/components/preview-attachment.tsx

File Processing:
  - /Users/ashray/code/amxv/agentdune-chat/lib/files/upload-prep.ts
  - /Users/ashray/code/amxv/agentdune-chat/lib/utils/download-assets.ts

Chat & Tools:
  - /Users/ashray/code/amxv/agentdune-chat/app/(chat)/api/chat/route.ts
  - /Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/tools.ts
  - /Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/retrieve.ts
  - /Users/ashray/code/amxv/agentdune-chat/lib/ai/tools/web-search.ts

Database:
  - /Users/ashray/code/amxv/agentdune-chat/lib/db/schema.ts
  - /Users/ashray/code/amxv/agentdune-chat/lib/db/queries.ts

Types:
  - /Users/ashray/code/amxv/agentdune-chat/lib/ai/types.ts
  - /Users/ashray/code/amxv/agentdune-chat/lib/message-conversion.ts
```

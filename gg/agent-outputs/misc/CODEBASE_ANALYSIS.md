# Codebase Analysis: Sparka AI - AI Chat Application

## Executive Summary

This is a **production-ready AI chat application** called **Sparka AI** built with Next.js 15, Vercel AI SDK v5, and TypeScript. It is an advanced multi-model AI chat platform with 120+ models through Vercel AI Gateway, but it is **NOT a traditional RAG (Retrieval Augmented Generation) system** with vector databases or embeddings.

## 1. Application Type

**Confirmed**: Full-featured AI Chat Application with:
- Multi-model support (Claude, GPT-4, Gemini, Grok, and 120+ models via Vercel AI Gateway)
- Authentication and authorization
- Persistent chat history
- Real-time streaming responses
- Advanced AI tools and capabilities

## 2. File Upload & Attachment Capabilities

### ✅ Supported File Types
- **Images**: JPEG, PNG (with client-side compression support)
- **PDFs**: Full PDF file support
- **Maximum file size**: 5 MB per file

### Upload Infrastructure
- **Frontend**: React Dropzone with `react-dropzone` library
- **File Processing**: `lib/files/upload-prep.ts`
  - Image compression using `browser-image-compression`
  - Dimension constraints: 2048px max
  - Quality adjustments for optimal size
- **Storage**: Vercel Blob (`@vercel/blob`)
  - Public access URLs
  - File prefix tracking
  - Consistent naming with random suffix

### API Endpoint
- **Route**: `POST /api/chat/api/files/upload`
- **Authentication**: Requires user session (via Better Auth)
- **Response**: Returns public blob URL for uploaded file

### Frontend Components
- `components/multimodal-input.tsx` - Main input with file upload
- `components/attachment-list.tsx` - Display uploaded files
- `components/preview-attachment.tsx` - Preview with PDF/image support
- Image modal for viewing in detail
- Auto-model switching for PDF/image compatible models

## 3. Document Processing & Retrieval

### Web Content Extraction (Firecrawl Integration)
**Location**: `lib/ai/tools/retrieve.ts`

The app uses **Firecrawl** for structured content extraction:
```typescript
const app = new FirecrawlApp({ apiKey: env.FIRECRAWL_API_KEY });
```

**Capabilities**:
- Scrape URLs to Markdown
- Extract page metadata (title, description, language)
- Schema-based extraction for missing content
- Fallback extraction for incomplete pages

### Web Search Capabilities
**Location**: `lib/ai/tools/web-search.ts`

Implemented via **Tavily API** with:
- Multi-query search support (up to 2 queries per request)
- Configurable search depth (basic/advanced)
- Topic filtering (general/news)
- Domain exclusion
- Inline source citation support

## 4. ❌ NOT Implemented: RAG Features

**Vector Databases**: None
- No Pinecone, Weaviate, ChromaDB, or Milvus integration
- No vector store configuration
- No embedding models

**Embeddings/Semantic Search**: Not implemented
- No OpenAI Embeddings or similar
- No semantic chunking
- No vector similarity searches

**RAG Libraries**: Not used
- LangChain: Not integrated
- LlamaIndex: Not integrated
- LangGraph: Not integrated

**Document Indexing Pipeline**: Not present
- No automatic document chunking
- No metadata extraction pipeline
- No knowledge base management
- No persistent document storage for retrieval

### Why Not RAG?
The application follows a different architectural approach:
1. **Direct Web Access**: Uses Firecrawl to scrape live web content
2. **Session-Based Memory**: Maintains conversation history in the session
3. **Attachment Passthrough**: Uploads files directly to blob storage and passes URLs to multimodal models
4. **Deep Research Tool**: Autonomous research agents for complex queries instead of vector search

## 5. AI Tools & Capabilities

### Available AI Tools

**Document & Artifact Tools**:
- `createDocument` - Generate text, sheets, or code artifacts
- `updateDocument` - Modify existing artifacts
- `readDocument` - Read/analyze documents
- `requestSuggestions` - AI suggestions on documents

**Search & Research Tools**:
- `webSearch` (Tavily) - Multi-query web search with Firecrawl
- `deepResearch` - Autonomous research with multi-step analysis
- `retrieve` (Firecrawl) - URL-based content extraction

**Utility Tools**:
- `generateImage` (OpenAI) - Image generation and editing
- `codeInterpreter` (E2B) - Secure Python/JavaScript execution
- `stockChart` - Financial data visualization
- `getWeather` - Weather information

**Tools Definitions**: `lib/ai/tools/tools-definitions.ts`

## 6. Data Storage

### Database Schema (PostgreSQL)

```typescript
// Core tables:
- User (with Better Auth integration)
- Chat (conversations)
- Message (chat messages with attachments field)
- Vote (message ratings)
- Document (generated artifacts with kind: text|code|sheet)
- Suggestion (collaborative editing suggestions)

// Session management (Better Auth):
- Session
- Account
- Verification
```

**Note**: Message table has `attachments` JSON field but stores only metadata. Actual files are stored in Vercel Blob.

### Message Structure
```typescript
type Message = {
  id: UUID
  chatId: UUID
  role: "user" | "assistant"
  parts: MessagePart[]  // AI SDK message parts
  attachments: []  // Stored as empty in DB, URLs in parts
  createdAt: Date
  lastContext: Usage
  annotations: JSON
  isPartial: boolean
  parentMessageId?: UUID
  selectedModel: string
  selectedTool?: string
}
```

## 7. Attachment Handling Pipeline

### From Upload to Model

1. **Client-side Upload**:
   ```
   User selects file → Compress (if image) → Validate type/size
   → Upload to blob endpoint → Get public URL
   ```

2. **Message Assembly**:
   - Attachment object created: `{ name, url, contentType }`
   - Added to `multimodal-input` state
   - Displayed in preview with ability to remove

3. **Message Conversion**:
   - `convertToModelMessages()` from AI SDK
   - Attachments become `FilePart` or `ImagePart` in ModelMessage
   - For PDFs: `FilePart` with URL
   - For images: `ImagePart` with URL

4. **Asset Download**:
   - `replaceFilePartUrlByBinaryDataInMessages()` in chat route
   - Downloads file from blob URL
   - Converts to binary data
   - Provider receives actual bytes, not URLs

5. **Model Processing**:
   - Vision models (Claude 3.5 Sonnet, GPT-4V, etc.) handle images
   - Models with document support handle PDFs
   - Firecrawl can extract text from PDFs if needed

## 8. PDF Support

**PDF Handling**:
- Accepted as attachment type
- Stored in Vercel Blob
- Passed to vision-capable models
- Preview shows PDF icon with open/download buttons
- Type hints include `@types/pdf-parse` but not actively used for server-side parsing

**PDF Processing**:
- Frontend: No client-side PDF parsing
- Server: Firecrawl can extract PDF content when needed
- Models: Rely on model's built-in PDF understanding

## 9. File Search & Document Querying

### Query Methods Available

**Web Search** (via Tavily + Firecrawl):
- Can search for specific documents/content
- Returns live web results with citations
- Integrates into conversation flow

**Deep Research** (Autonomous Agent):
- Multi-step research process
- Clarifying questions if ambiguous
- Parallel research tasks
- Synthesized reports with citations
- Uses web search + content extraction

**Single URL Retrieve** (Firecrawl):
- Extract content from known URLs
- Metadata extraction
- Markdown conversion
- Schema-based extraction

**Chat-based Querying**:
- Upload documents as attachments
- Ask questions about content
- Model processes directly (no indexing)

### Limitations
- **No keyword search** across uploaded documents
- **No semantic search** via embeddings
- **No document index** for quick retrieval
- **No cross-chat search** for documents
- Each query processes documents fresh

## 10. Technology Stack - File/Document Related

### Frontend Libraries
```typescript
"react-dropzone": "^14.3.8"           // File drag/drop
"browser-image-compression": "^2.0.2" // Image optimization
"@vercel/blob": "^0.24.1"             // Storage client
"papaparse": "^5.5.2"                 // CSV parsing (optional)
```

### Backend Libraries
```typescript
"@mendable/firecrawl-js": "1.29.1"    // Web scraping & extraction
"@tavily/core": "^0.3.3"              // Web search API
"@vercel/blob": "^0.24.1"             // Blob storage
"drizzle-orm": "^0.34.0"              // Database ORM
"@vercel/postgres": "^0.10.0"         // PostgreSQL client
```

### AI Libraries
```typescript
"ai": "^5.0.39"                       // Vercel AI SDK
"@ai-sdk/anthropic": "^2.0.3"         // Claude
"@ai-sdk/openai": "^2.0.12"           // GPT/Vision
"@ai-sdk/google": "^2.0.6"            // Gemini
"@ai-sdk/xai": "^2.0.7"               // Grok
"@ai-sdk/gateway": "1.0.23"           // Vercel AI Gateway
```

## 11. Feature Limitations & Gaps

**Missing for Full RAG**:
- ❌ Vector embeddings
- ❌ Semantic search
- ❌ Document indexing
- ❌ Persistent knowledge base
- ❌ Multi-document synthesis with relevance scoring
- ❌ Hybrid search (keyword + semantic)

**PDF Processing Limitations**:
- ❌ No server-side PDF parsing
- ❌ No OCR for images in PDFs
- ❌ No PDF metadata extraction beyond Firecrawl
- ❌ Limited to what vision models can understand

**Search Limitations**:
- ❌ No full-text search over uploaded files
- ❌ No document versioning
- ❌ No collaborative editing (though suggestions exist)
- ❌ No annotation system

## 12. Observability & Monitoring

**Logging Framework**: Pino structured logger

**Observability**:
- Langfuse integration for LLM observability
- Vercel Analytics for frontend metrics
- OpenTelemetry instrumentation
- Structured logging throughout

**Request Tracking**:
- Unique request IDs for tracing
- Message ID tracking
- Stream ID tracking for resumable uploads

## 13. Performance Features

- **Resumable Streams**: Redis-backed resumable uploads (optional)
- **Image Compression**: Automatic optimization before upload
- **Rate Limiting**: Anonymous user limits
- **Credit System**: Token-based usage tracking
- **Streaming Responses**: Server-sent events for real-time chat

## 14. Environment Configuration

**Required for File/Document Features**:
```bash
FIRECRAWL_API_KEY=           # Web scraping & PDF extraction
BLOB_READ_WRITE_TOKEN=       # Vercel Blob storage
TAVILY_API_KEY=              # Web search (optional)
EXA_API_KEY=                 # Alternative web search (optional)
POSTGRES_URL=                # Database
REDIS_URL=                   # Resumable streams (optional)
```

## 15. Security & Access Control

- **Authentication**: Better Auth framework
- **File Access**: Public blob URLs (files are public after upload)
- **Request Validation**: Zod schemas for all API inputs
- **Rate Limiting**: Per-user anonymous user limits
- **Session Management**: Bearer token-based sessions

## 16. Deployment Architecture

- **Frontend**: Next.js 15 deployed on Vercel
- **Database**: Vercel PostgreSQL
- **File Storage**: Vercel Blob
- **Caching**: Upstash Redis (optional)
- **Monitoring**: Vercel Analytics + Langfuse
- **Code Execution**: E2B Sandbox (for code interpreter)

## Conclusion

**Sparka AI** is a sophisticated AI chat application with multimodal file support and advanced search capabilities through Firecrawl and web search APIs. While it excels at handling documents within chat sessions and performing deep research on web sources, it is **not designed as a traditional RAG system** with persistent vector-indexed knowledge bases.

The application prioritizes:
- ✅ Real-time web content extraction
- ✅ Session-based document handling
- ✅ Multi-step autonomous research
- ✅ Direct multimodal model integration
- ✅ User chat history and artifact creation

Rather than:
- ❌ Pre-indexed knowledge bases
- ❌ Vector similarity search
- ❌ Persistent document retrieval systems
- ❌ Cross-session information synthesis

This architecture makes Sparka ideal for interactive research, content generation, and real-time information retrieval, but less suitable for scenarios requiring cross-user knowledge synthesis or extremely fast document retrieval.

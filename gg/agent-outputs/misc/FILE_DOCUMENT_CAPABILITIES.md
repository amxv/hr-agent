# Quick Reference: File & Document Capabilities

## What IS Supported ✅

| Feature | Status | Details |
|---------|--------|---------|
| **File Upload** | ✅ Yes | JPEG, PNG, PDF up to 5MB |
| **Image Support** | ✅ Yes | Client compression, 2048px max dimension |
| **PDF Attachments** | ✅ Yes | Passed to vision models, preview support |
| **Web Search** | ✅ Yes | Tavily API, multi-query support |
| **URL Scraping** | ✅ Yes | Firecrawl for Markdown extraction |
| **Deep Research** | ✅ Yes | Autonomous multi-step research agent |
| **Vision Models** | ✅ Yes | Claude, GPT-4V, Gemini image support |
| **Chat History** | ✅ Yes | PostgreSQL persistent storage |
| **Document Generation** | ✅ Yes | Create text/code/sheet artifacts |

## What IS NOT Supported ❌

| Feature | Status | Details |
|---------|--------|---------|
| **Vector Database** | ❌ No | No Pinecone, Weaviate, ChromaDB |
| **Embeddings** | ❌ No | No semantic search capability |
| **RAG Indexing** | ❌ No | No document chunking/indexing |
| **Full-Text Search** | ❌ No | Cannot search uploaded document content |
| **Knowledge Base** | ❌ No | No persistent document indexing |
| **LangChain/LlamaIndex** | ❌ No | Not integrated |
| **Keyword Search** | ❌ No | No index for fast retrieval |
| **Cross-Chat Search** | ❌ No | Each session is isolated |

## Key File Upload Components

```
Frontend:
  ├─ components/multimodal-input.tsx      ← Main upload UI
  ├─ components/attachment-list.tsx       ← Display attachments
  ├─ components/preview-attachment.tsx    ← File previews
  └─ lib/files/upload-prep.ts             ← Image compression logic

Backend:
  ├─ app/(chat)/api/files/upload/route.ts ← Upload endpoint
  ├─ lib/blob.ts                          ← Vercel Blob integration
  └─ lib/utils/download-assets.ts         ← Asset download logic
```

## File Processing Pipeline

```
1. User selects file
   ↓
2. Compress if image (browser-image-compression)
   ↓
3. Validate: type (JPEG/PNG/PDF), size (<5MB)
   ↓
4. Upload to endpoint (POST /api/chat/api/files/upload)
   ↓
5. Store in Vercel Blob (public URL returned)
   ↓
6. Create Attachment object: { name, url, contentType }
   ↓
7. Add to message
   ↓
8. Convert to ModelMessage (FilePart/ImagePart)
   ↓
9. Download binary from URL (server-side)
   ↓
10. Send to AI model with other message parts
```

## Document Query Methods

### Method 1: Chat with Uploaded Files
```typescript
User uploads PDF → Asks questions → Model reads document → Responds
// No indexing, direct model understanding
```

### Method 2: Web Search
```typescript
User searches term → Tavily API → Firecrawl extracts → Results
// Live web content, not indexed
```

### Method 3: Deep Research
```typescript
Complex query → Research agent autonomously searches
→ Multiple web sources → Synthesized report with citations
```

### Method 4: URL Retrieve
```typescript
User provides URL → Firecrawl scrapes → Markdown content extracted
→ Schema-based data extraction → Response to user
```

## File/Document Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Sparka AI Chat                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend               Backend              Services        │
│  ┌────────────┐        ┌─────────┐        ┌──────────────┐ │
│  │  Upload    │──POST──│ /files/ │        │ Vercel Blob  │ │
│  │  Component │        │ upload  │────┬──→│ (Storage)    │ │
│  └────────────┘        └─────────┘    │   └──────────────┘ │
│        │                                                     │
│        │                   ┌──────────────────────────────┐ │
│        │                   │   Chat Route (/api/chat)     │ │
│        └──────────────────→│  ┌─────────────────────────┐│ │
│                            │  │ convertToModelMessages   ││ │
│                            │  │ replaceFilePartUrl...    ││ │
│                            │  │ getLanguageModel()       ││ │
│                            │  └─────────────────────────┘│ │
│                            └─────────────┬────────────────┘ │
│                                          │                  │
│                            ┌─────────────▼─────────────┐   │
│                            │   AI Models               │   │
│                            │  (Claude, GPT-4, Gemini) │   │
│                            └───────────────────────────┘   │
│                                                              │
│                            ┌──────────────────────────────┐ │
│                            │  Tools                       │ │
│                            │  ├─ webSearch (Tavily)       │ │
│                            │  ├─ deepResearch (Agent)     │ │
│                            │  ├─ retrieve (Firecrawl)     │ │
│                            │  └─ generateImage (DALL-E)   │ │
│                            └──────────────────────────────┘ │
│                                                              │
│                            ┌──────────────────────────────┐ │
│                            │  Storage                     │ │
│                            │  ├─ PostgreSQL (Chats/Msgs) │ │
│                            │  └─ Vercel Blob (Files)     │ │
│                            └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## When to Use This App

### ✅ Good For:
- Interactive AI chat with document understanding
- Real-time web research
- Content generation with references
- Image-based queries
- Multi-model comparison
- Autonomous research on complex topics
- Document artifact creation

### ❌ Not Good For:
- Fast document retrieval from large databases
- Semantic similarity search
- Knowledge base synthesis
- Cross-user information retrieval
- Offline-first applications
- Complex RAG workflows

## Configuration Required

```bash
# Essential for file/document features:
BLOB_READ_WRITE_TOKEN=          # Vercel Blob (required)
FIRECRAWL_API_KEY=              # Web scraping (required)
TAVILY_API_KEY=                 # Web search (required)
POSTGRES_URL=                   # Database (required)

# Optional:
REDIS_URL=                      # Resumable streams
EXA_API_KEY=                    # Alternative search
E2B_API_KEY=                    # Code execution
OPENAI_API_KEY=                 # Direct OpenAI access
```

## Summary Table

| Aspect | Implementation | Technology |
|--------|---|---|
| **File Upload** | REST API | Vercel Blob |
| **Storage** | Cloud Object Storage | Vercel Blob |
| **Search** | Live Web Crawling | Tavily + Firecrawl |
| **PDFs** | Direct Model Input | Vision Models |
| **Images** | Client Compression | browser-image-compression |
| **Research** | Agent-based | Autonomous Tool Use |
| **Database** | Relational | PostgreSQL |
| **AI Models** | Multi-provider | Vercel AI Gateway |
| **RAG** | Not Implemented | — |

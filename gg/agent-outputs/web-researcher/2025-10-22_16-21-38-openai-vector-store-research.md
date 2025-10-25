# OpenAI Vector Store API and File Upload API Research

**Research Date**: October 22, 2025
**Focus**: Document RAG system implementation with OpenAI's Vector Store API and File Upload API

---

## Executive Summary

This research provides comprehensive guidance for implementing a document RAG system using OpenAI's Vector Store API and File Upload API. OpenAI automatically handles document parsing, chunking, embedding generation, and provides both keyword and semantic search capabilities. The system supports up to 10,000 files per vector store with a maximum of 512 MB per file.

---

## 1. Supported File Formats

**Source**: [OpenAI Official Documentation - Supported Files](https://platform.openai.com/docs/assistants/tools/file-search/supported-files)

### Complete List of Supported Formats

| File Format | MIME Type |
|---|---|
| `.c` | `text/x-c` |
| `.cpp` | `text/x-c++` |
| `.cs` | `text/x-csharp` |
| `.css` | `text/css` |
| `.doc` | `application/msword` |
| `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `.go` | `text/x-golang` |
| `.html` | `text/html` |
| `.java` | `text/x-java` |
| `.js` | `text/javascript` |
| `.json` | `application/json` |
| `.md` | `text/markdown` |
| `.pdf` | `application/pdf` |
| `.php` | `text/x-php` |
| `.pptx` | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| `.py` | `text/x-python` |
| `.rb` | `text/x-ruby` |
| `.sh` | `application/x-sh` |
| `.tex` | `text/x-tex` |
| `.ts` | `application/typescript` |
| `.txt` | `text/plain` |

**Note**: For `text/*` MIME types, encoding must be UTF-8, UTF-16, or ASCII.

### Known Limitations

The following file types are **NOT** currently supported:
- CSV and JSONL files (for structured data retrieval)
- Image files within documents
- Some specialized binary formats

---

## 2. File Size and Storage Limits

**Source**: OpenAI Documentation and Community Reports

### Individual File Limits
- **Maximum file size**: 512 MB per file
- **Maximum tokens per file**: 5,000,000 tokens (computed automatically when attached)

### Vector Store Limits
- **Maximum files per vector store**: 10,000 files
- **Organization storage quota**: 100 GB total across all uploaded files

### Batch Operations
- **Maximum files per batch**: 500 files per `file_batches.create()` call

### Important Considerations
- Exceeding the 100 GB organization limit returns error: "You have exceeded your file storage quota"
- File size limits are enforced at upload time
- Vector store creation and file addition are asynchronous operations

---

## 3. File Upload API

**Source**: [OpenAI File Upload API Documentation](https://platform.openai.com/docs/api-reference/files)

### Upload Flow

```python
# Python Example
file_response = client.files.create(
    file=open("document.pdf", "rb"),
    purpose="assistants"
)
file_id = file_response.id
```

### API Details

**Endpoint**: `POST /v1/files`

**Parameters**:
- `file` (required): Binary file content
- `purpose` (required): Must be `"assistants"` for vector store usage

**Response Fields**:
- `id`: Unique file identifier (e.g., `file-abc123`)
- `filename`: Original filename
- `bytes`: File size in bytes
- `created_at`: Unix timestamp
- `purpose`: The purpose string provided
- `status`: Processing status
- `status_details`: Additional status information if applicable

### HTTP Headers
```
Content-Type: application/json
Authorization: Bearer $OPENAI_API_KEY
```

### Key Points
- Files are uploaded to OpenAI's secure infrastructure
- File upload is synchronous (returns immediately)
- Files remain accessible until explicitly deleted
- Files can be reused across multiple vector stores and assistants

---

## 4. Vector Store Creation and Management

**Source**: [OpenAI Vector Store API Documentation](https://platform.openai.com/docs/assistants/tools/file-search/vector-stores)

### Creating a Vector Store

```python
# Simple creation
vector_store = client.vector_stores.create(
    name="Product Documentation"
)

# Creation with files
vector_store = client.vector_stores.create(
    name="Product Documentation",
    file_ids=['file_1', 'file_2', 'file_3']
)

# Creation with expiration policy
vector_store = client.vector_stores.create_and_poll(
    name="Product Documentation",
    file_ids=['file_1', 'file_2', 'file_3'],
    expires_after={
        "anchor": "last_active_at",
        "days": 7
    }
)
```

### Vector Store Response Object

**Key Fields**:
- `id`: Vector store identifier (e.g., `vs_abc123`)
- `name`: Display name
- `status`: One of `"in_progress"`, `"completed"`, `"expired"`
- `file_counts`: Object containing:
  - `total`: Total files attempted
  - `completed`: Successfully processed
  - `failed`: Failed to process
  - `cancelled`: Cancelled uploads
  - `in_progress`: Currently processing
- `usage_bytes`: Total bytes consumed
- `created_at`: Creation timestamp
- `expires_at`: Expiration time (if expiration policy set)
- `last_active_at`: Last time used

### Important Workflow

1. Create vector store (optionally with initial files)
2. Use `create_and_poll()` helper or manually poll status
3. Wait until `file_counts.in_progress == 0` before using
4. Fallback: 60-second maximum wait for thread vector stores with in-progress files

---

## 5. Adding and Removing Files from Vector Stores

**Source**: OpenAI Documentation and Community Forums

### Adding Files: Single File

```python
file = client.vector_stores.files.create_and_poll(
    vector_store_id="vs_abc123",
    file_id="file-abc123"
)
```

### Adding Files: Batch Operation (Recommended for >10 files)

```python
batch = client.vector_stores.file_batches.create_and_poll(
    vector_store_id="vs_abc123",
    file_ids=[
        'file_1', 'file_2', 'file_3',
        'file_4', 'file_5'
    ]
)

# Response contains file_counts showing success/failure
print(batch.status)  # "completed" or "failed"
print(batch.file_counts)
```

### Batch Operation Limits
- **Maximum 500 files per batch**
- Asynchronous processing
- Polling required to check completion

### Removing Files

```python
# Delete from vector store
client.vector_stores.files.delete(
    vector_store_id="vs_abc123",
    file_id="file-abc123"
)

# Alternative: Delete underlying file (removes from all stores)
client.files.delete("file-abc123")
```

### Listing Files in Vector Store

```python
files = client.vector_stores.files.list("vs_abc123")
for file in files:
    print(f"File: {file.id}, Status: {file.status}")
```

### Important Notes
- Deleting a file via `files.delete()` removes it from ALL vector stores
- Deleting from a vector store only removes from that store
- Status can be `"in_progress"`, `"completed"`, or `"failed"`
- Failed files may need to be re-added

---

## 6. Document Chunking and Indexing

**Source**: [OpenAI File Search Documentation - Chunking Configuration](https://platform.openai.com/docs/assistants/tools/file-search/vector-stores#chunking-configuration)

### Default Chunking Strategy

OpenAI automatically chunks documents with these defaults:
- **Chunk size**: 800 tokens
- **Chunk overlap**: 400 tokens
- **Embedding model**: `text-embedding-3-large` at 256 dimensions

### Customizing Chunk Size

```python
file = client.vector_stores.files.create_and_poll(
    vector_store_id="vs_abc123",
    file_id="file-abc123",
    chunking_strategy={
        "type": "static",
        "static": {
            "max_chunk_size_tokens": 1024,
            "chunk_overlap_tokens": 512
        }
    }
)
```

### Chunking Constraints

- `max_chunk_size_tokens`: Between 100 and 4096 (inclusive)
- `chunk_overlap_tokens`: Non-negative and should not exceed `max_chunk_size_tokens / 2`
- Must satisfy: `chunk_overlap <= max_chunk_size / 2`

### How OpenAI Processes Documents

1. **Parsing**: Automatically extracts text from supported file formats
2. **Chunking**: Divides text into overlapping segments
3. **Embedding**: Generates vector embeddings using `text-embedding-3-large`
4. **Indexing**: Creates searchable index with both keyword and semantic search capability

### Processing Latency

**Observed Patterns**:
- Small files (< 5 MB): Minutes to process
- Medium files (5-50 MB): Hours to process
- Large files (50-500 MB): Can take many hours to days
- Status is checked via vector store polling

---

## 7. Semantic Search and Retrieval

**Source**: [OpenAI File Search - How It Works](https://platform.openai.com/docs/assistants/tools/file-search/supported-files#how-it-works)

### Search Mechanism

The file_search tool automatically:
1. **Rewrites user queries** to optimize for search
2. **Breaks down complex queries** into multiple parallel searches
3. **Runs both keyword and semantic searches** across vector stores
4. **Reranks results** to identify most relevant chunks
5. **Uses automatic relevance scoring** (configurable)

### Retrieve Number of Chunks

```python
# Configure when creating assistant
assistant = client.beta.assistants.create(
    model="gpt-4o",
    tools=[{
        "type": "file_search",
        "file_search": {
            "max_num_results": 20
        }
    }],
    tool_resources={...}
)

# Or configure when creating run
run = client.beta.threads.runs.create(
    thread_id=thread_id,
    assistant_id=assistant_id,
    tools=[{
        "type": "file_search",
        "file_search": {
            "max_num_results": 20
        }
    }]
)
```

### Default Retrieved Chunks

- `gpt-4*` models: Up to 20 chunks
- `o-series` models: Up to 20 chunks
- `gpt-3.5-turbo`: Up to 5 chunks

### Token Budget for Context

Retrieved chunks are subject to a token budget:
- `gpt-3.5-turbo`: 4,000 tokens
- `gpt-4*` models: 16,000 tokens
- `o-series` models: 16,000 tokens

The tool may return fewer chunks if total tokens would exceed the budget.

### Configuring Ranking and Thresholds

```python
assistant = client.beta.assistants.create(
    model="gpt-4o",
    tools=[{
        "type": "file_search",
        "file_search": {
            "max_num_results": 20,
            "ranking_options": {
                "ranker": "auto",  # or "default_2024_08_21"
                "score_threshold": 0.5  # 0.0 to 1.0
            }
        }
    }],
    tool_resources={...}
)
```

**Ranking Options**:
- `ranker`: `"auto"` (uses latest) or `"default_2024_08_21"`
- `score_threshold`: 0.0 (minimum) to 1.0 (highest)
  - Higher threshold = stricter filtering
  - Risk: May exclude relevant chunks
  - Default: 0 (return all results with any relevance)

---

## 8. Retrieving Full Document Content and Citations

**Source**: OpenAI Documentation and Community Forums

### Getting File Search Results with Content

```python
# When retrieving run step with file search results
run_step = client.beta.threads.runs.steps.retrieve(
    thread_id="thread_abc123",
    run_id="run_abc123",
    step_id="step_abc123",
    include=["step_details.tool_calls[*].file_search.results[*].content"]
)

# Results will include actual chunk content
```

### File Citations in Responses

The assistant's response includes annotations:

```python
message = messages.data[0]
if message.content[0].type == "text":
    text = message.content[0].text
    annotations = text.annotations

    for annotation in annotations:
        if hasattr(annotation, "file_citation"):
            file_citation = annotation.file_citation
            file_id = file_citation.file_id

            # Retrieve file metadata
            file = client.files.retrieve(file_id)
            print(f"Cited file: {file.filename}")
```

### Annotation Structure

```json
{
  "type": "file_citation",
  "text": "【18:0†source】",
  "start_index": 434,
  "end_index": 447,
  "file_citation": {
    "file_id": "file-nRl3w3civlx7o897DieUXGaO"
  }
}
```

### Retrieving Full Document Content

```python
# Get file metadata and content
file = client.files.retrieve(file_id)
print(f"Filename: {file.filename}")
print(f"Size: {file.bytes} bytes")
print(f"Created: {file.created_at}")

# Retrieve file content
content = client.files.content(file_id).read()
```

### Important Limitations

- File search returns **chunk references**, not full documents
- Annotations only include file IDs and position markers
- The actual search results (chunks) are available via the `include` parameter in run steps
- Full document retrieval requires separate API call using file ID

---

## 9. API Response Formats and Metadata

**Source**: OpenAI API Documentation

### File Upload Response

```json
{
  "id": "file-abc123",
  "object": "file",
  "bytes": 1024000,
  "created_at": 1699009612,
  "filename": "document.pdf",
  "purpose": "assistants",
  "status": "processed",
  "status_details": null
}
```

### Vector Store Response

```json
{
  "id": "vs_abc123",
  "object": "vector_store",
  "created_at": 1699009612,
  "name": "Product Documentation",
  "status": "completed",
  "usage_bytes": 123456,
  "file_counts": {
    "in_progress": 0,
    "completed": 5,
    "cancelled": 0,
    "failed": 0,
    "total": 5
  },
  "expires_at": null,
  "last_active_at": 1699009612
}
```

### Vector Store File Response

```json
{
  "id": "file-abc123",
  "object": "vector_store.file",
  "created_at": 1699009612,
  "vector_store_id": "vs_abc123",
  "status": "completed",
  "status_details": null
}
```

### File Search Result (via include parameter)

```json
{
  "type": "tool_call",
  "id": "call_abc123",
  "function": {
    "name": "file_search",
    "arguments": {...}
  },
  "file_search": {
    "results": [
      {
        "file_id": "file-abc123",
        "score": 0.85,
        "content": "Chunk text from the document..."
      }
    ]
  }
}
```

### Metadata Filtering (Responses API)

```python
# Search with metadata filtering
result = client.responses.create(
    model="gpt-4o",
    messages=[...],
    tools=[{
        "type": "file_search",
        "file_search": {
            "vector_store_ids": ["vs_abc123"],
            "filter": {
                "where": {
                    "field": "author",
                    "operator": "equals",
                    "value": "Jane Doe"
                }
            }
        }
    }]
)
```

---

## 10. Rate Limits and Error Handling

**Source**: OpenAI Documentation and Best Practices

### General API Rate Limits

OpenAI applies rate limits at two levels:
- **RPM** (Requests Per Minute)
- **TPM** (Tokens Per Minute)

Rate limits vary by:
- Model being used
- Your account tier/usage history
- Available organization quota

### File-Specific Rate Limits

No dedicated rate limits published for File API operations. Rate limiting follows general API limits. However:
- File uploads count towards overall API quota
- Large file uploads may consume significant bandwidth
- No published timeout for file operations

### Error Handling Best Practices

```python
import time
from openai import RateLimitError, APIError

def retry_with_exponential_backoff(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return func()
        except RateLimitError as e:
            if attempt == max_retries - 1:
                raise
            wait_time = 2 ** attempt  # 1s, 2s, 4s
            print(f"Rate limited. Waiting {wait_time}s...")
            time.sleep(wait_time)
        except APIError as e:
            if e.status_code == 429:  # Too Many Requests
                if attempt == max_retries - 1:
                    raise
                wait_time = 2 ** attempt
                time.sleep(wait_time)
            else:
                raise

# Usage
retry_with_exponential_backoff(
    lambda: client.files.create(
        file=open("doc.pdf", "rb"),
        purpose="assistants"
    )
)
```

### Common Error Responses

| Status | Error | Cause | Solution |
|--------|-------|-------|----------|
| 400 | Invalid file format | Unsupported file type | Use supported format |
| 400 | File too large | Exceeds 512 MB | Split file or compress |
| 400 | Invalid 'file_ids': array too long | Too many files in batch | Use <= 500 files per batch |
| 429 | Rate limit exceeded | Too many requests | Implement exponential backoff |
| 500 | Internal server error | Server issue | Retry with backoff |

---

## 11. Document Lifecycle: Upload, Update, Delete

**Source**: OpenAI Community and Documentation

### Complete Document Management Flow

```python
import time
from openai import OpenAI

client = OpenAI()

# 1. UPLOAD: Create file
file_response = client.files.create(
    file=open("document.pdf", "rb"),
    purpose="assistants"
)
file_id = file_response.id
print(f"Uploaded: {file_id}")

# 2. CREATE VECTOR STORE
vs = client.vector_stores.create(name="My Docs")
vs_id = vs.id

# 3. ADD FILE to vector store
batch = client.vector_stores.file_batches.create_and_poll(
    vector_store_id=vs_id,
    file_ids=[file_id]
)
print(f"Added to store: {batch.status}")

# 4. UPDATE: Replace document
# To update, follow these steps:
#   a. Upload new version of file
new_file = client.files.create(
    file=open("document_v2.pdf", "rb"),
    purpose="assistants"
)
new_file_id = new_file.id

#   b. Remove old file from vector store
client.vector_stores.files.delete(vs_id, file_id)

#   c. Add new file to vector store
client.vector_stores.file_batches.create_and_poll(
    vector_store_id=vs_id,
    file_ids=[new_file_id]
)

#   d. Delete old file from storage
client.files.delete(file_id)

# 5. DELETE: Remove document
# Remove from vector store
client.vector_stores.files.delete(vs_id, new_file_id)
# Delete file entirely
client.files.delete(new_file_id)
```

### Important Considerations

- **Updates**: No direct "update" API - must upload new version and swap files
- **Synchronization**: After deletion, file may take time to disappear from vector store
- **Cascading delete**: Using `files.delete()` removes from all vector stores
- **Metadata tracking**: Keep separate database of file-to-document mapping for proper sync

---

## 12. Database Synchronization Strategy

**Recommended Approach for Maintaining Sync**:

```typescript
// Track document lifecycle in your database
interface DocumentRecord {
  id: string;                    // Your internal ID
  openai_file_id: string;        // File ID in OpenAI
  vector_store_id: string;       // Vector store ID
  filename: string;
  size_bytes: number;
  uploaded_at: Date;
  status: 'pending' | 'indexed' | 'failed' | 'deleted';
  error_message?: string;
  deleted_at?: Date;
}

// On upload:
// 1. Insert document record with status='pending'
// 2. Upload to OpenAI
// 3. Add to vector store
// 4. Poll vector store until completion
// 5. Update status='indexed'

// On delete:
// 1. Update status='deleted', set deleted_at
// 2. Remove from vector store
// 3. Delete file from OpenAI
// 4. Keep record for audit trail (soft delete)
```

---

## 13. Typical Latency and Performance Metrics

**Source**: Community reports and observed patterns

### Upload Latency
- **File upload**: < 1 second (synchronous)
- **Vector store file addition**: Async, status check needed

### Indexing/Processing Latency
| File Size | Typical Time | Notes |
|-----------|-------------|-------|
| < 1 MB | 1-5 minutes | Quick processing |
| 1-10 MB | 5-30 minutes | Standard range |
| 10-50 MB | 30 minutes - 2 hours | Moderate documents |
| 50-200 MB | 2-8 hours | Large documents |
| 200-512 MB | 8+ hours, up to days | Very large files |

### Query Latency
- **Search execution**: 1-5 seconds for typical queries
- **Result ranking**: Included in search time
- **Threading**: Queries are parallelized for multiple vector stores

### Polling Recommendations
- Short files: Poll every 5-10 seconds
- Medium files: Poll every 30-60 seconds
- Large files: Poll every 5-10 minutes

---

## 14. Configurable Features and Limitations

**Source**: OpenAI Documentation

### Configurable Features

- ✅ **Chunk size** (100-4096 tokens)
- ✅ **Chunk overlap** (0 to chunk_size/2)
- ✅ **Max search results** (1-100, default 20)
- ✅ **Ranking threshold** (0.0-1.0)
- ✅ **Ranker selection** (auto or default_2024_08_21)
- ✅ **Expiration policies** (days, anchor point)
- ✅ **Metadata filtering** (Responses API)

### Known Limitations (Not Yet Supported)

- ❌ **Pre-search filtering** using custom metadata (coming soon)
- ❌ **Image parsing** within documents (charts, graphs, tables)
- ❌ **Structured file formats** (CSV, JSONL) for retrieval
- ❌ **Optimized summarization** (tool optimized for search)
- ❌ **Custom embedding models** (always uses text-embedding-3-large)
- ❌ **Chunking strategy modifications** after file addition

### Deprecation Note

The Assistants API is deprecated after August 26, 2026. Use the Responses API for new implementations.

---

## 15. Cost Management

**Source**: [OpenAI Pricing Documentation](https://platform.openai.com/docs/assistants/tools/file-search/supported-files#managing-costs-with-expiration-policies)

### Vector Store Pricing

- **First 1 GB**: Free
- **Beyond 1 GB**: $0.10 per GB per day
- **File upload/operations**: No additional charge

### Cost Optimization Strategies

```python
# Set expiration policies to auto-clean
vector_store = client.vector_stores.create(
    name="Temporary Docs",
    file_ids=['file_1', 'file_2'],
    expires_after={
        "anchor": "last_active_at",
        "days": 7  # Auto-delete after 7 days of inactivity
    }
)

# Thread vector stores auto-expire after 7 days by default
# Explicitly set longer expiration if needed:
vector_store = client.vector_stores.create(
    name="Long-term Docs",
    expires_after={
        "anchor": "last_active_at",
        "days": 90
    }
)
```

### Monitoring Costs

Use the `usage_bytes` field from vector store objects:
```python
vs = client.vector_stores.retrieve("vs_abc123")
gb_used = vs.usage_bytes / (1024 ** 3)
daily_cost = max(0, (gb_used - 1) * 0.10)
```

---

## Implementation Recommendations

### For Admins Uploading Documents

1. **Validation Layer**
   - Check file type is in supported list
   - Validate file size < 512 MB
   - Verify token count will be < 5,000,000
   - Provide clear error messages

2. **Upload Process**
   - Use try-catch with exponential backoff
   - Return file_id to user immediately
   - Begin async indexing process
   - Poll vector store status in background

3. **Progress Tracking**
   - Display upload status: "Processing..." / "Complete" / "Failed"
   - Check vector store file_counts every 30-60 seconds
   - Update UI when status changes

### For AI Agent Retrieval

1. **Query Optimization**
   - Let OpenAI handle query rewriting
   - Use semantic search naturally (not keyword forcing)
   - Configure score_threshold based on use case
   - Set max_num_results to balance cost and quality

2. **Citation Handling**
   - Extract file_citation annotations from responses
   - Map file IDs to document names in UI
   - Use `include` parameter to get actual chunk content
   - Display references clearly to users

3. **Error Handling**
   - Handle vector store not ready (status != "completed")
   - Retry failed file additions with new file_id
   - Log all API errors with request details
   - Implement graceful degradation

### For Database Synchronization

1. **Keep separate tracking** of OpenAI state in your database
2. **Soft delete** documents (mark deleted_at, keep records)
3. **Batch operations** for bulk uploads (max 500 per batch)
4. **Periodic reconciliation** to catch orphaned files
5. **Cleanup strategy** for failed uploads (retry N times, then remove)

---

## API Integration Examples

### Python SDK

```python
from openai import OpenAI
import time

client = OpenAI(api_key="sk-...")

# Upload file
file = client.files.create(
    file=open("doc.pdf", "rb"),
    purpose="assistants"
)

# Create vector store with polling
vs = client.vector_stores.create_and_poll(
    name="Docs",
    file_ids=[file.id]
)

# Query through assistant
assistant = client.beta.assistants.create(
    model="gpt-4o",
    tools=[{"type": "file_search"}],
    tool_resources={
        "file_search": {"vector_store_ids": [vs.id]}
    }
)

thread = client.beta.threads.create()

client.beta.threads.messages.create(
    thread_id=thread.id,
    role="user",
    content="What's in the document?"
)

run = client.beta.threads.runs.create_and_poll(
    thread_id=thread.id,
    assistant_id=assistant.id
)

messages = client.beta.threads.messages.list(thread_id=thread.id)
print(messages.data[0].content[0].text)
```

### JavaScript/TypeScript SDK

```typescript
import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Upload file
const file = await openai.files.create({
  file: fs.createReadStream("doc.pdf"),
  purpose: "assistants",
});

// Create vector store
const vectorStore = await openai.vectorStores.create({
  name: "Docs",
});

// Add files to vector store
await openai.vectorStores.fileBatches.uploadAndPoll(
  vectorStore.id,
  [fs.createReadStream("doc.pdf")]
);

// Create assistant
const assistant = await openai.beta.assistants.create({
  model: "gpt-4o",
  tools: [{ type: "file_search" }],
  tool_resources: {
    file_search: { vector_store_ids: [vectorStore.id] },
  },
});
```

---

## Additional Resources

- [OpenAI Assistants File Search Documentation](https://platform.openai.com/docs/assistants/tools/file-search)
- [OpenAI Vector Stores API Reference](https://platform.openai.com/docs/api-reference/vector-stores)
- [OpenAI Files API Reference](https://platform.openai.com/docs/api-reference/files)
- [OpenAI Cookbook - File Search Examples](https://cookbook.openai.com/)
- [Migration Guide from Assistants to Responses API](https://platform.openai.com/docs/assistants/migration)

---

## Summary of Key Findings

| Aspect | Finding |
|--------|---------|
| **Supported Formats** | 20+ file types including PDF, DOCX, TXT, JSON, MD, PPTX |
| **File Size Limit** | 512 MB per file |
| **Vector Store Limit** | 10,000 files per store |
| **Chunking** | 800 tokens (default), 400 overlap, configurable 100-4096 |
| **Embedding Model** | text-embedding-3-large at 256 dimensions |
| **Search Type** | Both keyword and semantic |
| **Max Results** | 20 for gpt-4*, 5 for gpt-3.5-turbo (configurable) |
| **Relevance Threshold** | Configurable 0.0-1.0 (score_threshold) |
| **Processing Latency** | Seconds to days depending on file size |
| **Query Latency** | 1-5 seconds typical |
| **Cost** | $0.10/GB/day beyond 1GB free tier |
| **Citations** | File ID + position markers in annotations |
| **Database Sync** | Track in separate database, implement reconciliation |
| **Deprecation** | Assistants API deprecated after Aug 26, 2026 |

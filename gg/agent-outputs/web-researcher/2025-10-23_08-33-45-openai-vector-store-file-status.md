# OpenAI Vector Store File Status Checking: Complete Research Guide

## Executive Summary

When working with OpenAI's Vector Stores API for semantic search and file retrieval, it's critical to properly check the status of individual files being processed. This document provides authoritative guidance on checking file status, understanding status states, and implementing proper polling strategies.

**Key Finding**: You should check the **individual vector store file object's `status` field**, not the vector store's aggregate file counts. Each file has its own processing status that must be monitored independently.

---

## 1. Correct API Endpoint for Checking File Status

### Primary Method: Retrieve Individual Vector Store File

**Endpoint**: `GET /v1/vector_stores/{vector_store_id}/files/{file_id}`

**Python SDK**:
```python
file = client.vector_stores.files.retrieve(
    vector_store_id="vs_123",
    file_id="file_123"
)
print(file.status)  # Returns: in_progress, completed, failed, or cancelled
```

**JavaScript SDK**:
```javascript
const file = await openai.vectorStores.files.retrieve({
    vector_store_id: "vs_123",
    file_id: "file_123"
});
console.log(file.status);
```

**REST API**:
```bash
curl https://api.openai.com/v1/vector_stores/{vector_store_id}/files/{file_id} \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Response Structure** ([Official OpenAI API Reference](https://openai-hd4n6.mintlify.app/api-reference/vector-stores/retrieves-a-vector-store-file)):
```json
{
  "id": "file-abc123",
  "object": "vector_store.file",
  "usage_bytes": 1024,
  "created_at": 1692345678,
  "vector_store_id": "vs_abc123",
  "status": "completed",
  "last_error": null,
  "chunking_strategy": {
    "type": "static",
    "static": {
      "max_chunk_size_tokens": 800,
      "chunk_overlap_tokens": 400
    }
  },
  "attributes": {}
}
```

### Secondary Method: List All Vector Store Files

To check all files in a vector store and their statuses:

**Python SDK**:
```python
result = client.vector_stores.files.list(
    vector_store_id="vs_123"
)
for file in result.data:
    print(f"File {file.id}: {file.status}")
```

**JavaScript SDK**:
```javascript
const result = await openai.vectorStores.files.list({
    vector_store_id: "vs_123"
});
for (const file of result.data) {
    console.log(`File ${file.id}: ${file.status}`);
}
```

---

## 2. File Status Values and Their Meanings

The `status` field of a `vector_store.file` object can be one of four values:

| Status | Meaning | Action Required |
|--------|---------|-----------------|
| `in_progress` | File is being chunked, embedded, and indexed | Wait and poll again. Do not use for searches yet. |
| `completed` | File has finished processing and is ready for use | Safe to use in file search queries and semantic searches. |
| `failed` | File processing encountered an error | Check `last_error` field for details. May need to delete and re-upload. |
| `cancelled` | File processing was cancelled (usually by user) | Delete the file if no longer needed. Re-upload to retry. |

**Key Point from Official Documentation** ([File Search Guide](https://platform.openai.com/docs/guides/tools-file-search)):
> "Run this code until the file is ready to be used (i.e., when the status is `completed`)."

---

## 3. Error Information: The `last_error` Field

When a file's status is `failed`, check the `last_error` field for diagnostic information:

```python
file = client.vector_stores.files.retrieve(
    vector_store_id="vs_123",
    file_id="file_123"
)

if file.status == "failed":
    print(f"Error Code: {file.last_error.code}")
    print(f"Error Message: {file.last_error.message}")
```

### Error Codes

The `last_error.code` field can contain:

| Error Code | Description |
|------------|-------------|
| `server_error` | Internal server error occurred during processing |
| `unsupported_file` | File type or format is not supported by the API |
| `invalid_file` | File is corrupted, malformed, or otherwise invalid |
| `rate_limit_exceeded` | API rate limits were exceeded during processing |

---

## 4. Understanding Vector Store vs. Individual File Status

### The Critical Distinction

Your observation about the mismatch is accurate. There are **two different status concepts**:

1. **Vector Store File Counts** (aggregate, on vector store object):
   ```
   {
     "file_counts": {
       "in_progress": 0,
       "completed": 1,
       "failed": 0,
       "cancelled": 0
     }
   }
   ```
   These are **summary statistics** showing how many files are in each state.

2. **Individual Vector Store File Status** (granular, on each file object):
   ```
   {
     "status": "completed"  // or in_progress, failed, cancelled
   }
   ```
   This is the **actual status of each specific file**.

### Why the Mismatch?

Your situation ("file shows as processing in database but vector store shows completed: 1, inProgress: 0") suggests:
- The **vector store aggregate counts** are updated (showing 1 completed)
- But your **database still shows the old status** because it hasn't been refreshed yet
- The solution: Poll the **individual file object** and update your database with that status

---

## 5. Best Practice: Proper Polling Strategy

### Using SDK Helper Functions (Recommended)

The OpenAI SDKs provide helper functions that handle polling automatically:

**Python - `create_and_poll`**:
```python
# When adding an existing file to a vector store
file = client.vector_stores.files.create_and_poll(
    vector_store_id="vs_123",
    file_id="file_123"
)
# Returns once status is no longer in_progress
print(f"File status: {file.status}")
```

**Python - `upload_and_poll`**:
```python
# When uploading a new file directly
file = client.vector_stores.files.upload_and_poll(
    vector_store_id="vs_123",
    file=open("document.pdf", "rb")
)
# Blocks until processing complete
print(f"File status: {file.status}")
```

**JavaScript**:
```javascript
const file = await openai.vectorStores.files.create_and_poll({
    vector_store_id: "vs_123",
    file_id: "file_123"
});
console.log(`File status: ${file.status}`);
```

### Manual Polling Implementation

If you need custom polling logic:

```python
import time

def poll_file_status(client, vector_store_id: str, file_id: str,
                    max_attempts: int = 120, poll_interval: float = 0.5):
    """Poll file status until completion or failure"""

    for attempt in range(max_attempts):
        file = client.vector_stores.files.retrieve(
            vector_store_id=vector_store_id,
            file_id=file_id
        )

        # Check if processing is complete
        if file.status in ["completed", "failed", "cancelled"]:
            return file

        # Still processing, wait before next attempt
        if file.status == "in_progress":
            print(f"File still processing... (attempt {attempt + 1}/{max_attempts})")
            time.sleep(poll_interval)

    raise TimeoutError(f"File {file_id} did not complete after {max_attempts} attempts")

# Usage
file = poll_file_status(client, "vs_123", "file_123")

# Update your database
if file.status == "completed":
    database.update_file_status(file_id, "completed")
elif file.status == "failed":
    database.update_file_status(file_id, "failed", error=file.last_error)
```

### Batch Operations

When uploading multiple files, use batch operations for efficiency:

**Python**:
```python
# Upload multiple files at once
file_batch = client.vector_stores.file_batches.upload_and_poll(
    vector_store_id="vs_123",
    files=[
        open("doc1.pdf", "rb"),
        open("doc2.pdf", "rb"),
        open("doc3.pdf", "rb")
    ]
)

# Check batch status
print(f"Batch status: {file_batch.status}")
print(f"File counts: {file_batch.file_counts}")

# Get individual files from the batch
files = client.vector_stores.file_batches.list_files(
    vector_store_id="vs_123",
    batch_id=file_batch.id
)
```

**JavaScript**:
```javascript
const fileBatch = await openai.vectorStores.fileBatches.upload_and_poll({
    vector_store_id: "vs_123",
    files: [file1, file2, file3]
});

console.log(`Batch status: ${fileBatch.status}`);
```

---

## 6. Processing Time Expectations

From the official documentation and community reports:

- **Typical processing time**: A few seconds to a few minutes for most documents
- **Large files or high load**: Can take longer
- **Official recommendation**: "Files are not immediately usable upon attachment; you must wait for OpenAI to complete a series of preparations such as file chunking and vectorization"

**Best Practice**: Always poll or use `*_and_poll` helpers before attempting to use a file in searches.

---

## 7. Recommended Implementation for Your Use Case

Based on your scenario (PDF uploaded via Files API, then added to vector store), here's the recommended approach:

```python
from openai import OpenAI
import time
from datetime import datetime

client = OpenAI()

def upload_file_to_vector_store(pdf_path: str, vector_store_id: str):
    """
    Upload a PDF file to a vector store with proper status tracking
    """

    # Step 1: Upload file to Files API
    print("Step 1: Uploading file to OpenAI Files API...")
    with open(pdf_path, "rb") as f:
        file_response = client.files.create(
            file=f,
            purpose="assistants"
        )
    file_id = file_response.id
    print(f"  File uploaded: {file_id}")

    # Step 2: Add file to vector store with polling
    print(f"Step 2: Adding file to vector store {vector_store_id}...")
    vector_store_file = client.vector_stores.files.create_and_poll(
        vector_store_id=vector_store_id,
        file_id=file_id
    )

    # Step 3: Check final status and handle errors
    print(f"Step 3: Checking file status...")
    if vector_store_file.status == "completed":
        print(f"  SUCCESS: File {file_id} is ready for use")
        # Update your database
        db.update_file_status(file_id, {
            "status": "completed",
            "vector_store_id": vector_store_id,
            "indexed_at": datetime.now(),
            "usage_bytes": vector_store_file.usage_bytes
        })
        return True

    elif vector_store_file.status == "failed":
        print(f"  FAILED: File processing failed")
        print(f"  Error: {vector_store_file.last_error.message}")
        # Update your database with error
        db.update_file_status(file_id, {
            "status": "failed",
            "error_code": vector_store_file.last_error.code,
            "error_message": vector_store_file.last_error.message
        })
        return False

    else:
        print(f"  WARNING: Unexpected status: {vector_store_file.status}")
        return False

# Usage
success = upload_file_to_vector_store("document.pdf", "vs_12345")
```

---

## 8. Handling Common Issues

### Issue: File Stuck in "in_progress"

**Cause**: Processing taking longer than expected or service issue

**Solution**:
1. Continue polling (don't give up immediately)
2. Check for service status: https://status.openai.com
3. If stuck for hours, try deleting and re-uploading
4. Use the `last_error` field once status changes to detect actual failures

### Issue: Vector Store Reports "completed" But Individual File Status is "in_progress"

**Cause**: Timing mismatch or cache inconsistency

**Solution**:
```python
# Always check individual file status, not aggregate counts
file = client.vector_stores.files.retrieve(vector_store_id, file_id)

# The individual file.status is the source of truth
if file.status != "completed":
    print("File not ready yet, continue polling")
```

### Issue: File Status is "failed"

**Diagnosis**:
```python
file = client.vector_stores.files.retrieve(vector_store_id, file_id)

if file.status == "failed":
    error = file.last_error

    if error.code == "unsupported_file":
        print("File format not supported")
        # Try converting to PDF, TXT, or other supported format

    elif error.code == "invalid_file":
        print("File is corrupted or malformed")
        # Re-upload the original file

    elif error.code == "server_error":
        print("OpenAI server error - try again later")
        # Retry after a delay

    elif error.code == "rate_limit_exceeded":
        print("Rate limit hit - wait and retry")
        # Implement exponential backoff
```

---

## 9. API Reference Links

- **Official File Search Guide**: https://platform.openai.com/docs/guides/tools-file-search
- **Retrieval Guide with Vector Stores**: https://platform.openai.com/docs/guides/retrieval?attributes-filter-example=date-range-and-region#vector-stores
- **Vector Store Files API Reference**: https://platform.openai.com/docs/api-reference/vector-stores-files
- **Retrieve Individual Vector Store File Endpoint**: https://openai-hd4n6.mintlify.app/api-reference/vector-stores/retrieves-a-vector-store-file
- **OpenAI Python SDK**: https://github.com/openai/openai-python
- **OpenAI JavaScript SDK**: https://github.com/openai/openai-node

---

## 10. Summary: Your Implementation Checklist

- [ ] **Check individual file status**: Use `client.vector_stores.files.retrieve(vector_store_id, file_id)` to get the actual `status` field
- [ ] **Use polling helpers**: Prefer `create_and_poll()` or `upload_and_poll()` over manual polling
- [ ] **Handle all four status values**: in_progress, completed, failed, cancelled
- [ ] **Inspect `last_error`** when status is "failed" to understand the issue
- [ ] **Update your database** with the retrieved status, not aggregate vector store counts
- [ ] **Don't use files in searches** until status is "completed"
- [ ] **Implement exponential backoff** if manually polling to avoid rate limits
- [ ] **Set reasonable timeout**: OpenAI recommends checking for completion before creating runs/searches

---

## Additional Resources

- **Azure OpenAI Documentation** (similar API): https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/file-search
- **Practical Guide to Vector Stores**: https://www.eesel.ai/blog/openai-vector-stores-api-reference
- **OpenAI Cookbook - File Search Example**: https://cookbook.openai.com/examples/file_search_responses

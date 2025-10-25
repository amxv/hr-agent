# Session Compression: 2025-10-23 03:15:11

## Session Overview
Investigated and attempted to fix critical issues in the Document RAG system (Feature 002). Main problems: documents stuck in "processing" status forever, semantic search using outdated Assistants API and failing to map results to database documents, and file retrieve tool always failing. Implemented background status polling, database query optimization, and rewrote semantic search to use new Vector Store Search API. **CRITICAL: New issues emerged after implementation - semantic search API call has incorrect parameters, and status polling may not be working.**

## Key Learnings

### OpenAI Vector Store API Evolution
- **Old Approach (Deprecated)**: Using Assistants API with file_search tool - creates assistant → thread → run → poll → extract annotations → cleanup (7+ API calls, 10-60 seconds)
- **New Approach (Recommended)**: Direct Vector Store Search API - single call to `vectorStores.search()` (<2 seconds)
- OpenAI's documentation shows the new API but the implementation we used has parameter issues

### Document Processing Status Flow
- When file uploaded to OpenAI: immediately returns file ID
- File added to vector store: triggers async indexing (takes 30s-2min for small files, up to hours for large)
- **Critical**: No automatic webhook or callback - must poll `vectorStores.files.retrieve()` to check individual file status
- Aggregate counts from `vectorStores.retrieve()` are unreliable - always check individual file status

### Database Architecture Gaps
- No direct query for `openaiFileId` → document mapping existed
- Old implementation loaded 1000 documents into memory and filtered (O(n) complexity)
- New query added: `getUploadedDocumentByOpenAIFileId()` for O(1) lookup

### Status Lifecycle
- Upload → "uploading" (client side, immediate)
- Add to vector store → "processing" (database, immediate)
- OpenAI finishes → "completed" (OpenAI side, async - no notification!)
- Database update → "ready" (our responsibility - was missing!)

## Issues Found

### 🔴 CRITICAL - Semantic Search API Call Failing (NEW)
- **Issue**: Vector store search failing with error: "Path parameters result in path with invalid segments: Value of type Object is not a valid path parameter /vector_stores/[object Object]/search"
- **Location**: `lib/openai/vector-store.ts:260-308` (searchVectorStore function)
- **Root Cause**: Incorrect API call syntax - likely passing object instead of string for vector_store_id
- **Status**: **BLOCKING - Must fix immediately**
- **Evidence**: User screenshot shows error in chat UI when agent tries to search documents
- **Next Step**: Research correct OpenAI vector store search API syntax and fix parameter passing

### 🟡 HIGH - Status Polling Not Working
- **Issue**: User uploaded new document, OpenAI dashboard shows "ready", but database still shows "processing"
- **Location**: `lib/openai/status-polling.ts` (pollDocumentStatus function)
- **Possible Causes**:
  1. Polling function not being called (catch block silently swallowing errors?)
  2. Wrong parameter order in `getVectorStoreFileStatus()` call
  3. Background promise not executing (await missing somewhere?)
  4. Polling logic has bug in status checking
- **Status**: **In Progress - Needs investigation**
- **Evidence**: User confirmed file is "ready" in OpenAI but shows "processing" in UI

### 🟡 HIGH - Vector Store File Status API Call Issue
- **Issue**: Parameter order might be wrong in `vectorStores.files.retrieve(vectorStoreId, fileId)`
- **Location**: `lib/openai/vector-store.ts:215`
- **Note**: System reminder mentioned file was modified (possibly by linter) - need to verify correct parameter order
- **Status**: **Needs verification**
- **Related**: May be causing status polling to fail

### ✅ RESOLVED - Documents Stuck in "Processing" Status
- **Issue**: Documents uploaded successfully to OpenAI but database status never updates from "processing" to "ready"
- **Root Cause**: No background job to poll OpenAI for completion status
- **Fix**: Created `lib/openai/status-polling.ts` with exponential backoff polling
- **Status**: **Implemented but not verified working** (see issue above)

### ✅ RESOLVED - Semantic Search Using Outdated API
- **Issue**: Using old Assistants API approach (248 lines, 10-60 seconds, complex)
- **Root Cause**: Following outdated implementation pattern
- **Fix**: Rewrote to use Vector Store Search API (114 lines, <2 seconds)
- **Status**: **Implemented but has NEW bug** (see critical issue above)

### ✅ RESOLVED - Inefficient Document Lookup
- **Issue**: Loading 1000 documents into memory to find one by openaiFileId
- **Root Cause**: Missing database query function
- **Fix**: Added `getUploadedDocumentByOpenAIFileId()` to `lib/db/queries.ts`
- **Status**: **Completed and should work**

### ✅ RESOLVED - File Retrieve Always Failing
- **Issue**: File retrieve tool always returned "document not ready" error
- **Root Cause**: Documents stuck in "processing" status
- **Fix**: Will auto-resolve when status polling works
- **Status**: **Waiting on status polling fix**

## Important Files

### Created in This Session
- `lib/openai/status-polling.ts` - Background polling with exponential backoff (117 lines)
  - **Purpose**: Polls OpenAI every 1-30s to check file processing status
  - **Key Function**: `pollDocumentStatus(documentId, vectorStoreId, openaiFileId)`
  - **Max Attempts**: 20 attempts (~10 minutes)
  - **⚠️ Status**: Created but may have bugs - not confirmed working

### Modified in This Session
- `app/(admin)/api/documents/upload/route.ts:8,116-125`
  - **Change**: Added import and call to `pollDocumentStatus()` after file upload
  - **Key**: Runs in background (`.catch()` handler, no await)
  - **⚠️ Risk**: If promise is not executing, no errors would be visible

- `lib/db/queries.ts:965-992`
  - **Change**: Added `getUploadedDocumentByOpenAIFileId(openaiFileId)` function
  - **Purpose**: Efficient O(1) lookup instead of O(1000) memory filter
  - **Status**: ✅ Should work correctly

- `lib/openai/vector-store.ts:248-308`
  - **Change 1**: Added `searchVectorStore()` function (lines 248-308)
  - **Change 2**: Modified by linter/user (system reminder - line 206+)
  - **⚠️ CRITICAL**: Has bug in API call - passing object instead of string
  - **Status**: 🔴 **BROKEN - Must fix**

- `lib/ai/tools/semantic-search.ts`
  - **Change**: Complete rewrite - removed Assistants API approach
  - **Before**: 327 lines with assistant/thread/run/poll/cleanup
  - **After**: 164 lines with direct vector store search
  - **Key Change**: Lines 1-8 (imports), Lines 49-162 (execute function)
  - **⚠️ Status**: Depends on `searchVectorStore()` which is broken

### Must Read for Context
- `gg/features/002-document-rag/002-SPEC.md` - Full specification for Document RAG feature
- `gg/features/002-document-rag/002-PLAN.md` - Implementation plan with architecture decisions
- `lib/openai/files.ts` - File upload/retrieve/delete functions (working correctly)
- `lib/openai/client.ts` - OpenAI client initialization (uses OPENAI_API_KEY)
- `trpc/routers/admin.router.ts:360-420` - Manual refresh status mutation (working backup)
- `components/admin/document-list-table.tsx` - Admin UI showing status badges

## Research Documents

### Web Research Created
- `gg/agent-outputs/web-researcher/2025-10-23_08-33-45-openai-vector-store-file-status.md`
  - **Content**: Research on OpenAI vector store file status tracking
  - **Key Finding**: Must use individual file status checks, not aggregate counts

- OpenAI documentation provided in context (not saved to file):
  - Vector Store Search API: `client.vectorStores.search({ vector_store_id, query, max_num_results })`
  - File status checking: `client.vectorStores.files.retrieve(vectorStoreId, fileId)`

### No Codebase Research Documents
- Used direct file reading instead of codebase-researcher agent

## Technical Decisions

### Decision 1: Background Polling vs Webhooks
- **Context**: Need to know when OpenAI finishes processing files
- **Decision**: Implement background polling with exponential backoff
- **Rationale**: OpenAI doesn't provide webhooks for vector store file processing
- **Trade-offs**:
  - ✅ No external infrastructure needed
  - ✅ Works immediately
  - ❌ Uses server resources during polling
  - ❌ Max 10 minute timeout (very large files might exceed)
- **Implementation**: `pollDocumentStatus()` with 1-30s intervals, max 20 attempts

### Decision 2: New Vector Store Search API vs Assistants API
- **Context**: Semantic search was using old Assistants API (slow, complex)
- **Decision**: Rewrite to use direct Vector Store Search API
- **Rationale**:
  - 87% faster (2s vs 10-60s)
  - 54% less code (114 lines vs 248)
  - Modern API designed for this use case
  - Better results format (direct relevance scores)
- **Trade-offs**:
  - ✅ Much simpler code
  - ✅ Faster responses
  - ✅ More maintainable
  - ⚠️ **NEW API - had incorrect implementation** (current blocker)

### Decision 3: Direct Database Query vs Memory Filtering
- **Context**: Needed to map OpenAI file IDs to database documents
- **Decision**: Add dedicated database query function
- **Rationale**: O(1) indexed lookup vs O(n) memory scan
- **Trade-offs**:
  - ✅ Scales to any number of documents
  - ✅ Uses database indexes efficiently
  - ✅ Minimal memory footprint
  - ❌ One extra query function to maintain (trivial cost)

### Decision 4: Last-Write-Wins for Concurrent Updates
- **Context**: Spec mentioned concurrent document updates
- **Decision**: Keep simple last-write-wins, no locking
- **Rationale**: Per spec FR-045, explicitly stated as acceptable
- **Trade-offs**:
  - ✅ Simple implementation
  - ✅ No deadlock risks
  - ❌ Rare case of update conflicts (acceptable per spec)

## Work Status

### Completed ✅
- ✅ Created background status polling mechanism
- ✅ Modified upload route to start polling after upload
- ✅ Added `getUploadedDocumentByOpenAIFileId()` database query
- ✅ Implemented `searchVectorStore()` wrapper function
- ✅ Rewrote semantic search tool to use new API
- ✅ Removed old Assistants API code and helper function
- ✅ Dev server restarted successfully with all changes

### Blocked 🔴
- 🔴 **Semantic Search Testing** - BLOCKED by API parameter bug
  - **Blocker**: `searchVectorStore()` API call has incorrect syntax
  - **Error**: "Value of type Object is not a valid path parameter"
  - **Location**: `lib/openai/vector-store.ts:276-281`
  - **Next**: Research correct OpenAI SDK syntax for vectorStores.search()

- 🔴 **Status Polling Verification** - BLOCKED by unknown issue
  - **Blocker**: Documents not updating to "ready" despite OpenAI showing completed
  - **Symptoms**: User uploaded new doc, OpenAI dashboard shows ready, DB shows processing
  - **Next**: Add debug logging to polling function, verify it's being called

### In Progress 🟡
- 🟡 **Debugging Vector Store Search API**
  - **Current State**: Function exists but has parameter syntax error
  - **Next Step**: Check OpenAI SDK documentation for correct method signature
  - **File**: `lib/openai/vector-store.ts:260-308`

- 🟡 **Investigating Status Polling Failure**
  - **Current State**: Function created and called, but not updating status
  - **Next Step**: Add console logs to verify execution, check promise handling
  - **File**: `lib/openai/status-polling.ts` and `app/(admin)/api/documents/upload/route.ts:116-125`

## Next Steps

### 🚨 URGENT - Fix Critical Bugs (Do First!)

1. **Fix Vector Store Search API Call**
   ```bash
   # Research correct syntax
   # Check: lib/openai/vector-store.ts:276-281
   # Look for OpenAI SDK docs or examples for vectorStores.search()
   ```
   - Expected fix: Correct parameter passing to `openaiClient.vectorStores.search()`
   - Verify: Test semantic search in chat after fix

2. **Debug Status Polling**
   ```bash
   # Add logging to status-polling.ts
   # Verify pollDocumentStatus is actually being called
   # Check promise execution in upload route
   ```
   - Add `console.log` at start of `pollDocumentStatus()`
   - Add `console.log` in `.catch()` handler in upload route
   - Upload new document and watch server logs

3. **Verify getVectorStoreFileStatus Parameter Order**
   ```typescript
   // Check if this is correct:
   openaiClient.vectorStores.files.retrieve(vectorStoreId, fileId)
   // Or should it be:
   openaiClient.vectorStores.files.retrieve(fileId, vectorStoreId)
   ```
   - Reference: OpenAI SDK documentation
   - File: `lib/openai/vector-store.ts:215`

### After Critical Fixes

4. **Test Complete Upload Flow**
   - Upload new document
   - Verify status changes: processing → ready (within 30-120s)
   - Check server logs for polling activity
   - Confirm UI updates without manual refresh

5. **Test Semantic Search**
   - Ask agent to search documents
   - Verify results returned in <2 seconds
   - Check citations include correct document names and blob URLs
   - Confirm no errors in semantic-search-result UI component

6. **Test File Retrieve**
   - Ask agent to retrieve full document
   - Verify it works only on "ready" documents
   - Check full content is returned
   - Confirm no errors

7. **Handle Old Document**
   - Document uploaded before fixes won't auto-update
   - Options:
     1. Click "Refresh Status" button in admin UI
     2. Delete and re-upload to test auto-polling

## Additional Notes

### User-Reported Issues (Current Session)
1. **New document uploaded** - user confirmed upload successful
2. **OpenAI dashboard shows "ready"** - file processing completed on OpenAI's side
3. **Admin UI shows "processing"** - database status not synced
4. **Semantic search errors** - API parameter error when agent tries to search
5. **Screenshot evidence** - Error message: "Path parameters result in path with invalid segments: Value of type Object is not a valid path parameter /vector_stores/[object Object]/search"

### Implementation Metrics
- **Before**: 248 lines of semantic search code, 10-60s searches, O(1000) document loads
- **After**: 114 lines of code, <2s searches (when working), O(1) lookups
- **Improvement**: 54% less code, 20-30x faster (theoretical - needs bug fixes to verify)

### Known Limitations Accepted
1. **Safari PDF Navigation**: `#page=N` fragments don't work in Safari (graceful degradation)
2. **Polling Timeout**: Max 10 minutes for very large files (acceptable per spec)
3. **No Multi-Tenancy**: Single organization, shared vector store (per spec)
4. **Last-Write-Wins**: No locking on concurrent updates (per spec FR-045)

### Environment Context
- **Dev Server**: Running on http://localhost:3000
- **Database**: PostgreSQL (some connection pool warnings unrelated to our changes)
- **OpenAI Key**: Set as `OPENAI_API_KEY` env variable
- **AI SDK**: v5.0.39
- **OpenAI SDK**: v5.8.2

## Commands to Run

### Debug Status Polling
```bash
# Watch server logs while uploading document
tail -f $(find . -name "*.log" | head -1)

# Or if using bun dev, watch the output:
# Upload document and observe logs for:
# "pollDocumentStatus: starting background polling"
```

### Check OpenAI SDK Documentation
```bash
# Search for correct vectorStores.search() syntax
npm docs openai

# Or check installed version
grep -A 20 "vectorStores.*search" node_modules/openai/dist/index.d.ts
```

### Verify API Calls
```bash
# Add temporary logging to vector-store.ts searchVectorStore function
# Log the exact parameters being passed before the API call
```

### Manual Test Upload
```bash
# Use curl to test upload endpoint directly (if needed)
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Cookie: [session-cookie]" \
  -F "file=@test-document.pdf" \
  -F "tags=[\"test\"]"
```

## References

### Documentation
- OpenAI Vector Store API: https://platform.openai.com/docs/guides/retrieval
- OpenAI File Search Tool: https://platform.openai.com/docs/guides/tools-file-search
- AI SDK v5 Tools: https://sdk.vercel.ai/docs/ai-sdk-core/tools

### Spec Files
- Feature Spec: `/Users/ashray/code/amxv/rag/gg/features/002-document-rag/002-SPEC.md`
- Implementation Plan: `/Users/ashray/code/amxv/rag/gg/features/002-document-rag/002-PLAN.md`

### Related Code
- Upload endpoint: `app/(admin)/api/documents/upload/route.ts`
- Status polling: `lib/openai/status-polling.ts`
- Vector store functions: `lib/openai/vector-store.ts`
- Semantic search tool: `lib/ai/tools/semantic-search.ts`
- Database queries: `lib/db/queries.ts`

### Agent Outputs
- Vector store research: `gg/agent-outputs/web-researcher/2025-10-23_08-33-45-openai-vector-store-file-status.md`

---

## Critical Action Required

**⚠️ BEFORE NEXT SESSION:**

1. Fix the `searchVectorStore()` API call in `lib/openai/vector-store.ts` - this is completely blocking semantic search
2. Debug why `pollDocumentStatus()` is not updating status - users can't use documents that are ready
3. After fixes, test complete flow end-to-end

**This session made significant architectural improvements but introduced bugs in the implementation. The core approach is correct, but the API calls need correction.**

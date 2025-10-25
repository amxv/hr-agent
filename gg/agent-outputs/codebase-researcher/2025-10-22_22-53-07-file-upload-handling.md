# File Upload Handling Analysis

## Overview

The AgentDune application has a comprehensive file upload system that allows users to attach images (JPEG/PNG) and PDF documents to chat messages. Files are stored in Vercel Blob storage with public access, compressed on the client-side before upload, and transmitted as binary data to AI models for processing.

## Architecture

### Entry Points

1. **File Upload API Endpoint**: `app/(chat)/api/files/upload/route.ts:23-75`
   - Handles POST requests to `/api/files/upload`
   - Validates file size and type
   - Manages FormData parsing
   - Returns uploaded file metadata

2. **Multimodal Input Component**: `components/multimodal-input.tsx:64-625`
   - Main UI for file attachment with drag-and-drop support
   - Handles file selection, drag-drop, and clipboard paste
   - Manages upload queue state
   - Displays attachment preview and upload progress

## Core Implementation

### 1. Backend File Validation & Upload (`app/(chat)/api/files/upload/route.ts:8-75`)

#### Request Flow
- **Authentication** (line 24-28): Validates user session using `auth.api.getSession()`
- **Request Validation** (line 30-50): Uses Zod schema to validate file
- **File Schema** (line 8-21):
  ```typescript
  - File type: Blob instance
  - Max size: 5MB (5 * 1024 * 1024 bytes)
  - Allowed types: image/jpeg, image/png, application/pdf
  - Custom error messages for validation failures
  ```
- **File Processing** (line 54-64):
  - Converts Blob to ArrayBuffer
  - Extracts filename from FormData (line 53)
  - Calls `uploadFile(filename, fileBuffer)` from `lib/blob.ts`
  - Cleans filename from response using `extractFilenameFromUrl()`

#### Response Structure
```typescript
{
  url: string;           // Full Vercel Blob URL
  pathname: string;      // Cleaned filename
  contentType: string;   // MIME type (e.g., "image/jpeg")
}
```

#### Error Handling
- **No session**: Returns 401 Unauthorized (line 27)
- **Empty request body**: Returns 400 Bad Request (line 31)
- **No file uploaded**: Returns 400 Bad Request (line 39)
- **Validation failure**: Returns 400 with error details (line 44-49)
- **Upload failure**: Returns 500 Internal Server Error (line 67)
- **Request processing error**: Returns 500 with generic message (line 70-72)

### 2. Client-Side File Preparation (`lib/files/upload-prep.ts:1-107`)

Uses `browser-image-compression` library (v2.0.2) for client-side optimization.

#### Image Compression Function (`compressImageIfNeeded` lines 5-66)
- **Triggers**: Only processes images exceeding `maxBytes` limit
- **Supported formats**: JPEG and PNG only
- **Compression Options** (lines 31-37):
  ```typescript
  {
    maxSizeMB: converted from maxBytes parameter
    maxWidthOrHeight: 2048 pixels (from IMAGE_UPLOAD_LIMITS)
    useWebWorker: true
    fileType: maintains original MIME type
    initialQuality: 0.5-0.9 range based on minQuality param
  }
  ```
- **Quality handling** (line 36): Ensures quality between minQuality and 0.9
- **Return logic** (line 48-49): Returns compressed if smaller, otherwise original
- **Fallback** (line 63-64): Returns original file if compression fails

#### File Batch Processing (`processFilesForUpload` lines 68-106)
Returns four categories of files:
1. **processedImages**: Images after compression check (line 93)
2. **pdfFiles**: PDF files under size limit (line 99)
3. **stillOversized**: Files exceeding 5MB after compression (line 90)
4. **unsupportedFiles**: Non-image, non-PDF files (line 101)

### 3. Blob Storage Integration (`lib/blob.ts:1-85`)

Uses **Vercel Blob** service with consistent prefixing.

#### Configuration
- **File prefix**: `BLOB_FILE_PREFIX = "agentdune/files/"` (from `lib/constants.ts:10`)
- **Storage access**: Public access enabled (`access: "public"` in line 19)
- **Random suffix**: `addRandomSuffix: true` prevents collision (line 20)

#### Key Functions

**uploadFile()** (lines 13-27)
```typescript
- Input: filename (string), buffer (ArrayBuffer)
- Output: PutBlobResult { url, pathname, etc }
- Prefix: Adds "agentdune/files/" prefix to filename
- Error: Throws with detailed message
```

**listFiles()** (lines 32-42)
- Lists all files with correct prefix
- Returns ListBlobResult

**deleteFilesByUrls()** (lines 47-55)
- Batch delete by URLs
- Used for cleanup operations

**extractFilenameFromUrl()** (lines 60-77)
- Extracts clean filename from blob URL
- Removes prefix and query parameters
- Returns null on parsing errors

**isBlobUrl()** (lines 82-84)
- Checks if URL belongs to blob storage with correct prefix

### 4. UI Components

#### MultimodalInput Component (`components/multimodal-input.tsx`)

**File Upload Limits** (lines 56-62)
```typescript
IMAGE_UPLOAD_LIMITS = {
  maxBytes: 1024 * 1024,     // 1MB
  maxDimension: 2048,         // pixels
}
```

**File Input Setup** (lines 510-518)
- Hidden file input with multiple file support
- Accepts: `image/*, .pdf`
- Triggers on click via AttachmentsButton

**File Upload Flow** (lines 302-335)
```typescript
uploadFile(file: File) {
  1. Create FormData with file
  2. POST to /api/files/upload
  3. Handle 200 OK response
  4. Extract { url, pathname, contentType }
  5. Return attachment object or undefined on error
  6. Show toast error if upload fails
}
```

**Drag & Drop Support** (lines 453-495)
- Uses `react-dropzone` (v14.3.8)
- Accept: image/*, .pdf
- Only active when status="ready"
- Prevents click (noClick: true)
- Visual feedback with blue border on drag (line 523)

**Paste Support** (lines 368-421)
- Intercepts clipboard paste events
- Requires authentication (line 387-390)
- Shows success toast with file count (line 411-412)

**Submission Logic** (lines 249-276)
- Attachments converted to file parts in message structure:
```typescript
{
  type: "file",
  url: attachment.url,
  name: attachment.name,
  mediaType: attachment.contentType
}
```

#### AttachmentList Component (`components/attachment-list.tsx:16-55`)
- Maps attachments to PreviewAttachment components
- Shows uploading state for files in queue
- Handles attachment removal callbacks

#### PreviewAttachment Component (`components/preview-attachment.tsx:7-104`)

**Image Display** (lines 39-47)
- Next.js Image component with object-cover
- Clickable to open modal
- 80px sized preview

**PDF Display** (lines 49-82)
- FileText icon (red)
- Hover overlay with action buttons:
  - Open in new tab
  - Download with original filename
- Available only in message view (not during upload)

**Upload State** (lines 90-97)
- LoaderIcon spinner animation
- Prevents removal during upload

**Removal Button** (lines 27-35)
- Cross icon in top-right corner
- Only shown when not uploading and onRemove provided

#### ContextBar Component (`components/context-bar.tsx:28-87`)
- Animated container for attachments and token usage
- Shows all attachments in context preview
- Displays token consumption breakdown

### 5. Attachment Type Definition (`lib/ai/types.ts:123-127`)

```typescript
type Attachment = {
  name: string;           // filename
  url: string;            // Vercel Blob public URL
  contentType: string;    // MIME type
}
```

### 6. Message Processing

#### Extracting Attachments (`lib/utils.ts:186-194`)
```typescript
getAttachmentsFromMessage(message: ChatMessage): Attachment[]
- Filters message.parts for type='file'
- Maps FileUIPart to Attachment
- Maps FileUIPart.filename to name
- Maps FileUIPart.url to url
- Maps FileUIPart.mediaType to contentType
```

#### Binary Data Conversion (`lib/utils/download-assets.ts:92-150`)

**replaceFilePartUrlByBinaryDataInMessages()** (lines 92-150)
- Downloads files from public URLs to binary data
- Called in chat route before sending to AI model
- Flow:
  1. Collects all HTTP(S) URLs from file/image parts (lines 51-86)
  2. Downloads each file via fetch (line 184)
  3. Replaces URL with Uint8Array in message parts (lines 109-118)
  4. Returns modified ModelMessage[] with binary data

**Key Details**
- Uses defaultDownload implementation (lines 20-30)
- Extracts content-type from response headers (line 27)
- Creates Uint8Array from ArrayBuffer (line 29)
- Handles both FilePart and ImagePart types

### 7. File Cloning (`lib/clone-messages.ts:166-249`)

When sharing or copying conversations:

**cloneFileUIPart()** (lines 166-217)
- Validates URL exists and is blob URL (lines 169-181)
- Fetches original file to Blob (line 184)
- Re-uploads to new blob storage URL (line 204-205)
- Returns new FileUIPart with updated URL
- Error handling: Returns original on failure (line 216)

**cloneAttachmentsInMessages()** (lines 220-249)
- Iterates through all message parts
- Clones file parts only
- Passes through non-file parts unchanged
- Used when cloning entire conversations

## Data Flow

```
User selects file
    ↓
handleFileChange() / drag-drop / paste
    ↓
processFiles() - Validates & compresses
    ↓
uploadFile() - FormData POST to /api/files/upload
    ↓
Backend validation - Zod schema check
    ↓
uploadFile(lib/blob.ts) - Vercel Blob storage
    ↓
Return { url, pathname, contentType }
    ↓
Add to attachments state
    ↓
Show in PreviewAttachment component
    ↓
User submits message
    ↓
Message created with file parts
    ↓
replaceFilePartUrlByBinaryDataInMessages() - Download & embed
    ↓
Send to AI model with binary data
```

## Key Patterns

### 1. Validation Pattern
- **Client-side**: `processFilesForUpload()` for format & size
- **Server-side**: Zod schema in upload endpoint for security
- **Two-layer**: Ensures both UX and security

### 2. Error Handling
- **Toast notifications**: User feedback via sonner (imported in line 15)
- **Graceful degradation**: Continues with valid files if some fail
- **Fallback mechanism**: Returns original file on compression failure

### 3. State Management
- **Chat input provider** (`providers/chat-input-provider.tsx`): Manages attachments state
- **Upload queue** (line 124): Tracks uploading files
- **Submission gating** (lines 135-174): Prevents submission during upload

### 4. Accessibility
- File input has `tabIndex={-1}` (hidden from tab order)
- Attachment button shows login prompt for anonymous users
- Alt text provided for images in modal

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @vercel/blob | ^0.24.1 | Cloud file storage |
| browser-image-compression | ^2.0.2 | Client-side image optimization |
| react-dropzone | ^14.3.8 | Drag-and-drop file upload |
| sonner | ^2.0.7 | Toast notifications |
| ai | ^5.0.39 | FileUIPart type, message handling |
| zod | ^4.1.4 | Request validation |

## Limitations & Constraints

1. **File Size**: 5MB maximum (enforced at both client & server)
2. **File Types**: Only JPEG, PNG (images) and PDF
3. **Authentication**: Required for all uploads (anonymous users get popover prompt)
4. **Compression**: Only applies to JPEG/PNG, not PDF
5. **Image Dimensions**: Max 2048px width/height
6. **Quality Settings**: 0.5-0.9 range for compression
7. **Storage**: Public URL access required for AI model processing

## Configuration Points

| Setting | Value | Location |
|---------|-------|----------|
| Max file size | 5MB | `app/(chat)/api/files/upload/route.ts:11` |
| Allowed types | JPEG, PNG, PDF | `app/(chat)/api/files/upload/route.ts:16-19` |
| Image max bytes | 1MB | `components/multimodal-input.tsx:56-57` |
| Image max dimension | 2048px | `components/multimodal-input.tsx:58` |
| Blob prefix | agentdune/files/ | `lib/constants.ts:10` |
| Blob access | public | `lib/blob.ts:19` |
| Random suffix | true | `lib/blob.ts:20` |

## Security Considerations

1. **Authentication**: All uploads require valid user session (line 24-28)
2. **Type validation**: Strict MIME type checking with Zod (line 16-19)
3. **Size limits**: Both client and server-side validation
4. **File handling**: Content converted to binary before sending to model
5. **Error messages**: Generic server errors, detailed client validation errors

## Testing Observations

- File inputs have `data-testid="multimodal-input"` (line 573)
- Attachment button has `data-testid="attachments-button"` (line 655)
- Attachment preview has `data-testid="input-attachment-preview"` (line 25)
- Preview attachments have `data-testid="input-attachment-loader"` (line 93)
- Tests likely verify upload flow, compression, and attachment display

## Summary

The file upload system is well-architected with:
- Clear separation of concerns (client prep, API validation, storage)
- Robust error handling with user feedback
- Client-side optimization reducing bandwidth
- Secure server-side validation
- Seamless AI model integration via binary data conversion
- Comprehensive attachment management (preview, removal, cloning)

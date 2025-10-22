import { createModuleLogger } from "@/lib/logger";
import { openaiClient } from "./client";
import { withRetry } from "./retry";

const log = createModuleLogger("openai.files");

/**
 * Uploads a file to OpenAI's Files API for use with assistants and vector stores.
 *
 * Note: File upload is synchronous, but indexing happens asynchronously.
 * After upload, the file must be added to a vector store for semantic search.
 *
 * @param filename - Original filename
 * @param fileBuffer - File contents as Buffer
 * @returns OpenAI file ID
 */
export async function uploadFileToOpenAI(
  filename: string,
  fileBuffer: Buffer
): Promise<string> {
  try {
    // Convert buffer to Blob for OpenAI API
    const blob = new Blob([fileBuffer]);

    const file = await withRetry(() =>
      openaiClient.files.create({
        file: blob,
        purpose: "assistants",
      })
    );

    log.info(
      {
        filename,
        fileId: file.id,
        bytes: file.bytes,
      },
      "uploadFileToOpenAI: file uploaded successfully"
    );

    return file.id;
  } catch (error) {
    const err = error as { status?: number; message?: string };

    // Handle validation errors (400)
    if (err.status === 400) {
      log.error(
        {
          filename,
          error: err.message,
        },
        "uploadFileToOpenAI: invalid file format or size"
      );
      throw new Error(
        `Invalid file: ${err.message || "Unsupported format or exceeds size limit"}`
      );
    }

    log.error(
      {
        filename,
        error: {
          name: (error as Error).name,
          message: (error as Error).message,
        },
      },
      "uploadFileToOpenAI: upload failed"
    );
    throw error;
  }
}

/**
 * Retrieves the full content of a file from OpenAI.
 *
 * Warning: This may return very large content that could exceed context limits.
 * Use this carefully and consider the size of the file before retrieving.
 *
 * @param fileId - OpenAI file ID
 * @returns File content as string
 */
export async function retrieveFileContent(fileId: string): Promise<string> {
  try {
    const response = await withRetry(() => openaiClient.files.content(fileId));

    // Read response as text
    const content = await response.text();

    log.info(
      {
        fileId,
        contentLength: content.length,
      },
      "retrieveFileContent: content retrieved"
    );

    return content;
  } catch (error) {
    log.error(
      {
        fileId,
        error: {
          name: (error as Error).name,
          message: (error as Error).message,
        },
      },
      "retrieveFileContent: retrieval failed"
    );
    throw error;
  }
}

/**
 * Permanently deletes a file from OpenAI's file storage.
 *
 * Warning: This is permanent and will remove the file from all vector stores.
 * Ensure the file has been removed from vector stores first using removeFileFromVectorStore.
 *
 * @param fileId - OpenAI file ID to delete
 */
export async function deleteFileFromOpenAI(fileId: string): Promise<void> {
  try {
    await openaiClient.files.delete(fileId);

    log.info({ fileId }, "deleteFileFromOpenAI: file deleted successfully");
  } catch (error) {
    const err = error as { status?: number; message?: string };

    // Ignore 404 errors - file already deleted
    if (err.status === 404) {
      log.debug({ fileId }, "deleteFileFromOpenAI: file already deleted (404)");
      return;
    }

    log.error(
      {
        fileId,
        error: {
          name: (error as Error).name,
          message: (error as Error).message,
        },
      },
      "deleteFileFromOpenAI: deletion failed"
    );
    throw error;
  }
}

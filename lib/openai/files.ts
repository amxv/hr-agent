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
    // Convert buffer to File for OpenAI API (File object required, not just Blob)
    const file = new File([fileBuffer], filename, {
      type: "application/octet-stream",
    });

    const uploadedFile = await withRetry(() =>
      openaiClient.files.create({
        file,
        purpose: "assistants",
      })
    );

    log.info(
      {
        filename,
        fileId: uploadedFile.id,
        bytes: uploadedFile.bytes,
      },
      "uploadFileToOpenAI: file uploaded successfully"
    );

    return uploadedFile.id;
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
 * Retrieves the full content of a file from OpenAI Vector Store.
 *
 * Note: Files uploaded with purpose "assistants" must be retrieved via the
 * Vector Store API, not the standard Files API.
 *
 * The API returns parsed content in a structured format with text chunks.
 *
 * Warning: This may return very large content that could exceed context limits.
 * Use this carefully and consider the size of the file before retrieving.
 *
 * @param vectorStoreId - Vector store ID where the file is stored
 * @param fileId - OpenAI file ID
 * @returns File content as string (concatenated from all text chunks)
 */
export async function retrieveFileContent(
  vectorStoreId: string,
  fileId: string
): Promise<string> {
  try {
    // Use direct HTTP request since SDK doesn't have proper typing yet
    const url = `https://api.openai.com/v1/vector_stores/${vectorStoreId}/files/${fileId}/content`;

    const response = await withRetry(async () => {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${openaiClient.apiKey}`,
        },
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`${res.status} ${error}`);
      }

      return res;
    });

    // Parse JSON response
    const data = await response.json();

    // Extract text content from all chunks
    let content = "";
    if (data.content && Array.isArray(data.content)) {
      content = data.content
        .filter((chunk: { type: string; text?: string }) => chunk.type === "text")
        .map((chunk: { text: string }) => chunk.text)
        .join("\n");
    }

    log.info(
      {
        vectorStoreId,
        fileId,
        contentLength: content.length,
        chunkCount: data.content?.length || 0,
      },
      "retrieveFileContent: content retrieved"
    );

    return content;
  } catch (error) {
    log.error(
      {
        vectorStoreId,
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

import { getVectorStoreId, setVectorStoreId } from "@/lib/db/queries";
import { createModuleLogger } from "@/lib/logger";
import { openaiClient } from "./client";
import { withRetry } from "./retry";

const log = createModuleLogger("openai.vector-store");

/**
 * Retrieves the existing vector store ID from database, or creates a new vector store
 * if one doesn't exist yet.
 *
 * This maintains a single shared vector store for all documents in the organization.
 *
 * @returns The vector store ID
 */
export async function getOrCreateVectorStore(): Promise<string> {
  try {
    // Try to get existing vector store ID from database
    const existingVectorStoreId = await getVectorStoreId();

    if (existingVectorStoreId) {
      log.debug(
        { vectorStoreId: existingVectorStoreId },
        "getOrCreateVectorStore: using existing vector store"
      );
      return existingVectorStoreId;
    }

    // No vector store exists yet - create a new one
    log.info("getOrCreateVectorStore: creating new vector store");

    const vectorStore = await withRetry(() =>
      openaiClient.vectorStores.create({
        name: "Organization Documents",
      })
    );

    // Save vector store ID to database
    await setVectorStoreId(vectorStore.id);

    log.info(
      { vectorStoreId: vectorStore.id },
      "getOrCreateVectorStore: created new vector store"
    );

    return vectorStore.id;
  } catch (error) {
    log.error(
      {
        error: {
          name: (error as Error).name,
          message: (error as Error).message,
        },
      },
      "getOrCreateVectorStore: failed"
    );
    throw error;
  }
}

/**
 * Adds a file to the vector store and initiates indexing.
 *
 * Note: This operation is non-blocking. The file will be indexed asynchronously
 * by OpenAI. Use pollVectorStoreStatus to check indexing progress.
 *
 * @param vectorStoreId - The vector store ID
 * @param fileId - The OpenAI file ID to add
 */
export async function addFileToVectorStore(
  vectorStoreId: string,
  fileId: string
): Promise<void> {
  try {
    await withRetry(() =>
      openaiClient.vectorStores.files.create(vectorStoreId, {
        file_id: fileId,
      })
    );

    log.info(
      { vectorStoreId, fileId },
      "addFileToVectorStore: file added to vector store"
    );
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
      "addFileToVectorStore: failed"
    );
    throw error;
  }
}

/**
 * Removes a file from the vector store.
 *
 * Note: This only removes the file from the vector store, not from OpenAI's file storage.
 * To fully delete the file, use deleteFileFromOpenAI after this.
 *
 * @param vectorStoreId - The vector store ID
 * @param fileId - The OpenAI file ID to remove
 */
export async function removeFileFromVectorStore(
  vectorStoreId: string,
  fileId: string
): Promise<void> {
  try {
    await openaiClient.vectorStores.files.delete(fileId, {
      vector_store_id: vectorStoreId,
    });

    log.info(
      { vectorStoreId, fileId },
      "removeFileFromVectorStore: file removed from vector store"
    );
  } catch (error) {
    const err = error as { status?: number; message?: string };

    // Ignore 404 errors - file already removed
    if (err.status === 404) {
      log.debug(
        { vectorStoreId, fileId },
        "removeFileFromVectorStore: file already removed (404)"
      );
      return;
    }

    log.error(
      {
        vectorStoreId,
        fileId,
        error: {
          name: (error as Error).name,
          message: (error as Error).message,
        },
      },
      "removeFileFromVectorStore: failed"
    );
    throw error;
  }
}

/**
 * Polls the vector store to get current file processing counts.
 *
 * This can be used to check how many files are still being processed,
 * how many have completed, and how many have failed.
 *
 * @param vectorStoreId - The vector store ID
 * @returns Object with file processing counts
 */
export async function pollVectorStoreStatus(vectorStoreId: string): Promise<{
  inProgress: number;
  completed: number;
  failed: number;
}> {
  try {
    const vectorStore = await withRetry(() =>
      openaiClient.vectorStores.retrieve(vectorStoreId)
    );

    const counts = {
      inProgress: vectorStore.file_counts.in_progress,
      completed: vectorStore.file_counts.completed,
      failed: vectorStore.file_counts.failed,
    };

    log.debug(
      { vectorStoreId, counts },
      "pollVectorStoreStatus: retrieved status"
    );

    return counts;
  } catch (error) {
    log.error(
      {
        vectorStoreId,
        error: {
          name: (error as Error).name,
          message: (error as Error).message,
        },
      },
      "pollVectorStoreStatus: failed"
    );
    throw error;
  }
}

/**
 * Gets the current processing status of an individual file in a vector store.
 *
 * This is the CORRECT way to check if a specific file has finished processing.
 * Do not rely on vector store aggregate counts - always check individual file status.
 *
 * @param vectorStoreId - The vector store ID
 * @param fileId - The OpenAI file ID
 * @returns Object with file status and optional error information
 */
export async function getVectorStoreFileStatus(
  vectorStoreId: string,
  fileId: string
): Promise<{
  status: "in_progress" | "completed" | "failed" | "cancelled";
  lastError: { code: string; message: string } | null;
}> {
  try {
    const file = await withRetry(() =>
      openaiClient.vectorStores.files.retrieve(fileId, {
        vector_store_id: vectorStoreId,
      })
    );

    log.debug(
      { vectorStoreId, fileId, status: file.status },
      "getVectorStoreFileStatus: retrieved file status"
    );

    return {
      status: file.status,
      lastError: file.last_error
        ? {
            code: file.last_error.code,
            message: file.last_error.message,
          }
        : null,
    };
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
      "getVectorStoreFileStatus: failed"
    );
    throw error;
  }
}

/**
 * Performs semantic search across a vector store using natural language query.
 * Returns ranked results with relevance scores.
 *
 * This uses the new Vector Store Search API which is much simpler and faster
 * than the old Assistants API approach.
 *
 * @param vectorStoreId - The vector store ID
 * @param query - Natural language search query
 * @param maxNumResults - Maximum number of results to return (default: 10)
 * @returns Search results with content, scores, and file references
 */
export async function searchVectorStore(
  vectorStoreId: string,
  query: string,
  maxNumResults = 10
): Promise<{
  data: Array<{
    file_id: string;
    filename: string;
    score: number;
    content: Array<{
      type: string;
      text: string;
    }>;
  }>;
}> {
  try {
    const results = await withRetry(() =>
      openaiClient.vectorStores.search(vectorStoreId, {
        query,
        max_num_results: maxNumResults,
      })
    );

    log.debug(
      {
        vectorStoreId,
        query,
        resultCount: results.data.length,
      },
      "searchVectorStore: search completed"
    );

    return results;
  } catch (error) {
    log.error(
      {
        vectorStoreId,
        query,
        error: {
          name: (error as Error).name,
          message: (error as Error).message,
        },
      },
      "searchVectorStore: search failed"
    );
    throw error;
  }
}

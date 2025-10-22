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

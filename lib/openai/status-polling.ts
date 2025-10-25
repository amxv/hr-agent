import {
  DOCUMENT_PROCESSING_TIMEOUT_MESSAGE,
  updateDocumentStatus,
} from "@/lib/db/queries";
import { createModuleLogger } from "@/lib/logger";
import { getVectorStoreFileStatus } from "./vector-store";

const log = createModuleLogger("openai.status-polling");

/**
 * Polls OpenAI for document processing status and updates database.
 * Runs in background with exponential backoff retry logic.
 *
 * This function should be called after uploading a file to the vector store
 * to automatically update the document status when OpenAI finishes processing.
 *
 * @param documentId - Database document ID
 * @param vectorStoreId - OpenAI vector store ID
 * @param openaiFileId - OpenAI file ID
 */
export async function pollDocumentStatus(
  documentId: string,
  vectorStoreId: string,
  openaiFileId: string
): Promise<void> {
  const maxAttempts = 20; // ~10 minutes max with exponential backoff
  let attempt = 0;

  log.info(
    { documentId, vectorStoreId, openaiFileId },
    "pollDocumentStatus: starting background polling"
  );

  while (attempt < maxAttempts) {
    try {
      const fileStatus = await getVectorStoreFileStatus(
        vectorStoreId,
        openaiFileId
      );

      log.debug(
        {
          documentId,
          attempt,
          status: fileStatus.status,
        },
        "pollDocumentStatus: checked status"
      );

      if (fileStatus.status === "completed") {
        await updateDocumentStatus(documentId, "ready");
        log.info(
          { documentId, attempts: attempt + 1 },
          "pollDocumentStatus: document processing completed"
        );
        return;
      }

      if (fileStatus.status === "failed") {
        await updateDocumentStatus(
          documentId,
          "failed",
          fileStatus.lastError?.message || "Processing failed"
        );
        log.error(
          {
            documentId,
            attempts: attempt + 1,
            error: fileStatus.lastError,
          },
          "pollDocumentStatus: document processing failed"
        );
        return;
      }

      if (fileStatus.status === "cancelled") {
        await updateDocumentStatus(
          documentId,
          "failed",
          "Processing was cancelled"
        );
        log.warn(
          { documentId, attempts: attempt + 1 },
          "pollDocumentStatus: document processing cancelled"
        );
        return;
      }

      // Still in_progress, wait and retry with exponential backoff
      attempt++;
      const delay = Math.min(1000 * 1.5 ** attempt, 30_000); // Max 30s between polls

      log.debug(
        { documentId, attempt, nextPollIn: delay },
        "pollDocumentStatus: still processing, will retry"
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      log.error(
        {
          documentId,
          attempt,
          error: {
            name: (error as Error).name,
            message: (error as Error).message,
          },
        },
        "pollDocumentStatus: status check error"
      );

      attempt++;

      // On error, wait 5 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  // Max attempts reached; keep document in processing so manual refresh can retry
  log.warn(
    { documentId, maxAttempts },
    "pollDocumentStatus: polling timeout, deferring to manual refresh"
  );
  await updateDocumentStatus(
    documentId,
    "processing",
    DOCUMENT_PROCESSING_TIMEOUT_MESSAGE
  );
}

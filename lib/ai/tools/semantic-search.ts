import { tool } from "ai";
import { z } from "zod";
import { getUploadedDocumentById, getVectorStoreId } from "@/lib/db/queries";
import { createModuleLogger } from "@/lib/logger";
import { openaiClient } from "@/lib/openai/client";
import type { StreamWriter } from "../types";

const log = createModuleLogger("ai.tools.semantic-search");

export type SemanticSearchInput = {
  query: string;
  limit?: number;
};

export type SearchResultItem = {
  documentId: string;
  documentName: string;
  chunkContent: string;
  pageNumber: number | null;
  relevanceScore: number;
  blobUrl: string;
};

export type SemanticSearchOutput = {
  results: SearchResultItem[];
  totalResults: number;
};

type SemanticSearchProps = {
  dataStream: StreamWriter;
};

export const semanticSearch = ({ dataStream }: SemanticSearchProps) =>
  tool({
    description:
      "Search the organization's document library using semantic similarity to find relevant information. Returns text passages with citations to source documents.",
    inputSchema: z.object({
      query: z.string().describe("The search query in natural language"),
      limit: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .describe("Maximum number of results to return (default: 5)"),
    }),
    execute: async ({ query, limit = 5 }: SemanticSearchInput) => {
      const startMs = Date.now();
      log.info(
        {
          query,
          limit,
        },
        "semanticSearch: start"
      );

      // Write data stream update: Search started
      dataStream.write({
        type: "data-researchUpdate",
        data: {
          title: "Searching documents",
          timestamp: Date.now(),
          type: "started",
        },
      });

      try {
        // Get vector store ID from database
        const vectorStoreId = await getVectorStoreId();

        if (!vectorStoreId) {
          log.warn("semanticSearch: no vector store found");
          return {
            results: [],
            totalResults: 0,
          };
        }

        log.debug(
          { vectorStoreId },
          "semanticSearch: creating temporary assistant"
        );

        // Create temporary OpenAI assistant with file_search tool
        const assistant = await openaiClient.beta.assistants.create({
          model: "gpt-4o",
          tools: [
            {
              type: "file_search",
            },
          ],
          tool_resources: {
            file_search: {
              vector_store_ids: [vectorStoreId],
            },
          },
        });

        log.debug(
          { assistantId: assistant.id },
          "semanticSearch: assistant created"
        );

        // Create thread with user message
        const thread = await openaiClient.beta.threads.create({
          messages: [
            {
              role: "user",
              content: query,
            },
          ],
        });

        log.debug({ threadId: thread.id }, "semanticSearch: thread created");

        // Run assistant on thread
        const run = await openaiClient.beta.threads.runs.create(thread.id, {
          assistant_id: assistant.id,
        });

        log.debug({ runId: run.id }, "semanticSearch: run created");

        // Poll run status until completed
        let runStatus = run.status;
        let attempts = 0;
        const maxAttempts = 60; // 60 attempts * 1 second = 60 seconds max

        while (
          runStatus !== "completed" &&
          runStatus !== "failed" &&
          runStatus !== "cancelled" &&
          attempts < maxAttempts
        ) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const updatedRun = await openaiClient.beta.threads.runs.retrieve(
            run.id,
            {
              thread_id: thread.id,
            }
          );
          runStatus = updatedRun.status;
          attempts++;

          log.debug(
            { runId: run.id, status: runStatus, attempt: attempts },
            "semanticSearch: polling run status"
          );
        }

        if (runStatus !== "completed") {
          log.error(
            { runId: run.id, status: runStatus },
            "semanticSearch: run did not complete successfully"
          );

          // Cleanup
          await Promise.all([
            openaiClient.beta.assistants.delete(assistant.id),
            openaiClient.beta.threads.delete(thread.id),
          ]);

          return {
            error: `Search failed: ${runStatus}`,
            results: [],
            totalResults: 0,
          };
        }

        // Retrieve messages from thread
        const messages = await openaiClient.beta.threads.messages.list(
          thread.id,
          {
            limit: 1,
            order: "desc",
          }
        );

        log.debug(
          { messageCount: messages.data.length },
          "semanticSearch: messages retrieved"
        );

        // Extract annotations from assistant message
        const results: SearchResultItem[] = [];
        const assistantMessage = messages.data[0];

        if (assistantMessage?.content[0]) {
          const content = assistantMessage.content[0];

          if (content.type === "text" && content.text.annotations) {
            log.debug(
              { annotationCount: content.text.annotations.length },
              "semanticSearch: processing annotations"
            );

            // Process each annotation
            for (const [
              index,
              annotation,
            ] of content.text.annotations.entries()) {
              if (
                annotation.type === "file_citation" &&
                annotation.file_citation
              ) {
                const fileId = annotation.file_citation.file_id;

                // Find document by openaiFileId
                // Note: We need to add a query function to find by openaiFileId
                // For now, we'll use a workaround to get all documents and filter
                const documents = await getAllDocumentsByOpenAIFileId(fileId);

                if (documents.length > 0) {
                  const doc = documents[0];

                  // Extract text excerpt
                  const startIndex = annotation.start_index || 0;
                  const endIndex = annotation.end_index || 0;
                  const excerpt = content.text.value.substring(
                    startIndex,
                    endIndex
                  );

                  results.push({
                    documentId: doc.id,
                    documentName: doc.filename,
                    chunkContent: excerpt || annotation.text || "",
                    pageNumber: null, // OpenAI doesn't provide page numbers in annotations
                    relevanceScore: index, // Use annotation index as proxy for relevance
                    blobUrl: doc.blobUrl,
                  });

                  log.debug(
                    {
                      documentId: doc.id,
                      documentName: doc.filename,
                    },
                    "semanticSearch: added result"
                  );
                }
              }
            }
          }
        }

        // Cleanup assistant and thread
        await Promise.all([
          openaiClient.beta.assistants.delete(assistant.id),
          openaiClient.beta.threads.delete(thread.id),
        ]);

        log.debug("semanticSearch: cleanup completed");

        // Write data stream update: Search completed
        dataStream.write({
          type: "data-researchUpdate",
          data: {
            title: "Search complete",
            timestamp: Date.now(),
            type: "completed",
          },
        });

        log.info(
          {
            ms: Date.now() - startMs,
            resultCount: results.length,
          },
          "semanticSearch: success"
        );

        return {
          results: results.slice(0, limit),
          totalResults: results.length,
        };
      } catch (error) {
        log.error(
          {
            ms: Date.now() - startMs,
            error: {
              name: (error as Error).name,
              message: (error as Error).message,
            },
          },
          "semanticSearch: failure"
        );

        return {
          error: `Search failed: ${(error as Error).message}`,
          results: [],
          totalResults: 0,
        };
      }
    },
  });

// Helper function to find documents by OpenAI file ID
// This is a workaround - ideally we'd have a direct query function
async function getAllDocumentsByOpenAIFileId(
  openaiFileId: string
): Promise<Array<{ id: string; filename: string; blobUrl: string }>> {
  try {
    // We'll need to use raw SQL or add a new query function
    // For now, we'll import from queries and filter
    const { listDocuments } = await import("@/lib/db/queries");
    const { documents } = await listDocuments({ limit: 1000 });

    return documents
      .filter((doc) => doc.openaiFileId === openaiFileId)
      .map((doc) => ({
        id: doc.id,
        filename: doc.filename,
        blobUrl: doc.blobUrl,
      }));
  } catch (error) {
    log.error(
      {
        openaiFileId,
        error: {
          name: (error as Error).name,
          message: (error as Error).message,
        },
      },
      "getAllDocumentsByOpenAIFileId: failed"
    );
    return [];
  }
}

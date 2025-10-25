import { tool } from "ai";
import { z } from "zod";
import {
  getUploadedDocumentByOpenAIFileId,
  getVectorStoreId,
} from "@/lib/db/queries";
import { createModuleLogger } from "@/lib/logger";
import { searchVectorStore } from "@/lib/openai/vector-store";
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
      log.info({ query, limit }, "semanticSearch: start");

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

        log.debug({ vectorStoreId }, "semanticSearch: performing search");

        // Use NEW Vector Store Search API - much simpler and faster!
        const searchResults = await searchVectorStore(
          vectorStoreId,
          query,
          limit
        );

        log.debug(
          { resultCount: searchResults.data.length },
          "semanticSearch: results retrieved"
        );

        // Map search results to our format
        const results: SearchResultItem[] = [];

        for (const result of searchResults.data) {
          // Get document from database using openaiFileId
          const document = await getUploadedDocumentByOpenAIFileId(
            result.file_id
          );

          if (!document) {
            log.warn(
              { fileId: result.file_id },
              "semanticSearch: document not found in database"
            );
            continue;
          }

          // Extract text content from result
          const chunkContent = result.content
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("\n");

          results.push({
            documentId: document.id,
            documentName: document.filename,
            chunkContent,
            pageNumber: null, // OpenAI doesn't provide page numbers in search results
            relevanceScore: result.score,
            blobUrl: document.blobUrl,
          });
        }

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
          results,
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

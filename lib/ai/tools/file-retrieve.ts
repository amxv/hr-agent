import { tool } from "ai";
import { z } from "zod";
import { getUploadedDocumentById } from "@/lib/db/queries";
import { createModuleLogger } from "@/lib/logger";
import { retrieveFileContent } from "@/lib/openai/files";
import type { StreamWriter } from "../types";

const log = createModuleLogger("ai.tools.file-retrieve");

export type FileRetrieveInput = {
  documentId: string;
};

export type FileRetrieveOutput = {
  documentId: string;
  documentName: string;
  content: string;
  pageCount: number | null;
  fileSize: number;
};

type FileRetrieveProps = {
  dataStream: StreamWriter;
};

export const fileRetrieve = ({ dataStream }: FileRetrieveProps) =>
  tool({
    description:
      "Retrieve the complete content of a specific document from the library. Use this when you need full context from a document rather than just search results.",
    inputSchema: z.object({
      documentId: z.string().describe("The ID of the document to retrieve"),
    }),
    execute: async ({ documentId }: FileRetrieveInput) => {
      const startMs = Date.now();
      log.info(
        {
          documentId,
        },
        "fileRetrieve: start"
      );

      // Write data stream update: Retrieving document
      dataStream.write({
        type: "data-researchUpdate",
        data: {
          title: "Retrieving document",
          timestamp: Date.now(),
          type: "started",
        },
      });

      try {
        // Get document by ID
        const document = await getUploadedDocumentById(documentId);

        if (!document) {
          log.warn({ documentId }, "fileRetrieve: document not found");
          return {
            error: "Document not found",
          };
        }

        // Check if document is ready
        if (document.status !== "ready") {
          log.warn(
            { documentId, status: document.status },
            "fileRetrieve: document not ready"
          );
          return {
            error: `Document is ${document.status === "processing" ? "still processing" : document.status === "uploading" ? "still uploading" : `not available (status: ${document.status})`}`,
          };
        }

        log.debug(
          {
            documentId,
            openaiFileId: document.openaiFileId,
          },
          "fileRetrieve: retrieving content from OpenAI"
        );

        // Retrieve file content from OpenAI
        const content = await retrieveFileContent(document.openaiFileId);

        // Extract page count (best effort - may not work for all formats)
        let pageCount: number | null = null;

        // Simple heuristic: count page break indicators in PDFs
        if (document.contentType === "application/pdf") {
          const pageMatches = content.match(/\f/g); // Form feed character
          pageCount = pageMatches ? pageMatches.length + 1 : null;
        }

        // Write data stream update: Document retrieved
        dataStream.write({
          type: "data-researchUpdate",
          data: {
            title: "Document retrieved",
            timestamp: Date.now(),
            type: "completed",
          },
        });

        log.info(
          {
            ms: Date.now() - startMs,
            documentId,
            contentLength: content.length,
            pageCount,
          },
          "fileRetrieve: success"
        );

        return {
          documentId: document.id,
          documentName: document.filename,
          content,
          pageCount,
          fileSize: document.fileSize,
        };
      } catch (error) {
        log.error(
          {
            ms: Date.now() - startMs,
            documentId,
            error: {
              name: (error as Error).name,
              message: (error as Error).message,
            },
          },
          "fileRetrieve: failure"
        );

        return {
          error: `Failed to retrieve document content: ${(error as Error).message}`,
        };
      }
    },
  });

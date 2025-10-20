import { tool } from "ai";
import { z } from "zod";
import type { Session } from "@/lib/auth";
import { getDocumentById } from "@/lib/db/queries";
import type { StreamWriter } from "../types";

type ReadDocumentProps = {
  session: Session;
  dataStream: StreamWriter;
};

export const readDocument = ({
  session,
  dataStream: _dataStream,
}: ReadDocumentProps) =>
  tool({
    description: `Read the contents of a document created earlier in this chat.

Use for:
- Retrieve document text for follow-up analysis or questions

Avoid:
- Documents that were not produced in the current conversation`,
    inputSchema: z.object({
      id: z.string().describe("The ID of the document to read"),
    }),
    execute: async ({ id }) => {
      const document = await getDocumentById({ id });

      if (!document) {
        return {
          error: "Document not found",
        };
      }

      if (document.userId !== session.user?.id) {
        return {
          error: "Unauthorized access to document",
        };
      }

      return {
        id: document.id,
        title: document.title,
        kind: document.kind,
        content: document.content,
        createdAt: document.createdAt,
      };
    },
  });

import { streamObject, tool } from "ai";
import { z } from "zod";
import type { Session } from "@/lib/auth";
import { getDocumentById, saveSuggestions } from "@/lib/db/queries";
import type { Suggestion } from "@/lib/db/schema";
import { generateUUID } from "@/lib/utils";
import { DEFAULT_ARTIFACT_SUGGESTION_MODEL } from "../app-models";
import { getLanguageModel } from "../providers";
import type { StreamWriter } from "../types";

type RequestSuggestionsProps = {
  session: Session;
  dataStream: StreamWriter;
};

export const requestSuggestions = ({
  session,
  dataStream,
}: RequestSuggestionsProps) =>
  tool({
    description: `Generate concrete writing-improvement suggestions for an existing document without applying the edits.

Use for:
- The user asks to improve, tighten, rephrase, or fix grammar/style of an existing document
- You want critique/suggestions rather than modifying the document content yourself
- There is a stored document and you know its ID

Avoid:
- Creating new content (use createDocument)
- Directly changing the document (use updateDocument)
- When no document exists or the ID is unknown (read or create the document first)

Behavior:
- Produces up to 5 suggestions, each with originalSentence, suggestedSentence (a full rewritten sentence), and a short description/rationale
- Streams suggestions to the UI and persists them for later review`,
    inputSchema: z.object({
      documentId: z
        .string()
        .describe(
          "ID of the existing document to critique and propose rewritten sentences for"
        ),
    }),
    execute: async ({ documentId }) => {
      const document = await getDocumentById({ id: documentId });

      if (!document?.content) {
        return {
          error: "Document not found",
        };
      }

      const suggestions: Omit<
        Suggestion,
        "userId" | "createdAt" | "documentCreatedAt"
      >[] = [];

      const { elementStream } = streamObject({
        model: getLanguageModel(DEFAULT_ARTIFACT_SUGGESTION_MODEL),
        experimental_telemetry: { isEnabled: true },

        system:
          "You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.",
        prompt: document.content,
        output: "array",
        schema: z.object({
          originalSentence: z.string().describe("The original sentence"),
          suggestedSentence: z.string().describe("The suggested sentence"),
          description: z.string().describe("The description of the suggestion"),
        }),
      });

      for await (const element of elementStream) {
        const suggestion: Suggestion = {
          originalText: element.originalSentence,
          suggestedText: element.suggestedSentence,
          description: element.description,
          id: generateUUID(),
          documentId,
          isResolved: false,
          createdAt: new Date(),
          userId: session.user?.id ?? "",
          documentCreatedAt: document.createdAt,
        };

        dataStream.write({
          type: "data-suggestion",
          data: suggestion,
          transient: true,
        });

        suggestions.push(suggestion);
      }

      if (session.user?.id) {
        const userId = session.user.id;

        await saveSuggestions({
          suggestions: suggestions.map((suggestion) => ({
            ...suggestion,
            userId,
            createdAt: new Date(),
            documentCreatedAt: document.createdAt,
          })),
        });
      }

      return {
        id: documentId,
        title: document.title,
        kind: document.kind,
        message: "Suggestions have been added to the document",
      };
    },
  });

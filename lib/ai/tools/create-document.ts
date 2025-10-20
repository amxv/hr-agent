import type { ModelId } from "@ai-models/vercel-gateway";
import type { ModelMessage } from "ai";
import { tool } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/lib/artifacts/artifact-kind";
import { artifactKinds } from "@/lib/artifacts/artifact-kind";
import {
  type DocumentHandler,
  documentHandlersByArtifactKind,
} from "@/lib/artifacts/server";
import type { Session } from "@/lib/auth";
import { generateUUID } from "@/lib/utils";
import type { StreamWriter } from "../types";
import type { ArtifactToolResult } from "./artifact-tool-result";

type CreateDocumentProps = {
  session: Session;
  dataStream: StreamWriter;
  contextForLLM?: ModelMessage[];
  messageId: string;
  selectedModel: ModelId;
};

export const createDocumentTool = ({
  session,
  dataStream,
  contextForLLM,
  messageId,
  selectedModel,
}: CreateDocumentProps) =>
  tool({
    description: `Create a persistent document (text, code, or spreadsheet).  This tool orchestrates the downstream handlers that actually generate the file based on the provided title, kind and description.

Usage:
- Substantial content (>100 lines), code, or spreadsheets
- Deliverables the user will likely save/reuse (emails, essays, code, etc.)
- Explicit "create a document" like requests
- Single-snippet code answers with Python language (always wrap in an artifact)
  - Specify language with backticks, e.g. \`\`\`python\`code here\`\`\` (only Python supported for now)
- When you have all the information available to create the document, use this tool.
- This tool will display the document content in the chat.


For code artifacts (only code artifacts):
- The title MUST include the appropriate file extension (e.g., "script.py", "component.tsx", "utils.js")
- This extension will be used to determine syntax highlighting

Avoid:
- Purely conversational or explanatory responses that belong in chat
- "Keep it in chat" requests`,
    inputSchema: z.object({
      title: z
        .string()
        .describe(
          'For code artifacts, must include file extension (e.g., "script.py", "App.tsx", "utils.js"). For other artifacts, just the filename'
        ),
      description: z
        .string()
        .describe("A detailed description of what the document should contain"),
      kind: z.enum(artifactKinds),
    }),
    execute: async ({ title, description, kind }) => {
      let prompt = `
      Title: ${title}
      Description: ${description}
      `;

      if (contextForLLM && contextForLLM.length > 0) {
        const conversationContext = contextForLLM
          .map(
            (msg) =>
              `${msg.role}: ${typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)}`
          )
          .join("\n");

        prompt = `
      Title: ${title}
      Description: ${description}
      
      Conversation Context:
      ${conversationContext}
      `;
      }

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === kind
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      const result: ArtifactToolResult = await createDocument({
        dataStream,
        kind,
        title,
        description,
        session,
        prompt,
        messageId,
        selectedModel,
        documentHandler,
      });

      return result;
    },
  });

export async function createDocument({
  dataStream,
  kind,
  title,
  description,
  session,
  prompt,
  messageId,
  selectedModel,
  documentHandler,
}: {
  dataStream: StreamWriter;
  kind: ArtifactKind;
  title: string;
  description: string;
  session: Session;
  prompt: string;
  messageId: string;
  selectedModel: ModelId;
  documentHandler: DocumentHandler<ArtifactKind>;
}): Promise<ArtifactToolResult> {
  const id = generateUUID();

  dataStream.write({
    type: "data-kind",
    data: kind,
    transient: true,
  });

  dataStream.write({
    type: "data-id",
    data: id,
    transient: true,
  });

  dataStream.write({
    type: "data-messageId",
    data: messageId,
    transient: true,
  });

  dataStream.write({
    type: "data-title",
    data: title,
    transient: true,
  });

  dataStream.write({
    type: "data-clear",
    data: null,
    transient: true,
  });

  await documentHandler.onCreateDocument({
    id,
    title,
    description,
    dataStream,
    session,
    prompt,
    messageId,
    selectedModel,
  });

  dataStream.write({ type: "data-finish", data: null, transient: true });

  const result: ArtifactToolResult = {
    id,
    title,
    kind,
    content: "A document was created and is now visible to the user.",
  };

  return result;
}

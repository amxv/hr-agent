import type { ModelId } from "@ai-models/vercel-gateway";
import type { FileUIPart, ModelMessage } from "ai";
import { codeInterpreter } from "@/lib/ai/tools/code-interpreter";
import { createDocumentTool } from "@/lib/ai/tools/create-document";
import { generateImage } from "@/lib/ai/tools/generate-image";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { readDocument } from "@/lib/ai/tools/read-document";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { retrieve } from "@/lib/ai/tools/retrieve";
import { stockChart } from "@/lib/ai/tools/stock-chart";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { tavilyWebSearch } from "@/lib/ai/tools/web-search";
import type { Session } from "@/lib/auth";
import { env } from "@/lib/env";
import type { StreamWriter } from "../types";
import { deepResearch } from "./deep-research/deep-research";

export function getTools({
  dataStream,
  session,
  messageId,
  selectedModel,
  attachments = [],
  lastGeneratedImage = null,
  contextForLLM,
}: {
  dataStream: StreamWriter;
  session: Session;
  messageId: string;
  selectedModel: ModelId;
  attachments: FileUIPart[];
  lastGeneratedImage: { imageUrl: string; name: string } | null;
  contextForLLM: ModelMessage[];
}) {
  return {
    getWeather,
    createDocument: createDocumentTool({
      session,
      dataStream,
      contextForLLM,
      messageId,
      selectedModel,
    }),
    updateDocument: updateDocument({
      session,
      dataStream,
      messageId,
      selectedModel,
    }),
    requestSuggestions: requestSuggestions({
      session,
      dataStream,
    }),
    readDocument: readDocument({
      session,
      dataStream,
    }),
    // reasonSearch: createReasonSearch({
    //   session,
    //   dataStream,
    // }),
    retrieve,
    ...(env.NEXT_PUBLIC_TAVILY_AVAILABLE
      ? {
          webSearch: tavilyWebSearch({
            dataStream,
            writeTopLevelUpdates: true,
          }),
        }
      : {}),

    ...(env.NEXT_PUBLIC_SANDBOX_AVAILABLE ? { stockChart } : {}),
    ...(env.NEXT_PUBLIC_SANDBOX_AVAILABLE ? { codeInterpreter } : {}),
    ...(env.NEXT_PUBLIC_OPENAI_AVAILABLE
      ? { generateImage: generateImage({ attachments, lastGeneratedImage }) }
      : {}),
    ...(env.NEXT_PUBLIC_TAVILY_AVAILABLE
      ? {
          deepResearch: deepResearch({
            session,
            dataStream,
            messageId,
            messages: contextForLLM,
          }),
        }
      : {}),
  };
}

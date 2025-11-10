import type {
  InferUITool,
  LanguageModelUsage,
  UIMessage,
  UIMessageStreamWriter,
} from "ai";
import { z } from "zod";
import type { codeInterpreter } from "@/lib/ai/tools/code-interpreter";
import type { deepResearch } from "@/lib/ai/tools/deep-research/deep-research";
import type { fileRetrieve } from "@/lib/ai/tools/file-retrieve";
import type { generateImage } from "@/lib/ai/tools/generate-image";
import type { getWeather } from "@/lib/ai/tools/get-weather";
import type { benefitsInfo } from "@/lib/ai/tools/benefits-info";
import type { hrCase } from "@/lib/ai/tools/hr-case";
import type { leaveBalance } from "@/lib/ai/tools/leave-balance";
import type { readDocument } from "@/lib/ai/tools/read-document";
import type { teamAvailability } from "@/lib/ai/tools/team-availability";
import type { peopleSearch } from "@/lib/ai/tools/people-search";
import type { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import type { retrieve } from "@/lib/ai/tools/retrieve";
import type { semanticSearch } from "@/lib/ai/tools/semantic-search";
import type { stockChart } from "@/lib/ai/tools/stock-chart";
import type { updateDocument } from "@/lib/ai/tools/update-document";
import type { tavilyWebSearch } from "@/lib/ai/tools/web-search";
import type { Suggestion } from "@/lib/db/schema";
import type { ArtifactKind } from "../artifacts/artifact-kind";
import type { AppModelId } from "./app-models";
import type { createDocumentTool as createDocument } from "./tools/create-document";
import type { ResearchUpdate } from "./tools/research-updates-schema";

export const toolNameSchema = z.enum([
  "getWeather",
  "createDocument",
  "updateDocument",
  "requestSuggestions",
  "readDocument",
  "retrieve",
  "webSearch",
  "stockChart",
  "codeInterpreter",
  "generateImage",
  "deepResearch",
  "semanticSearch",
  "fileRetrieve",
  "leaveBalance",
  "benefitsInfo",
  "hrCase",
  "teamAvailability",
  "peopleSearch",
]);

const _ = toolNameSchema.options satisfies ToolName[];

type ToolNameInternal = z.infer<typeof toolNameSchema>;

export const frontendToolsSchema = z.enum([
  "webSearch",
  "deepResearch",
  "generateImage",
  "createDocument",
]);

const __ = frontendToolsSchema.options satisfies ToolNameInternal[];

export type UiToolName = z.infer<typeof frontendToolsSchema>;
export const messageMetadataSchema = z.object({
  createdAt: z.date(),
  parentMessageId: z.string().nullable(),
  selectedModel: z.custom<AppModelId>((val) => typeof val === "string"),
  isPartial: z.boolean().optional(),
  selectedTool: frontendToolsSchema.optional(),
  usage: z.custom<LanguageModelUsage | undefined>((_val) => true).optional(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;
type deepResearchTool = InferUITool<ReturnType<typeof deepResearch>>;
type readDocumentTool = InferUITool<ReturnType<typeof readDocument>>;
type generateImageTool = InferUITool<ReturnType<typeof generateImage>>;
type webSearchTool = InferUITool<ReturnType<typeof tavilyWebSearch>>;
type stockChartTool = InferUITool<typeof stockChart>;
type codeInterpreterTool = InferUITool<typeof codeInterpreter>;
type retrieveTool = InferUITool<typeof retrieve>;
type semanticSearchTool = InferUITool<ReturnType<typeof semanticSearch>>;
type fileRetrieveTool = InferUITool<ReturnType<typeof fileRetrieve>>;
type leaveBalanceTool = InferUITool<ReturnType<typeof leaveBalance>>;
type benefitsInfoTool = InferUITool<ReturnType<typeof benefitsInfo>>;
type hrCaseTool = InferUITool<ReturnType<typeof hrCase>>;
type teamAvailabilityTool = InferUITool<ReturnType<typeof teamAvailability>>;
type peopleSearchTool = InferUITool<ReturnType<typeof peopleSearch>>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  deepResearch: deepResearchTool;
  readDocument: readDocumentTool;
  generateImage: generateImageTool;
  webSearch: webSearchTool;
  stockChart: stockChartTool;
  codeInterpreter: codeInterpreterTool;
  retrieve: retrieveTool;
  semanticSearch: semanticSearchTool;
  fileRetrieve: fileRetrieveTool;
  leaveBalance: leaveBalanceTool;
  benefitsInfo: benefitsInfoTool;
  hrCase: hrCaseTool;
  teamAvailability: teamAvailabilityTool;
  peopleSearch: peopleSearchTool;
};

type FollowupSuggestions = {
  suggestions: string[];
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  messageId: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  researchUpdate: ResearchUpdate;
  followupSuggestions: FollowupSuggestions;
};

export type ChatMessage = Omit<
  UIMessage<MessageMetadata, CustomUIDataTypes, ChatTools>,
  "metadata"
> & {
  metadata: MessageMetadata;
};

export type ToolName = keyof ChatTools;

export type StreamWriter = UIMessageStreamWriter<ChatMessage>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};

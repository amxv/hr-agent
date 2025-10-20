import type { OpenAIProvider } from "@ai-sdk/openai";

type OpenAIimageModelId = Parameters<OpenAIProvider["imageModel"]>[0];

// Exclude the non-literal model ids
type OpenAILiteralImageModelId = OpenAIimageModelId extends infer T
  ? T extends string
    ? string extends T
      ? never
      : T
    : never
  : never;

export type ImageModelId = `openai/${OpenAILiteralImageModelId}`;

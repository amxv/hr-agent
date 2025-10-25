import type { AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { createGateway } from "@ai-sdk/gateway";
import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { type OpenAIResponsesProviderOptions, openai } from "@ai-sdk/openai";
import { extractReasoningMiddleware, wrapLanguageModel } from "ai";
import { env } from "@/lib/env";
import type { ImageModelId, ModelId } from "../../packages/models";
import { getModelAndProvider } from "../../packages/models";
import type { AppModelId } from "./app-models";
import { getAppModelDefinition, getImageModelDefinition } from "./app-models";

const _telemetryConfig = {
  telemetry: {
    isEnabled: true,
    functionId: "get-language-model",
  },
};

let gatewayProvider: ReturnType<typeof createGateway> | null = null;

function getGatewayProvider() {
  if (!gatewayProvider) {
    gatewayProvider = createGateway({
      apiKey: env.AI_GATEWAY_API_KEY,
    });
  }
  return gatewayProvider;
}

export const getLanguageModel = (modelId: ModelId) => {
  const model = getAppModelDefinition(modelId);
  const languageProvider = getGatewayProvider()(model.id);

  // Wrap with reasoning middleware if the model supports reasoning
  if (model.reasoning && model.owned_by === "xai") {
    console.log("Wrapping reasoning middleware for", model.id);
    return wrapLanguageModel({
      model: languageProvider,
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    });
  }

  return languageProvider;
};

export const getImageModel = (modelId: ImageModelId) => {
  const model = getImageModelDefinition(modelId);
  const { model: modelIdShort } = getModelAndProvider(modelId);

  if (model.owned_by === "openai") {
    return openai.image(modelIdShort);
  }
  throw new Error(`Provider ${model.owned_by} not supported`);
};

type GatewayProviderSlug =
  | "anthropic"
  | "openai"
  | "deepinfra"
  | "xai"
  | "google";

type GatewayProviderOptions = {
  gateway: { only: GatewayProviderSlug[] };
};

type ProviderOptionsWithGateway<TOptions> = TOptions & GatewayProviderOptions;

type ModelProviderOptions =
  | ProviderOptionsWithGateway<{ openai: OpenAIResponsesProviderOptions }>
  | ProviderOptionsWithGateway<{ anthropic: AnthropicProviderOptions }>
  | ProviderOptionsWithGateway<{ xai: Record<string, never> }>
  | ProviderOptionsWithGateway<{ google: GoogleGenerativeAIProviderOptions }>
  | GatewayProviderOptions;

export const getModelProviderOptions = (
  providerModelId: AppModelId
): ModelProviderOptions => {
  const model = getAppModelDefinition(providerModelId);
  if (model.owned_by === "openai") {
    if (model.reasoning) {
      return {
        openai: {
          reasoningSummary: "auto",
          ...(model.id === "openai/gpt-5" ||
          model.id === "openai/gpt-5-mini" ||
          model.id === "openai/gpt-5-nano"
            ? { reasoningEffort: "low" }
            : {}),
        } satisfies OpenAIResponsesProviderOptions,
        gateway: { only: ["openai"] },
      };
    }
    return { openai: {}, gateway: { only: ["openai"] } };
  }
  if (model.owned_by === "anthropic") {
    if (model.reasoning) {
      return {
        anthropic: {
          thinking: {
            type: "enabled",
            budgetTokens: 4096,
          },
        } satisfies AnthropicProviderOptions,
        gateway: { only: ["anthropic"] },
      };
    }
    return { anthropic: {}, gateway: { only: ["anthropic"] } };
  }
  if (model.owned_by === "xai") {
    return {
      xai: {},
      gateway: { only: ["deepinfra"] },
    };
  }
  if (model.owned_by === "google") {
    if (model.reasoning) {
      return {
        google: {
          thinkingConfig: {
            thinkingBudget: 10_000,
          },
        },
        gateway: { only: ["deepinfra"] },
      };
    }
    return { google: {}, gateway: { only: ["deepinfra"] } };
  }
  return { gateway: { only: ["deepinfra"] } };
};

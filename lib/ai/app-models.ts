import {
  allModels as allModelsData,
  type ImageModelId,
  type ModelDefinition,
  type ModelId,
} from "@ai-models/vercel-gateway";
import {
  type ImageModelData,
  imageModelsData,
} from "@/lib/models/image-models";

export type ImageModelDefinition = ImageModelData & {
  features?: never; // deprecated: use ModelExtra in base defs if needed later
};

export type AppModelId = ModelId | `${ModelId}-reasoning`;
export type AppModelDefinition = Omit<ModelDefinition, "id"> & {
  id: AppModelId;
  apiModelId: ModelId;
};

const DISABLED_MODELS: Partial<Record<ModelId, true>> = {
  // 'anthropic/claude-opus-4': true,
  // 'anthropic/claude-opus-4.1': true,
  "cohere/command-r": true,
  "cohere/command-r-plus": true,
  "morph/morph-v3-large": true,
  "morph/morph-v3-fast": true,
};

export const allAppModels = allModelsData
  .flatMap((model) => {
    // If the model supports reasoning, return two variants:
    // - Non-reasoning (original id, reasoning=false)
    // - Reasoning (id with -reasoning suffix, reasoning=true)
    if (model.reasoning === true) {
      const reasoningId: AppModelId = `${model.id}-reasoning`;

      return [
        {
          ...model,
          id: reasoningId,
          apiModelId: model.id,
          disabled: DISABLED_MODELS[model.id],
        },
        {
          ...model,
          reasoning: false,
          apiModelId: model.id,
          disabled: DISABLED_MODELS[model.id],
        },
      ];
    }

    // Models without reasoning stay as-is
    return [
      {
        ...model,
        apiModelId: model.id,
        disabled: DISABLED_MODELS[model.id],
      },
    ];
  })
  .filter((model) => model.type === "language" && !model.disabled);

const allImageModels = imageModelsData;

const PROVIDER_ORDER = ["openai", "google", "anthropic", "xai"];

export const chatModels = allAppModels
  .filter((model) => model.output.text === true)
  .sort((a, b) => {
    const aProviderIndex = PROVIDER_ORDER.indexOf(a.owned_by);
    const bProviderIndex = PROVIDER_ORDER.indexOf(b.owned_by);

    const aIndex =
      aProviderIndex === -1 ? PROVIDER_ORDER.length : aProviderIndex;
    const bIndex =
      bProviderIndex === -1 ? PROVIDER_ORDER.length : bProviderIndex;

    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    return 0;
  });

// Memoized dictionary of models by ID for efficient lookups
const _modelsByIdCache = new Map<string, AppModelDefinition>();

function getModelsByIdDict(): Map<string, AppModelDefinition> {
  if (_modelsByIdCache.size === 0) {
    allAppModels.forEach((model) => {
      _modelsByIdCache.set(model.id, model);
    });
  }
  return _modelsByIdCache;
}

export function getAppModelDefinition(modelId: AppModelId): AppModelDefinition {
  const modelsByIdDict = getModelsByIdDict();

  const model = modelsByIdDict.get(modelId);
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }
  return model;
}

const _imageModelsByIdCache = new Map<string, ImageModelDefinition>();

function getImageModelsByIdDict(): Map<string, ImageModelDefinition> {
  if (_imageModelsByIdCache.size === 0) {
    allImageModels.forEach((model) => {
      _imageModelsByIdCache.set(model.id, model);
    });
  }
  return _imageModelsByIdCache;
}

export function getImageModelDefinition(
  modelId: ImageModelId
): ImageModelDefinition {
  const modelsByIdDict = getImageModelsByIdDict();
  const model = modelsByIdDict.get(modelId);
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }
  return model;
}

export const DEFAULT_CHAT_MODEL: ModelId = "openai/gpt-5-nano";
export const DEFAULT_PDF_MODEL: ModelId = "openai/gpt-5-mini";
export const DEFAULT_TITLE_MODEL: ModelId = "openai/gpt-5-nano";
export const DEFAULT_ARTIFACT_MODEL: ModelId = "openai/gpt-5-nano";
export const DEFAULT_FOLLOWUP_SUGGESTIONS_MODEL: ModelId =
  "google/gemini-2.5-flash-lite";
export const DEFAULT_ARTIFACT_SUGGESTION_MODEL: ModelId = "openai/gpt-5-mini";
export const DEFAULT_IMAGE_MODEL: ImageModelId = "openai/gpt-image-1";
export const DEFAULT_CHAT_IMAGE_COMPATIBLE_MODEL: ModelId =
  "openai/gpt-4o-mini";
export const DEFAULT_SUGGESTIONS_MODEL: ModelId = "openai/gpt-5-mini";
export const DEFAULT_POLISH_TEXT_MODEL: ModelId = "openai/gpt-5-mini";
export const DEFAULT_FORMAT_AND_CLEAN_SHEET_MODEL: ModelId =
  "openai/gpt-5-mini";
export const DEFAULT_ANALYZE_AND_VISUALIZE_SHEET_MODEL: ModelId =
  "openai/gpt-5-mini";

export const DEFAULT_CODE_EDITS_MODEL: ModelId = "openai/gpt-5-mini";

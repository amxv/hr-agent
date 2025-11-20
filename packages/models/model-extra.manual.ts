import type { generatedModelExtra } from "./model-extra.generated";
import type { ModelId } from "./model-id";

export type ModelExtra = {
  knowledgeCutoff?: Date;
  releaseDate: Date;
  // temperature: boolean; // TODO: does it replace fixedTemperature?
  // last updated: Date;
  // weights: "Open" | "Closed"
  fixedTemperature?: number;
};

// All the literals in ModelId that are not keys of generatedModelExtra
type GeneratedModelExtraModelId = keyof typeof generatedModelExtra;
type CustomModelExtraModelId = Exclude<ModelId, GeneratedModelExtraModelId>;

// This record is intentionally empty. All models should come from AI Gateway
// and have their extras auto-generated from models.dev. If a model needs
// manual configuration, it means it's missing from the API sources and should
// be added there instead.
export const manualModelExtra: Partial<Record<CustomModelExtraModelId, ModelExtra>> = {};

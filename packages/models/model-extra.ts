import { generatedModelExtra } from "./model-extra.generated";
import { manualModelExtra } from "./model-extra.manual";
import type { ModelId } from "./model-id";

export type ModelExtra = {
  knowledgeCutoff?: Date;
  releaseDate: Date;
  fixedTemperature?: number;
};

export const allModelsExtra: Partial<Record<ModelId, ModelExtra>> = {
  ...generatedModelExtra,
  ...manualModelExtra,
};

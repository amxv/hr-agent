import {
  type AppModelDefinition,
  type AppModelId,
  getAppModelDefinition,
} from "../ai/app-models";
import { toolsDefinitions } from "../ai/tools/tools-definitions";
import type { ToolName } from "../ai/types";

// Credit costs for different operations (in credits)
export const CREDIT_COSTS = {
  // Base conversation costs (per message exchange)
  MESSAGE_BASE: 1,

  // File operations
  FILE_UPLOAD: 2,
  PDF_PROCESSING: 5,
  IMAGE_UPLOAD: 3,

  // Tool usage
  WEB_SEARCH: 3,
  ARTIFACT_GENERATION: 5,
  IMAGE_GENERATION: 10,

  // Premium features
  DEEP_RESEARCH: 15,
} as const;

// Daily limits for anonymous users
export const ANONYMOUS_DAILY_LIMITS = {
  TOTAL_CREDITS: 50,
  MESSAGES: 20,
  ARTIFACTS: 5,
  IMAGES: 3,
  WEB_SEARCHES: 10,
  DEEP_RESEARCH: 2,
} as const;

export function filterAffordableTools(
  tools: ToolName[],
  toolBudget: number
): ToolName[] {
  const affordableTools = tools.filter((toolName) => {
    const toolCost = toolsDefinitions[toolName].cost;
    return toolBudget >= toolCost;
  });

  return affordableTools;
}

export function getMaxToolCost(tools: ToolName[]): number {
  return tools.reduce(
    (max, toolName) => Math.max(max, toolsDefinitions[toolName].cost),
    0
  );
}

export function getBaseModelCostByModelId(modelId: AppModelId) {
  const model = getAppModelDefinition(modelId);
  return getBaseModelCost(model);
}

export function getBaseModelCost(model: AppModelDefinition) {
  if (!model.pricing) {
    return 10; // fallback for models without pricing
  }

  const { input, output } = model.pricing;

  // Convert from string to number and scale to per million tokens
  const inputCostPerMTok = Number.parseFloat(input) * 1_000_000;
  const outputCostPerMTok = Number.parseFloat(output) * 1_000_000;

  // Formula: Weighted average assuming typical 1:3 input:output ratio
  // This gives more weight to output since models typically generate more output
  const weightedCost = inputCostPerMTok * 0.25 + outputCostPerMTok * 0.75;

  // Scale to reasonable credit units (adjust multiplier as needed)
  return Math.ceil(weightedCost);
}

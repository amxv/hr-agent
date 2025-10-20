import { allTools } from "../ai/tools/tools-definitions";
import { reserveAvailableCredits } from "../repositories/credits";
import { getMaxToolCost } from "./credits-utils";

export async function reserveCredits({
  userId,
  baseModelCost,
  maxSteps = 5,
}: {
  userId: string;
  baseModelCost: number;
  maxSteps?: number;
}): Promise<
  | {
      success: true;
      budget: number;
    }
  | {
      success: false;
      error: string;
    }
> {
  const maxToolCost = getMaxToolCost(allTools);
  const totalBudget = baseModelCost + maxToolCost * maxSteps;

  const reservation = await reserveAvailableCredits({
    userId,
    maxAmount: totalBudget,
    minAmount: baseModelCost,
  });

  if (!reservation.success) {
    return {
      success: false,
      error: reservation.error,
    };
  }

  if (reservation.reservedAmount < baseModelCost) {
    return {
      success: false,
      error: "Insufficient credits for the selected model",
    };
  }
  return {
    success: true,
    budget: reservation.reservedAmount,
  };
}

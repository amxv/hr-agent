import {
  finalizeCreditsUsage,
  releaseReservedCredits,
} from "@/lib/repositories/credits";
import { reserveCredits } from "./reserveCredits";

export class CreditReservation {
  private readonly userId: string;
  private readonly amount: number;
  private released = false;
  public readonly budget: number;

  constructor(userId: string, amount: number) {
    this.userId = userId;
    this.amount = amount;
    this.budget = amount;
  }

  async finalize(actualCost: number) {
    if (!this.released) {
      await finalizeCreditsUsage({
        userId: this.userId,
        reservedAmount: this.amount,
        actualAmount: actualCost,
      });
      this.released = true;
    }
  }

  async release() {
    if (!this.released) {
      await releaseReservedCredits({
        userId: this.userId,
        amount: this.amount,
      });
      this.released = true;
    }
  }

  async cleanup() {
    return this.release();
  }
}

export async function reserveCreditsWithCleanup(
  userId: string,
  baseModelCost: number,
  maxSteps: number
): Promise<
  | { success: true; reservation: CreditReservation }
  | { success: false; error: string }
> {
  const result = await reserveCredits({ userId, baseModelCost, maxSteps });

  if (result.success) {
    return {
      success: true,
      reservation: new CreditReservation(userId, result.budget),
    };
  }

  return {
    success: false,
    error: result.error || "Credit reservation failed",
  };
}

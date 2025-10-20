import { reserveCreditsWithCleanup } from "@/lib/credits/credit-reservation";

export async function getCreditReservation(
  userId: string,
  baseModelCost: number
) {
  const reservedCredits = await reserveCreditsWithCleanup(
    userId,
    baseModelCost,
    1
  );

  if (!reservedCredits.success) {
    return { reservation: null, error: reservedCredits.error };
  }

  return { reservation: reservedCredits.reservation, error: null };
}

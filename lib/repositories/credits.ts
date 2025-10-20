import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db/client";
import { userCredit } from "../db/schema";

async function ensureUserCreditRow(userId: string) {
  await db.insert(userCredit).values({ userId }).onConflictDoNothing();
}

export async function getUserCreditsInfo({ userId }: { userId: string }) {
  let creditsRows = await db
    .select({
      credits: userCredit.credits,
      reservedCredits: userCredit.reservedCredits,
    })
    .from(userCredit)
    .where(eq(userCredit.userId, userId))
    .limit(1);

  let userInfo = creditsRows[0];
  if (!userInfo) {
    await ensureUserCreditRow(userId);
    creditsRows = await db
      .select({
        credits: userCredit.credits,
        reservedCredits: userCredit.reservedCredits,
      })
      .from(userCredit)
      .where(eq(userCredit.userId, userId))
      .limit(1);
    userInfo = creditsRows[0];
    if (!userInfo) {
      return null;
    }
  }

  return {
    totalCredits: userInfo.credits,
    availableCredits: userInfo.credits - userInfo.reservedCredits,
    reservedCredits: userInfo.reservedCredits,
  };
}

export async function reserveAvailableCredits({
  userId,
  maxAmount,
  minAmount,
}: {
  userId: string;
  maxAmount: number;
  minAmount: number;
}): Promise<
  | {
      success: true;
      reservedAmount: number;
    }
  | {
      success: false;
      error: string;
    }
> {
  try {
    const userInfo = await getUserCreditsInfo({ userId });
    if (!userInfo) {
      return { success: false, error: "User credits not initialized" };
    }

    const availableCredits = userInfo.availableCredits;
    const amountToReserve = Math.min(maxAmount, availableCredits);

    if (amountToReserve < minAmount) {
      return { success: false, error: "Insufficient credits" };
    }

    const result = await db
      .update(userCredit)
      .set({
        reservedCredits: sql`${userCredit.reservedCredits} + ${amountToReserve}`,
      })
      .where(
        and(
          eq(userCredit.userId, userId),
          gte(
            sql`${userCredit.credits} - ${userCredit.reservedCredits}`,
            amountToReserve
          )
        )
      )
      .returning({
        credits: userCredit.credits,
        reservedCredits: userCredit.reservedCredits,
      });

    if (result.length === 0) {
      return { success: false, error: "Failed to reserve credits" };
    }

    return {
      success: true,
      reservedAmount: amountToReserve,
    };
  } catch (error) {
    console.error("Failed to reserve available credits:", error);
    return { success: false, error: "Failed to reserve credits" };
  }
}

export async function finalizeCreditsUsage({
  userId,
  reservedAmount,
  actualAmount,
}: {
  userId: string;
  reservedAmount: number;
  actualAmount: number;
}): Promise<void> {
  await db
    .update(userCredit)
    .set({
      credits: sql`${userCredit.credits} - ${actualAmount}`,
      reservedCredits: sql`${userCredit.reservedCredits} - ${reservedAmount}`,
    })
    .where(eq(userCredit.userId, userId));
}

export async function releaseReservedCredits({
  userId,
  amount,
}: {
  userId: string;
  amount: number;
}): Promise<void> {
  await db
    .update(userCredit)
    .set({
      reservedCredits: sql`${userCredit.reservedCredits} - ${amount}`,
    })
    .where(
      and(
        eq(userCredit.userId, userId),
        gte(userCredit.reservedCredits, amount)
      )
    );
}

import { getUserCreditsInfo } from "@/lib/repositories/credits";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const creditsRouter = createTRPCRouter({
  getAvailableCredits: protectedProcedure.query(async ({ ctx }) => {
    const creditsInfo = await getUserCreditsInfo({ userId: ctx.user.id });
    return (
      creditsInfo || {
        totalCredits: 0,
        availableCredits: 0,
        reservedCredits: 0,
      }
    );
  }),
});

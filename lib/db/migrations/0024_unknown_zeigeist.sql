ALTER TABLE "User" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "UserCredit" DROP COLUMN IF EXISTS "createdAt";--> statement-breakpoint
ALTER TABLE "UserCredit" DROP COLUMN IF EXISTS "updatedAt";
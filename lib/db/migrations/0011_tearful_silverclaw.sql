DROP TABLE "CreditTransaction";--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "reservedCredits" integer DEFAULT 0 NOT NULL;
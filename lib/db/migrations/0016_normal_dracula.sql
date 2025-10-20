DROP TABLE IF EXISTS "ChatStream";--> statement-breakpoint
ALTER TABLE "User" ALTER COLUMN "credits" SET DEFAULT 1000;--> statement-breakpoint
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "parentMessageId" uuid;
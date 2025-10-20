DROP TABLE "Vote_v2";--> statement-breakpoint
DROP TABLE "Message_v2";--> statement-breakpoint
ALTER TABLE "Message" ADD COLUMN "parts" json NOT NULL;--> statement-breakpoint
ALTER TABLE "Message" ADD COLUMN "attachments" json NOT NULL;--> statement-breakpoint
ALTER TABLE "Message" ADD COLUMN "annotations" json;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "credits" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "Message" DROP COLUMN IF EXISTS "content";
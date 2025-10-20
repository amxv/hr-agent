ALTER TABLE "Message" ADD COLUMN "lastContext" json;--> statement-breakpoint
ALTER TABLE "Chat" DROP COLUMN IF EXISTS "lastContext";
ALTER TABLE "Document" DROP COLUMN IF EXISTS "metadata";
ALTER TABLE "Chat" ADD COLUMN "isPinned" boolean DEFAULT false NOT NULL;
ALTER TABLE "Message" ADD COLUMN "selectedModel" varchar(256) DEFAULT '';--> statement-breakpoint

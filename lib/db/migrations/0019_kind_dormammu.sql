ALTER TABLE "User" ALTER COLUMN "credits" SET DEFAULT 500;--> statement-breakpoint
ALTER TABLE "Message" ADD COLUMN "selectedTool" varchar(256) DEFAULT '';
-- Add updatedAt column if it doesn't exist
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
-- Update existing rows to have updatedAt = createdAt for consistency
UPDATE "Chat" SET "updatedAt" = "createdAt" WHERE "updatedAt" != "createdAt"; 
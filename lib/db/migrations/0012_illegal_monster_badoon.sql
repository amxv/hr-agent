-- Add column as nullable first
ALTER TABLE "Document" ADD COLUMN "messageId" uuid;

-- Update existing documents with closest messageId by user and timestamp
-- First, try to match by user
UPDATE "Document" 
SET "messageId" = (
  SELECT m.id 
  FROM "Message" m 
  JOIN "Chat" c ON m."chatId" = c.id
  WHERE c."userId" = "Document"."userId"
  ORDER BY ABS(EXTRACT(EPOCH FROM (m."createdAt" - "Document"."createdAt")))
  LIMIT 1
)
WHERE "messageId" IS NULL;

-- For any remaining documents without messageId, assign them to the most recent message from any chat
UPDATE "Document" 
SET "messageId" = (
  SELECT m.id 
  FROM "Message" m 
  ORDER BY m."createdAt" DESC
  LIMIT 1
)
WHERE "messageId" IS NULL;

-- Now make it NOT NULL
ALTER TABLE "Document" ALTER COLUMN "messageId" SET NOT NULL;

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "Document" ADD CONSTRAINT "Document_messageId_Message_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

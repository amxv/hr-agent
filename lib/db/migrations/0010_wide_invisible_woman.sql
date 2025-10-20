CREATE TABLE IF NOT EXISTS "CreditTransaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"amount" integer NOT NULL,
	"type" varchar NOT NULL,
	"description" text NOT NULL,
	"relatedChatId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_relatedChatId_Chat_id_fk" FOREIGN KEY ("relatedChatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

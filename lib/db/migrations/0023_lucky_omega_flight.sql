CREATE TABLE IF NOT EXISTS "UserCredit" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"credits" integer DEFAULT 100 NOT NULL,
	"reservedCredits" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserCredit" ADD CONSTRAINT "UserCredit_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "User" DROP COLUMN IF EXISTS "credits";--> statement-breakpoint
ALTER TABLE "User" DROP COLUMN IF EXISTS "reservedCredits";
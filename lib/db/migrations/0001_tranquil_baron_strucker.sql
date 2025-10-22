CREATE TABLE IF NOT EXISTS "UploadedDocument" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"file_size" integer NOT NULL,
	"content_type" text NOT NULL,
	"blob_url" text NOT NULL,
	"blob_pathname" text NOT NULL,
	"openai_file_id" text NOT NULL,
	"vector_store_id" text NOT NULL,
	"status" varchar DEFAULT 'uploading' NOT NULL,
	"error_message" text,
	"tags" json DEFAULT '[]'::json NOT NULL,
	CONSTRAINT "UploadedDocument_openai_file_id_unique" UNIQUE("openai_file_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "VectorStoreConfig" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"vector_store_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "VectorStoreConfig_vector_store_id_unique" UNIQUE("vector_store_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UploadedDocument" ADD CONSTRAINT "UploadedDocument_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uploaded_document_uploaded_by_idx" ON "UploadedDocument" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uploaded_document_status_idx" ON "UploadedDocument" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uploaded_document_vector_store_id_idx" ON "UploadedDocument" USING btree ("vector_store_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uploaded_document_deleted_at_idx" ON "UploadedDocument" USING btree ("deleted_at");
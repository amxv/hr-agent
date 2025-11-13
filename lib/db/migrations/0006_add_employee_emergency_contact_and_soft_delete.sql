-- Migration: Add emergency_contact, deleted_at, and deleted_by fields to employee table
-- This migration adds support for emergency contact information and soft delete functionality

-- Add emergency_contact column (JSONB for flexible contact data)
ALTER TABLE "employee" ADD COLUMN "emergency_contact" jsonb;
--> statement-breakpoint

-- Add deleted_at column for soft delete tracking
ALTER TABLE "employee" ADD COLUMN "deleted_at" timestamp;
--> statement-breakpoint

-- Add deleted_by column for audit trail
ALTER TABLE "employee" ADD COLUMN "deleted_by" text REFERENCES "user"("id");
--> statement-breakpoint

-- Create index on deleted_at for better query performance
CREATE INDEX IF NOT EXISTS "employee_deleted_at_idx" ON "employee" USING btree ("deleted_at");

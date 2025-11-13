-- Update benefits_category enum to add 'health'
ALTER TYPE "benefits_category" ADD VALUE IF NOT EXISTS 'health';
--> statement-breakpoint

-- BenefitsPlan table changes
-- 1. Rename plan_id to plan_code
ALTER TABLE "benefits_plan" RENAME COLUMN "plan_id" TO "plan_code";
--> statement-breakpoint

-- 2. Update the unique constraint index name
ALTER INDEX "benefits_plan_plan_id_unique" RENAME TO "benefits_plan_plan_code_unique";
--> statement-breakpoint

-- 3. Update the index name
DROP INDEX IF EXISTS "benefits_plan_plan_id_idx";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefits_plan_plan_code_idx" ON "benefits_plan" USING btree ("plan_code");
--> statement-breakpoint

-- 4. Add tier column
ALTER TABLE "benefits_plan" ADD COLUMN "tier" text;
--> statement-breakpoint

-- 5. Add is_active column
ALTER TABLE "benefits_plan" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint

-- 6. Change monthly_premium from JSON to numeric
ALTER TABLE "benefits_plan" ALTER COLUMN "monthly_premium" TYPE numeric(10, 2) USING
  CASE
    WHEN "monthly_premium" IS NULL THEN NULL
    WHEN jsonb_typeof("monthly_premium"::jsonb) = 'number' THEN ("monthly_premium"::jsonb)::text::numeric
    WHEN jsonb_typeof("monthly_premium"::jsonb) = 'string' THEN ("monthly_premium"::jsonb->>0)::numeric
    ELSE NULL
  END;
--> statement-breakpoint

-- 7. Rename deductible to annual_deductible and change type
ALTER TABLE "benefits_plan" RENAME COLUMN "deductible" TO "annual_deductible";
--> statement-breakpoint
ALTER TABLE "benefits_plan" ALTER COLUMN "annual_deductible" TYPE numeric(10, 2) USING
  CASE
    WHEN "annual_deductible" IS NULL THEN NULL
    WHEN jsonb_typeof("annual_deductible"::jsonb) = 'number' THEN ("annual_deductible"::jsonb)::text::numeric
    WHEN jsonb_typeof("annual_deductible"::jsonb) = 'string' THEN ("annual_deductible"::jsonb->>0)::numeric
    ELSE NULL
  END;
--> statement-breakpoint

-- 8. Change out_of_pocket_max from JSON to numeric
ALTER TABLE "benefits_plan" ALTER COLUMN "out_of_pocket_max" TYPE numeric(10, 2) USING
  CASE
    WHEN "out_of_pocket_max" IS NULL THEN NULL
    WHEN jsonb_typeof("out_of_pocket_max"::jsonb) = 'number' THEN ("out_of_pocket_max"::jsonb)::text::numeric
    WHEN jsonb_typeof("out_of_pocket_max"::jsonb) = 'string' THEN ("out_of_pocket_max"::jsonb->>0)::numeric
    ELSE NULL
  END;
--> statement-breakpoint

-- Dependent table changes
-- 1. Rename name to full_name
ALTER TABLE "dependent" RENAME COLUMN "name" TO "full_name";
--> statement-breakpoint

-- 2. Add ssn column
ALTER TABLE "dependent" ADD COLUMN "ssn" text;
--> statement-breakpoint

-- 3. Add is_student column
ALTER TABLE "dependent" ADD COLUMN "is_student" boolean DEFAULT false NOT NULL;
--> statement-breakpoint

-- EnrollmentPeriod table changes
-- 1. Add period_name column (required)
ALTER TABLE "enrollment_period" ADD COLUMN "period_name" text NOT NULL DEFAULT '';
--> statement-breakpoint

-- 2. Add start_date column (required)
ALTER TABLE "enrollment_period" ADD COLUMN "start_date" date NOT NULL DEFAULT CURRENT_DATE;
--> statement-breakpoint

-- 3. Add end_date column (required)
ALTER TABLE "enrollment_period" ADD COLUMN "end_date" date NOT NULL DEFAULT CURRENT_DATE;
--> statement-breakpoint

-- LeaveBalance table changes
-- 1. Add planned_ytd column
ALTER TABLE "leave_balance" ADD COLUMN "planned_ytd" numeric(5, 2) DEFAULT '0' NOT NULL;

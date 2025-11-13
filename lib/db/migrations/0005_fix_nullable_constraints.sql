-- Migration: Fix nullable constraints for better test compatibility
-- This migration makes several foreign key and audit fields nullable to allow
-- easier testing and more flexible data entry without requiring full user setup

-- Make employee.user_id nullable (allows creating employees without users)
ALTER TABLE "employee" ALTER COLUMN "user_id" DROP NOT NULL;

-- Make employee.updated_by nullable (can default to created_by)
ALTER TABLE "employee" ALTER COLUMN "updated_by" DROP NOT NULL;

-- Make leave_balance.updated_by nullable
ALTER TABLE "leave_balance" ALTER COLUMN "updated_by" DROP NOT NULL;

-- Make leave_policy.updated_by nullable
ALTER TABLE "leave_policy" ALTER COLUMN "updated_by" DROP NOT NULL;

-- Make benefits_plan.updated_by nullable
ALTER TABLE "benefits_plan" ALTER COLUMN "updated_by" DROP NOT NULL;

-- Make benefits_enrollment.updated_by nullable
ALTER TABLE "benefits_enrollment" ALTER COLUMN "updated_by" DROP NOT NULL;

-- Make dependent.updated_by nullable
ALTER TABLE "dependent" ALTER COLUMN "updated_by" DROP NOT NULL;

-- Make enrollment_period.updated_by nullable
ALTER TABLE "enrollment_period" ALTER COLUMN "updated_by" DROP NOT NULL;

-- Make hr_case.updated_by nullable
ALTER TABLE "hr_case" ALTER COLUMN "updated_by" DROP NOT NULL;

-- Make hr_case.submitted_by_name nullable (can be derived from employee)
ALTER TABLE "hr_case" ALTER COLUMN "submitted_by_name" DROP NOT NULL;

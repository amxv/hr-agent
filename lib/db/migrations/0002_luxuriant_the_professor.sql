DO $$ BEGIN
 CREATE TYPE "public"."absence_type" AS ENUM('vacation', 'sick', 'personal', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."accrual_schedule" AS ENUM('monthly', 'bi_weekly', 'quarterly', 'annually');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."benefits_category" AS ENUM('medical', 'dental', 'vision', 'retirement', 'hsa_fsa');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."case_category" AS ENUM('payroll', 'benefits', 'policy', 'equipment', 'leave', 'performance', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."case_priority" AS ENUM('low', 'medium', 'high', 'urgent');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."case_status" AS ENUM('open', 'in_progress', 'pending_info', 'resolved', 'closed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."case_update_type" AS ENUM('system', 'hr_response', 'internal_note', 'status_change');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."employment_status" AS ENUM('active', 'probation', 'leave_of_absence', 'notice_period', 'terminated');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."leave_request_status" AS ENUM('pending', 'approved', 'denied');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."leave_type" AS ENUM('vacation', 'sick', 'personal');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."relationship" AS ENUM('spouse', 'domestic_partner', 'child', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."update_visibility" AS ENUM('public', 'internal');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."work_mode" AS ENUM('office', 'remote', 'hybrid');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "absence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"absence_type" "absence_type" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"total_days" numeric(5, 1) NOT NULL,
	"approval_date" date NOT NULL,
	"approved_by" uuid,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "benefits_enrollment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"medical_plan_id" uuid,
	"medical_coverage_level" text,
	"medical_monthly_premium" numeric(8, 2),
	"medical_employee_contribution" numeric(8, 2),
	"medical_employer_contribution" numeric(8, 2),
	"medical_enrollment_date" date,
	"dental_plan_id" uuid,
	"dental_coverage_level" text,
	"dental_monthly_premium" numeric(8, 2),
	"dental_employee_contribution" numeric(8, 2),
	"dental_employer_contribution" numeric(8, 2),
	"vision_plan_id" uuid,
	"vision_coverage_level" text,
	"vision_monthly_premium" numeric(8, 2),
	"retirement_plan_id" uuid,
	"retirement_employee_contribution_percent" numeric(5, 2),
	"retirement_employer_match_percent" numeric(5, 2),
	"retirement_current_balance" numeric(12, 2),
	"retirement_vesting_schedule" text,
	"hsa_employer_contribution" numeric(8, 2),
	"hsa_employee_contribution" numeric(8, 2),
	"fsa_election" numeric(8, 2),
	"updated_by" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "benefits_enrollment_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "benefits_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" text NOT NULL,
	"category" "benefits_category" NOT NULL,
	"plan_name" text NOT NULL,
	"carrier" text,
	"type" text,
	"monthly_premium" json,
	"deductible" json,
	"out_of_pocket_max" json,
	"coverage" json,
	"annual_maximum" integer,
	"employer_match_percent" numeric(5, 2),
	"vesting_schedule" text,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "benefits_plan_plan_id_unique" UNIQUE("plan_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blackout_date" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" text NOT NULL,
	"department" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_update" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"author" text NOT NULL,
	"type" "case_update_type" NOT NULL,
	"message" text NOT NULL,
	"visibility" "update_visibility" DEFAULT 'public' NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dependent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"name" text NOT NULL,
	"relationship" "relationship" NOT NULL,
	"date_of_birth" date NOT NULL,
	"covered_under" json DEFAULT '[]'::json NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"full_name" text NOT NULL,
	"preferred_name" text,
	"email" text NOT NULL,
	"phone_extension" text,
	"job_title" text NOT NULL,
	"department" text NOT NULL,
	"team" text,
	"manager_id" uuid,
	"direct_reports" json DEFAULT '[]'::json NOT NULL,
	"employment_status" "employment_status" NOT NULL,
	"location" text NOT NULL,
	"work_mode" "work_mode" NOT NULL,
	"office_location" text,
	"work_authorization" json NOT NULL,
	"start_date" date NOT NULL,
	"years_of_service" numeric(4, 1) NOT NULL,
	"skills" json DEFAULT '[]'::json NOT NULL,
	"certifications" json DEFAULT '[]'::json NOT NULL,
	"expected_return_date" date,
	"probation_end_date" date,
	"last_working_day" date,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employee_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "employee_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enrollment_period" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_year" integer NOT NULL,
	"open_enrollment_start" date NOT NULL,
	"open_enrollment_end" date NOT NULL,
	"effective_date" date NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "enrollment_period_plan_year_unique" UNIQUE("plan_year")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_case" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" text NOT NULL,
	"title" text NOT NULL,
	"category" "case_category" NOT NULL,
	"description" text NOT NULL,
	"priority" "case_priority" NOT NULL,
	"status" "case_status" NOT NULL,
	"submitted_by" uuid,
	"submitted_by_name" text NOT NULL,
	"assigned_team" text NOT NULL,
	"first_response_due" timestamp NOT NULL,
	"first_response_met" boolean DEFAULT false NOT NULL,
	"resolution_due" timestamp NOT NULL,
	"sla_hours_remaining" numeric(8, 2),
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hr_case_case_id_unique" UNIQUE("case_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leave_balance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"leave_type" "leave_type" NOT NULL,
	"current_balance" numeric(5, 2) NOT NULL,
	"accrued_ytd" numeric(5, 2) DEFAULT '0' NOT NULL,
	"used_ytd" numeric(5, 2) DEFAULT '0' NOT NULL,
	"accrual_rate" numeric(5, 2) NOT NULL,
	"accrual_schedule" "accrual_schedule" NOT NULL,
	"carryover_limit" integer DEFAULT 0 NOT NULL,
	"carryover_deadline" date,
	"projected_year_end" numeric(5, 2) NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leave_policy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department" text,
	"minimum_notice" integer NOT NULL,
	"max_consecutive_days" integer NOT NULL,
	"require_approval" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leave_policy_department_unique" UNIQUE("department")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leave_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"request_type" "absence_type" NOT NULL,
	"requested_start_date" date NOT NULL,
	"requested_end_date" date NOT NULL,
	"total_days_requested" numeric(5, 1) NOT NULL,
	"submitted_date" date DEFAULT now() NOT NULL,
	"status" "leave_request_status" DEFAULT 'pending' NOT NULL,
	"has_conflict" boolean DEFAULT false NOT NULL,
	"conflicts_with" json DEFAULT '[]'::json NOT NULL,
	"conflict_reason" text,
	"coverage_percent" integer,
	"notes" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leave_request_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
ALTER TABLE "UserCredit" ALTER COLUMN "credits" SET DEFAULT 10000;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "absence" ADD CONSTRAINT "absence_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "absence" ADD CONSTRAINT "absence_approved_by_employee_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."employee"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "absence" ADD CONSTRAINT "absence_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "benefits_enrollment" ADD CONSTRAINT "benefits_enrollment_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "benefits_enrollment" ADD CONSTRAINT "benefits_enrollment_medical_plan_id_benefits_plan_id_fk" FOREIGN KEY ("medical_plan_id") REFERENCES "public"."benefits_plan"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "benefits_enrollment" ADD CONSTRAINT "benefits_enrollment_dental_plan_id_benefits_plan_id_fk" FOREIGN KEY ("dental_plan_id") REFERENCES "public"."benefits_plan"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "benefits_enrollment" ADD CONSTRAINT "benefits_enrollment_vision_plan_id_benefits_plan_id_fk" FOREIGN KEY ("vision_plan_id") REFERENCES "public"."benefits_plan"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "benefits_enrollment" ADD CONSTRAINT "benefits_enrollment_retirement_plan_id_benefits_plan_id_fk" FOREIGN KEY ("retirement_plan_id") REFERENCES "public"."benefits_plan"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "benefits_enrollment" ADD CONSTRAINT "benefits_enrollment_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "benefits_plan" ADD CONSTRAINT "benefits_plan_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "benefits_plan" ADD CONSTRAINT "benefits_plan_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blackout_date" ADD CONSTRAINT "blackout_date_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_update" ADD CONSTRAINT "case_update_case_id_hr_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."hr_case"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_update" ADD CONSTRAINT "case_update_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dependent" ADD CONSTRAINT "dependent_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dependent" ADD CONSTRAINT "dependent_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dependent" ADD CONSTRAINT "dependent_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee" ADD CONSTRAINT "employee_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee" ADD CONSTRAINT "employee_manager_id_employee_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."employee"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee" ADD CONSTRAINT "employee_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee" ADD CONSTRAINT "employee_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrollment_period" ADD CONSTRAINT "enrollment_period_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrollment_period" ADD CONSTRAINT "enrollment_period_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hr_case" ADD CONSTRAINT "hr_case_submitted_by_employee_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."employee"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hr_case" ADD CONSTRAINT "hr_case_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hr_case" ADD CONSTRAINT "hr_case_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leave_balance" ADD CONSTRAINT "leave_balance_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leave_balance" ADD CONSTRAINT "leave_balance_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leave_policy" ADD CONSTRAINT "leave_policy_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leave_policy" ADD CONSTRAINT "leave_policy_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "absence_employee_id_idx" ON "absence" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "absence_start_date_idx" ON "absence" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "absence_end_date_idx" ON "absence" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "absence_absence_type_idx" ON "absence" USING btree ("absence_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefits_enrollment_employee_id_idx" ON "benefits_enrollment" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefits_enrollment_medical_plan_id_idx" ON "benefits_enrollment" USING btree ("medical_plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefits_enrollment_dental_plan_id_idx" ON "benefits_enrollment" USING btree ("dental_plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefits_enrollment_vision_plan_id_idx" ON "benefits_enrollment" USING btree ("vision_plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefits_plan_plan_id_idx" ON "benefits_plan" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefits_plan_category_idx" ON "benefits_plan" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blackout_date_department_idx" ON "blackout_date" USING btree ("department");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blackout_date_start_date_idx" ON "blackout_date" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blackout_date_end_date_idx" ON "blackout_date" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_update_case_id_idx" ON "case_update" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_update_case_id_timestamp_idx" ON "case_update" USING btree ("case_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dependent_employee_id_idx" ON "dependent" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_employee_id_idx" ON "employee" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_user_id_idx" ON "employee" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_employment_status_idx" ON "employee" USING btree ("employment_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_department_idx" ON "employee" USING btree ("department");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_manager_id_idx" ON "employee" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_email_idx" ON "employee" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrollment_period_plan_year_idx" ON "enrollment_period" USING btree ("plan_year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_case_case_id_idx" ON "hr_case" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_case_status_idx" ON "hr_case" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_case_category_idx" ON "hr_case" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_case_submitted_by_idx" ON "hr_case" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_case_created_at_idx" ON "hr_case" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_case_assigned_team_idx" ON "hr_case" USING btree ("assigned_team");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "leave_balance_employee_leave_type_idx" ON "leave_balance" USING btree ("employee_id","leave_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_balance_leave_type_idx" ON "leave_balance" USING btree ("leave_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_request_request_id_idx" ON "leave_request" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_request_employee_id_idx" ON "leave_request" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_request_status_idx" ON "leave_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_request_requested_start_date_idx" ON "leave_request" USING btree ("requested_start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_request_requested_end_date_idx" ON "leave_request" USING btree ("requested_end_date");
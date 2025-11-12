-- Add check constraint to leave_balance table
-- Ensures currentBalance cannot be negative

DO $$ BEGIN
  ALTER TABLE "leave_balance" ADD CONSTRAINT "leave_balance_current_balance_check" CHECK ("current_balance" >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

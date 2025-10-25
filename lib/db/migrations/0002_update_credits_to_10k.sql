-- Update all existing users to 10,000 credits
-- This migration ensures all users (including admin@agentdune.com) have 10k credits

-- Update all existing UserCredit rows to 10,000 credits (only if less than 10k)
UPDATE "UserCredit"
SET credits = 10000
WHERE credits < 10000;

-- Ensure admin@agentdune.com has a UserCredit row and set to 10k
-- First, ensure the row exists (insert if not)
-- Then update to 10k regardless
INSERT INTO "UserCredit" ("userId", credits, "reservedCredits")
SELECT id, 10000, 0
FROM "user"
WHERE email = 'admin@agentdune.com'
ON CONFLICT ("userId")
DO UPDATE SET credits = 10000;

-- Also ensure all other users have UserCredit rows with 10k
INSERT INTO "UserCredit" ("userId", credits, "reservedCredits")
SELECT id, 10000, 0
FROM "user"
WHERE id NOT IN (SELECT "userId" FROM "UserCredit")
ON CONFLICT ("userId")
DO NOTHING;

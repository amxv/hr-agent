-- Insert default admin user
INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
VALUES (
  'admin-default-001',
  'Admin',
  'admin@agentdune.com',
  true,
  'admin',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

-- Insert account record with hashed password
-- Password: "password" (hashed with scrypt)
INSERT INTO "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
VALUES (
  'admin-account-001',
  'admin@agentdune.com',
  'credential',
  'admin-default-001',
  'e73353162c680e782986519a857d8bff:9f352110258bac14c37912cf7d5cc3461926ea2345114d201360478852f2d394ff31a576e0957ee1eaa1ea3c619cc497330d918b0842cdb1f7e157727fbfdf65',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

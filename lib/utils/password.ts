import { randomBytes } from "node:crypto";

/**
 * Generates a cryptographically secure random password
 *
 * @param length - Password length (default: 16)
 * @returns Secure random password with uppercase, lowercase, numbers, and symbols
 */
export function generateSecurePassword(length = 16): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

  const bytes = randomBytes(length);
  let password = "";

  for (const byte of bytes) {
    password += charset[byte % charset.length];
  }

  return password;
}

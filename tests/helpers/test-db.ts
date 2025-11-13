import { db } from '@/lib/db/client'
import { seedAllHRData, clearAllHRData } from '@/lib/db/seeds/hr-data'

const TEST_ADMIN_USER_ID = 'test-admin-id'

/**
 * Set up test database with seed data
 */
export async function setupTestDatabase() {
  // Clear all data
  await clearAllHRData()

  // Seed test data
  await seedAllHRData(TEST_ADMIN_USER_ID)
}

/**
 * Clean up test database
 */
export async function cleanupTestDatabase() {
  await clearAllHRData()
}

/**
 * Reset test database to initial state
 */
export async function resetTestDatabase() {
  await setupTestDatabase()
}

/**
 * Get a test database connection
 */
export function getTestDb() {
  return db
}

/**
 * Test admin user ID for creating records
 */
export const TEST_ADMIN_ID = TEST_ADMIN_USER_ID

/**
 * Test user ID for non-admin operations
 */
export const TEST_USER_ID = 'test-regular-user-id'

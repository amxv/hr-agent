import { beforeEach } from 'vitest'
import { resetTestDatabase } from '../helpers/test-db'

// Reset database before each integration test
beforeEach(async () => {
  await resetTestDatabase()
})

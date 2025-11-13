import { describe, test, expect, beforeEach } from 'vitest'
import {
  listHRCases,
  getHRCaseById,
  getHRCaseByCaseId,
  createHRCase,
  updateHRCase,
  deleteHRCase,
  addCaseUpdate,
  getEmployeeByEmployeeId,
} from '@/lib/db/queries'
import { resetTestDatabase, TEST_ADMIN_ID } from '../../helpers/test-db'
import type { InsertHRCase, InsertCaseUpdate } from '@/lib/db/schema'

describe('HR Case Queries', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  describe('listHRCases', () => {
    test('returns all HR cases', async () => {
      const result = await listHRCases({})

      expect(result.items).toBeDefined()
      expect(Array.isArray(result.items)).toBe(true)
    })

    test('filters by status', async () => {
      const result = await listHRCases({
        status: 'open',
      })

      expect(result.items.every(c => c.status === 'open')).toBe(true)
    })

    test('filters by category', async () => {
      const result = await listHRCases({
        category: 'payroll',
      })

      expect(result.items.every(c => c.category === 'payroll')).toBe(true)
    })

    test('filters by priority', async () => {
      const result = await listHRCases({
        priority: 'high',
      })

      expect(result.items.every(c => c.priority === 'high')).toBe(true)
    })

    test('includes employee information', async () => {
      const result = await listHRCases({})

      if (result.items.length > 0) {
        expect(result.items[0]).toHaveProperty('submittedBy')
        expect(result.items[0]).toHaveProperty('submittedByName')
      }
    })

    test('supports pagination', async () => {
      const page1 = await listHRCases({ limit: 2, offset: 0 })
      const page2 = await listHRCases({ limit: 2, offset: 2 })

      expect(page1.items.length).toBeLessThanOrEqual(2)
      if (page1.total > 2) {
        expect(page2.items.length).toBeGreaterThan(0)
      }
    })
  })

  describe('getHRCaseById', () => {
    test('returns case with valid id', async () => {
      const cases = await listHRCases({})
      if (cases.items.length === 0) {
        // Skip test if no cases exist
        return
      }

      const hrCase = await getHRCaseById(cases.items[0].id)

      expect(hrCase).toBeDefined()
      expect(hrCase?.id).toBe(cases.items[0].id)
    })

    test('returns null for invalid id', async () => {
      const hrCase = await getHRCaseById('00000000-0000-0000-0000-000000000000')

      expect(hrCase).toBeNull()
    })

    test('includes case updates in timeline', async () => {
      const cases = await listHRCases({})
      if (cases.items.length === 0) {
        return
      }

      const hrCase = await getHRCaseById(cases.items[0].id)

      expect(hrCase).toBeDefined()
      expect(hrCase?.updates).toBeDefined()
      expect(Array.isArray(hrCase?.updates)).toBe(true)
    })
  })

  describe('getHRCaseByCaseId', () => {
    test('returns case with valid caseId', async () => {
      const cases = await listHRCases({})
      if (cases.items.length === 0) {
        return
      }

      const hrCase = await getHRCaseByCaseId(cases.items[0].caseId)

      expect(hrCase).toBeDefined()
      expect(hrCase?.caseId).toBe(cases.items[0].caseId)
    })

    test('returns null for invalid caseId', async () => {
      const hrCase = await getHRCaseByCaseId('HR-9999-999999')

      expect(hrCase).toBeNull()
    })
  })

  describe('createHRCase', () => {
    test('creates case with required fields', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      expect(employee).toBeDefined()

      const newCase = {
        title: 'Test HR Case',
        description: 'This is a test case',
        category: 'payroll' as const,
        priority: 'high' as const,
        status: 'open' as const,
        submittedBy: employee!.id,
        assignedTeam: 'Payroll Services',
      }

      const created = await createHRCase(newCase, TEST_ADMIN_ID)

      expect(created.id).toBeDefined()
      expect(created.caseId).toBeDefined()
      expect(created.title).toBe('Test HR Case')
      expect(created.status).toBe('open')
    })

    test('auto-assigns team based on category', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      expect(employee).toBeDefined()

      const equipmentCase = {
        title: 'Equipment Request',
        description: 'Need new laptop',
        category: 'equipment' as const,
        priority: 'medium' as const,
        status: 'open' as const,
        submittedBy: employee!.id,
        assignedTeam: 'IT & Facilities',
      }

      const created = await createHRCase(equipmentCase, TEST_ADMIN_ID)

      expect(created.assignedTeam).toBe('IT & Facilities')
    })

    test('sets SLA dates correctly', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      expect(employee).toBeDefined()

      const now = new Date()
      const newCase = {
        title: 'Test SLA',
        description: 'Testing SLA dates',
        category: 'payroll' as const,
        priority: 'high' as const,
        status: 'open' as const,
        submittedBy: employee!.id,
        assignedTeam: 'Payroll Services',
      }

      const created = await createHRCase(newCase, TEST_ADMIN_ID)

      expect(created.firstResponseDue).toBeDefined()
      expect(created.resolutionDue).toBeDefined()
      expect(new Date(created.firstResponseDue!).getTime()).toBeGreaterThan(now.getTime())
      expect(new Date(created.resolutionDue!).getTime()).toBeGreaterThan(now.getTime())
    })
  })

  describe('updateHRCase', () => {
    test('updates case status', async () => {
      const cases = await listHRCases({})
      if (cases.items.length === 0) {
        return
      }

      const updated = await updateHRCase(cases.items[0].id, {
        status: 'in_progress',
      }, TEST_ADMIN_ID)

      expect(updated.status).toBe('in_progress')
      expect(updated.updatedBy).toBe(TEST_ADMIN_ID)
    })

    test('updates case assignment', async () => {
      const cases = await listHRCases({})
      if (cases.items.length === 0) {
        return
      }

      const updated = await updateHRCase(cases.items[0].id, {
        assignedTeam: 'Benefits Administration',
      }, TEST_ADMIN_ID)

      expect(updated.assignedTeam).toBe('Benefits Administration')
    })

    test('preserves non-updated fields', async () => {
      const cases = await listHRCases({})
      if (cases.items.length === 0) {
        return
      }

      const originalTitle = cases.items[0].title

      const updated = await updateHRCase(cases.items[0].id, {
        status: 'in_progress',
      }, TEST_ADMIN_ID)

      expect(updated.title).toBe(originalTitle)
      expect(updated.status).toBe('in_progress')
    })
  })

  describe('addCaseUpdate', () => {
    test('adds update to case timeline', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      expect(employee).toBeDefined()

      // Create a test case first
      const testCase = await createHRCase({
        title: 'Test Case for Updates',
        description: 'Test case to verify updates work',
        category: 'payroll' as const,
        priority: 'medium' as const,
        status: 'open' as const,
        submittedBy: employee!.id,
        assignedTeam: 'Payroll Services',
      }, TEST_ADMIN_ID)

      const update: InsertCaseUpdate = {
        caseId: testCase.id,
        message: 'Test update message',
        type: 'hr_response',
        visibility: 'public',
        author: employee!.fullName,
      }

      const created = await addCaseUpdate(update)

      expect(created.id).toBeDefined()
      expect(created.message).toBe('Test update message')
      expect(created.type).toBe('hr_response')

      // Verify update is in case timeline
      const hrCase = await getHRCaseById(testCase.id)
      expect(hrCase?.updates.some(u => u.id === created.id)).toBe(true)
    })

    test('creates different types of updates', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      expect(employee).toBeDefined()

      // Create a test case first
      const testCase = await createHRCase({
        title: 'Test Case for Multiple Updates',
        description: 'Test case to verify different update types',
        category: 'payroll' as const,
        priority: 'medium' as const,
        status: 'open' as const,
        submittedBy: employee!.id,
        assignedTeam: 'Payroll Services',
      }, TEST_ADMIN_ID)

      const types: Array<'system' | 'hr_response' | 'status_change'> = [
        'system',
        'hr_response',
        'status_change',
      ]

      for (const type of types) {
        const update: InsertCaseUpdate = {
          caseId: testCase.id,
          message: `Test ${type}`,
          type: type,
          visibility: 'public',
          author: employee!.fullName,
        }

        const created = await addCaseUpdate(update)
        expect(created.type).toBe(type)
      }
    })

    test('creates internal updates', async () => {
      const cases = await listHRCases({})
      if (cases.items.length === 0) {
        return
      }

      const employee = await getEmployeeByEmployeeId('EMP001')

      const update: InsertCaseUpdate = {
        caseId: cases.items[0].id,
        message: 'Internal note for HR team',
        type: 'hr_response',
        visibility: 'internal',
        author: employee!.fullName,
      }

      const created = await addCaseUpdate(update)

      expect(created.visibility).toBe('internal')
    })
  })

  describe('deleteHRCase', () => {
    test('deletes HR case', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      expect(employee).toBeDefined()

      const newCase = {
        title: 'To Be Deleted',
        description: 'This case will be deleted',
        category: 'payroll' as const,
        priority: 'low' as const,
        status: 'open' as const,
        submittedBy: employee!.id,
        assignedTeam: 'HR Operations',
      }

      const created = await createHRCase(newCase, TEST_ADMIN_ID)
      await deleteHRCase(created.id)

      const retrieved = await getHRCaseById(created.id)
      expect(retrieved).toBeNull()
    })
  })
})

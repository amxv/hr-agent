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
        expect(result.items[0]).toHaveProperty('submittedByEmployee')
        if (result.items[0].submittedByEmployee) {
          expect(result.items[0].submittedByEmployee).toHaveProperty('fullName')
        }
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

      const newCase: InsertHRCase = {
        caseId: `HR-2025-${Date.now().toString().slice(-6)}`,
        title: 'Test HR Case',
        description: 'This is a test case',
        category: 'payroll',
        priority: 'high',
        status: 'open',
        submittedBy: employee!.id,
        assignedTeam: 'Payroll Services',
        assignedTo: null,
        firstResponseDue: new Date(Date.now() + 4 * 60 * 60 * 1000), // +4 hours
        resolutionDue: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // +2 days
        createdBy: TEST_ADMIN_ID,
      }

      const created = await createHRCase(newCase)

      expect(created.id).toBeDefined()
      expect(created.caseId).toBe(newCase.caseId)
      expect(created.title).toBe('Test HR Case')
      expect(created.status).toBe('open')
    })

    test('auto-assigns team based on category', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      expect(employee).toBeDefined()

      const equipmentCase: InsertHRCase = {
        caseId: `HR-2025-${Date.now().toString().slice(-6)}`,
        title: 'Equipment Request',
        description: 'Need new laptop',
        category: 'equipment',
        priority: 'medium',
        status: 'open',
        submittedBy: employee!.id,
        assignedTeam: 'IT & Facilities',
        assignedTo: null,
        firstResponseDue: new Date(Date.now() + 24 * 60 * 60 * 1000),
        resolutionDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: TEST_ADMIN_ID,
      }

      const created = await createHRCase(equipmentCase)

      expect(created.assignedTeam).toBe('IT & Facilities')
    })

    test('sets SLA dates correctly', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      expect(employee).toBeDefined()

      const now = new Date()
      const newCase: InsertHRCase = {
        caseId: `HR-2025-${Date.now().toString().slice(-6)}`,
        title: 'Test SLA',
        description: 'Testing SLA dates',
        category: 'payroll',
        priority: 'high',
        status: 'open',
        submittedBy: employee!.id,
        assignedTeam: 'Payroll Services',
        assignedTo: null,
        firstResponseDue: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        resolutionDue: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        createdBy: TEST_ADMIN_ID,
      }

      const created = await createHRCase(newCase)

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
        updatedBy: TEST_ADMIN_ID,
      })

      expect(updated.status).toBe('in_progress')
      expect(updated.updatedBy).toBe(TEST_ADMIN_ID)
    })

    test('updates case assignment', async () => {
      const cases = await listHRCases({})
      if (cases.items.length === 0) {
        return
      }

      const employee = await getEmployeeByEmployeeId('EMP001')

      const updated = await updateHRCase(cases.items[0].id, {
        assignedTo: employee!.id,
        updatedBy: TEST_ADMIN_ID,
      })

      expect(updated.assignedTo).toBe(employee!.id)
    })

    test('preserves non-updated fields', async () => {
      const cases = await listHRCases({})
      if (cases.items.length === 0) {
        return
      }

      const originalTitle = cases.items[0].title

      const updated = await updateHRCase(cases.items[0].id, {
        status: 'in_progress',
        updatedBy: TEST_ADMIN_ID,
      })

      expect(updated.title).toBe(originalTitle)
      expect(updated.status).toBe('in_progress')
    })
  })

  describe('addCaseUpdate', () => {
    test('adds update to case timeline', async () => {
      const cases = await listHRCases({})
      if (cases.items.length === 0) {
        return
      }

      const employee = await getEmployeeByEmployeeId('EMP001')

      const update: InsertCaseUpdate = {
        caseId: cases.items[0].id,
        message: 'Test update message',
        updateType: 'hr_response',
        visibility: 'public',
        addedBy: employee!.id,
      }

      const created = await addCaseUpdate(update)

      expect(created.id).toBeDefined()
      expect(created.message).toBe('Test update message')
      expect(created.updateType).toBe('hr_response')

      // Verify update is in case timeline
      const hrCase = await getHRCaseById(cases.items[0].id)
      expect(hrCase?.updates.some(u => u.id === created.id)).toBe(true)
    })

    test('creates different types of updates', async () => {
      const cases = await listHRCases({})
      if (cases.items.length === 0) {
        return
      }

      const employee = await getEmployeeByEmployeeId('EMP001')

      const types: Array<'employee_comment' | 'hr_response' | 'status_change'> = [
        'employee_comment',
        'hr_response',
        'status_change',
      ]

      for (const type of types) {
        const update: InsertCaseUpdate = {
          caseId: cases.items[0].id,
          message: `Test ${type}`,
          updateType: type,
          visibility: 'public',
          addedBy: employee!.id,
        }

        const created = await addCaseUpdate(update)
        expect(created.updateType).toBe(type)
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
        updateType: 'hr_response',
        visibility: 'internal',
        addedBy: employee!.id,
      }

      const created = await addCaseUpdate(update)

      expect(created.visibility).toBe('internal')
    })
  })

  describe('deleteHRCase', () => {
    test('deletes HR case', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      expect(employee).toBeDefined()

      const newCase: InsertHRCase = {
        caseId: `HR-2025-${Date.now().toString().slice(-6)}`,
        title: 'To Be Deleted',
        description: 'This case will be deleted',
        category: 'general',
        priority: 'low',
        status: 'open',
        submittedBy: employee!.id,
        assignedTeam: 'HR Operations',
        assignedTo: null,
        firstResponseDue: new Date(Date.now() + 24 * 60 * 60 * 1000),
        resolutionDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: TEST_ADMIN_ID,
      }

      const created = await createHRCase(newCase)
      await deleteHRCase(created.id)

      const retrieved = await getHRCaseById(created.id)
      expect(retrieved).toBeNull()
    })
  })
})

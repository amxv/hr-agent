import { describe, test, expect, beforeEach } from 'vitest'
import {
  listLeaveBalances,
  getLeaveBalancesByEmployeeId,
  updateLeaveBalance,
  listBlackoutDates,
  createBlackoutDate,
  deleteBlackoutDate,
  getLeavePolicy,
  getEmployeeByEmployeeId,
} from '@/lib/db/queries'
import { resetTestDatabase, TEST_ADMIN_ID } from '../../helpers/test-db'
import type { InsertBlackoutDate } from '@/lib/db/schema'

describe('Leave Balance Queries', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  describe('listLeaveBalances', () => {
    test('returns all leave balances', async () => {
      const result = await listLeaveBalances({})

      expect(result.total).toBeGreaterThan(0)
      expect(result.items).toBeDefined()
      expect(result.items.length).toBeGreaterThan(0)
    })

    test('filters by employee', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      expect(employee).toBeDefined()

      const result = await listLeaveBalances({
        employeeId: employee!.id,
      })

      expect(result.items.every(b => b.employeeId === employee!.id)).toBe(true)
    })

    test('filters by leave type', async () => {
      const result = await listLeaveBalances({
        leaveType: 'vacation',
      })

      expect(result.items.every(b => b.leaveType === 'vacation')).toBe(true)
    })

    test('includes employee details in results', async () => {
      const result = await listLeaveBalances({})

      expect(result.items[0].employee).toBeDefined()
      expect(result.items[0].employee.fullName).toBeDefined()
      expect(result.items[0].employee.employeeId).toBeDefined()
    })

    test('supports pagination', async () => {
      const page1 = await listLeaveBalances({ limit: 2, offset: 0 })
      const page2 = await listLeaveBalances({ limit: 2, offset: 2 })

      expect(page1.items.length).toBeLessThanOrEqual(2)
      if (page1.total > 2) {
        expect(page2.items.length).toBeGreaterThan(0)
      }
    })
  })

  describe('getLeaveBalancesByEmployeeId', () => {
    test('returns all leave types for employee', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      expect(employee).toBeDefined()

      const balances = await getLeaveBalancesByEmployeeId(employee!.id)

      expect(balances).toBeDefined()
      expect(balances.length).toBeGreaterThan(0)

      const leaveTypes = balances.map(b => b.leaveType)
      expect(leaveTypes).toContain('vacation')
    })

    test('returns empty array for employee with no balances', async () => {
      const balances = await getLeaveBalancesByEmployeeId('00000000-0000-0000-0000-000000000000')

      expect(balances).toEqual([])
    })

    test('includes all balance fields', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      expect(employee).toBeDefined()

      const balances = await getLeaveBalancesByEmployeeId(employee!.id)

      expect(balances[0]).toHaveProperty('leaveType')
      expect(balances[0]).toHaveProperty('currentBalance')
      expect(balances[0]).toHaveProperty('accruedYTD')
      expect(balances[0]).toHaveProperty('usedYTD')
      expect(balances[0]).toHaveProperty('plannedYTD')
    })
  })

  describe('updateLeaveBalance', () => {
    test('updates balance values', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      expect(employee).toBeDefined()

      const updated = await updateLeaveBalance(
        employee!.id,
        'vacation',
        {
          currentBalance: '25.0',
          accruedYTD: '20.0',
          usedYTD: '5.0',
          updatedBy: TEST_ADMIN_ID,
        }
      )

      expect(updated.currentBalance).toBe('25.0')
      expect(updated.accruedYTD).toBe('20.0')
      expect(updated.usedYTD).toBe('5.0')
    })

    test('preserves non-updated fields', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      expect(employee).toBeDefined()

      const balances = await getLeaveBalancesByEmployeeId(employee!.id)
      const vacationBalance = balances.find(b => b.leaveType === 'vacation')

      const updated = await updateLeaveBalance(
        employee!.id,
        'vacation',
        {
          currentBalance: '25.0',
          updatedBy: TEST_ADMIN_ID,
        }
      )

      expect(updated.currentBalance).toBe('25.0')
      // Other fields should remain unchanged
      expect(updated.leaveType).toBe('vacation')
    })

    test('updates metadata fields', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      expect(employee).toBeDefined()

      const updated = await updateLeaveBalance(
        employee!.id,
        'vacation',
        {
          currentBalance: '25.0',
          updatedBy: TEST_ADMIN_ID,
        }
      )

      expect(updated.updatedBy).toBe(TEST_ADMIN_ID)
      expect(updated.updatedAt).toBeDefined()
    })
  })

  describe('listBlackoutDates', () => {
    test('returns all blackout dates', async () => {
      const result = await listBlackoutDates({})

      expect(result.items).toBeDefined()
      expect(Array.isArray(result.items)).toBe(true)
    })

    test('filters by department', async () => {
      const result = await listBlackoutDates({
        department: 'Engineering',
      })

      expect(result.items.every(
        bd => bd.department === 'Engineering' || bd.department === null
      )).toBe(true)
    })

    test('includes date range information', async () => {
      const result = await listBlackoutDates({})

      if (result.items.length > 0) {
        expect(result.items[0]).toHaveProperty('startDate')
        expect(result.items[0]).toHaveProperty('endDate')
        expect(result.items[0]).toHaveProperty('reason')
      }
    })
  })

  describe('createBlackoutDate', () => {
    test('creates blackout date', async () => {
      const now = new Date()
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      const newBlackout: InsertBlackoutDate = {
        startDate: now.toISOString().split('T')[0],
        endDate: nextMonth.toISOString().split('T')[0],
        reason: 'Test Blackout Period',
        department: 'Engineering',
        createdBy: TEST_ADMIN_ID,
      }

      const created = await createBlackoutDate(newBlackout)

      expect(created.id).toBeDefined()
      expect(created.reason).toBe('Test Blackout Period')
      expect(created.department).toBe('Engineering')
    })

    test('creates company-wide blackout date', async () => {
      const now = new Date()
      const newBlackout: InsertBlackoutDate = {
        startDate: now.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
        reason: 'Company Holiday',
        department: null,
        createdBy: TEST_ADMIN_ID,
      }

      const created = await createBlackoutDate(newBlackout)

      expect(created.department).toBeNull()
      expect(created.reason).toBe('Company Holiday')
    })
  })

  describe('deleteBlackoutDate', () => {
    test('deletes blackout date', async () => {
      const now = new Date()
      const newBlackout: InsertBlackoutDate = {
        startDate: now.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
        reason: 'To Be Deleted',
        department: 'Engineering',
        createdBy: TEST_ADMIN_ID,
      }

      const created = await createBlackoutDate(newBlackout)
      await deleteBlackoutDate(created.id)

      const remaining = await listBlackoutDates({})
      expect(remaining.items.find(bd => bd.id === created.id)).toBeUndefined()
    })
  })

  describe('getLeavePolicy', () => {
    test('returns leave policy', async () => {
      const policy = await getLeavePolicy()

      expect(policy).toBeDefined()
      expect(policy).toHaveProperty('minNoticeDays')
      expect(policy).toHaveProperty('maxConsecutiveDays')
    })

    test('returns department-specific policy if available', async () => {
      const policy = await getLeavePolicy('Engineering')

      expect(policy).toBeDefined()
      expect(policy.department).toBe('Engineering')
    })

    test('returns default policy if department not found', async () => {
      const policy = await getLeavePolicy('NonExistentDepartment')

      expect(policy).toBeDefined()
      // Should return default policy
    })
  })
})

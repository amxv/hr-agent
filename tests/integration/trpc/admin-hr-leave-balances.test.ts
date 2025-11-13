import { describe, test, expect, beforeEach } from 'vitest'
import { adminCaller, userCaller } from '../helpers/trpc-caller'
import { resetTestDatabase } from '../../helpers/test-db'

describe('admin.hr.leaveBalances tRPC procedures', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  describe('list', () => {
    test('returns all leave balances', async () => {
      const result = await adminCaller.hr.leaveBalances.list({})

      expect(result.total).toBeGreaterThan(0)
      expect(result.items).toBeDefined()
      expect(result.items[0]).toHaveProperty('leaveType')
      expect(result.items[0]).toHaveProperty('currentBalance')
      expect(result.items[0]).toHaveProperty('employee')
    })

    test('filters by employee', async () => {
      const employees = await adminCaller.hr.employees.list({})
      const employee = employees.items[0]

      const result = await adminCaller.hr.leaveBalances.list({
        employeeId: employee.id,
      })

      expect(result.items.every(b => b.employeeId === employee.id)).toBe(true)
    })

    test('filters by leave type', async () => {
      const result = await adminCaller.hr.leaveBalances.list({
        leaveType: 'vacation',
      })

      expect(result.items.every(b => b.leaveType === 'vacation')).toBe(true)
    })

    test('includes employee details', async () => {
      const result = await adminCaller.hr.leaveBalances.list({})

      expect(result.items[0].employee).toBeDefined()
      expect(result.items[0].employee.fullName).toBeDefined()
    })

    test('requires admin role', async () => {
      await expect(
        userCaller.hr.leaveBalances.list({})
      ).rejects.toThrow()
    })

    test('supports pagination', async () => {
      const result = await adminCaller.hr.leaveBalances.list({
        limit: 2,
        offset: 0,
      })

      expect(result.items.length).toBeLessThanOrEqual(2)
    })
  })

  describe('update', () => {
    test('updates balance values', async () => {
      const balances = await adminCaller.hr.leaveBalances.list({})
      const balance = balances.items[0]

      const result = await adminCaller.hr.leaveBalances.update({
        employeeId: balance.employeeId,
        leaveType: balance.leaveType,
        data: {
          currentBalance: '30.0',
          accruedYTD: '25.0',
          usedYTD: '5.0',
        },
      })

      expect(result.success).toBe(true)
      expect(result.data.currentBalance).toBe('30.0')
      expect(result.data.accruedYTD).toBe('25.0')
    })

    test('validates balance values', async () => {
      const balances = await adminCaller.hr.leaveBalances.list({})
      const balance = balances.items[0]

      await expect(
        adminCaller.hr.leaveBalances.update({
          employeeId: balance.employeeId,
          leaveType: balance.leaveType,
          data: {
            currentBalance: '-10.0', // negative balance
          },
        })
      ).rejects.toThrow()
    })

    test('throws NOT_FOUND for non-existent balance', async () => {
      await expect(
        adminCaller.hr.leaveBalances.update({
          employeeId: '00000000-0000-0000-0000-000000000000',
          leaveType: 'vacation',
          data: {
            currentBalance: '10.0',
          },
        })
      ).rejects.toThrow('NOT_FOUND')
    })

    test('requires admin role', async () => {
      const balances = await adminCaller.hr.leaveBalances.list({})
      const balance = balances.items[0]

      await expect(
        userCaller.hr.leaveBalances.update({
          employeeId: balance.employeeId,
          leaveType: balance.leaveType,
          data: {
            currentBalance: '30.0',
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('blackoutDates', () => {
    describe('list', () => {
      test('returns all blackout dates', async () => {
        const result = await adminCaller.hr.leaveBalances.blackoutDates.list({})

        expect(result.items).toBeDefined()
        expect(Array.isArray(result.items)).toBe(true)
      })

      test('filters by department', async () => {
        const result = await adminCaller.hr.leaveBalances.blackoutDates.list({
          department: 'Engineering',
        })

        expect(result.items.every(
          bd => bd.department === 'Engineering' || bd.department === null
        )).toBe(true)
      })
    })

    describe('create', () => {
      test('creates blackout date', async () => {
        const now = new Date()
        const nextMonth = new Date(now)
        nextMonth.setMonth(nextMonth.getMonth() + 1)

        const result = await adminCaller.hr.leaveBalances.blackoutDates.create({
          startDate: now.toISOString().split('T')[0],
          endDate: nextMonth.toISOString().split('T')[0],
          reason: 'Test Blackout Period',
          department: 'Engineering',
        })

        expect(result.success).toBe(true)
        expect(result.data.reason).toBe('Test Blackout Period')
      })

      test('validates date range', async () => {
        const now = new Date()
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)

        await expect(
          adminCaller.hr.leaveBalances.blackoutDates.create({
            startDate: now.toISOString().split('T')[0],
            endDate: yesterday.toISOString().split('T')[0], // end before start
            reason: 'Invalid',
            department: null,
          })
        ).rejects.toThrow()
      })
    })

    describe('delete', () => {
      test('deletes blackout date', async () => {
        const now = new Date()
        const created = await adminCaller.hr.leaveBalances.blackoutDates.create({
          startDate: now.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0],
          reason: 'To Be Deleted',
          department: null,
        })

        const result = await adminCaller.hr.leaveBalances.blackoutDates.delete({
          id: created.data.id,
        })

        expect(result.success).toBe(true)

        const remaining = await adminCaller.hr.leaveBalances.blackoutDates.list({})
        expect(remaining.items.find(bd => bd.id === created.data.id)).toBeUndefined()
      })
    })
  })
})

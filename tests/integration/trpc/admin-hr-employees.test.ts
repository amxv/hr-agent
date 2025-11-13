import { describe, test, expect, beforeEach } from 'vitest'
import { adminCaller, userCaller } from '../helpers/trpc-caller'
import { resetTestDatabase, TEST_ADMIN_ID } from '../../helpers/test-db'
import type { InsertEmployee } from '@/lib/db/schema'

describe('admin.hr.employees tRPC procedures', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  describe('list', () => {
    test('returns paginated employee list', async () => {
      const result = await adminCaller.hr.employees.list({
        limit: 10,
        offset: 0,
      })

      expect(result.total).toBeGreaterThan(0)
      expect(result.items).toBeDefined()
      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items[0]).toHaveProperty('employeeId')
      expect(result.items[0]).toHaveProperty('fullName')
    })

    test('supports search by fullName', async () => {
      const result = await adminCaller.hr.employees.list({
        searchField: 'fullName',
        searchValue: 'John',
      })

      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items[0].fullName).toContain('John')
    })

    test('supports search by employeeId', async () => {
      const result = await adminCaller.hr.employees.list({
        searchField: 'employeeId',
        searchValue: 'EMP001',
      })

      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items[0].employeeId).toContain('EMP001')
    })

    test('filters by employment status', async () => {
      const result = await adminCaller.hr.employees.list({
        employmentStatus: 'active',
      })

      expect(result.items.every(e => e.employmentStatus === 'active')).toBe(true)
    })

    test('filters by department', async () => {
      const result = await adminCaller.hr.employees.list({
        department: 'Engineering',
      })

      expect(result.items.every(e => e.department === 'Engineering')).toBe(true)
    })

    test('requires admin role', async () => {
      await expect(
        userCaller.hr.employees.list({})
      ).rejects.toThrow()
    })

    test('respects pagination limits', async () => {
      const result = await adminCaller.hr.employees.list({
        limit: 2,
        offset: 0,
      })

      expect(result.items.length).toBeLessThanOrEqual(2)
    })
  })

  describe('get', () => {
    test('returns employee by id', async () => {
      const employees = await adminCaller.hr.employees.list({})
      const employee = await adminCaller.hr.employees.get({
        id: employees.items[0].id,
      })

      expect(employee).toBeDefined()
      expect(employee.id).toBe(employees.items[0].id)
      expect(employee).toHaveProperty('fullName')
      expect(employee).toHaveProperty('email')
    })

    test('throws NOT_FOUND for invalid id', async () => {
      await expect(
        adminCaller.hr.employees.get({
          id: '00000000-0000-0000-0000-000000000000',
        })
      ).rejects.toThrow('NOT_FOUND')
    })

    test('requires admin role', async () => {
      const employees = await adminCaller.hr.employees.list({})
      await expect(
        userCaller.hr.employees.get({
          id: employees.items[0].id,
        })
      ).rejects.toThrow()
    })
  })

  describe('create', () => {
    test('creates new employee with valid data', async () => {
      const now = new Date()
      const newEmployee = {
        employeeId: 'EMP999',
        fullName: 'New Employee',
        email: 'new@example.com',
        phoneExtension: 'x9999',
        jobTitle: 'Software Engineer',
        department: 'Engineering',
        location: 'Remote',
        workMode: 'remote' as const,
        employmentStatus: 'active' as const,
        startDate: now.toISOString().split('T')[0],
        yearsOfService: '0.0',
        reportsTo: null,
      }

      const result = await adminCaller.hr.employees.create(newEmployee)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data.employeeId).toBe('EMP999')
      expect(result.data.id).toBeDefined()
    })

    test('validates required fields', async () => {
      await expect(
        adminCaller.hr.employees.create({
          employeeId: 'EMP999',
          // missing required fields
        } as any)
      ).rejects.toThrow()
    })

    test('prevents duplicate employeeId', async () => {
      const now = new Date()
      await expect(
        adminCaller.hr.employees.create({
          employeeId: 'EMP001', // already exists
          fullName: 'Duplicate',
          email: 'dupe@example.com',
          phoneExtension: 'x0001',
          jobTitle: 'Engineer',
          department: 'Engineering',
          location: 'Remote',
          workMode: 'remote' as const,
          employmentStatus: 'active' as const,
          startDate: now.toISOString().split('T')[0],
          yearsOfService: '0.0',
          reportsTo: null,
        })
      ).rejects.toThrow()
    })

    test('requires admin role', async () => {
      const now = new Date()
      await expect(
        userCaller.hr.employees.create({
          employeeId: 'EMP999',
          fullName: 'Test',
          email: 'test@example.com',
          phoneExtension: 'x9999',
          jobTitle: 'Engineer',
          department: 'Engineering',
          location: 'Remote',
          workMode: 'remote' as const,
          employmentStatus: 'active' as const,
          startDate: now.toISOString().split('T')[0],
          yearsOfService: '0.0',
          reportsTo: null,
        })
      ).rejects.toThrow()
    })
  })

  describe('update', () => {
    test('updates employee fields', async () => {
      const employees = await adminCaller.hr.employees.list({})
      const employee = employees.items[0]

      const result = await adminCaller.hr.employees.update({
        id: employee.id,
        data: {
          jobTitle: 'Senior Engineer',
          department: 'Engineering',
        },
      })

      expect(result.success).toBe(true)
      expect(result.data.jobTitle).toBe('Senior Engineer')
    })

    test('validates update data', async () => {
      const employees = await adminCaller.hr.employees.list({})

      await expect(
        adminCaller.hr.employees.update({
          id: employees.items[0].id,
          data: {
            email: 'invalid-email', // invalid format
          },
        })
      ).rejects.toThrow()
    })

    test('throws NOT_FOUND for non-existent employee', async () => {
      await expect(
        adminCaller.hr.employees.update({
          id: '00000000-0000-0000-0000-000000000000',
          data: { jobTitle: 'Test' },
        })
      ).rejects.toThrow('NOT_FOUND')
    })

    test('requires admin role', async () => {
      const employees = await adminCaller.hr.employees.list({})
      await expect(
        userCaller.hr.employees.update({
          id: employees.items[0].id,
          data: { jobTitle: 'Test' },
        })
      ).rejects.toThrow()
    })
  })

  describe('delete', () => {
    test('soft deletes employee', async () => {
      const employees = await adminCaller.hr.employees.list({})
      const employee = employees.items[0]

      const result = await adminCaller.hr.employees.delete({
        id: employee.id,
      })

      expect(result.success).toBe(true)

      // Employee should no longer be in active list
      const activeEmployees = await adminCaller.hr.employees.list({
        employmentStatus: 'active',
      })
      expect(activeEmployees.items.find(e => e.id === employee.id)).toBeUndefined()
    })

    test('throws NOT_FOUND for non-existent employee', async () => {
      await expect(
        adminCaller.hr.employees.delete({
          id: '00000000-0000-0000-0000-000000000000',
        })
      ).rejects.toThrow('NOT_FOUND')
    })

    test('requires admin role', async () => {
      const employees = await adminCaller.hr.employees.list({})
      await expect(
        userCaller.hr.employees.delete({
          id: employees.items[0].id,
        })
      ).rejects.toThrow()
    })
  })
})

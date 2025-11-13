import { describe, test, expect, beforeEach } from 'vitest'
import {
  listEmployees,
  getEmployeeById,
  getEmployeeByEmployeeId,
  createEmployee,
  updateEmployee,
  softDeleteEmployee,
} from '@/lib/db/queries'
import { resetTestDatabase, TEST_ADMIN_ID } from '../../helpers/test-db'
import type { InsertEmployee } from '@/lib/db/schema'

describe.sequential('Employee Queries', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  describe('listEmployees', () => {
    test('returns all employees when no filters applied', async () => {
      const result = await listEmployees({})

      expect(result.total).toBeGreaterThan(0)
      expect(result.items).toBeDefined()
      expect(result.items.length).toBeGreaterThan(0)
    })

    test('filters by search value in fullName', async () => {
      const result = await listEmployees({
        searchField: 'fullName',
        searchValue: 'John',
      })

      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items[0].fullName).toContain('John')
    })

    test('filters by employment status', async () => {
      const result = await listEmployees({
        status: 'active',
      })

      expect(result.items.every(e => e.employmentStatus === 'active')).toBe(true)
    })

    test('filters by department', async () => {
      const result = await listEmployees({
        department: 'Engineering',
      })

      expect(result.items.every(e => e.department === 'Engineering')).toBe(true)
    })

    test('supports pagination with limit and offset', async () => {
      const page1 = await listEmployees({ limit: 2, offset: 0 })
      const page2 = await listEmployees({ limit: 2, offset: 2 })

      expect(page1.items.length).toBeLessThanOrEqual(2)
      expect(page2.items.length).toBeLessThanOrEqual(2)

      if (page1.items.length > 0 && page2.items.length > 0) {
        expect(page1.items[0].id).not.toBe(page2.items[0].id)
      }
    })

    test('search is case-insensitive', async () => {
      const resultLower = await listEmployees({
        searchField: 'fullName',
        searchValue: 'john',
      })
      const resultUpper = await listEmployees({
        searchField: 'fullName',
        searchValue: 'JOHN',
      })

      expect(resultLower.total).toBe(resultUpper.total)
    })
  })

  describe('getEmployeeByEmployeeId', () => {
    test('returns employee with valid employeeId', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')

      expect(employee).toBeDefined()
      expect(employee?.employeeId).toBe('EMP001')
      expect(employee?.fullName).toBeDefined()
    })

    test('returns null for invalid employeeId', async () => {
      const employee = await getEmployeeByEmployeeId('INVALID_ID')

      expect(employee).toBeNull()
    })

    test('includes manager details when present', async () => {
      const employee = await getEmployeeByEmployeeId('EMP200')

      if (employee && employee.reportsTo) {
        expect(employee.manager).toBeDefined()
        expect(employee.manager?.fullName).toBeDefined()
      }
    })
  })

  describe('getEmployeeById', () => {
    test('returns employee with valid id', async () => {
      const allEmployees = await listEmployees({})
      const firstEmployee = allEmployees.items[0]

      const employee = await getEmployeeById(firstEmployee.id)

      expect(employee).toBeDefined()
      expect(employee?.id).toBe(firstEmployee.id)
    })

    test('returns null for invalid id', async () => {
      const employee = await getEmployeeById('00000000-0000-0000-0000-000000000000')

      expect(employee).toBeNull()
    })
  })

  describe('createEmployee', () => {
    test('creates employee with required fields', async () => {
      const now = new Date()
      const newEmployee: InsertEmployee = {
        employeeId: 'EMP999',
        fullName: 'Test Employee',
        email: 'test@example.com',
        phoneExtension: 'x9999',
        jobTitle: 'Software Engineer',
        department: 'Engineering',
        location: 'Remote',
        workMode: 'remote',
        employmentStatus: 'active',
        startDate: now.toISOString().split('T')[0],
        yearsOfService: '0.0',
        reportsTo: null,
        createdBy: TEST_ADMIN_ID,
        workAuthorization: {
          status: 'citizen',
          expiryDate: null,
          requiresRenewal: false,
          daysUntilExpiry: null,
        },
      }

      const created = await createEmployee(newEmployee)

      expect(created.id).toBeDefined()
      expect(created.employeeId).toBe('EMP999')
      expect(created.fullName).toBe('Test Employee')
      expect(created.email).toBe('test@example.com')
    })

    test('creates employee with optional fields', async () => {
      const now = new Date()
      const newEmployee: InsertEmployee = {
        employeeId: 'EMP998',
        fullName: 'Test Employee 2',
        email: 'test2@example.com',
        phoneExtension: 'x9998',
        jobTitle: 'Engineer',
        department: 'Engineering',
        location: 'San Francisco',
        workMode: 'hybrid',
        employmentStatus: 'active',
        startDate: now.toISOString().split('T')[0],
        yearsOfService: '1.5',
        reportsTo: null,
        createdBy: TEST_ADMIN_ID,
        skills: ['TypeScript', 'React'],
        certifications: ['AWS Certified'],
        emergencyContact: {
          name: 'Jane Doe',
          relationship: 'Spouse',
          phone: '555-0123',
        },
        workAuthorization: {
          status: 'citizen',
          expiryDate: null,
          requiresRenewal: false,
          daysUntilExpiry: null,
        },
      }

      const created = await createEmployee(newEmployee)

      expect(created.skills).toEqual(['TypeScript', 'React'])
      expect(created.certifications).toEqual(['AWS Certified'])
      expect(created.emergencyContact).toBeDefined()
    })

    test('throws error for duplicate employeeId', async () => {
      // EMP001 should already exist from seed data
      const now = new Date()
      const duplicateEmployee: InsertEmployee = {
        employeeId: 'EMP001',
        fullName: 'Duplicate',
        email: 'duplicate@example.com',
        phoneExtension: 'x0001',
        jobTitle: 'Engineer',
        department: 'Engineering',
        location: 'Remote',
        workMode: 'remote',
        employmentStatus: 'active',
        startDate: now.toISOString().split('T')[0],
        yearsOfService: '0.0',
        reportsTo: null,
        createdBy: TEST_ADMIN_ID,
      }

      await expect(createEmployee(duplicateEmployee)).rejects.toThrow()
    })
  })

  describe('updateEmployee', () => {
    test('updates employee fields', async () => {
      const employees = await listEmployees({})
      const employee = employees.items[0]

      const updated = await updateEmployee(employee.id, {
        jobTitle: 'Senior Engineer',
        department: 'Engineering',
        updatedBy: TEST_ADMIN_ID,
      })

      expect(updated.jobTitle).toBe('Senior Engineer')
      expect(updated.updatedBy).toBe(TEST_ADMIN_ID)
      expect(updated.updatedAt).toBeDefined()
    })

    test('preserves non-updated fields', async () => {
      const employees = await listEmployees({})
      const employee = employees.items[0]
      const originalEmail = employee.email

      const updated = await updateEmployee(employee.id, {
        jobTitle: 'New Title',
        updatedBy: TEST_ADMIN_ID,
      })

      expect(updated.email).toBe(originalEmail)
      expect(updated.jobTitle).toBe('New Title')
    })

    test('updates nested objects', async () => {
      const employees = await listEmployees({})
      const employee = employees.items[0]

      const updated = await updateEmployee(employee.id, {
        emergencyContact: {
          name: 'New Contact',
          relationship: 'Friend',
          phone: '555-9999',
        },
        updatedBy: TEST_ADMIN_ID,
      })

      expect(updated.emergencyContact).toEqual({
        name: 'New Contact',
        relationship: 'Friend',
        phone: '555-9999',
      })
    })

    test('throws error for non-existent employee', async () => {
      await expect(
        updateEmployee('00000000-0000-0000-0000-000000000000', {
          jobTitle: 'Test',
          updatedBy: TEST_ADMIN_ID,
        })
      ).rejects.toThrow()
    })
  })

  describe('softDeleteEmployee', () => {
    test('soft deletes employee', async () => {
      const employees = await listEmployees({})
      const employee = employees.items[0]

      await softDeleteEmployee(employee.id, TEST_ADMIN_ID)

      // Employee should no longer be in active list
      const activeEmployees = await listEmployees({ status: 'active' })
      expect(activeEmployees.items.find(e => e.id === employee.id)).toBeUndefined()
    })

    test('preserves employee data after soft delete', async () => {
      const employees = await listEmployees({})
      const employee = employees.items[0]

      await softDeleteEmployee(employee.id, TEST_ADMIN_ID)

      // Should still be retrievable by ID if we query with includeDeleted
      const deletedEmployee = await getEmployeeById(employee.id)
      if (deletedEmployee) {
        expect(deletedEmployee.deletedAt).toBeDefined()
        expect(deletedEmployee.deletedBy).toBe(TEST_ADMIN_ID)
      }
    })
  })
})

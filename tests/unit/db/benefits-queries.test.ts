import { describe, test, expect, beforeEach } from 'vitest'
import {
  listBenefitsPlans,
  getBenefitsPlanById,
  createBenefitsPlan,
  updateBenefitsPlan,
  deleteBenefitsPlan,
  listEnrollments,
  getEnrollmentByEmployeeId,
  upsertEnrollment,
  listDependents,
  createDependent,
  updateDependent,
  deleteDependent,
  getCurrentEnrollmentPeriod,
  getEmployeeByEmployeeId,
} from '@/lib/db/queries'
import { resetTestDatabase, TEST_ADMIN_ID } from '../../helpers/test-db'
import type { InsertBenefitsPlan, InsertBenefitsEnrollment, InsertDependent } from '@/lib/db/schema'

describe('Benefits Queries', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  describe('listBenefitsPlans', () => {
    test('returns all benefits plans', async () => {
      const result = await listBenefitsPlans({})

      expect(result.items).toBeDefined()
      expect(Array.isArray(result.items)).toBe(true)
    })

    test('filters by category', async () => {
      const result = await listBenefitsPlans({
        category: 'health',
      })

      expect(result.items.every(p => p.category === 'health')).toBe(true)
    })

    test('filters by tier', async () => {
      const result = await listBenefitsPlans({
        tier: 'gold',
      })

      expect(result.items.every(p => p.tier === 'gold')).toBe(true)
    })

    test('includes plan details', async () => {
      const result = await listBenefitsPlans({})

      if (result.items.length > 0) {
        expect(result.items[0]).toHaveProperty('planName')
        expect(result.items[0]).toHaveProperty('monthlyPremium')
        expect(result.items[0]).toHaveProperty('coverage')
      }
    })
  })

  describe('getBenefitsPlanById', () => {
    test('returns plan with valid id', async () => {
      const plans = await listBenefitsPlans({})
      if (plans.items.length === 0) {
        return
      }

      const plan = await getBenefitsPlanById(plans.items[0].id)

      expect(plan).toBeDefined()
      expect(plan?.id).toBe(plans.items[0].id)
    })

    test('returns null for invalid id', async () => {
      const plan = await getBenefitsPlanById('00000000-0000-0000-0000-000000000000')

      expect(plan).toBeNull()
    })
  })

  describe('createBenefitsPlan', () => {
    test('creates benefits plan', async () => {
      const newPlan: InsertBenefitsPlan = {
        planCode: 'TEST-HEALTH-001',
        planName: 'Test Health Plan',
        category: 'health',
        tier: 'gold',
        carrier: 'Test Insurance Co.',
        monthlyPremium: '500.00',
        annualDeductible: '2000.00',
        outOfPocketMax: '8000.00',
        coverage: {
          medical: '100% after deductible',
          prescription: '$10 copay',
        },
        isActive: true,
        createdBy: TEST_ADMIN_ID,
      }

      const created = await createBenefitsPlan(newPlan)

      expect(created.id).toBeDefined()
      expect(created.planCode).toBe('TEST-HEALTH-001')
      expect(created.planName).toBe('Test Health Plan')
    })
  })

  describe('listEnrollments', () => {
    test('returns all enrollments', async () => {
      const result = await listEnrollments({})

      expect(result.items).toBeDefined()
      expect(Array.isArray(result.items)).toBe(true)
    })

    test('filters by employee', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      if (!employee) return

      const result = await listEnrollments({
        employeeId: employee.id,
      })

      expect(result.items.every(e => e.employeeId === employee.id)).toBe(true)
    })

    test('includes employee and plan details', async () => {
      const result = await listEnrollments({})

      if (result.items.length > 0) {
        expect(result.items[0]).toHaveProperty('employee')
        expect(result.items[0]).toHaveProperty('plan')
        if (result.items[0].employee) {
          expect(result.items[0].employee).toHaveProperty('fullName')
        }
      }
    })
  })

  describe('getEnrollmentByEmployeeId', () => {
    test('returns enrollments for employee', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      if (!employee) return

      const enrollments = await getEnrollmentByEmployeeId(employee.id)

      expect(Array.isArray(enrollments)).toBe(true)
      expect(enrollments.every(e => e.employeeId === employee.id)).toBe(true)
    })
  })

  describe('listDependents', () => {
    test('returns dependents for employee', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      if (!employee) return

      const dependents = await listDependents(employee.id)

      expect(Array.isArray(dependents)).toBe(true)
    })

    test('includes dependent details', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      if (!employee) return

      const dependents = await listDependents(employee.id)

      if (dependents.length > 0) {
        expect(dependents[0]).toHaveProperty('fullName')
        expect(dependents[0]).toHaveProperty('relationship')
        expect(dependents[0]).toHaveProperty('dateOfBirth')
      }
    })
  })

  describe('createDependent', () => {
    test('creates dependent', async () => {
      const employee = await getEmployeeByEmployeeId('EMP001')
      if (!employee) return

      const newDependent: InsertDependent = {
        employeeId: employee.id,
        fullName: 'Test Dependent',
        relationship: 'child',
        dateOfBirth: '2015-01-01',
        ssn: null,
        isStudent: false,
        createdBy: TEST_ADMIN_ID,
      }

      const created = await createDependent(newDependent)

      expect(created.id).toBeDefined()
      expect(created.fullName).toBe('Test Dependent')
      expect(created.relationship).toBe('child')
    })
  })

  describe('getCurrentEnrollmentPeriod', () => {
    test('returns current enrollment period', async () => {
      const period = await getCurrentEnrollmentPeriod()

      if (period) {
        expect(period).toHaveProperty('periodName')
        expect(period).toHaveProperty('startDate')
        expect(period).toHaveProperty('endDate')
      }
    })
  })
})

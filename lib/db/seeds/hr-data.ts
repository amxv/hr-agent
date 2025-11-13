import "server-only";
import { count, eq, sql } from "drizzle-orm";
import { db } from "../client";
import {
  absence,
  benefitsEnrollment,
  benefitsPlan,
  blackoutDate,
  caseUpdate,
  dependent,
  employee,
  enrollmentPeriod,
  hrCase,
  leaveBalance,
  leavePolicy,
  leaveRequest,
  user,
} from "../schema";

/**
 * Checks if HR data has already been seeded
 */
export async function checkIfSeeded(): Promise<boolean> {
  const [result] = await db.select({ count: count() }).from(employee);
  return (result?.count ?? 0) > 0;
}

/**
 * Seeds user records for all employees and admin
 * Must be called BEFORE seeding employees to satisfy foreign key constraints
 */
export async function seedUsers(adminUserId: string): Promise<void> {
  // Ensure admin user exists by upserting based on ID
  // First delete any conflicting user with the same email but different ID
  await db
    .delete(user)
    .where(
      sql`${user.email} = 'admin@test.com' AND ${user.id} != ${adminUserId}`
    );

  // Create admin user using upsert on ID
  await db
    .insert(user)
    .values({
      id: adminUserId,
      name: "Test Admin",
      email: "admin@test.com",
      emailVerified: true,
      role: "admin",
    })
    .onConflictDoUpdate({
      target: user.id,
      set: {
        name: "Test Admin",
        email: "admin@test.com",
        emailVerified: true,
        role: "admin",
      },
    });

  // Create employee user records
  const employeeUsers = [
    {
      id: "user_EMP001",
      name: "John Doe",
      email: "john.doe@company.com",
      emailVerified: true,
    },
    {
      id: "user_EMP200",
      name: "Noor Al-Harbi",
      email: "noor.alharbi@company.com",
      emailVerified: true,
    },
    {
      id: "user_EMP301",
      name: "Maria Garcia",
      email: "maria.garcia@company.com",
      emailVerified: true,
    },
    {
      id: "user_EMP401",
      name: "Ahmed Hassan",
      email: "ahmed.hassan@company.com",
      emailVerified: true,
    },
    {
      id: "user_EMP501",
      name: "Jennifer Lee",
      email: "jennifer.lee@company.com",
      emailVerified: true,
    },
    {
      id: "user_EMP101",
      name: "Alice Johnson",
      email: "alice.johnson@company.com",
      emailVerified: true,
    },
    {
      id: "user_EMP102",
      name: "Bob Smith",
      email: "bob.smith@company.com",
      emailVerified: true,
    },
    {
      id: "user_EMP103",
      name: "Carol Martinez",
      email: "carol.martinez@company.com",
      emailVerified: true,
    },
    {
      id: "user_EMP104",
      name: "David Chen",
      email: "david.chen@company.com",
      emailVerified: true,
    },
    {
      id: "user_EMP105",
      name: "Eva Patel",
      email: "eva.patel@company.com",
      emailVerified: true,
    },
  ];

  // Insert all employee users using upsert (insert or update if exists)
  // This ensures users are created even if there are email conflicts
  for (const userData of employeeUsers) {
    // Delete any conflicting user with the same email but different ID
    await db
      .delete(user)
      .where(
        sql`${user.email} = ${userData.email} AND ${user.id} != ${userData.id}`
      );

    // Insert or update the employee user
    await db
      .insert(user)
      .values(userData)
      .onConflictDoUpdate({
        target: user.id,
        set: {
          name: userData.name,
          email: userData.email,
          emailVerified: userData.emailVerified,
        },
      });
  }
}

/**
 * Seeds employees matching mock data from people-search.ts
 */
export async function seedEmployees(
  adminUserId: string
): Promise<Array<{ id: string; employeeId: string }>> {
  const employeeData = [
    {
      userId: "user_EMP001",
      employeeId: "EMP001",
      fullName: "John Doe",
      email: "john.doe@company.com",
      phoneExtension: "x5001",
      jobTitle: "Engineering Manager",
      department: "Engineering",
      location: "San Francisco HQ",
      workMode: "office",
      employmentStatus: "active",
      startDate: "2020-03-15",
      yearsOfService: "4.6",
      workAuthorization: {
        status: "citizen",
        expiryDate: null,
        requiresRenewal: false,
        daysUntilExpiry: null,
      },
      managerId: null,
      directReports: [],
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
    {
      userId: "user_EMP200",
      employeeId: "EMP200",
      fullName: "Noor Al-Harbi",
      preferredName: "Noor",
      email: "noor.alharbi@company.com",
      phoneExtension: "x5432",
      jobTitle: "Senior Software Engineer",
      department: "Engineering",
      location: "San Francisco HQ",
      workMode: "hybrid",
      employmentStatus: "active",
      startDate: "2021-06-15",
      yearsOfService: "3.4",
      workAuthorization: {
        status: "work_visa_h1b",
        expiryDate: "2026-06-14",
        requiresRenewal: true,
        daysUntilExpiry: 565,
      },
      managerId: null,
      directReports: [],
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
    {
      userId: "user_EMP301",
      employeeId: "EMP301",
      fullName: "Maria Garcia",
      email: "maria.garcia@company.com",
      phoneExtension: "x5789",
      jobTitle: "Product Manager",
      department: "Product",
      location: "Austin Office",
      workMode: "remote",
      employmentStatus: "leave_of_absence",
      startDate: "2022-01-10",
      yearsOfService: "2.8",
      workAuthorization: {
        status: "permanent_resident",
        expiryDate: null,
        requiresRenewal: false,
        daysUntilExpiry: null,
      },
      managerId: null,
      directReports: [],
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
    {
      userId: "user_EMP401",
      employeeId: "EMP401",
      fullName: "Ahmed Hassan",
      email: "ahmed.hassan@company.com",
      phoneExtension: "x5234",
      jobTitle: "Sales Associate",
      department: "Sales",
      location: "Dubai Office",
      workMode: "office",
      employmentStatus: "probation",
      startDate: "2025-09-01",
      probationEndDate: "2025-12-01",
      yearsOfService: "0.2",
      workAuthorization: {
        status: "work_visa_other",
        expiryDate: "2027-08-31",
        requiresRenewal: true,
        daysUntilExpiry: 650,
      },
      managerId: null,
      directReports: [],
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
    {
      userId: "user_EMP501",
      employeeId: "EMP501",
      fullName: "Jennifer Lee",
      email: "jennifer.lee@company.com",
      jobTitle: "Marketing Manager",
      department: "Marketing",
      location: "New York Office",
      workMode: "hybrid",
      employmentStatus: "notice_period",
      startDate: "2019-11-20",
      lastWorkingDay: "2025-12-15",
      yearsOfService: "5.0",
      workAuthorization: {
        status: "citizen",
        expiryDate: null,
        requiresRenewal: false,
        daysUntilExpiry: null,
      },
      managerId: null,
      directReports: [],
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
  ] as const;

  // Insert employees - conflicts are ignored
  await db.insert(employee).values(employeeData).onConflictDoNothing();

  // Query for all the employees we just tried to insert
  // This ensures we get the records even if onConflictDoNothing prevented the insert
  const employeeIds = employeeData.map((e) => e.employeeId);
  const employees = await db
    .select({ id: employee.id, employeeId: employee.employeeId })
    .from(employee)
    .where(
      eq(employee.employeeId, employeeIds[0])
      // Note: inArray would be better but we need to check each one
    );

  // Get all employees by their employeeIds
  const allEmployees = await Promise.all(
    employeeIds.map((empId) =>
      db
        .select({ id: employee.id, employeeId: employee.employeeId })
        .from(employee)
        .where(eq(employee.employeeId, empId))
        .then((rows) => rows[0])
    )
  );

  return allEmployees.filter(Boolean);
}

/**
 * Seeds leave balances for all employees
 */
export async function seedLeaveBalances(
  employees: Array<{ id: string; employeeId: string }>,
  adminUserId: string
): Promise<void> {
  // Skip if no employees (prevents empty values() error)
  if (employees.length === 0) {
    console.log("No employees found, skipping leave balance seeding");
    return;
  }

  // Create leave balances for all employees
  const balanceValues = [];

  for (const emp of employees) {
    // Vacation balance
    balanceValues.push({
      employeeId: emp.id,
      leaveType: "vacation" as const,
      currentBalance: "18.5",
      accruedYTD: "20",
      usedYTD: "1.5",
      plannedYTD: "5.0",
      projectedYearEnd: "26.5",
      accrualRate: "1.67",
      accrualSchedule: "monthly" as const,
      carryoverLimit: 5,
      carryoverDeadline: "2026-03-31",
      updatedBy: adminUserId,
    });

    // Sick leave balance
    balanceValues.push({
      employeeId: emp.id,
      leaveType: "sick" as const,
      currentBalance: "12",
      accruedYTD: "12",
      usedYTD: "0",
      plannedYTD: "0",
      projectedYearEnd: "12",
      accrualRate: "1",
      accrualSchedule: "monthly" as const,
      carryoverLimit: 0,
      carryoverDeadline: "2025-12-31",
      updatedBy: adminUserId,
    });

    // Personal leave balance
    balanceValues.push({
      employeeId: emp.id,
      leaveType: "personal" as const,
      currentBalance: "3",
      accruedYTD: "3",
      usedYTD: "0",
      plannedYTD: "0",
      projectedYearEnd: "3",
      accrualRate: "0.25",
      accrualSchedule: "monthly" as const,
      carryoverLimit: 0,
      carryoverDeadline: "2025-12-31",
      updatedBy: adminUserId,
    });
  }

  if (balanceValues.length > 0) {
    await db.insert(leaveBalance).values(balanceValues).onConflictDoNothing();
  }
}

/**
 * Seeds blackout dates
 */
export async function seedBlackoutDates(adminUserId: string): Promise<void> {
  await db
    .insert(blackoutDate)
    .values([
      {
        startDate: "2025-11-15",
        endDate: "2025-11-30",
        reason: "Year-end release freeze",
        department: "Engineering",
        createdBy: adminUserId,
      },
      {
        startDate: "2025-12-15",
        endDate: "2025-12-31",
        reason: "Holiday season - limited approval",
        department: null, // Company-wide
        createdBy: adminUserId,
      },
    ])
    .onConflictDoNothing();
}

/**
 * Seeds global leave policy and department-specific policies
 */
export async function seedLeavePolicy(adminUserId: string): Promise<void> {
  await db
    .insert(leavePolicy)
    .values([
      {
        department: null, // Global policy
        minimumNotice: 14,
        maxConsecutiveDays: 15,
        requireApproval: true,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        department: 'Engineering',
        minimumNotice: 7,
        maxConsecutiveDays: 10,
        requireApproval: true,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
    ])
    .onConflictDoNothing();
}

/**
 * Seeds benefits plans matching benefits-info.ts mock data
 */
export async function seedBenefitsPlans(
  adminUserId: string
): Promise<Array<{ id: string; planCode: string }>> {
  const planData = [
    // Medical Plans
    {
      planCode: "MED001",
      category: "health",
      tier: "gold",
      planName: "Blue Shield PPO Gold",
      carrier: "Blue Shield of California",
      monthlyPremium: "250.00",
      annualDeductible: "1500.00",
      outOfPocketMax: "6000.00",
      isActive: true,
      coverage: {
        coPayPrimaryCare: "$25",
        coPaySpecialist: "$50",
        inNetworkCoverage: "80%",
        outOfNetworkCoverage: "60%",
        prescriptionCoverage: "$10 generic, $30 brand name, $50 specialty",
        preventiveCare: "Covered 100%",
        highlights: [
          "Access to large provider network",
          "No referrals needed for specialists",
          "Higher out-of-pocket costs",
          "Good for frequent healthcare users",
        ],
      },
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
    {
      planCode: "MED002",
      category: "health",
      tier: "platinum",
      planName: "Kaiser HMO Platinum",
      carrier: "Kaiser Permanente",
      monthlyPremium: "200.00",
      annualDeductible: "500.00",
      outOfPocketMax: "4000.00",
      isActive: true,
      coverage: {
        coPayPrimaryCare: "$15",
        coPaySpecialist: "$30",
        inNetworkCoverage: "100%",
        outOfNetworkCoverage: "0%",
        prescriptionCoverage: "$5 generic, $20 brand name, $40 specialty",
        preventiveCare: "Covered 100%",
        highlights: [
          "Integrated care model",
          "Lower monthly premiums",
          "Must use Kaiser facilities",
          "Referrals required for specialists",
          "No out-of-network coverage",
        ],
      },
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
    {
      planCode: "MED003",
      category: "health",
      tier: "hdhp",
      planName: "Blue Shield HDHP with HSA",
      carrier: "Blue Shield of California",
      monthlyPremium: "150.00",
      annualDeductible: "3000.00",
      outOfPocketMax: "6000.00",
      isActive: true,
      coverage: {
        coPayPrimaryCare: "$0",
        coPaySpecialist: "$0",
        inNetworkCoverage: "100%",
        outOfNetworkCoverage: "70%",
        prescriptionCoverage: "After deductible, then 80% covered",
        preventiveCare: "Covered 100%",
        highlights: [
          "Lowest monthly premium",
          "HSA-eligible (employer contributes $1,000/year)",
          "High deductible",
          "Best for healthy individuals",
          "Tax-advantaged savings",
        ],
      },
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
    // Dental Plans
    {
      planCode: "DEN001",
      category: "dental",
      tier: "ppo",
      planName: "Delta Dental PPO",
      carrier: "Delta Dental",
      monthlyPremium: "35.00",
      annualDeductible: "50.00",
      outOfPocketMax: "2000.00",
      isActive: true,
      annualMaximum: 2000,
      coverage: {
        preventiveCare: "Covered 100%",
        basicServices: "80% coverage",
        majorServices: "50% coverage",
        inNetworkCoverage: "80%",
        outOfNetworkCoverage: "60%",
      },
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
    {
      planCode: "DEN002",
      category: "dental",
      tier: "hmo",
      planName: "Cigna Dental HMO",
      carrier: "Cigna",
      monthlyPremium: "20.00",
      annualDeductible: "0.00",
      outOfPocketMax: "1500.00",
      isActive: true,
      annualMaximum: 1500,
      coverage: {
        preventiveCare: "Covered 100%",
        basicServices: "Copays apply",
        majorServices: "Copays apply",
        inNetworkCoverage: "100%",
        outOfNetworkCoverage: "0%",
      },
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
    // Vision Plans
    {
      planCode: "VIS001",
      category: "vision",
      tier: "standard",
      planName: "VSP Vision Care",
      carrier: "VSP",
      monthlyPremium: "10.00",
      annualDeductible: "0.00",
      outOfPocketMax: "0.00",
      isActive: true,
      coverage: {
        examCoverage: "Covered annually",
        frameAllowance: "$150 every 2 years",
        lenseCoverage: "Covered annually",
        contactsAllowance: "$150 in lieu of glasses",
      },
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
    {
      planCode: "VIS002",
      category: "vision",
      tier: "basic",
      planName: "EyeMed Vision",
      carrier: "EyeMed",
      monthlyPremium: "8.00",
      annualDeductible: "0.00",
      outOfPocketMax: "0.00",
      isActive: true,
      coverage: {
        examCoverage: "Covered annually",
        frameAllowance: "$130 every year",
        lenseCoverage: "Covered annually",
        contactsAllowance: "$130 in lieu of glasses",
      },
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
    // Retirement Plan
    {
      planCode: "401K001",
      category: "retirement",
      tier: "standard",
      planName: "Traditional 401(k)",
      carrier: "Fidelity",
      monthlyPremium: "0.00",
      annualDeductible: "0.00",
      outOfPocketMax: "0.00",
      isActive: true,
      employerMatchPercent: "6.00",
      vestingSchedule: "4 year graded vesting",
      coverage: {
        employerMatch: "100% match up to 6% of salary",
        contributionLimit: "$23,000",
        rothOption: "Available",
        catchUpContributions: "$7,500 for 50+",
      },
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
  ] as const;

  // Insert plans - conflicts are ignored
  await db.insert(benefitsPlan).values(planData).onConflictDoNothing();

  // Query for all the plans we just tried to insert
  const planCodes = planData.map((p) => p.planCode);
  const allPlans = await Promise.all(
    planCodes.map((pCode) =>
      db
        .select({ id: benefitsPlan.id, planCode: benefitsPlan.planCode })
        .from(benefitsPlan)
        .where(eq(benefitsPlan.planCode, pCode))
        .then((rows) => rows[0])
    )
  );

  return allPlans.filter(Boolean);
}

/**
 * Seeds benefits enrollments for employees
 */
export async function seedEnrollments(
  employees: Array<{ id: string; employeeId: string }>,
  plans: Array<{ id: string; planCode: string }>,
  adminUserId: string
): Promise<void> {
  // Find employees
  const johnDoe = employees.find((e) => e.employeeId === "EMP001");
  const noor = employees.find((e) => e.employeeId === "EMP200");
  const maria = employees.find((e) => e.employeeId === "EMP301");

  // Find plans
  const medicalPlan1 = plans.find((p) => p.planCode === "MED001");
  const medicalPlan2 = plans.find((p) => p.planCode === "MED002");
  const dentalPlan1 = plans.find((p) => p.planCode === "DEN001");
  const dentalPlan2 = plans.find((p) => p.planCode === "DEN002");
  const visionPlan = plans.find((p) => p.planCode === "VIS001");
  const retirementPlan = plans.find((p) => p.planCode === "401K001");

  // Create enrollment for John Doe (with family)
  if (johnDoe && medicalPlan1 && dentalPlan1 && visionPlan && retirementPlan) {
    await db
      .insert(benefitsEnrollment)
      .values({
        employeeId: johnDoe.id,
        medicalPlanId: medicalPlan1.id,
        dentalPlanId: dentalPlan1.id,
        visionPlanId: visionPlan.id,
        retirementPlanId: retirementPlan.id,
        retirementEmployeeContributionPercent: "6.00",
        hsaEmployeeContribution: "0",
        fsaElection: "0",
        updatedBy: adminUserId,
      })
      .onConflictDoNothing();

    // Create dependents for John Doe
    await db
      .insert(dependent)
      .values([
        {
          employeeId: johnDoe.id,
          fullName: "Jane Doe",
          relationship: "spouse",
          dateOfBirth: "1988-07-22",
          ssn: null,
          isStudent: false,
          coveredUnder: ["medical", "dental", "vision"],
          createdBy: adminUserId,
          updatedBy: adminUserId,
        },
        {
          employeeId: johnDoe.id,
          fullName: "Jimmy Doe",
          relationship: "child",
          dateOfBirth: "2015-03-10",
          ssn: null,
          isStudent: true,
          coveredUnder: ["dental"],
          createdBy: adminUserId,
          updatedBy: adminUserId,
        },
      ])
      .onConflictDoNothing();
  }

  // Create enrollment for Noor (employee only, different plans)
  if (noor && medicalPlan2 && dentalPlan2 && retirementPlan) {
    await db
      .insert(benefitsEnrollment)
      .values({
        employeeId: noor.id,
        medicalPlanId: medicalPlan2.id,
        dentalPlanId: dentalPlan2.id,
        visionPlanId: null,
        retirementPlanId: retirementPlan.id,
        retirementEmployeeContributionPercent: "5.00",
        hsaEmployeeContribution: "0",
        fsaElection: "0",
        updatedBy: adminUserId,
      })
      .onConflictDoNothing();
  }

  // Create enrollment for Maria (employee only, minimal coverage)
  if (maria && medicalPlan1 && retirementPlan) {
    await db
      .insert(benefitsEnrollment)
      .values({
        employeeId: maria.id,
        medicalPlanId: medicalPlan1.id,
        dentalPlanId: null,
        visionPlanId: null,
        retirementPlanId: retirementPlan.id,
        retirementEmployeeContributionPercent: "4.00",
        hsaEmployeeContribution: "0",
        fsaElection: "0",
        updatedBy: adminUserId,
      })
      .onConflictDoNothing();
  }
}

/**
 * Seeds enrollment period
 */
export async function seedEnrollmentPeriod(adminUserId: string): Promise<void> {
  await db
    .insert(enrollmentPeriod)
    .values({
      periodName: "2026 Open Enrollment",
      planYear: 2026,
      startDate: "2025-11-01",
      endDate: "2025-11-30",
      openEnrollmentStart: "2025-11-01",
      openEnrollmentEnd: "2025-11-30",
      effectiveDate: "2026-01-01",
      createdBy: adminUserId,
      updatedBy: adminUserId,
    })
    .onConflictDoNothing();
}

/**
 * Seeds HR cases matching hr-case.ts mock data
 */
export async function seedHRCases(
  employees: Array<{ id: string; employeeId: string }>,
  adminUserId: string
): Promise<void> {
  const johnDoe = employees.find((e) => e.employeeId === "EMP001");
  if (!johnDoe) {
    return;
  }

  const { calculateSLA } = await import("@/lib/hr/helpers");

  // Case 1: Benefits case
  const case1CreatedAt = new Date("2025-11-05T10:30:00Z");
  const case1SLA = calculateSLA(case1CreatedAt, "benefits");

  const [case1] = await db
    .insert(hrCase)
    .values({
      caseId: "HR-2025-001234",
      title: "FSA claim reimbursement delay",
      category: "benefits",
      priority: "medium",
      status: "in_progress",
      description:
        "Submitted FSA claim on Oct 15th but haven't received reimbursement yet. Claim #FSA-2025-0892.",
      submittedBy: johnDoe.id,
      submittedByName: "John Doe",
      assignedTeam: "Benefits Administration",
      firstResponseDue: case1SLA.firstResponseDue,
      firstResponseMet: true,
      resolutionDue: case1SLA.resolutionDue,
      slaHoursRemaining: case1SLA.slaHoursRemaining.toFixed(2),
      createdBy: adminUserId,
      updatedBy: adminUserId,
    })
    .onConflictDoNothing()
    .returning();

  if (case1) {
    await db
      .insert(caseUpdate)
      .values([
        {
          caseId: case1.id,
          author: "System",
          type: "system",
          message: "Case created and assigned to Benefits Administration team",
          visibility: "public",
          timestamp: new Date("2025-11-05T10:30:00Z"),
        },
        {
          caseId: case1.id,
          author: "Sarah Chen",
          type: "hr_response",
          message:
            "Hi John, I've located your claim. It's currently in processing with our FSA vendor. I've escalated it for faster processing. You should see the reimbursement within 2-3 business days.",
          visibility: "public",
          timestamp: new Date("2025-11-05T14:20:00Z"),
        },
        {
          caseId: case1.id,
          author: "Sarah Chen",
          type: "internal_note",
          message: "Claim approved by vendor, payment initiated",
          visibility: "internal",
          timestamp: new Date("2025-11-06T09:15:00Z"),
        },
      ])
      .onConflictDoNothing();
  }

  // Case 2: Equipment case (resolved)
  const case2CreatedAt = new Date("2025-10-28T15:45:00Z");
  const case2SLA = calculateSLA(case2CreatedAt, "equipment");

  const [case2] = await db
    .insert(hrCase)
    .values({
      caseId: "HR-2025-001198",
      title: "Request additional monitor for home office",
      category: "equipment",
      priority: "low",
      status: "resolved",
      description:
        "Would like to request a second monitor for my home office setup to improve productivity.",
      submittedBy: johnDoe.id,
      submittedByName: "John Doe",
      assignedTeam: "IT & Facilities",
      firstResponseDue: case2SLA.firstResponseDue,
      firstResponseMet: true,
      resolutionDue: case2SLA.resolutionDue,
      slaHoursRemaining: "0",
      createdBy: adminUserId,
      updatedBy: adminUserId,
    })
    .onConflictDoNothing()
    .returning();

  if (case2) {
    await db
      .insert(caseUpdate)
      .values([
        {
          caseId: case2.id,
          author: "System",
          type: "system",
          message: "Case created and assigned to IT & Facilities team",
          visibility: "public",
          timestamp: new Date("2025-10-28T15:45:00Z"),
        },
        {
          caseId: case2.id,
          author: "IT Support",
          type: "hr_response",
          message:
            "Request approved. Monitor will be shipped to your home address on file. Expected delivery: Nov 1-3.",
          visibility: "public",
          timestamp: new Date("2025-10-29T09:30:00Z"),
        },
        {
          caseId: case2.id,
          author: "John Doe",
          type: "system",
          message: "Monitor received. Thank you!",
          visibility: "public",
          timestamp: new Date("2025-11-02T14:20:00Z"),
        },
        {
          caseId: case2.id,
          author: "IT Support",
          type: "hr_response",
          message:
            "Great! Closing this case. Let us know if you need anything else.",
          visibility: "public",
          timestamp: new Date("2025-11-02T14:25:00Z"),
        },
      ])
      .onConflictDoNothing();
  }
}

/**
 * Seeds approved absences matching team-availability.ts mock data
 */
export async function seedAbsences(
  employees: Array<{ id: string; employeeId: string }>,
  adminUserId: string
): Promise<void> {
  // Create placeholder employees for team members
  await db
    .insert(employee)
    .values([
      {
        userId: "user_EMP101",
        employeeId: "EMP101",
        fullName: "Alice Johnson",
        email: "alice.johnson@company.com",
        jobTitle: "Senior Engineer",
        department: "Engineering",
        location: "San Francisco HQ",
        workMode: "office",
        employmentStatus: "active",
        startDate: "2019-05-01",
        yearsOfService: "5.5",
        workAuthorization: {
          status: "citizen",
          expiryDate: null,
          requiresRenewal: false,
          daysUntilExpiry: null,
        },
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        userId: "user_EMP103",
        employeeId: "EMP103",
        fullName: "Carol Martinez",
        email: "carol.martinez@company.com",
        jobTitle: "Engineer",
        department: "Engineering",
        location: "San Francisco HQ",
        workMode: "office",
        employmentStatus: "active",
        startDate: "2020-08-15",
        yearsOfService: "4.2",
        workAuthorization: {
          status: "citizen",
          expiryDate: null,
          requiresRenewal: false,
          daysUntilExpiry: null,
        },
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        userId: "user_EMP104",
        employeeId: "EMP104",
        fullName: "David Chen",
        email: "david.chen@company.com",
        jobTitle: "Junior Engineer",
        department: "Engineering",
        location: "San Francisco HQ",
        workMode: "office",
        employmentStatus: "active",
        startDate: "2023-06-01",
        yearsOfService: "1.4",
        workAuthorization: {
          status: "citizen",
          expiryDate: null,
          requiresRenewal: false,
          daysUntilExpiry: null,
        },
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
    ])
    .onConflictDoNothing();

  // Query for the employees we just inserted (handles conflicts gracefully)
  const aliceResult = await db
    .select()
    .from(employee)
    .where(eq(employee.employeeId, "EMP101"));
  const carolResult = await db
    .select()
    .from(employee)
    .where(eq(employee.employeeId, "EMP103"));
  const davidResult = await db
    .select()
    .from(employee)
    .where(eq(employee.employeeId, "EMP104"));

  const alice = aliceResult[0];
  const carol = carolResult[0];
  const david = davidResult[0];

  if (!alice || !carol || !david) {
    return;
  }

  await db
    .insert(absence)
    .values([
      {
        employeeId: alice.id,
        absenceType: "vacation",
        startDate: "2025-11-18",
        endDate: "2025-11-22",
        totalDays: "5",
        approvalDate: "2025-11-01",
        approvedBy: alice.id,
        createdBy: adminUserId,
      },
      {
        employeeId: carol.id,
        absenceType: "personal",
        startDate: "2025-11-25",
        endDate: "2025-11-26",
        totalDays: "2",
        approvalDate: "2025-11-01",
        approvedBy: carol.id,
        createdBy: adminUserId,
      },
      {
        employeeId: david.id,
        absenceType: "vacation",
        startDate: "2025-12-02",
        endDate: "2025-12-06",
        totalDays: "5",
        approvalDate: "2025-11-01",
        approvedBy: david.id,
        createdBy: adminUserId,
      },
    ])
    .onConflictDoNothing();
}

/**
 * Seeds pending leave requests
 */
export async function seedLeaveRequests(
  employees: Array<{ id: string; employeeId: string }>,
  adminUserId: string
): Promise<void> {
  // Create additional team members if needed
  await db
    .insert(employee)
    .values({
      userId: "user_EMP102",
      employeeId: "EMP102",
      fullName: "Bob Smith",
      email: "bob.smith@company.com",
      jobTitle: "Engineer",
      department: "Engineering",
      location: "San Francisco HQ",
      workMode: "office",
      employmentStatus: "active",
      startDate: "2021-03-15",
      yearsOfService: "3.6",
      workAuthorization: {
        status: "citizen",
        expiryDate: null,
        requiresRenewal: false,
        daysUntilExpiry: null,
      },
      createdBy: adminUserId,
      updatedBy: adminUserId,
    })
    .onConflictDoNothing();

  await db
    .insert(employee)
    .values({
      userId: "user_EMP105",
      employeeId: "EMP105",
      fullName: "Eva Patel",
      email: "eva.patel@company.com",
      jobTitle: "Senior Engineer",
      department: "Engineering",
      location: "San Francisco HQ",
      workMode: "office",
      employmentStatus: "active",
      startDate: "2018-09-01",
      yearsOfService: "6.2",
      workAuthorization: {
        status: "citizen",
        expiryDate: null,
        requiresRenewal: false,
        daysUntilExpiry: null,
      },
      createdBy: adminUserId,
      updatedBy: adminUserId,
    })
    .onConflictDoNothing();

  // Query for the employees (handles conflicts gracefully)
  const bobResult = await db
    .select()
    .from(employee)
    .where(eq(employee.employeeId, "EMP102"));
  const evaResult = await db
    .select()
    .from(employee)
    .where(eq(employee.employeeId, "EMP105"));

  const bob = bobResult[0];
  const eva = evaResult[0];

  if (!bob || !eva) {
    return;
  }

  // Find Alice for conflict reference
  const [alice] = await db
    .select()
    .from(employee)
    .where(eq(employee.employeeId, "EMP101"))
    .limit(1);

  await db
    .insert(leaveRequest)
    .values([
      {
        requestId: "REQ-2025-0891",
        employeeId: bob.id,
        requestType: "vacation",
        requestedStartDate: "2025-11-20",
        requestedEndDate: "2025-11-27",
        totalDaysRequested: "6",
        submittedDate: "2025-11-08",
        status: "pending",
        hasConflict: true,
        conflictsWith: alice ? [alice.id] : [],
        conflictReason: "1 team member already has overlapping time off",
        coveragePercent: 60,
        notes: "Family vacation - Thanksgiving week",
        createdBy: adminUserId,
      },
      {
        requestId: "REQ-2025-0892",
        employeeId: eva.id,
        requestType: "vacation",
        requestedStartDate: "2025-12-09",
        requestedEndDate: "2025-12-13",
        totalDaysRequested: "5",
        submittedDate: "2025-11-09",
        status: "pending",
        hasConflict: false,
        conflictsWith: [],
        conflictReason: null,
        coveragePercent: 80,
        notes: "Holiday travel",
        createdBy: adminUserId,
      },
    ])
    .onConflictDoNothing();
}

/**
 * Main seeding function - seeds all HR data
 */
export async function seedAllHRData(adminUserId: string): Promise<void> {
  // Check if already seeded
  const isSeeded = await checkIfSeeded();
  if (isSeeded) {
    console.log("HR data already seeded, skipping...");
    return;
  }

  console.log("Seeding HR data...");

  // Seed users FIRST to satisfy foreign key constraints
  await seedUsers(adminUserId);
  console.log("Seeded user records");

  // Seed in order to maintain referential integrity
  const employees = await seedEmployees(adminUserId);
  console.log(`Seeded ${employees.length} employees`);

  await seedLeaveBalances(employees, adminUserId);
  console.log("Seeded leave balances");

  await seedBlackoutDates(adminUserId);
  console.log("Seeded blackout dates");

  await seedLeavePolicy(adminUserId);
  console.log("Seeded leave policy");

  const plans = await seedBenefitsPlans(adminUserId);
  console.log(`Seeded ${plans.length} benefits plans`);

  await seedEnrollments(employees, plans, adminUserId);
  console.log("Seeded enrollments and dependents");

  await seedEnrollmentPeriod(adminUserId);
  console.log("Seeded enrollment period");

  await seedHRCases(employees, adminUserId);
  console.log("Seeded HR cases");

  await seedAbsences(employees, adminUserId);
  console.log("Seeded absences");

  await seedLeaveRequests(employees, adminUserId);
  console.log("Seeded leave requests");

  console.log("HR data seeding complete!");
}

/**
 * Clears all HR data from all tables
 */
export async function clearAllHRData(): Promise<void> {
  console.log("Clearing all HR data...");

  // Delete in reverse order to handle foreign key constraints
  await db.delete(caseUpdate);
  await db.delete(hrCase);
  await db.delete(leaveRequest);
  await db.delete(absence);
  await db.delete(dependent);
  await db.delete(benefitsEnrollment);
  await db.delete(enrollmentPeriod);
  await db.delete(benefitsPlan);
  await db.delete(leavePolicy);
  await db.delete(blackoutDate);
  await db.delete(leaveBalance);
  await db.delete(employee);

  // Delete user records created by seedUsers (optional - keeps only test users)
  // Note: We don't delete all users to preserve any existing auth users
  // Only delete the specific employee user IDs we created
  // DO NOT delete "test-admin-id" as it's used by integration tests
  const employeeUserIds = [
    "user_EMP001",
    "user_EMP200",
    "user_EMP301",
    "user_EMP401",
    "user_EMP501",
    "user_EMP101",
    "user_EMP102",
    "user_EMP103",
    "user_EMP104",
    "user_EMP105",
  ];

  for (const userId of employeeUserIds) {
    await db.delete(user).where(eq(user.id, userId));
  }

  console.log("All HR data cleared!");
}

import "server-only";
import { count, eq } from "drizzle-orm";
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
} from "../schema";

/**
 * Checks if HR data has already been seeded
 */
export async function checkIfSeeded(): Promise<boolean> {
  const [result] = await db.select({ count: count() }).from(employee);
  return (result?.count ?? 0) > 0;
}

/**
 * Seeds employees matching mock data from people-search.ts
 */
export async function seedEmployees(
  adminUserId: string
): Promise<Array<{ id: string; employeeId: string }>> {
  const employees = await db
    .insert(employee)
    .values([
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
    ])
    .returning({ id: employee.id, employeeId: employee.employeeId });

  return employees;
}

/**
 * Seeds leave balances for all employees
 */
export async function seedLeaveBalances(
  employees: Array<{ id: string; employeeId: string }>,
  adminUserId: string
): Promise<void> {
  // Find John Doe (EMP001) for his leave balances
  const johnDoe = employees.find((e) => e.employeeId === "EMP001");
  if (!johnDoe) {
    return;
  }

  await db.insert(leaveBalance).values([
    {
      employeeId: johnDoe.id,
      leaveType: "vacation",
      currentBalance: "18.5",
      accruedYTD: "20",
      usedYTD: "1.5",
      projectedYearEnd: "26.5",
      accrualRate: "1.67",
      accrualSchedule: "monthly",
      carryoverLimit: 5,
      carryoverDeadline: "2026-03-31",
      updatedBy: adminUserId,
    },
    {
      employeeId: johnDoe.id,
      leaveType: "sick",
      currentBalance: "12",
      accruedYTD: "12",
      usedYTD: "0",
      projectedYearEnd: "12",
      accrualRate: "1",
      accrualSchedule: "monthly",
      carryoverLimit: 0,
      carryoverDeadline: "2025-12-31",
      updatedBy: adminUserId,
    },
    {
      employeeId: johnDoe.id,
      leaveType: "personal",
      currentBalance: "3",
      accruedYTD: "3",
      usedYTD: "0",
      projectedYearEnd: "3",
      accrualRate: "0.25",
      accrualSchedule: "monthly",
      carryoverLimit: 0,
      carryoverDeadline: "2025-12-31",
      updatedBy: adminUserId,
    },
  ]);
}

/**
 * Seeds blackout dates
 */
export async function seedBlackoutDates(adminUserId: string): Promise<void> {
  await db.insert(blackoutDate).values([
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
  ]);
}

/**
 * Seeds global leave policy
 */
export async function seedLeavePolicy(adminUserId: string): Promise<void> {
  await db.insert(leavePolicy).values({
    department: null, // Global policy
    minimumNotice: 14,
    maxConsecutiveDays: 15,
    requireApproval: true,
    createdBy: adminUserId,
    updatedBy: adminUserId,
  });
}

/**
 * Seeds benefits plans matching benefits-info.ts mock data
 */
export async function seedBenefitsPlans(
  adminUserId: string
): Promise<Array<{ id: string; planId: string }>> {
  const plans = await db
    .insert(benefitsPlan)
    .values([
      // Medical Plans
      {
        planId: "MED001",
        category: "medical",
        planName: "Blue Shield PPO Gold",
        carrier: "Blue Shield of California",
        monthlyPremium: {
          employeeOnly: 250,
          employeeSpouse: 450,
          family: 650,
        },
        deductible: {
          individual: 1500,
          family: 3000,
        },
        outOfPocketMax: {
          individual: 6000,
          family: 12_000,
        },
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
        planId: "MED002",
        category: "medical",
        planName: "Kaiser HMO Platinum",
        carrier: "Kaiser Permanente",
        monthlyPremium: {
          employeeOnly: 200,
          employeeSpouse: 380,
          family: 550,
        },
        deductible: {
          individual: 500,
          family: 1000,
        },
        outOfPocketMax: {
          individual: 4000,
          family: 8000,
        },
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
        planId: "MED003",
        category: "medical",
        planName: "Blue Shield HDHP with HSA",
        carrier: "Blue Shield of California",
        monthlyPremium: {
          employeeOnly: 150,
          employeeSpouse: 300,
          family: 450,
        },
        deductible: {
          individual: 3000,
          family: 6000,
        },
        outOfPocketMax: {
          individual: 6000,
          family: 12_000,
        },
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
        planId: "DEN001",
        category: "dental",
        planName: "Delta Dental PPO",
        carrier: "Delta Dental",
        monthlyPremium: {
          employeeOnly: 35,
          employeeSpouse: 60,
          family: 85,
        },
        deductible: {
          individual: 50,
          family: 150,
        },
        outOfPocketMax: {
          individual: 2000,
          family: 4000,
        },
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
        planId: "DEN002",
        category: "dental",
        planName: "Cigna Dental HMO",
        carrier: "Cigna",
        monthlyPremium: {
          employeeOnly: 20,
          employeeSpouse: 40,
          family: 60,
        },
        deductible: {
          individual: 0,
          family: 0,
        },
        outOfPocketMax: {
          individual: 1500,
          family: 3000,
        },
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
        planId: "VIS001",
        category: "vision",
        planName: "VSP Vision Care",
        carrier: "VSP",
        monthlyPremium: {
          employeeOnly: 10,
          employeeSpouse: 18,
          family: 25,
        },
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
        planId: "VIS002",
        category: "vision",
        planName: "EyeMed Vision",
        carrier: "EyeMed",
        monthlyPremium: {
          employeeOnly: 8,
          employeeSpouse: 15,
          family: 22,
        },
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
        planId: "401K001",
        category: "retirement",
        planName: "Traditional 401(k)",
        carrier: "Fidelity",
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
    ])
    .returning({ id: benefitsPlan.id, planId: benefitsPlan.planId });

  return plans;
}

/**
 * Seeds benefits enrollments for employees
 */
export async function seedEnrollments(
  employees: Array<{ id: string; employeeId: string }>,
  plans: Array<{ id: string; planId: string }>,
  adminUserId: string
): Promise<void> {
  // Find John Doe (EMP001)
  const johnDoe = employees.find((e) => e.employeeId === "EMP001");
  if (!johnDoe) {
    return;
  }

  // Find plans
  const medicalPlan = plans.find((p) => p.planId === "MED001");
  const dentalPlan = plans.find((p) => p.planId === "DEN001");
  const visionPlan = plans.find((p) => p.planId === "VIS001");
  const retirementPlan = plans.find((p) => p.planId === "401K001");

  if (!medicalPlan || !dentalPlan || !visionPlan || !retirementPlan) {
    return;
  }

  // Create enrollment
  const [enrollment] = await db
    .insert(benefitsEnrollment)
    .values({
      employeeId: johnDoe.id,
      medicalPlanId: medicalPlan.id,
      dentalPlanId: dentalPlan.id,
      visionPlanId: visionPlan.id,
      retirementPlanId: retirementPlan.id,
      retirementEmployeeContributionPercent: "6.00",
      hsaEmployeeContribution: "0",
      fsaElection: "0",
      updatedBy: adminUserId,
    })
    .returning();

  // Create dependents
  if (enrollment) {
    await db.insert(dependent).values([
      {
        employeeId: johnDoe.id,
        name: "Jane Doe",
        relationship: "spouse",
        dateOfBirth: "1988-07-22",
        coveredUnder: ["medical", "dental", "vision"],
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        employeeId: johnDoe.id,
        name: "Jimmy Doe",
        relationship: "child",
        dateOfBirth: "2015-03-10",
        coveredUnder: ["dental"],
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
    ]);
  }
}

/**
 * Seeds enrollment period
 */
export async function seedEnrollmentPeriod(adminUserId: string): Promise<void> {
  await db.insert(enrollmentPeriod).values({
    planYear: 2026,
    openEnrollmentStart: "2025-11-01",
    openEnrollmentEnd: "2025-11-30",
    effectiveDate: "2026-01-01",
    createdBy: adminUserId,
    updatedBy: adminUserId,
  });
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
    .returning();

  if (case1) {
    await db.insert(caseUpdate).values([
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
    ]);
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
    .returning();

  if (case2) {
    await db.insert(caseUpdate).values([
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
    ]);
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
  const teamMembers = await db
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
    .returning();

  const alice = teamMembers.find((e) => e.employeeId === "EMP101");
  const carol = teamMembers.find((e) => e.employeeId === "EMP103");
  const david = teamMembers.find((e) => e.employeeId === "EMP104");

  if (!alice || !carol || !david) {
    return;
  }

  await db.insert(absence).values([
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
  ]);
}

/**
 * Seeds pending leave requests
 */
export async function seedLeaveRequests(
  employees: Array<{ id: string; employeeId: string }>,
  adminUserId: string
): Promise<void> {
  // Create additional team members if needed
  const bob = await db
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
    .returning();

  const eva = await db
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
    .returning();

  if (bob.length === 0 || eva.length === 0) {
    return;
  }

  // Find Alice for conflict reference
  const [alice] = await db
    .select()
    .from(employee)
    .where(eq(employee.employeeId, "EMP101"))
    .limit(1);

  await db.insert(leaveRequest).values([
    {
      requestId: "REQ-2025-0891",
      employeeId: bob[0].id,
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
      employeeId: eva[0].id,
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
  ]);
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

  console.log("All HR data cleared!");
}

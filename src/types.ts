// ============================================================================
// Re-export Base Types from Schema
// ============================================================================

export type {
  // Absence
  Absence,
  // Benefits Enrollment
  BenefitsEnrollment,
  // Benefits Plan
  BenefitsPlan,
  // Blackout Date
  BlackoutDate,
  // Case Update
  CaseUpdate,
  // Dependent
  Dependent,
  // Employee
  Employee,
  // Enrollment Period
  EnrollmentPeriod,
  // HR Case
  HRCase,
  InsertAbsence,
  InsertBenefitsEnrollment,
  InsertBenefitsPlan,
  InsertBlackoutDate,
  InsertCaseUpdate,
  InsertDependent,
  InsertEmployee,
  InsertEnrollmentPeriod,
  InsertHRCase,
  InsertLeaveBalance,
  InsertLeavePolicy,
  InsertLeaveRequest,
  // Leave Balance
  LeaveBalance,
  // Leave Policy
  LeavePolicy,
  // Leave Request
  LeaveRequest,
} from "@/lib/db/schema";

// ============================================================================
// Re-export Enum Types from Schema
// ============================================================================

export type {
  AbsenceType,
  AccrualSchedule,
  // Benefits
  BenefitsCategory,
  // HR Cases
  CaseCategory,
  CasePriority,
  CaseStatus,
  CaseUpdateType,
  // Employment
  EmploymentStatus,
  LeaveRequestStatus,
  // Leave
  LeaveType,
  Relationship,
  UpdateVisibility,
  WorkMode,
} from "@/lib/db/schema";

// ============================================================================
// Composite Types for API Responses
// ============================================================================

import type {
  Absence,
  BenefitsEnrollment,
  BenefitsPlan,
  CaseUpdate,
  Dependent,
  Employee,
  HRCase,
  LeaveBalance,
  LeaveRequest,
} from "@/lib/db/schema";

// Employee with manager and direct reports
export type EmployeeWithRelations = Employee & {
  manager: Pick<Employee, "id" | "fullName" | "email"> | null;
  directReportsDetails: Pick<Employee, "id" | "fullName" | "jobTitle">[];
};

// Leave balance with employee info
export type LeaveBalanceWithEmployee = LeaveBalance & {
  employee: Pick<Employee, "employeeId" | "fullName" | "department">;
};

// Benefits enrollment with plan details
export type EnrollmentWithPlans = BenefitsEnrollment & {
  medicalPlan: BenefitsPlan | null;
  dentalPlan: BenefitsPlan | null;
  visionPlan: BenefitsPlan | null;
  retirementPlan: BenefitsPlan | null;
  dependents: Dependent[];
};

// HR case with updates timeline
export type HRCaseWithUpdates = HRCase & {
  updates: CaseUpdate[];
};

// Absence with employee info
export type AbsenceWithEmployee = Absence & {
  employee: Pick<Employee, "employeeId" | "fullName" | "jobTitle">;
  approver: Pick<Employee, "fullName"> | null;
};

// Leave request with conflict details
export type LeaveRequestWithDetails = LeaveRequest & {
  employee: Pick<Employee, "employeeId" | "fullName" | "department">;
  conflictingEmployees: Pick<Employee, "fullName">[];
};

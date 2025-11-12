import type { CaseCategory, CasePriority } from "@/lib/db/schema";

/**
 * SLA Configuration by case category
 * Defines first response time (in hours) and resolution time (in days) for each category
 */
export const SLA_CONFIG: Record<
  CaseCategory,
  { firstResponseHours: number; resolutionDays: number; priority: CasePriority }
> = {
  payroll: { firstResponseHours: 4, resolutionDays: 2, priority: "high" },
  benefits: { firstResponseHours: 8, resolutionDays: 3, priority: "medium" },
  equipment: { firstResponseHours: 24, resolutionDays: 7, priority: "low" },
  leave: { firstResponseHours: 8, resolutionDays: 2, priority: "medium" },
  policy: { firstResponseHours: 24, resolutionDays: 5, priority: "low" },
  performance: {
    firstResponseHours: 24,
    resolutionDays: 10,
    priority: "medium",
  },
  other: { firstResponseHours: 24, resolutionDays: 7, priority: "low" },
} as const;

/**
 * Team Assignment by case category
 * Maps each category to the appropriate team for handling
 */
export const TEAM_ASSIGNMENT: Record<CaseCategory, string> = {
  payroll: "Payroll Services",
  benefits: "Benefits Administration",
  equipment: "IT & Facilities",
  leave: "HR Operations",
  policy: "HR Compliance",
  performance: "HR Business Partners",
  other: "General HR Support",
} as const;

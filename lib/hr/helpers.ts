import "server-only";
import { desc, eq, like, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { CaseCategory } from "@/lib/db/schema";
import { hrCase, leaveRequest } from "@/lib/db/schema";
import { SLA_CONFIG } from "./sla-config";

/**
 * Generates unique case IDs in format "HR-YYYY-NNNNNN" (e.g., "HR-2025-001234")
 * Queries database for max case number in current year, increments by 1, pads to 6 digits
 */
export async function generateCaseId(): Promise<string> {
  const year = new Date().getFullYear();
  const yearPrefix = `HR-${year}-`;

  // Get the maximum case ID for this year
  const result = await db
    .select({ caseId: hrCase.caseId })
    .from(hrCase)
    .where(like(hrCase.caseId, `${yearPrefix}%`))
    .orderBy(desc(hrCase.caseId))
    .limit(1);

  let nextNumber = 1;
  if (result.length > 0 && result[0]) {
    const lastCaseId = result[0].caseId;
    const lastNumber = Number.parseInt(lastCaseId.split("-")[2] || "0", 10);
    nextNumber = lastNumber + 1;
  }

  // Pad to 6 digits
  const paddedNumber = nextNumber.toString().padStart(6, "0");
  return `${yearPrefix}${paddedNumber}`;
}

/**
 * Generates unique request IDs in format "REQ-YYYY-NNNN" (e.g., "REQ-2025-0042")
 * Queries database for max request number in current year, increments by 1, pads to 4 digits
 */
export async function generateRequestId(): Promise<string> {
  const year = new Date().getFullYear();
  const yearPrefix = `REQ-${year}-`;

  // Get the maximum request ID for this year
  const result = await db
    .select({ requestId: leaveRequest.requestId })
    .from(leaveRequest)
    .where(like(leaveRequest.requestId, `${yearPrefix}%`))
    .orderBy(desc(leaveRequest.requestId))
    .limit(1);

  let nextNumber = 1;
  if (result.length > 0 && result[0]) {
    const lastRequestId = result[0].requestId;
    const lastNumber = Number.parseInt(lastRequestId.split("-")[2] || "0", 10);
    nextNumber = lastNumber + 1;
  }

  // Pad to 4 digits
  const paddedNumber = nextNumber.toString().padStart(4, "0");
  return `${yearPrefix}${paddedNumber}`;
}

/**
 * Calculates SLA deadlines based on case category and creation time
 * Uses SLA_CONFIG to get firstResponseHours and resolutionDays
 * Returns timestamps for due dates and hours remaining until resolution due
 */
export function calculateSLA(
  createdAt: Date,
  category: CaseCategory
): {
  firstResponseDue: Date;
  resolutionDue: Date;
  slaHoursRemaining: number;
} {
  const slaConfig = SLA_CONFIG[category];

  // Calculate first response due (add hours to created time)
  const firstResponseDue = new Date(
    createdAt.getTime() + slaConfig.firstResponseHours * 60 * 60 * 1000
  );

  // Calculate resolution due (add days to created time)
  const resolutionDue = new Date(
    createdAt.getTime() + slaConfig.resolutionDays * 24 * 60 * 60 * 1000
  );

  // Calculate hours remaining until resolution due
  const now = new Date();
  const msRemaining = resolutionDue.getTime() - now.getTime();
  const slaHoursRemaining = Math.max(0, msRemaining / (60 * 60 * 1000));

  return {
    firstResponseDue,
    resolutionDue,
    slaHoursRemaining,
  };
}

/**
 * Calculates team coverage percentage for a given date
 * Counts how many team members have absences overlapping the target date
 * Returns percentage of available staff (0-100)
 */
export function calculateCoveragePercent(
  teamSize: number,
  absences: Array<{ startDate: Date; endDate: Date }>,
  targetDate: Date
): number {
  if (teamSize === 0) {
    return 0;
  }

  // Count team members with absences on target date
  const absentCount = absences.filter((absence) => {
    const start = new Date(absence.startDate);
    const end = new Date(absence.endDate);
    return targetDate >= start && targetDate <= end;
  }).length;

  const availableCount = teamSize - absentCount;
  return Math.round((availableCount / teamSize) * 100);
}

/**
 * Detects overlapping absences for team members
 * Checks if any existing absences overlap with the requested date range
 * Returns conflict status and list of conflicting employee IDs
 */
export function detectConflicts(
  employeeId: string,
  requestedStart: Date,
  requestedEnd: Date,
  existingAbsences: Array<{
    employeeId: string;
    startDate: Date;
    endDate: Date;
  }>
): {
  hasConflict: boolean;
  conflictsWith: string[];
  reason: string;
} {
  const conflicts = existingAbsences.filter((absence) => {
    // Don't count the same employee's existing absences as conflicts
    if (absence.employeeId === employeeId) {
      return false;
    }

    const start = new Date(absence.startDate);
    const end = new Date(absence.endDate);

    // Check for overlap: absence overlaps if it starts before requested ends
    // and ends after requested starts
    return start <= requestedEnd && end >= requestedStart;
  });

  const conflictsWith = conflicts.map((c) => c.employeeId);
  const hasConflict = conflictsWith.length > 0;

  let reason = "";
  if (hasConflict) {
    reason = `${conflictsWith.length} team member${conflictsWith.length > 1 ? "s" : ""} already have overlapping time off`;
  }

  return {
    hasConflict,
    conflictsWith,
    reason,
  };
}

/**
 * Calculates number of business days between two dates (excluding weekends)
 * Used for totalDays calculation in absences and leave requests
 */
export function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return count;
}

/**
 * Updates SLA tracking fields for a case
 * Calculates hours remaining, checks if first response met, updates slaHoursRemaining
 * Called whenever case is updated
 */
export async function updateSLAStatus(caseId: string): Promise<void> {
  // Fetch the case
  const [caseRecord] = await db
    .select()
    .from(hrCase)
    .where(eq(hrCase.id, caseId))
    .limit(1);

  if (!caseRecord) {
    return;
  }

  // Calculate hours remaining
  const now = new Date();
  const resolutionDue = new Date(caseRecord.resolutionDue);
  const msRemaining = resolutionDue.getTime() - now.getTime();
  const hoursRemaining = msRemaining / (60 * 60 * 1000);

  // Update the case
  await db
    .update(hrCase)
    .set({
      slaHoursRemaining: hoursRemaining.toFixed(2),
      updatedAt: now,
    })
    .where(eq(hrCase.id, caseId));
}

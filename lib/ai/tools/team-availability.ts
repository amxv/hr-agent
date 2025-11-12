import { tool } from "ai";
import { z } from "zod";
import { createModuleLogger } from "@/lib/logger";
import type { StreamWriter } from "../types";

const log = createModuleLogger("ai.tools.team-availability");

// ===== TYPES =====

export type TeamAvailabilityInput = {
  action:
    | "view_schedule"
    | "view_approvals"
    | "approve_request"
    | "deny_request";
  startDate?: string; // ISO date for schedule view
  endDate?: string; // ISO date for schedule view
  employeeId?: string; // for approval actions
  requestId?: string; // for approval actions
  reason?: string; // for denial
};

export type TeamMemberAbsence = {
  employeeId: string;
  employeeName: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  leaveType: "vacation" | "sick" | "personal" | "other";
  totalDays: number;
  status: "approved" | "pending" | "denied";
};

export type LeaveRequest = {
  requestId: string;
  employeeId: string;
  employeeName: string;
  leaveType: "vacation" | "sick" | "personal" | "other";
  startDate: string; // ISO date
  endDate: string; // ISO date
  totalDays: number;
  requestDate: string; // ISO date
  status: "pending" | "approved" | "denied";
  reason?: string; // employee's reason for leave
  managerNotes?: string; // notes from manager
  conflicts: {
    hasConflict: boolean;
    conflictingEmployees: string[];
    teamCoveragePercentage: number; // % of team available
  };
};

export type TeamCoverage = {
  date: string; // ISO date
  totalTeamSize: number;
  available: number;
  onLeave: number;
  coveragePercentage: number;
};

export type TeamAvailabilityOutput =
  | {
      action: "view_schedule";
      absences: TeamMemberAbsence[];
      coverageSummary: TeamCoverage[];
      criticalDates: string[]; // dates with < 70% coverage
    }
  | {
      action: "view_approvals";
      pendingRequests: LeaveRequest[];
      totalPending: number;
    }
  | {
      action: "approve_request" | "deny_request";
      request: LeaveRequest;
      message: string;
    }
  | {
      error: string;
      permissionDenied?: boolean;
    };

export type ManagerContext = {
  employeeId: string;
  isManager: boolean;
  teamMembers: string[]; // employee IDs
  department: string;
};

// ===== HELPER FUNCTIONS =====

// Helper to calculate coverage for date range
function calculateCoverage(
  startDate: string,
  endDate: string,
  absences: TeamMemberAbsence[],
  teamSize: number
): TeamCoverage[] {
  const coverage: TeamCoverage[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];

    // Count who's on leave on this date
    const onLeave = absences.filter((absence) => {
      const absStart = new Date(absence.startDate);
      const absEnd = new Date(absence.endDate);
      return d >= absStart && d <= absEnd;
    }).length;

    const available = teamSize - onLeave;
    const coveragePercentage = Math.round((available / teamSize) * 100);

    coverage.push({
      date: dateStr,
      totalTeamSize: teamSize,
      available,
      onLeave,
      coveragePercentage,
    });
  }

  return coverage;
}

// ===== TOOL IMPLEMENTATION =====

type TeamAvailabilityProps = {
  dataStream: StreamWriter;
  // In production, pass session to check manager status
  // session: Session;
};

export const teamAvailability = ({ dataStream }: TeamAvailabilityProps) =>
  tool({
    description: `
      MANAGER-ONLY tool for viewing team availability and approving leave requests.

      Use this tool when managers ask about:
      - Team member absences and schedules
      - Who is off on specific dates
      - Pending leave requests to approve
      - Coverage conflicts
      - Approving or denying leave requests

      ⚠️ IMPORTANT: This tool requires manager permissions. Only use when the user is a manager.

      Actions:
      - view_schedule: See team absences for a date range
      - view_approvals: List pending leave requests
      - approve_request: Approve a leave request
      - deny_request: Deny a leave request with reason
    `,
    inputSchema: z.object({
      action: z
        .enum([
          "view_schedule",
          "view_approvals",
          "approve_request",
          "deny_request",
        ])
        .describe("Action to perform"),
      startDate: z
        .string()
        .optional()
        .describe("Start date for schedule (ISO format)"),
      endDate: z
        .string()
        .optional()
        .describe("End date for schedule (ISO format)"),
      employeeId: z
        .string()
        .optional()
        .describe("Employee ID for approval actions"),
      requestId: z
        .string()
        .optional()
        .describe("Request ID for approval actions"),
      reason: z.string().optional().describe("Reason for denial"),
    }),
    execute: async ({
      action,
      startDate,
      endDate,
      employeeId,
      requestId,
      reason,
    }: TeamAvailabilityInput): Promise<TeamAvailabilityOutput> => {
      const startMs = Date.now();
      log.info(
        { action, startDate, endDate, employeeId, requestId },
        "teamAvailability: start"
      );

      dataStream.write({
        type: "data-researchUpdate",
        data: {
          title: "Checking team availability...",
          timestamp: Date.now(),
          type: "started",
        },
      });

      try {
        // Import database queries dynamically
        const {
          getEmployeeByEmployeeId,
          listAbsences,
          listLeaveRequests,
          listEmployees,
          approveLeaveRequest,
          denyLeaveRequest,
        } = await import("@/lib/db/queries");

        // For now, use a default manager/department
        // In production, get from session context
        const defaultManagerId = "EMP001";
        const manager = await getEmployeeByEmployeeId(defaultManagerId);
        if (!manager) {
          return {
            error: "Manager context not found. Please contact HR.",
          };
        }

        const department = manager.department;

        // Get team members in the same department
        const teamMembersResult = await listEmployees({ department });
        const teamMembers = teamMembersResult.employees;

        // VIEW SCHEDULE
        if (action === "view_schedule") {
          // Default to next 14 days if not specified
          const start = startDate || new Date().toISOString().split("T")[0];
          const end =
            endDate ||
            new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0];

          // Get absences for the department in the date range
          const dbAbsencesResult = await listAbsences({
            department,
            startDate: new Date(start),
            endDate: new Date(end),
          });

          // Transform to expected format
          const absences: TeamMemberAbsence[] = dbAbsencesResult.absences.map(
            (record) => ({
              employeeId: record.employee.id,
              employeeName: record.employee.fullName,
              startDate: record.absence.startDate,
              endDate: record.absence.endDate,
              leaveType: record.absence.absenceType as
                | "vacation"
                | "sick"
                | "personal"
                | "other",
              totalDays: Number.parseFloat(record.absence.totalDays),
              status: "approved",
            })
          );

          const coverageSummary = calculateCoverage(
            start,
            end,
            absences,
            teamMembers.length
          );

          const criticalDates = coverageSummary
            .filter((c) => c.coveragePercentage < 70)
            .map((c) => c.date);

          dataStream.write({
            type: "data-researchUpdate",
            data: {
              title: "Team schedule retrieved",
              timestamp: Date.now(),
              type: "completed",
            },
          });

          log.info(
            { ms: Date.now() - startMs, absenceCount: absences.length },
            "teamAvailability: view_schedule success"
          );

          return {
            action: "view_schedule",
            absences,
            coverageSummary,
            criticalDates,
          };
        }

        // VIEW APPROVALS
        if (action === "view_approvals") {
          const dbRequestsResult = await listLeaveRequests({
            status: "pending",
            department,
          });

          // Transform to expected format
          const pendingRequests: LeaveRequest[] = dbRequestsResult.requests.map(
            (record) => {
              // Calculate team coverage if this request is approved
              const teamSize = teamMembers.length;
              const coveragePercent = Math.round(
                ((teamSize - 1) / teamSize) * 100
              );

              return {
                requestId: record.request.requestId,
                employeeId: record.employee.id,
                employeeName: record.employee.fullName,
                leaveType: record.request.requestType as
                  | "vacation"
                  | "sick"
                  | "personal"
                  | "other",
                startDate: record.request.requestedStartDate,
                endDate: record.request.requestedEndDate,
                totalDays: Number.parseFloat(record.request.totalDaysRequested),
                requestDate: record.request.submittedDate,
                status: record.request.status as
                  | "pending"
                  | "approved"
                  | "denied",
                reason: record.request.notes || undefined,
                managerNotes: undefined,
                conflicts: {
                  hasConflict: record.request.hasConflict,
                  conflictingEmployees: Array.isArray(
                    record.request.conflictsWith
                  )
                    ? record.request.conflictsWith
                    : [],
                  teamCoveragePercentage: coveragePercent,
                },
              };
            }
          );

          dataStream.write({
            type: "data-researchUpdate",
            data: {
              title: "Pending requests retrieved",
              timestamp: Date.now(),
              type: "completed",
            },
          });

          log.info(
            { ms: Date.now() - startMs, pendingCount: pendingRequests.length },
            "teamAvailability: view_approvals success"
          );

          return {
            action: "view_approvals",
            pendingRequests,
            totalPending: pendingRequests.length,
          };
        }

        // APPROVE REQUEST
        if (action === "approve_request") {
          if (!requestId) {
            return { error: "Request ID is required to approve" };
          }

          const result = await approveLeaveRequest(requestId, manager.id);
          if (!result) {
            return { error: `Request ${requestId} not found` };
          }

          // Get employee details
          const employeeRecord = await getEmployeeByEmployeeId(
            result.request.employeeId
          );
          if (!employeeRecord) {
            return { error: "Employee not found for this request" };
          }

          // Transform to expected format
          const teamSize = teamMembers.length;
          const coveragePercent = Math.round(((teamSize - 1) / teamSize) * 100);

          const request: LeaveRequest = {
            requestId: result.request.requestId,
            employeeId: employeeRecord.employeeId,
            employeeName: employeeRecord.fullName,
            leaveType: result.request.requestType as
              | "vacation"
              | "sick"
              | "personal"
              | "other",
            startDate: result.request.requestedStartDate,
            endDate: result.request.requestedEndDate,
            totalDays: Number.parseFloat(result.request.totalDaysRequested),
            requestDate: result.request.submittedDate,
            status: "approved",
            reason: result.request.notes || undefined,
            managerNotes: undefined,
            conflicts: {
              hasConflict: false,
              conflictingEmployees: [],
              teamCoveragePercentage: coveragePercent,
            },
          };

          dataStream.write({
            type: "data-researchUpdate",
            data: {
              title: "Request approved",
              timestamp: Date.now(),
              type: "completed",
            },
          });

          log.info(
            { ms: Date.now() - startMs, requestId },
            "teamAvailability: approve success"
          );

          return {
            action: "approve_request",
            request,
            message: `Leave request ${requestId} for ${request.employeeName} has been approved. The employee will be notified.`,
          };
        }

        // DENY REQUEST
        if (action === "deny_request") {
          if (!requestId) {
            return { error: "Request ID is required to deny" };
          }
          if (!reason) {
            return { error: "Reason is required to deny a request" };
          }

          const updatedRequest = await denyLeaveRequest(
            requestId,
            manager.id,
            reason
          );
          if (!updatedRequest) {
            return { error: `Request ${requestId} not found` };
          }

          // Get employee details
          const employeeRecord = await getEmployeeByEmployeeId(
            updatedRequest.employeeId
          );
          if (!employeeRecord) {
            return { error: "Employee not found for this request" };
          }

          // Transform to expected format
          const teamSize = teamMembers.length;
          const coveragePercent = Math.round(((teamSize - 1) / teamSize) * 100);

          const request: LeaveRequest = {
            requestId: updatedRequest.requestId,
            employeeId: employeeRecord.employeeId,
            employeeName: employeeRecord.fullName,
            leaveType: updatedRequest.requestType as
              | "vacation"
              | "sick"
              | "personal"
              | "other",
            startDate: updatedRequest.requestedStartDate,
            endDate: updatedRequest.requestedEndDate,
            totalDays: Number.parseFloat(updatedRequest.totalDaysRequested),
            requestDate: updatedRequest.submittedDate,
            status: "denied",
            reason: updatedRequest.notes || undefined,
            managerNotes: undefined,
            conflicts: {
              hasConflict: false,
              conflictingEmployees: [],
              teamCoveragePercentage: coveragePercent,
            },
          };

          dataStream.write({
            type: "data-researchUpdate",
            data: {
              title: "Request denied",
              timestamp: Date.now(),
              type: "completed",
            },
          });

          log.info(
            { ms: Date.now() - startMs, requestId },
            "teamAvailability: deny success"
          );

          return {
            action: "deny_request",
            request,
            message: `Leave request ${requestId} for ${request.employeeName} has been denied. The employee will be notified with your reason.`,
          };
        }

        return { error: "Invalid action" };
      } catch (error) {
        log.error(
          {
            ms: Date.now() - startMs,
            error: {
              name: (error as Error).name,
              message: (error as Error).message,
            },
          },
          "teamAvailability: failure"
        );

        return {
          error: `Failed to ${action}: ${(error as Error).message}`,
        };
      }
    },
  });

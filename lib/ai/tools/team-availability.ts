import { tool } from "ai";
import { z } from "zod";
import { createModuleLogger } from "@/lib/logger";
import type { StreamWriter } from "../types";

const log = createModuleLogger("ai.tools.team-availability");

// ===== TYPES =====

export type TeamAvailabilityInput = {
  action: "view_schedule" | "view_approvals" | "approve_request" | "deny_request";
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

// ===== MOCK DATA =====

// Mock manager context (in production, fetch from session)
const MOCK_MANAGER: ManagerContext = {
  employeeId: "EMP001",
  isManager: true,
  teamMembers: ["EMP101", "EMP102", "EMP103", "EMP104", "EMP105"],
  department: "Engineering",
};

// Mock team member directory
const TEAM_DIRECTORY: Record<string, { name: string; role: string }> = {
  EMP101: { name: "Alice Johnson", role: "Senior Engineer" },
  EMP102: { name: "Bob Smith", role: "Engineer" },
  EMP103: { name: "Carol Martinez", role: "Engineer" },
  EMP104: { name: "David Chen", role: "Junior Engineer" },
  EMP105: { name: "Eva Patel", role: "Senior Engineer" },
};

// Mock approved absences
const APPROVED_ABSENCES: TeamMemberAbsence[] = [
  {
    employeeId: "EMP101",
    employeeName: "Alice Johnson",
    startDate: "2025-11-18",
    endDate: "2025-11-22",
    leaveType: "vacation",
    totalDays: 5,
    status: "approved",
  },
  {
    employeeId: "EMP103",
    employeeName: "Carol Martinez",
    startDate: "2025-11-25",
    endDate: "2025-11-26",
    leaveType: "personal",
    totalDays: 2,
    status: "approved",
  },
  {
    employeeId: "EMP104",
    employeeName: "David Chen",
    startDate: "2025-12-02",
    endDate: "2025-12-06",
    leaveType: "vacation",
    totalDays: 5,
    status: "approved",
  },
];

// Mock pending requests
const PENDING_REQUESTS: LeaveRequest[] = [
  {
    requestId: "REQ-2025-0891",
    employeeId: "EMP102",
    employeeName: "Bob Smith",
    leaveType: "vacation",
    startDate: "2025-11-20",
    endDate: "2025-11-27",
    totalDays: 6,
    requestDate: "2025-11-08",
    status: "pending",
    reason: "Family vacation - Thanksgiving week",
    conflicts: {
      hasConflict: true,
      conflictingEmployees: ["Alice Johnson"], // overlap with Alice's leave
      teamCoveragePercentage: 60, // only 3/5 available
    },
  },
  {
    requestId: "REQ-2025-0892",
    employeeId: "EMP105",
    employeeName: "Eva Patel",
    leaveType: "vacation",
    startDate: "2025-12-09",
    endDate: "2025-12-13",
    totalDays: 5,
    requestDate: "2025-11-09",
    status: "pending",
    reason: "Holiday travel",
    conflicts: {
      hasConflict: false,
      conflictingEmployees: [],
      teamCoveragePercentage: 80, // 4/5 available
    },
  },
];

// ===== HELPER FUNCTIONS =====

// Helper to calculate coverage for date range
function calculateCoverage(
  startDate: string,
  endDate: string,
  absences: TeamMemberAbsence[]
): TeamCoverage[] {
  const coverage: TeamCoverage[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const teamSize = MOCK_MANAGER.teamMembers.length;

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
        .enum(["view_schedule", "view_approvals", "approve_request", "deny_request"])
        .describe("Action to perform"),
      startDate: z.string().optional().describe("Start date for schedule (ISO format)"),
      endDate: z.string().optional().describe("End date for schedule (ISO format)"),
      employeeId: z.string().optional().describe("Employee ID for approval actions"),
      requestId: z.string().optional().describe("Request ID for approval actions"),
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
      log.info({ action, startDate, endDate, employeeId, requestId }, "teamAvailability: start");

      // ⚠️ CRITICAL: Check manager permissions
      // In production: const user = await getUser(session);
      // For demo, use mock:
      const manager = MOCK_MANAGER;

      if (!manager.isManager) {
        log.warn({ action }, "teamAvailability: permission denied");
        return {
          error: "This tool is only available to managers. Please contact your HR administrator if you believe you should have access.",
          permissionDenied: true,
        };
      }

      dataStream.write({
        type: "data-researchUpdate",
        data: {
          title: "Checking team availability...",
          timestamp: Date.now(),
          type: "started",
        },
      });

      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 800));

        // VIEW SCHEDULE
        if (action === "view_schedule") {
          // Default to next 14 days if not specified
          const start = startDate || new Date().toISOString().split("T")[0];
          const end =
            endDate ||
            new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

          const absences = APPROVED_ABSENCES.filter((absence) => {
            return absence.endDate >= start && absence.startDate <= end;
          });

          const coverageSummary = calculateCoverage(start, end, absences);

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
          dataStream.write({
            type: "data-researchUpdate",
            data: {
              title: "Pending requests retrieved",
              timestamp: Date.now(),
              type: "completed",
            },
          });

          log.info(
            { ms: Date.now() - startMs, pendingCount: PENDING_REQUESTS.length },
            "teamAvailability: view_approvals success"
          );

          return {
            action: "view_approvals",
            pendingRequests: PENDING_REQUESTS,
            totalPending: PENDING_REQUESTS.length,
          };
        }

        // APPROVE REQUEST
        if (action === "approve_request") {
          if (!requestId) {
            return { error: "Request ID is required to approve" };
          }

          const request = PENDING_REQUESTS.find((r) => r.requestId === requestId);
          if (!request) {
            return { error: `Request ${requestId} not found` };
          }

          // Update status
          request.status = "approved";
          request.managerNotes = `Approved by manager on ${new Date().toISOString()}`;

          dataStream.write({
            type: "data-researchUpdate",
            data: {
              title: "Request approved",
              timestamp: Date.now(),
              type: "completed",
            },
          });

          log.info({ ms: Date.now() - startMs, requestId }, "teamAvailability: approve success");

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

          const request = PENDING_REQUESTS.find((r) => r.requestId === requestId);
          if (!request) {
            return { error: `Request ${requestId} not found` };
          }

          // Update status
          request.status = "denied";
          request.managerNotes = reason;

          dataStream.write({
            type: "data-researchUpdate",
            data: {
              title: "Request denied",
              timestamp: Date.now(),
              type: "completed",
            },
          });

          log.info({ ms: Date.now() - startMs, requestId }, "teamAvailability: deny success");

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

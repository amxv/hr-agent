# Tool Implementation Plan: Team Availability & Approvals

**Tool ID:** 004
**Tool Name:** `teamAvailability`
**Purpose:** For managers to view team absences, check conflicts, and approve/deny leave requests with RBAC enforcement

---

## Overview

This tool enables managers to:
- View upcoming team absences and leave schedules
- Identify scheduling conflicts
- See pending approval requests
- Approve or return leave requests with reasons
- Check team coverage and availability

**Example Query:**
"Who from my team is off next 2 weeks? Approve Ali's annual leave if no conflicts."

**⚠️ RBAC Note**: This tool requires manager-level permissions. Implementation should check user role and team membership.

---

## Backend Implementation

### Step 1: Define Types

**File:** `lib/ai/tools/team-availability.ts`

```typescript
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
```

### Step 2: Create Mock Data

**File:** `lib/ai/tools/team-availability.ts`

```typescript
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
    employeeName: "Eva Patel",
    employeeId: "EMP105",
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
```

### Step 3: Implement Tool

**File:** `lib/ai/tools/team-availability.ts`

```typescript
import { tool } from "ai";
import { z } from "zod";
import { createModuleLogger } from "@/lib/logger";
import type { StreamWriter } from "../types";

const log = createModuleLogger("ai.tools.team-availability");

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
    }): Promise<TeamAvailabilityOutput> => {
      const startMs = Date.now();
      log.info({ action, startDate, endDate, employeeId, requestId }, "teamAvailability: start");

      // Check manager permissions
      // In production: const user = await getUser(session);
      // For demo, use mock:
      const manager = MOCK_MANAGER;

      if (!manager.isManager) {
        log.warn({ action }, "teamAvailability: permission denied");
        return {
          error: "This tool is only available to managers.",
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
        log.error({ error }, "teamAvailability: failure");
        return {
          error: `Failed to ${action}: ${(error as Error).message}`,
        };
      }
    },
  });
```

### Step 4: Register Tool

Follow standard registration pattern.

---

## Frontend Implementation

### Step 1: Create UI Component

**File:** `components/team-availability-result.tsx`

```typescript
"use client";

import { Loader2, Users, Calendar, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import type { TeamAvailabilityInput, TeamAvailabilityOutput } from "@/lib/ai/tools/team-availability";

type TeamAvailabilityResultProps = {
  state: "input-available" | "output-available";
  input: TeamAvailabilityInput;
  output?: TeamAvailabilityOutput;
};

export function TeamAvailabilityResult({ state, input, output }: TeamAvailabilityResultProps) {
  // LOADING STATE
  if (state === "input-available") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-indigo-900 text-sm dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-100">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>
          {input.action === "view_schedule" && "Loading team schedule..."}
          {input.action === "view_approvals" && "Loading pending approvals..."}
          {input.action === "approve_request" && "Approving request..."}
          {input.action === "deny_request" && "Processing denial..."}
        </span>
      </div>
    );
  }

  // RESULT STATE
  if (state === "output-available" && output) {
    if ("error" in output) {
      return (
        <Alert variant={output.permissionDenied ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error</strong>
            <br />
            {output.error}
          </AlertDescription>
        </Alert>
      );
    }

    // VIEW SCHEDULE
    if (output.action === "view_schedule") {
      const { absences, coverageSummary, criticalDates } = output;

      return (
        <div className="space-y-4">
          {/* Critical Coverage Alert */}
          {criticalDates.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Low Coverage Warning</strong>
                <br />
                {criticalDates.length} date(s) have less than 70% team coverage:
                <br />
                {criticalDates.map((d) => new Date(d).toLocaleDateString()).join(", ")}
              </AlertDescription>
            </Alert>
          )}

          {/* Team Absences */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Absences ({absences.length})
            </h3>
            {absences.length === 0 ? (
              <Card className="p-3 text-center text-sm text-muted-foreground">
                No absences scheduled for this period
              </Card>
            ) : (
              <div className="grid gap-2">
                {absences.map((absence, idx) => (
                  <Card key={idx} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{absence.employeeName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(absence.startDate).toLocaleDateString()} -{" "}
                            {new Date(absence.endDate).toLocaleDateString()}
                          </span>
                          <span>({absence.totalDays} days)</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="capitalize">
                          {absence.leaveType}
                        </Badge>
                        <Badge
                          className={
                            absence.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {absence.status}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Coverage Summary */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Team Coverage</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {coverageSummary.map((coverage) => (
                <Card
                  key={coverage.date}
                  className={`p-2 ${
                    coverage.coveragePercentage < 70
                      ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">
                      {new Date(coverage.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-xs">
                      {coverage.available}/{coverage.totalTeamSize} available
                    </span>
                  </div>
                  <Progress value={coverage.coveragePercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {coverage.coveragePercentage}% coverage
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // VIEW APPROVALS
    if (output.action === "view_approvals") {
      const { pendingRequests, totalPending } = output;

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Approvals
            </h3>
            <Badge>{totalPending} pending</Badge>
          </div>

          {pendingRequests.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              No pending approval requests
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <Card
                  key={request.requestId}
                  className={`p-3 ${
                    request.conflicts.hasConflict
                      ? "border-l-4 border-amber-400"
                      : "border-l-4 border-green-400"
                  }`}
                >
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{request.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                          Request ID: {request.requestId}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {request.leaveType}
                      </Badge>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>
                        {new Date(request.startDate).toLocaleDateString()} -{" "}
                        {new Date(request.endDate).toLocaleDateString()}
                      </span>
                      <span className="text-muted-foreground">
                        ({request.totalDays} days)
                      </span>
                    </div>

                    {/* Reason */}
                    {request.reason && (
                      <p className="text-xs italic text-muted-foreground">
                        "{request.reason}"
                      </p>
                    )}

                    {/* Conflicts */}
                    {request.conflicts.hasConflict ? (
                      <Alert variant="destructive" className="py-2">
                        <AlertTriangle className="h-3 w-3" />
                        <AlertDescription className="text-xs">
                          <strong>Scheduling Conflict</strong>
                          <br />
                          Overlaps with: {request.conflicts.conflictingEmployees.join(", ")}
                          <br />
                          Team coverage: {request.conflicts.teamCoveragePercentage}%
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        <span>
                          No conflicts • {request.conflicts.teamCoveragePercentage}% team
                          coverage
                        </span>
                      </div>
                    )}

                    {/* Request Date */}
                    <p className="text-xs text-muted-foreground">
                      Requested: {new Date(request.requestDate).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      );
    }

    // APPROVE/DENY ACTION
    if (output.action === "approve_request" || output.action === "deny_request") {
      const { request, message } = output;
      const isApproved = output.action === "approve_request";

      return (
        <Card className={`border-l-4 ${isApproved ? "border-green-400" : "border-red-400"}`}>
          <div className="p-4 space-y-3">
            {/* Success Message */}
            <div
              className={`flex items-start gap-2 ${
                isApproved
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400"
              }`}
            >
              {isApproved ? (
                <CheckCircle className="h-5 w-5 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 mt-0.5" />
              )}
              <div>
                <p className="font-medium">
                  {isApproved ? "Request Approved" : "Request Denied"}
                </p>
                <p className="text-sm mt-0.5">{message}</p>
              </div>
            </div>

            {/* Request Details */}
            <Card className="bg-muted/50 p-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employee:</span>
                  <span className="font-medium">{request.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dates:</span>
                  <span>
                    {new Date(request.startDate).toLocaleDateString()} -{" "}
                    {new Date(request.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{request.totalDays} days</span>
                </div>
                {request.managerNotes && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground text-xs">Manager Notes:</span>
                    <p className="text-xs mt-1">{request.managerNotes}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </Card>
      );
    }
  }

  return null;
}
```

### Step 2: Add to Message Parts Router

Standard integration in `components/message-parts.tsx`.

---

## System Prompt Integration

**File:** `lib/ai/prompts.ts`

```typescript
**Team Availability Tool (MANAGERS ONLY)** - Use when managers ask about:
- Team member absences and schedules
- Who is off on specific dates
- Team coverage percentages
- Pending leave requests to approve
- Approving or denying leave requests

⚠️ Only use this tool if the user is a manager.

Example: "Who from my team is off next 2 weeks?"
```

---

## RBAC Implementation

### Production Considerations

**File:** `lib/ai/tools/team-availability.ts` (execute function)

```typescript
// Get user from session
const user = await getUser(session);

// Check if user is a manager
const isManager = user.role === "manager" || user.role === "admin";
if (!isManager) {
  return {
    error: "This tool is only available to managers.",
    permissionDenied: true,
  };
}

// Get user's team members
const teamMembers = await getTeamMembers(user.employeeId);
```

**Database Schema:**

```sql
CREATE TABLE employees (
  employee_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL, -- 'employee', 'manager', 'admin'
  manager_id TEXT REFERENCES employees(employee_id),
  department TEXT NOT NULL
);

CREATE TABLE leave_requests (
  request_id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES employees(employee_id),
  manager_id TEXT REFERENCES employees(employee_id),
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'approved', 'denied'
  reason TEXT,
  manager_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Testing Checklist

- [ ] Manager can view team schedule
- [ ] Coverage percentages calculate correctly
- [ ] Critical dates (< 70% coverage) highlight
- [ ] Pending requests list displays
- [ ] Conflict detection shows warnings
- [ ] Approve action updates request
- [ ] Deny action requires reason
- [ ] Non-managers get permission denied
- [ ] Error handling
- [ ] Dark mode styling

---

## Key Features

1. **RBAC Enforcement**: Only managers can access
2. **Conflict Detection**: Highlights overlapping absences
3. **Coverage Analysis**: Shows % of team available each day
4. **Critical Date Warnings**: Alerts when < 70% coverage
5. **Approval Workflow**: Approve/deny with notes
6. **Team View**: See all direct reports' schedules

---

## Mock Data Scenarios

- **Team Size**: 5 members
- **Approved Absences**: 3 scheduled
- **Pending Requests**: 2 (one with conflict, one without)
- **Critical Dates**: Days with 2+ people out

---

## Key File Paths

**Backend:**
- `lib/ai/tools/team-availability.ts` - New file

**Frontend:**
- `components/team-availability-result.tsx` - New file
- `components/ui/progress.tsx` - For coverage bars (may need to add)

---

## Implementation Notes

1. **Permission Checks**: Mock shows RBAC pattern; production must check session
2. **Team Scope**: Managers only see direct reports
3. **Coverage Calculation**: Day-by-day analysis of availability
4. **Conflict Logic**: Detects overlapping dates and calculates impact
5. **Approval Actions**: Updates request status and adds manager notes
6. **Color Scheme**: Indigo theme for team/management features
7. **Future Enhancements**:
   - Calendar visualization
   - Email notifications on approval/denial
   - Team rotation/on-call schedules
   - Holiday calendar integration
   - Multi-level approval workflows
   - Coverage threshold configuration

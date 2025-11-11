"use client";

import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Users,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type {
  TeamAvailabilityInput,
  TeamAvailabilityOutput,
} from "@/lib/ai/tools/team-availability";

type TeamAvailabilityResultProps = {
  state: "input-available" | "output-available";
  input: TeamAvailabilityInput;
  output?: TeamAvailabilityOutput;
};

export function TeamAvailabilityResult({
  state,
  input,
  output,
}: TeamAvailabilityResultProps) {
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
    // ERROR STATE
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
                {criticalDates
                  .map((d) => new Date(d).toLocaleDateString())
                  .join(", ")}
              </AlertDescription>
            </Alert>
          )}

          {/* Team Absences */}
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <Users className="h-4 w-4" />
              Team Absences ({absences.length})
            </h3>
            {absences.length === 0 ? (
              <Card className="p-3 text-center text-muted-foreground text-sm">
                No absences scheduled for this period
              </Card>
            ) : (
              <div className="grid gap-2">
                {absences.map((absence, idx) => (
                  <Card className="p-3" key={idx}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">
                          {absence.employeeName}
                        </p>
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(absence.startDate).toLocaleDateString()} -{" "}
                            {new Date(absence.endDate).toLocaleDateString()}
                          </span>
                          <span>({absence.totalDays} days)</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge className="capitalize" variant="outline">
                          {absence.leaveType}
                        </Badge>
                        <Badge
                          className={
                            absence.status === "approved"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
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

          {/* Coverage Summary with Progress Bars */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Team Coverage</h3>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {coverageSummary.map((coverage) => (
                <Card
                  className={`p-2 ${
                    coverage.coveragePercentage < 70
                      ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950"
                      : ""
                  }`}
                  key={coverage.date}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium text-xs">
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
                  <Progress
                    className="h-2"
                    value={coverage.coveragePercentage}
                  />
                  <p className="mt-1 text-muted-foreground text-xs">
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
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <Clock className="h-4 w-4" />
              Pending Approvals
            </h3>
            <Badge>{totalPending} pending</Badge>
          </div>

          {pendingRequests.length === 0 ? (
            <Card className="p-4 text-center text-muted-foreground text-sm">
              <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
              No pending approval requests
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <Card
                  className={`p-3 ${
                    request.conflicts.hasConflict
                      ? "border-amber-400 border-l-4"
                      : "border-green-400 border-l-4"
                  }`}
                  key={request.requestId}
                >
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {request.employeeName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Request ID: {request.requestId}
                        </p>
                      </div>
                      <Badge className="capitalize" variant="outline">
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
                      <p className="text-muted-foreground text-xs italic">
                        "{request.reason}"
                      </p>
                    )}

                    {/* Conflicts */}
                    {request.conflicts.hasConflict ? (
                      <Alert className="py-2" variant="destructive">
                        <AlertTriangle className="h-3 w-3" />
                        <AlertDescription className="text-xs">
                          <strong>Scheduling Conflict</strong>
                          <br />
                          Overlaps with:{" "}
                          {request.conflicts.conflictingEmployees.join(", ")}
                          <br />
                          Team coverage:{" "}
                          {request.conflicts.teamCoveragePercentage}%
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="flex items-center gap-1 text-green-700 text-xs dark:text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        <span>
                          No conflicts •{" "}
                          {request.conflicts.teamCoveragePercentage}% team
                          coverage
                        </span>
                      </div>
                    )}

                    {/* Request Date */}
                    <p className="text-muted-foreground text-xs">
                      Requested:{" "}
                      {new Date(request.requestDate).toLocaleDateString()}
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
    if (
      output.action === "approve_request" ||
      output.action === "deny_request"
    ) {
      const { request, message } = output;
      const isApproved = output.action === "approve_request";

      return (
        <Card
          className={`border-l-4 ${isApproved ? "border-green-400" : "border-red-400"}`}
        >
          <div className="space-y-3 p-4">
            {/* Success Message */}
            <div
              className={`flex items-start gap-2 ${
                isApproved
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400"
              }`}
            >
              {isApproved ? (
                <CheckCircle className="mt-0.5 h-5 w-5" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5" />
              )}
              <div>
                <p className="font-medium">
                  {isApproved ? "Request Approved" : "Request Denied"}
                </p>
                <p className="mt-0.5 text-sm">{message}</p>
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
                  <div className="border-t pt-2">
                    <span className="text-muted-foreground text-xs">
                      Manager Notes:
                    </span>
                    <p className="mt-1 text-xs">{request.managerNotes}</p>
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

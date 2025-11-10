"use client";

import {
  Loader2,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

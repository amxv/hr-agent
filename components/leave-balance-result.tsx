"use client";

import { AlertTriangle, Calendar, Info, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type {
  LeaveBalanceInput,
  LeaveBalanceOutput,
} from "@/lib/ai/tools/leave-balance";

type LeaveBalanceResultProps = {
  state: "input-available" | "output-available";
  input: LeaveBalanceInput;
  output?: LeaveBalanceOutput;
};

export function LeaveBalanceResult({
  state,
  input,
  output,
}: LeaveBalanceResultProps) {
  // LOADING STATE
  if (state === "input-available") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-900 text-sm dark:border-green-800 dark:bg-green-950 dark:text-green-100">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Checking leave balances...</span>
      </div>
    );
  }

  // RESULT STATE
  if (state === "output-available" && output) {
    // Error handling
    if ("error" in output) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900 text-sm dark:border-red-800 dark:bg-red-950 dark:text-red-100">
          <p className="font-medium">Error retrieving leave balances</p>
          <p className="mt-1 text-xs opacity-90">{output.error}</p>
        </div>
      );
    }

    const { balances, blackoutDates, projection, policies } = output;

    return (
      <div className="space-y-2">
        {/* Projection Warning (if applicable) */}
        {projection?.warning && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{projection.warning}</AlertDescription>
          </Alert>
        )}

        {/* Projection Result */}
        {projection && !projection.warning && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>{projection.scenario}</strong>
              <br />
              Projected balance on{" "}
              {new Date(projection.projectionDate).toLocaleDateString()}:
              <strong className="ml-1">
                {projection.projectedBalance} days
              </strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Current Balances */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm">Current Balances</h3>
          <div className="grid gap-2">
            {balances.map((balance) => (
              <Card className="p-3" key={balance.leaveType}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">
                        {balance.leaveType}
                      </span>
                      <Badge variant="outline">
                        {balance.currentBalance} days
                      </Badge>
                    </div>
                    <div className="space-y-0.5 text-muted-foreground text-xs">
                      <p>
                        Accrued: {balance.accrued} days | Used: {balance.used}{" "}
                        days
                      </p>
                      <p>Accrual rate: {balance.accrualRate} days/month</p>
                      <p>Projected year-end: {balance.projected} days</p>
                      {balance.carryoverLimit > 0 && (
                        <p className="text-amber-600 dark:text-amber-400">
                          Max carryover: {balance.carryoverLimit} days
                          {balance.carryoverDeadline && (
                            <>
                              {" "}
                              (by{" "}
                              {new Date(
                                balance.carryoverDeadline
                              ).toLocaleDateString()}
                              )
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Blackout Dates */}
        {blackoutDates.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Blackout Dates</h3>
            <div className="space-y-2">
              {blackoutDates.map((blackout, idx) => (
                <Card
                  className="border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950"
                  key={idx}
                >
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-0.5 text-sm">
                      <p className="font-medium">
                        {new Date(blackout.startDate).toLocaleDateString()} -{" "}
                        {new Date(blackout.endDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs">{blackout.reason}</p>
                      <p className="text-muted-foreground text-xs">
                        Department: {blackout.department}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Policies */}
        <Card className="border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
          <h3 className="mb-1 font-medium text-sm">Leave Policies</h3>
          <div className="space-y-1 text-blue-900 text-xs dark:text-blue-100">
            <p>• Minimum notice: {policies.minNotice} days</p>
            <p>• Maximum consecutive days: {policies.maxConsecutive}</p>
            <p className="mt-2">{policies.carryoverRules}</p>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}

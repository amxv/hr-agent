import { tool } from "ai";
import { z } from "zod";
import { createModuleLogger } from "@/lib/logger";
import type { StreamWriter } from "../types";

const log = createModuleLogger("ai.tools.leave-balance");

export type LeaveBalanceInput = {
  query: string;
  projectionDate?: string; // ISO date for "what if" scenarios
  daysToTake?: number;
  leaveType?: "vacation" | "sick" | "personal" | "all";
};

export type LeaveBalance = {
  leaveType: "vacation" | "sick" | "personal";
  currentBalance: number; // in days
  accrued: number; // days accrued this year
  used: number; // days used this year
  projected: number; // projected at end of year
  accrualRate: number; // days per month
  carryoverLimit: number; // max days that can carry over
  carryoverDeadline: string; // ISO date
};

export type BlackoutDate = {
  startDate: string; // ISO date
  endDate: string; // ISO date
  reason: string;
  department: string;
};

export type LeaveBalanceOutput =
  | {
      balances: LeaveBalance[];
      blackoutDates: BlackoutDate[];
      projection?: {
        scenario: string;
        projectedBalance: number;
        projectionDate: string;
        warning?: string; // e.g., "This would leave you with negative balance"
      };
      policies: {
        minNotice: number; // days
        maxConsecutive: number; // days
        carryoverRules: string;
      };
    }
  | {
      error: string;
    };

type LeaveBalanceProps = {
  dataStream: StreamWriter;
};

export const leaveBalance = ({ dataStream }: LeaveBalanceProps) =>
  tool({
    description: `
      Check employee leave balances, accrual schedules, carryover rules, and blackout dates.
      Can project future balances based on planned time off.

      Use this tool when employees ask about:
      - Current vacation/sick/personal day balances
      - How many days they'll accrue by a certain date
      - Carryover rules and deadlines
      - Blackout dates for their department
      - "What if" scenarios: "If I take X days in [timeframe], what will my balance be?"
    `,
    inputSchema: z.object({
      query: z
        .string()
        .describe("The employee's question about leave balances"),
      projectionDate: z
        .string()
        .optional()
        .describe("ISO date for projection (e.g., '2026-01-01')"),
      daysToTake: z
        .number()
        .optional()
        .describe("Number of days for projection scenario"),
      leaveType: z
        .enum(["vacation", "sick", "personal", "all"])
        .optional()
        .describe("Type of leave to query"),
    }),
    execute: async ({
      query,
      projectionDate,
      daysToTake,
      leaveType = "all",
    }): Promise<LeaveBalanceOutput> => {
      const startMs = Date.now();
      log.info(
        { query, projectionDate, daysToTake, leaveType },
        "leaveBalance: start"
      );

      // Send loading update
      dataStream.write({
        type: "data-researchUpdate",
        data: {
          title: "Checking leave balances...",
          timestamp: Date.now(),
          type: "started",
        },
      });

      try {
        // Import database queries dynamically
        const {
          getEmployeeByEmployeeId,
          getLeaveBalancesByEmployeeId,
          listBlackoutDates,
          getLeavePolicy,
        } = await import("@/lib/db/queries");

        // For now, use a default employee ID since the tool doesn't have employee context
        // In production, this would come from session or be required as a parameter
        const defaultEmployeeId = "EMP001";

        // Get employee data
        const employee = await getEmployeeByEmployeeId(defaultEmployeeId);
        if (!employee) {
          return {
            error: "Employee not found. Please contact HR for assistance.",
          };
        }

        // Get leave balances for the employee
        const dbBalances = await getLeaveBalancesByEmployeeId(employee.id);
        if (!dbBalances || dbBalances.length === 0) {
          return {
            error: "No leave balance data available for this employee.",
          };
        }

        // Filter balances by type if specified
        let filteredBalances = dbBalances;
        if (leaveType !== "all") {
          filteredBalances = dbBalances.filter(
            (b) => b.leaveType === leaveType
          );
        }

        // Transform database balances to match expected format
        const balances: LeaveBalance[] = filteredBalances.map((b) => ({
          leaveType: b.leaveType as "vacation" | "sick" | "personal",
          currentBalance: Number.parseFloat(b.currentBalance),
          accrued: Number.parseFloat(b.accruedYTD),
          used: Number.parseFloat(b.usedYTD),
          projected: Number.parseFloat(b.projectedYearEnd),
          accrualRate: Number.parseFloat(b.accrualRate),
          carryoverLimit: b.carryoverLimit,
          carryoverDeadline: b.carryoverDeadline || new Date().toISOString(),
        }));

        // Get blackout dates for the employee's department
        const dbBlackoutDates = await listBlackoutDates({
          department: employee.department,
        });

        // Transform blackout dates to match expected format
        const blackoutDates: BlackoutDate[] = dbBlackoutDates.map((bd) => ({
          startDate: bd.startDate,
          endDate: bd.endDate,
          reason: bd.reason,
          department: bd.department || "All",
        }));

        // Get leave policy for the employee's department
        const policy = await getLeavePolicy(employee.department);

        // Handle projection scenario
        let projection:
          | {
              scenario: string;
              projectedBalance: number;
              projectionDate: string;
              warning?: string;
            }
          | undefined;
        if (projectionDate && daysToTake) {
          const vacationBalance = balances.find(
            (b) => b.leaveType === "vacation"
          );
          if (vacationBalance) {
            const projectedBalance =
              vacationBalance.currentBalance - daysToTake;

            projection = {
              scenario: `Taking ${daysToTake} vacation days by ${projectionDate}`,
              projectedBalance,
              projectionDate,
              warning:
                projectedBalance < 0
                  ? "Warning: This would result in negative balance. Request may not be approved."
                  : projectedBalance < 2
                    ? "Note: This would leave you with very limited vacation time remaining."
                    : undefined,
            };
          }
        }

        // Complete update
        dataStream.write({
          type: "data-researchUpdate",
          data: {
            title: "Leave balances retrieved",
            timestamp: Date.now(),
            type: "completed",
          },
        });

        log.info(
          { ms: Date.now() - startMs, resultCount: balances.length },
          "leaveBalance: success"
        );

        return {
          balances,
          blackoutDates,
          projection,
          policies: {
            minNotice: policy?.minimumNotice || 14,
            maxConsecutive: policy?.maxConsecutiveDays || 15,
            carryoverRules:
              "Carryover limits and deadlines are shown per leave type above. Contact HR for specific policy questions.",
          },
        };
      } catch (error) {
        log.error({ error }, "leaveBalance: failure");
        return {
          error: `Failed to retrieve leave balances: ${(error as Error).message}`,
        };
      }
    },
  });

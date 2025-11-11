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

// Mock employee leave data
const MOCK_EMPLOYEE_DATA = {
  employeeId: "EMP001",
  employeeName: "John Doe",
  department: "Engineering",
  hireDate: "2020-03-15",
  balances: [
    {
      leaveType: "vacation" as const,
      currentBalance: 18.5,
      accrued: 20,
      used: 1.5,
      projected: 26.5, // includes end-of-year accrual
      accrualRate: 1.67, // 20 days/year ≈ 1.67/month
      carryoverLimit: 5,
      carryoverDeadline: "2026-03-31",
    },
    {
      leaveType: "sick" as const,
      currentBalance: 12,
      accrued: 12,
      used: 0,
      projected: 12,
      accrualRate: 1, // 12 days/year = 1/month
      carryoverLimit: 0, // sick days don't carry over
      carryoverDeadline: "2025-12-31",
    },
    {
      leaveType: "personal" as const,
      currentBalance: 3,
      accrued: 3,
      used: 0,
      projected: 3,
      accrualRate: 0.25, // 3 days/year
      carryoverLimit: 0,
      carryoverDeadline: "2025-12-31",
    },
  ],
  blackoutDates: [
    {
      startDate: "2025-11-15",
      endDate: "2025-11-30",
      reason: "Year-end release freeze",
      department: "Engineering",
    },
    {
      startDate: "2025-12-15",
      endDate: "2025-12-31",
      reason: "Holiday season - limited approval",
      department: "All",
    },
  ],
  policies: {
    minNotice: 14, // 2 weeks
    maxConsecutive: 15, // days
    carryoverRules:
      "Maximum 5 vacation days can be carried over to next year. Must be used by March 31st. Sick and personal days do not carry over.",
  },
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
        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Get employee data
        const employeeData = MOCK_EMPLOYEE_DATA;

        // Filter balances by type if specified
        let balances = employeeData.balances;
        if (leaveType !== "all") {
          balances = balances.filter((b) => b.leaveType === leaveType);
        }

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
          blackoutDates: employeeData.blackoutDates,
          projection,
          policies: employeeData.policies,
        };
      } catch (error) {
        log.error({ error }, "leaveBalance: failure");
        return {
          error: `Failed to retrieve leave balances: ${(error as Error).message}`,
        };
      }
    },
  });

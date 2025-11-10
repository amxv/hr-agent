# Tool Implementation Plan: Leave Balances & Projections

**Tool ID:** 001
**Tool Name:** `leaveBalance`
**Purpose:** Check current leave balances, accrual schedules, carryover rules, blackout dates, and project future balances based on planned time off

---

## Overview

This tool enables employees to:
- Check current leave balances (vacation, sick, personal days)
- View accrual schedules and rates
- Understand carryover rules and deadlines
- See blackout dates for their department
- Project future balances with "what-if" scenarios

**Example Query:**
"If I take 7 days off December 18-24, what will my vacation balance be on January 1?"

---

## Backend Implementation

### Step 1: Define Types

**File:** `lib/ai/tools/leave-balance.ts`

```typescript
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

export type LeaveBalanceOutput = {
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
} | {
  error: string;
};
```

### Step 2: Create Mock Data

**File:** `lib/ai/tools/leave-balance.ts` (within the tool implementation)

```typescript
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
    carryoverRules: "Maximum 5 vacation days can be carried over to next year. Must be used by March 31st. Sick and personal days do not carry over.",
  },
};

// Additional mock scenarios
const MOCK_BLACKOUT_DATES_BY_DEPT = {
  Engineering: [
    {
      startDate: "2025-11-15",
      endDate: "2025-11-30",
      reason: "Year-end release freeze",
      department: "Engineering",
    },
  ],
  Sales: [
    {
      startDate: "2025-12-01",
      endDate: "2025-12-31",
      reason: "End of quarter - all hands required",
      department: "Sales",
    },
  ],
  HR: [],
};
```

### Step 3: Implement Tool

**File:** `lib/ai/tools/leave-balance.ts`

```typescript
import { tool } from "ai";
import { z } from "zod";
import { createModuleLogger } from "@/lib/logger";
import type { StreamWriter } from "../types";

const log = createModuleLogger("ai.tools.leave-balance");

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
      query: z.string().describe("The employee's question about leave balances"),
      projectionDate: z.string().optional().describe("ISO date for projection (e.g., '2026-01-01')"),
      daysToTake: z.number().optional().describe("Number of days for projection scenario"),
      leaveType: z.enum(["vacation", "sick", "personal", "all"]).optional().describe("Type of leave to query"),
    }),
    execute: async ({ query, projectionDate, daysToTake, leaveType = "all" }): Promise<LeaveBalanceOutput> => {
      const startMs = Date.now();
      log.info({ query, projectionDate, daysToTake, leaveType }, "leaveBalance: start");

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
        await new Promise(resolve => setTimeout(resolve, 800));

        // Get employee data
        const employeeData = MOCK_EMPLOYEE_DATA;

        // Filter balances by type if specified
        let balances = employeeData.balances;
        if (leaveType !== "all") {
          balances = balances.filter(b => b.leaveType === leaveType);
        }

        // Handle projection scenario
        let projection = undefined;
        if (projectionDate && daysToTake) {
          const vacationBalance = balances.find(b => b.leaveType === "vacation");
          if (vacationBalance) {
            const projectedBalance = vacationBalance.currentBalance - daysToTake;

            projection = {
              scenario: `Taking ${daysToTake} vacation days by ${projectionDate}`,
              projectedBalance,
              projectionDate,
              warning: projectedBalance < 0
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
```

### Step 4: Register Tool

**File:** `lib/ai/tools/tools-definitions.ts`

Add to the `toolsDefinitions` object:

```typescript
leaveBalance: {
  name: "leaveBalance",
  description: "Check leave balances and projections",
  cost: 2,
},
```

**File:** `lib/ai/types.ts`

Add to `toolNameSchema`:

```typescript
export const toolNameSchema = z.enum([
  // ... existing tools
  "leaveBalance",
]);
```

Add to `ChatTools` type:

```typescript
import type { leaveBalance } from "@/lib/ai/tools/leave-balance";

type leaveBalanceTool = InferUITool<ReturnType<typeof leaveBalance>>;

export type ChatTools = {
  // ... existing tools
  leaveBalance: leaveBalanceTool;
};
```

**File:** `lib/ai/tools/tools.ts`

Import and register:

```typescript
import { leaveBalance } from "@/lib/ai/tools/leave-balance";

export function getTools({...}) {
  return {
    // ... existing tools
    leaveBalance: leaveBalance({ dataStream }),
  };
}
```

---

## Frontend Implementation

### Step 1: Create UI Component

**File:** `components/leave-balance-result.tsx`

```typescript
"use client";

import { Loader2, Calendar, AlertTriangle, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { LeaveBalanceInput, LeaveBalanceOutput } from "@/lib/ai/tools/leave-balance";

type LeaveBalanceResultProps = {
  state: "input-available" | "output-available";
  input: LeaveBalanceInput;
  output?: LeaveBalanceOutput;
};

export function LeaveBalanceResult({ state, input, output }: LeaveBalanceResultProps) {
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
      <div className="space-y-4">
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
              Projected balance on {new Date(projection.projectionDate).toLocaleDateString()}:
              <strong className="ml-1">{projection.projectedBalance} days</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Current Balances */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm">Current Balances</h3>
          <div className="grid gap-2">
            {balances.map((balance) => (
              <Card key={balance.leaveType} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{balance.leaveType}</span>
                      <Badge variant="outline">{balance.currentBalance} days</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Accrued: {balance.accrued} days | Used: {balance.used} days</p>
                      <p>Accrual rate: {balance.accrualRate} days/month</p>
                      <p>Projected year-end: {balance.projected} days</p>
                      {balance.carryoverLimit > 0 && (
                        <p className="text-amber-600 dark:text-amber-400">
                          Max carryover: {balance.carryoverLimit} days (by {new Date(balance.carryoverDeadline).toLocaleDateString()})
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
                <Card key={idx} className="border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="text-sm space-y-0.5">
                      <p className="font-medium">
                        {new Date(blackout.startDate).toLocaleDateString()} - {new Date(blackout.endDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs">{blackout.reason}</p>
                      <p className="text-xs text-muted-foreground">Department: {blackout.department}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Policies */}
        <Card className="border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
          <h3 className="font-medium text-sm mb-2">Leave Policies</h3>
          <div className="text-xs space-y-1 text-blue-900 dark:text-blue-100">
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
```

### Step 2: Add to Message Parts Router

**File:** `components/message-parts.tsx`

Add import:

```typescript
import { LeaveBalanceResult } from "./leave-balance-result";
```

Add handler in `PureMessagePart` function (around line 473):

```typescript
if (type === "tool-leaveBalance") {
  const { toolCallId, state } = part;
  if (state === "input-available") {
    const { input } = part;
    return (
      <div key={toolCallId}>
        <LeaveBalanceResult input={input} state={state} />
      </div>
    );
  }
  if (state === "output-available") {
    const { input, output } = part;
    return (
      <div key={toolCallId}>
        <LeaveBalanceResult input={input} output={output} state={state} />
      </div>
    );
  }
}
```

---

## System Prompt Integration

**File:** `lib/ai/prompts.ts`

Add to the tool usage section:

```typescript
**Leave Balance Tool** - Use when employees ask about:
- Current leave balances (vacation, sick, personal days)
- Accrual schedules and rates
- Carryover rules and deadlines
- Blackout dates
- Future balance projections ("If I take X days, what will my balance be?")

Example: "If I take 7 days in December, what will my vacation balance be on Jan 1?"
```

---

## Testing Checklist

- [ ] Tool executes without errors
- [ ] Loading state displays correctly
- [ ] Current balances render with proper formatting
- [ ] Projection scenarios calculate correctly
- [ ] Warning messages appear for negative projections
- [ ] Blackout dates display properly
- [ ] Policy information is readable
- [ ] Dark mode styles work
- [ ] Error states handle gracefully
- [ ] Tool cost is deducted from user credits

---

## Key File Paths

**Backend:**
- `lib/ai/tools/leave-balance.ts` - Tool implementation
- `lib/ai/tools/tools-definitions.ts` - Tool metadata (lines ~100)
- `lib/ai/tools/tools.ts` - Tool registration in getTools() (lines ~90)
- `lib/ai/types.ts` - Type definitions (lines 26-40 for schema, 83-97 for ChatTools)

**Frontend:**
- `components/leave-balance-result.tsx` - UI component (new file)
- `components/message-parts.tsx` - Router integration (lines ~473)

**Configuration:**
- `lib/ai/prompts.ts` - System prompt updates

---

## Implementation Notes

1. **Mock Data Realism**: The mock data simulates a mid-year scenario (November) with realistic accrual rates and balances.

2. **Projection Logic**: Simple subtraction for demo purposes. Production would need to account for accrual during the projected period.

3. **Blackout Date Logic**: Currently shows all blackout dates. Could be enhanced to only show relevant dates based on query.

4. **Employee Context**: Hardcoded for demo. Production would get employee ID from session and query HCM API.

5. **Color Scheme**: Uses green for leave/time-off related UI to match common HR system patterns.

6. **Policies**: Static text for demo. Production would pull from policy management system.

7. **Future Enhancements**:
   - Calendar view of leave schedule
   - Team leave calendar showing who's out when
   - Direct leave request submission
   - Leave history view

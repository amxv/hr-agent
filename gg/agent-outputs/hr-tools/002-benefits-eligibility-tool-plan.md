# Tool Implementation Plan: Benefits & Eligibility

**Tool ID:** 002
**Tool Name:** `benefitsInfo`
**Purpose:** Query medical/dental plan tiers, dependent information, coverage dates, enrollment windows, and plan comparisons

---

## Overview

This tool enables employees to:
- View current benefit enrollments (medical, dental, vision, 401k)
- Check dependents on file and their coverage status
- See coverage effective dates and termination dates
- Get enrollment window information with countdown
- Compare plan options (premium, deductible, coverage)

**Example Query:**
"What's the difference between the PPO and HMO plans? When is open enrollment?"

---

## Backend Implementation

### Step 1: Define Types

**File:** `lib/ai/tools/benefits-info.ts`

```typescript
export type BenefitsInfoInput = {
  query: string;
  category?: "medical" | "dental" | "vision" | "retirement" | "all";
  compareMode?: boolean; // if true, return plan comparison
};

export type Dependent = {
  id: string;
  name: string;
  relationship: "spouse" | "domestic_partner" | "child";
  dateOfBirth: string;
  coverageTypes: string[]; // ["medical", "dental"]
};

export type PlanEnrollment = {
  planType: "medical" | "dental" | "vision" | "401k" | "fsa" | "hsa";
  planName: string;
  tier: string; // "Employee Only", "Employee + Spouse", "Family"
  carrier: string;
  monthlyPremium: number; // employee portion
  deductible?: number;
  outOfPocketMax?: number;
  effectiveDate: string; // ISO date
  terminationDate?: string; // ISO date, null if active
  status: "active" | "pending" | "terminated";
};

export type PlanOption = {
  planId: string;
  planType: "medical" | "dental" | "vision";
  planName: string;
  carrier: string;
  monthlyPremiumEmployeeOnly: number;
  monthlyPremiumEmployeeSpouse: number;
  monthlyPremiumFamily: number;
  deductibleIndividual: number;
  deductibleFamily: number;
  outOfPocketMaxIndividual: number;
  outOfPocketMaxFamily: number;
  coPayPrimaryCare: number;
  coPaySpecialist: number;
  coverage: {
    inNetworkCoverage: number; // percentage
    outOfNetworkCoverage: number; // percentage
    preventiveCare: "Covered 100%" | "After deductible";
    prescriptionDrugs: string;
  };
  highlights: string[];
};

export type EnrollmentWindow = {
  type: "open_enrollment" | "new_hire" | "qualifying_event";
  startDate: string; // ISO date
  endDate: string; // ISO date
  daysRemaining: number;
  description: string;
};

export type BenefitsInfoOutput = {
  currentEnrollments: PlanEnrollment[];
  dependents: Dependent[];
  enrollmentWindow?: EnrollmentWindow;
  planComparison?: PlanOption[]; // if compareMode is true
  benefits: {
    employerHSAContribution?: number;
    employerRetirementMatch?: string;
    ptoPolicy?: string;
  };
} | {
  error: string;
};
```

### Step 2: Create Mock Data

**File:** `lib/ai/tools/benefits-info.ts`

```typescript
const MOCK_EMPLOYEE_BENEFITS = {
  employeeId: "EMP001",
  employeeName: "John Doe",

  currentEnrollments: [
    {
      planType: "medical" as const,
      planName: "Blue Shield PPO Gold",
      tier: "Employee + Spouse",
      carrier: "Blue Shield of California",
      monthlyPremium: 450,
      deductible: 1500,
      outOfPocketMax: 6000,
      effectiveDate: "2025-01-01",
      terminationDate: null,
      status: "active" as const,
    },
    {
      planType: "dental" as const,
      planName: "Delta Dental PPO",
      tier: "Family",
      carrier: "Delta Dental",
      monthlyPremium: 85,
      deductible: 50,
      outOfPocketMax: 2000,
      effectiveDate: "2025-01-01",
      terminationDate: null,
      status: "active" as const,
    },
    {
      planType: "vision" as const,
      planName: "VSP Vision Care",
      tier: "Employee + Spouse",
      carrier: "VSP",
      monthlyPremium: 18,
      effectiveDate: "2025-01-01",
      terminationDate: null,
      status: "active" as const,
    },
    {
      planType: "401k" as const,
      planName: "Traditional 401(k)",
      tier: "Employee",
      carrier: "Fidelity",
      monthlyPremium: 0, // contribution is pre-tax
      effectiveDate: "2020-04-01",
      terminationDate: null,
      status: "active" as const,
    },
  ],

  dependents: [
    {
      id: "DEP001",
      name: "Jane Doe",
      relationship: "spouse" as const,
      dateOfBirth: "1988-07-22",
      coverageTypes: ["medical", "dental", "vision"],
    },
    {
      id: "DEP002",
      name: "Jimmy Doe",
      relationship: "child" as const,
      dateOfBirth: "2015-03-10",
      coverageTypes: ["dental"],
    },
  ],

  enrollmentWindow: {
    type: "open_enrollment" as const,
    startDate: "2025-11-01",
    endDate: "2025-11-30",
    daysRemaining: 20,
    description: "Annual open enrollment period for 2026 benefits. Changes will be effective January 1, 2026.",
  },

  benefits: {
    employerHSAContribution: 1000, // annual
    employerRetirementMatch: "100% match up to 6% of salary",
    ptoPolicy: "20 vacation days, 12 sick days, 3 personal days per year",
  },
};

const MOCK_PLAN_OPTIONS: PlanOption[] = [
  {
    planId: "MED001",
    planType: "medical",
    planName: "Blue Shield PPO Gold",
    carrier: "Blue Shield of California",
    monthlyPremiumEmployeeOnly: 250,
    monthlyPremiumEmployeeSpouse: 450,
    monthlyPremiumFamily: 650,
    deductibleIndividual: 1500,
    deductibleFamily: 3000,
    outOfPocketMaxIndividual: 6000,
    outOfPocketMaxFamily: 12000,
    coPayPrimaryCare: 25,
    coPaySpecialist: 50,
    coverage: {
      inNetworkCoverage: 80,
      outOfNetworkCoverage: 60,
      preventiveCare: "Covered 100%",
      prescriptionDrugs: "$10 generic, $30 brand name, $50 specialty",
    },
    highlights: [
      "Access to large provider network",
      "No referrals needed for specialists",
      "Higher out-of-pocket costs",
      "Good for frequent healthcare users",
    ],
  },
  {
    planId: "MED002",
    planType: "medical",
    planName: "Kaiser HMO Platinum",
    carrier: "Kaiser Permanente",
    monthlyPremiumEmployeeOnly: 200,
    monthlyPremiumEmployeeSpouse: 380,
    monthlyPremiumFamily: 550,
    deductibleIndividual: 500,
    deductibleFamily: 1000,
    outOfPocketMaxIndividual: 4000,
    outOfPocketMaxFamily: 8000,
    coPayPrimaryCare: 15,
    coPaySpecialist: 30,
    coverage: {
      inNetworkCoverage: 100,
      outOfNetworkCoverage: 0,
      preventiveCare: "Covered 100%",
      prescriptionDrugs: "$5 generic, $20 brand name, $40 specialty",
    },
    highlights: [
      "Integrated care model",
      "Lower monthly premiums",
      "Must use Kaiser facilities",
      "Referrals required for specialists",
      "No out-of-network coverage",
    ],
  },
  {
    planId: "MED003",
    planType: "medical",
    planName: "Blue Shield HDHP with HSA",
    carrier: "Blue Shield of California",
    monthlyPremiumEmployeeOnly: 150,
    monthlyPremiumEmployeeSpouse: 300,
    monthlyPremiumFamily: 450,
    deductibleIndividual: 3000,
    deductibleFamily: 6000,
    outOfPocketMaxIndividual: 6000,
    outOfPocketMaxFamily: 12000,
    coPayPrimaryCare: 0, // after deductible
    coPaySpecialist: 0, // after deductible
    coverage: {
      inNetworkCoverage: 100,
      outOfNetworkCoverage: 70,
      preventiveCare: "Covered 100%",
      prescriptionDrugs: "After deductible, then 80% covered",
    },
    highlights: [
      "Lowest monthly premium",
      "HSA-eligible (employer contributes $1,000/year)",
      "High deductible",
      "Best for healthy individuals",
      "Tax-advantaged savings",
    ],
  },
];
```

### Step 3: Implement Tool

**File:** `lib/ai/tools/benefits-info.ts`

```typescript
import { tool } from "ai";
import { z } from "zod";
import { createModuleLogger } from "@/lib/logger";
import type { StreamWriter } from "../types";

const log = createModuleLogger("ai.tools.benefits-info");

type BenefitsInfoProps = {
  dataStream: StreamWriter;
};

export const benefitsInfo = ({ dataStream }: BenefitsInfoProps) =>
  tool({
    description: `
      Query employee benefits information including medical, dental, vision, and retirement plans.

      Use this tool when employees ask about:
      - Current benefit enrollments and coverage
      - Dependents on their plan
      - Premium costs and out-of-pocket maximums
      - Enrollment windows and deadlines
      - Comparing different plan options
      - HSA/FSA information
      - 401(k) matching and retirement benefits

      Can provide plan comparisons when employees are deciding between options.
    `,
    inputSchema: z.object({
      query: z.string().describe("The employee's question about benefits"),
      category: z.enum(["medical", "dental", "vision", "retirement", "all"]).optional(),
      compareMode: z.boolean().optional().describe("Set to true to return plan comparison data"),
    }),
    execute: async ({ query, category = "all", compareMode = false }): Promise<BenefitsInfoOutput> => {
      const startMs = Date.now();
      log.info({ query, category, compareMode }, "benefitsInfo: start");

      dataStream.write({
        type: "data-researchUpdate",
        data: {
          title: "Retrieving benefits information...",
          timestamp: Date.now(),
          type: "started",
        },
      });

      try {
        await new Promise(resolve => setTimeout(resolve, 900));

        const employeeData = MOCK_EMPLOYEE_BENEFITS;

        // Filter enrollments by category if specified
        let enrollments = employeeData.currentEnrollments;
        if (category !== "all") {
          enrollments = enrollments.filter(e => e.planType === category);
        }

        // Include plan comparison if requested
        let planComparison = undefined;
        if (compareMode) {
          planComparison = MOCK_PLAN_OPTIONS;
        }

        dataStream.write({
          type: "data-researchUpdate",
          data: {
            title: "Benefits information retrieved",
            timestamp: Date.now(),
            type: "completed",
          },
        });

        log.info(
          { ms: Date.now() - startMs },
          "benefitsInfo: success"
        );

        return {
          currentEnrollments: enrollments,
          dependents: employeeData.dependents,
          enrollmentWindow: employeeData.enrollmentWindow,
          planComparison,
          benefits: employeeData.benefits,
        };
      } catch (error) {
        log.error({ error }, "benefitsInfo: failure");
        return {
          error: `Failed to retrieve benefits information: ${(error as Error).message}`,
        };
      }
    },
  });
```

### Step 4: Register Tool

**File:** `lib/ai/tools/tools-definitions.ts`

```typescript
benefitsInfo: {
  name: "benefitsInfo",
  description: "Query benefits and plan information",
  cost: 2,
},
```

**File:** `lib/ai/types.ts`

Update type definitions (same pattern as leaveBalance).

**File:** `lib/ai/tools/tools.ts`

```typescript
import { benefitsInfo } from "@/lib/ai/tools/benefits-info";

export function getTools({...}) {
  return {
    // ... existing tools
    benefitsInfo: benefitsInfo({ dataStream }),
  };
}
```

---

## Frontend Implementation

### Step 1: Create UI Component

**File:** `components/benefits-info-result.tsx`

```typescript
"use client";

import { Loader2, Heart, Users, Calendar, DollarSign, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BenefitsInfoInput, BenefitsInfoOutput } from "@/lib/ai/tools/benefits-info";

type BenefitsInfoResultProps = {
  state: "input-available" | "output-available";
  input: BenefitsInfoInput;
  output?: BenefitsInfoOutput;
};

export function BenefitsInfoResult({ state, input, output }: BenefitsInfoResultProps) {
  // LOADING STATE
  if (state === "input-available") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-900 text-sm dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Retrieving benefits information...</span>
      </div>
    );
  }

  // RESULT STATE
  if (state === "output-available" && output) {
    if ("error" in output) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900 text-sm dark:border-red-800 dark:bg-red-950 dark:text-red-100">
          <p className="font-medium">Error retrieving benefits</p>
          <p className="mt-1 text-xs opacity-90">{output.error}</p>
        </div>
      );
    }

    const { currentEnrollments, dependents, enrollmentWindow, planComparison, benefits } = output;

    return (
      <div className="space-y-4">
        {/* Enrollment Window Alert */}
        {enrollmentWindow && enrollmentWindow.daysRemaining > 0 && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <Calendar className="h-4 w-4" />
            <AlertDescription>
              <strong>{enrollmentWindow.type.replace(/_/g, " ").toUpperCase()}</strong>
              <br />
              {enrollmentWindow.description}
              <br />
              <span className="font-bold text-amber-900 dark:text-amber-100">
                {enrollmentWindow.daysRemaining} days remaining
              </span>
              {" "}(ends {new Date(enrollmentWindow.endDate).toLocaleDateString()})
            </AlertDescription>
          </Alert>
        )}

        {/* Current Enrollments */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Current Enrollments
          </h3>
          <div className="grid gap-2">
            {currentEnrollments.map((enrollment, idx) => (
              <Card key={idx} className="p-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{enrollment.planName}</span>
                        <Badge variant="outline" className="capitalize">
                          {enrollment.planType}
                        </Badge>
                        <Badge
                          variant={enrollment.status === "active" ? "default" : "secondary"}
                        >
                          {enrollment.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {enrollment.carrier} • {enrollment.tier}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">${enrollment.monthlyPremium}/mo</p>
                      <p className="text-xs text-muted-foreground">Your cost</p>
                    </div>
                  </div>

                  {enrollment.deductible !== undefined && (
                    <div className="flex gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Deductible: </span>
                        <span className="font-medium">${enrollment.deductible.toLocaleString()}</span>
                      </div>
                      {enrollment.outOfPocketMax && (
                        <div>
                          <span className="text-muted-foreground">Max OOP: </span>
                          <span className="font-medium">${enrollment.outOfPocketMax.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Effective: {new Date(enrollment.effectiveDate).toLocaleDateString()}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Dependents */}
        {dependents.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Dependents ({dependents.length})
            </h3>
            <div className="grid gap-2">
              {dependents.map((dependent) => (
                <Card key={dependent.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{dependent.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {dependent.relationship.replace(/_/g, " ")} • Born {new Date(dependent.dateOfBirth).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {dependent.coverageTypes.map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Plan Comparison Table */}
        {planComparison && planComparison.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Plan Comparison</h3>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Premium (EE Only)</TableHead>
                      <TableHead>Deductible</TableHead>
                      <TableHead>Max OOP</TableHead>
                      <TableHead>PCP Co-pay</TableHead>
                      <TableHead>Highlights</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planComparison.map((plan) => (
                      <TableRow key={plan.planId}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{plan.planName}</p>
                            <p className="text-xs text-muted-foreground">{plan.carrier}</p>
                          </div>
                        </TableCell>
                        <TableCell>${plan.monthlyPremiumEmployeeOnly}/mo</TableCell>
                        <TableCell>${plan.deductibleIndividual.toLocaleString()}</TableCell>
                        <TableCell>${plan.outOfPocketMaxIndividual.toLocaleString()}</TableCell>
                        <TableCell>
                          {plan.coPayPrimaryCare > 0 ? `$${plan.coPayPrimaryCare}` : "After deductible"}
                        </TableCell>
                        <TableCell>
                          <ul className="text-xs space-y-0.5 list-disc list-inside">
                            {plan.highlights.slice(0, 3).map((highlight, idx) => (
                              <li key={idx}>{highlight}</li>
                            ))}
                          </ul>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}

        {/* Additional Benefits */}
        <Card className="border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
          <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Additional Benefits
          </h3>
          <div className="text-xs space-y-1 text-green-900 dark:text-green-100">
            {benefits.employerHSAContribution && (
              <p>• Employer HSA contribution: ${benefits.employerHSAContribution.toLocaleString()}/year</p>
            )}
            {benefits.employerRetirementMatch && (
              <p>• 401(k) matching: {benefits.employerRetirementMatch}</p>
            )}
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

```typescript
import { BenefitsInfoResult } from "./benefits-info-result";

// In PureMessagePart function
if (type === "tool-benefitsInfo") {
  const { toolCallId, state } = part;
  if (state === "input-available") {
    const { input } = part;
    return (
      <div key={toolCallId}>
        <BenefitsInfoResult input={input} state={state} />
      </div>
    );
  }
  if (state === "output-available") {
    const { input, output } = part;
    return (
      <div key={toolCallId}>
        <BenefitsInfoResult input={input} output={output} state={state} />
      </div>
    );
  }
}
```

---

## System Prompt Integration

**File:** `lib/ai/prompts.ts`

```typescript
**Benefits Info Tool** - Use when employees ask about:
- Current benefit enrollments (medical, dental, vision, 401k)
- Premium costs and coverage details
- Dependents on file
- Enrollment windows and deadlines
- Comparing plan options
- HSA/FSA and retirement benefits

Example: "What's the difference between the PPO and HMO plans?"
```

---

## Testing Checklist

- [ ] Tool executes and returns benefits data
- [ ] Loading state displays
- [ ] Current enrollments render correctly
- [ ] Dependents section shows properly
- [ ] Enrollment window alert appears with countdown
- [ ] Plan comparison table renders (when compareMode=true)
- [ ] Premium and cost information formats correctly
- [ ] Additional benefits section displays
- [ ] Error handling works
- [ ] Dark mode styling

---

## Key File Paths

**Backend:**
- `lib/ai/tools/benefits-info.ts` - New file
- `lib/ai/tools/tools-definitions.ts` - Add entry
- `lib/ai/tools/tools.ts` - Register tool
- `lib/ai/types.ts` - Add types

**Frontend:**
- `components/benefits-info-result.tsx` - New file
- `components/message-parts.tsx` - Add handler
- `components/ui/table.tsx` - For plan comparison

**Configuration:**
- `lib/ai/prompts.ts` - Update system prompt

---

## Implementation Notes

1. **Mock Data Coverage**: Includes comprehensive benefits data for a mid-level employee with family coverage.

2. **Plan Comparison**: Comparison mode provides side-by-side analysis of PPO, HMO, and HDHP options.

3. **Enrollment Window**: Mock shows active open enrollment with countdown - creates urgency.

4. **Dependent Management**: Shows spouse and child with different coverage types.

5. **Cost Transparency**: Clearly displays employee costs vs employer contributions.

6. **Color Scheme**: Blue theme for benefits-related UI (standard in HR/benefits contexts).

7. **Table Component**: Uses shadcn/ui Table component for plan comparison - may need to install if not present.

8. **Future Enhancements**:
   - Direct enrollment actions
   - FSA/HSA account balances and contribution changes
   - Life event tracking for qualifying events
   - Benefits document library integration
   - Premium calculators for different scenarios
   - Beneficiary information

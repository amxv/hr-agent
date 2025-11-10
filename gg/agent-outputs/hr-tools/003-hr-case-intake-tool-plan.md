# Tool Implementation Plan: HR Case Intake & Status

**Tool ID:** 003
**Tool Name:** `hrCase`
**Purpose:** Create HR support tickets and check status of existing cases with classification, SLA tracking, and resolution updates

---

## Overview

This tool enables employees to:
- Create new HR support tickets with automatic intent classification
- Check status of existing cases
- View SLA timelines and expected resolution dates
- See case history and updates
- Attach chat transcripts to cases for context

**Example Query:**
"Start a case about a payroll deduction discrepancy; attach this chat."

---

## Backend Implementation

### Step 1: Define Types

**File:** `lib/ai/tools/hr-case.ts`

```typescript
export type HRCaseInput = {
  action: "create" | "status" | "list";
  category?: "payroll" | "benefits" | "policy" | "equipment" | "other";
  description?: string; // for create action
  caseId?: string; // for status action
  attachChat?: boolean; // whether to attach current conversation
};

export type CaseCategory =
  | "payroll"
  | "benefits"
  | "policy"
  | "equipment"
  | "leave"
  | "performance"
  | "other";

export type CasePriority = "low" | "medium" | "high" | "urgent";

export type CaseStatus =
  | "new"
  | "assigned"
  | "in_progress"
  | "pending_employee"
  | "resolved"
  | "closed";

export type CaseUpdate = {
  timestamp: string; // ISO date
  author: string;
  authorRole: "employee" | "hr_specialist" | "system";
  message: string;
  isInternal: boolean; // internal notes not visible to employee
};

export type HRCase = {
  caseId: string;
  createdDate: string; // ISO date
  category: CaseCategory;
  priority: CasePriority;
  status: CaseStatus;
  subject: string;
  description: string;
  assignedTo?: string;
  assignedTeam: string;
  sla: {
    firstResponseDue: string; // ISO date
    firstResponseMet: boolean;
    resolutionDue: string; // ISO date
    resolutionMet: boolean;
    hoursRemaining: number;
  };
  updates: CaseUpdate[];
  attachments?: string[]; // URLs or descriptions
};

export type HRCaseOutput =
  | {
      action: "create";
      case: HRCase;
      message: string;
    }
  | {
      action: "status";
      case: HRCase;
    }
  | {
      action: "list";
      cases: HRCase[];
      totalOpen: number;
      totalClosed: number;
    }
  | {
      error: string;
    };
```

### Step 2: Create Mock Data

**File:** `lib/ai/tools/hr-case.ts`

```typescript
// Mock existing cases
const MOCK_EXISTING_CASES: HRCase[] = [
  {
    caseId: "HR-2025-001234",
    createdDate: "2025-11-05T10:30:00Z",
    category: "benefits",
    priority: "medium",
    status: "in_progress",
    subject: "FSA claim reimbursement delay",
    description: "Submitted FSA claim on Oct 15th but haven't received reimbursement yet. Claim #FSA-2025-0892.",
    assignedTo: "Sarah Chen",
    assignedTeam: "Benefits Administration",
    sla: {
      firstResponseDue: "2025-11-05T18:30:00Z",
      firstResponseMet: true,
      resolutionDue: "2025-11-08T18:30:00Z",
      resolutionMet: false,
      hoursRemaining: 12,
    },
    updates: [
      {
        timestamp: "2025-11-05T10:30:00Z",
        author: "System",
        authorRole: "system",
        message: "Case created and assigned to Benefits Administration team",
        isInternal: false,
      },
      {
        timestamp: "2025-11-05T14:20:00Z",
        author: "Sarah Chen",
        authorRole: "hr_specialist",
        message: "Hi John, I've located your claim. It's currently in processing with our FSA vendor. I've escalated it for faster processing. You should see the reimbursement within 2-3 business days.",
        isInternal: false,
      },
      {
        timestamp: "2025-11-06T09:15:00Z",
        author: "Sarah Chen",
        authorRole: "hr_specialist",
        message: "Claim approved by vendor, payment initiated",
        isInternal: true,
      },
    ],
    attachments: ["FSA Claim #0892"],
  },
  {
    caseId: "HR-2025-001198",
    createdDate: "2025-10-28T15:45:00Z",
    category: "equipment",
    priority: "low",
    status: "resolved",
    subject: "Request additional monitor for home office",
    description: "Would like to request a second monitor for my home office setup to improve productivity.",
    assignedTo: "IT Support",
    assignedTeam: "IT & Facilities",
    sla: {
      firstResponseDue: "2025-10-29T15:45:00Z",
      firstResponseMet: true,
      resolutionDue: "2025-11-04T15:45:00Z",
      resolutionMet: true,
      hoursRemaining: 0,
    },
    updates: [
      {
        timestamp: "2025-10-28T15:45:00Z",
        author: "System",
        authorRole: "system",
        message: "Case created and assigned to IT & Facilities team",
        isInternal: false,
      },
      {
        timestamp: "2025-10-29T09:30:00Z",
        author: "IT Support",
        authorRole: "hr_specialist",
        message: "Request approved. Monitor will be shipped to your home address on file. Expected delivery: Nov 1-3.",
        isInternal: false,
      },
      {
        timestamp: "2025-11-02T14:20:00Z",
        author: "John Doe",
        authorRole: "employee",
        message: "Monitor received. Thank you!",
        isInternal: false,
      },
      {
        timestamp: "2025-11-02T14:25:00Z",
        author: "IT Support",
        authorRole: "hr_specialist",
        message: "Great! Closing this case. Let us know if you need anything else.",
        isInternal: false,
      },
    ],
  },
];

// SLA configurations by category
const SLA_CONFIG: Record<CaseCategory, { firstResponseHours: number; resolutionDays: number; priority: CasePriority }> = {
  payroll: { firstResponseHours: 4, resolutionDays: 2, priority: "high" },
  benefits: { firstResponseHours: 8, resolutionDays: 3, priority: "medium" },
  policy: { firstResponseHours: 24, resolutionDays: 5, priority: "low" },
  equipment: { firstResponseHours: 24, resolutionDays: 7, priority: "low" },
  leave: { firstResponseHours: 8, resolutionDays: 2, priority: "medium" },
  performance: { firstResponseHours: 24, resolutionDays: 7, priority: "medium" },
  other: { firstResponseHours: 24, resolutionDays: 5, priority: "low" },
};

// Team assignments by category
const TEAM_ASSIGNMENT: Record<CaseCategory, string> = {
  payroll: "Payroll Services",
  benefits: "Benefits Administration",
  policy: "HR Policy & Compliance",
  equipment: "IT & Facilities",
  leave: "Leave Management",
  performance: "Employee Relations",
  other: "General HR Support",
};

// Function to classify intent from description
function classifyIntent(description: string): CaseCategory {
  const lower = description.toLowerCase();
  if (lower.includes("payroll") || lower.includes("paycheck") || lower.includes("deduction")) {
    return "payroll";
  }
  if (lower.includes("benefit") || lower.includes("insurance") || lower.includes("medical") || lower.includes("dental")) {
    return "benefits";
  }
  if (lower.includes("policy") || lower.includes("handbook") || lower.includes("rule")) {
    return "policy";
  }
  if (lower.includes("equipment") || lower.includes("laptop") || lower.includes("monitor") || lower.includes("computer")) {
    return "equipment";
  }
  if (lower.includes("leave") || lower.includes("vacation") || lower.includes("pto") || lower.includes("sick day")) {
    return "leave";
  }
  if (lower.includes("performance") || lower.includes("review") || lower.includes("manager")) {
    return "performance";
  }
  return "other";
}

// Generate case ID
function generateCaseId(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 900000) + 100000;
  return `HR-${year}-${randomNum}`;
}
```

### Step 3: Implement Tool

**File:** `lib/ai/tools/hr-case.ts`

```typescript
import { tool } from "ai";
import { z } from "zod";
import { createModuleLogger } from "@/lib/logger";
import type { StreamWriter } from "../types";

const log = createModuleLogger("ai.tools.hr-case");

type HRCaseProps = {
  dataStream: StreamWriter;
};

export const hrCase = ({ dataStream }: HRCaseProps) =>
  tool({
    description: `
      Create and manage HR support tickets for employee inquiries and issues.

      Use this tool when employees want to:
      - Create a new HR support ticket/case
      - Check status of an existing case
      - List all their open cases
      - Report issues with payroll, benefits, equipment, policies, etc.

      The tool automatically classifies the issue type and assigns appropriate priority and SLA.

      Categories: payroll, benefits, policy, equipment, leave, performance, other
    `,
    inputSchema: z.object({
      action: z.enum(["create", "status", "list"]).describe("Action to perform"),
      category: z
        .enum(["payroll", "benefits", "policy", "equipment", "leave", "performance", "other"])
        .optional()
        .describe("Category of the issue (for create action)"),
      description: z.string().optional().describe("Description of the issue (for create action)"),
      caseId: z.string().optional().describe("Case ID to query (for status action)"),
      attachChat: z.boolean().optional().describe("Whether to attach current conversation to case"),
    }),
    execute: async ({ action, category, description, caseId, attachChat = false }): Promise<HRCaseOutput> => {
      const startMs = Date.now();
      log.info({ action, category, description, caseId, attachChat }, "hrCase: start");

      dataStream.write({
        type: "data-researchUpdate",
        data: {
          title: `${action === "create" ? "Creating" : action === "status" ? "Retrieving" : "Listing"} HR case...`,
          timestamp: Date.now(),
          type: "started",
        },
      });

      try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (action === "create") {
          if (!description) {
            return { error: "Description is required to create a case" };
          }

          // Auto-classify if category not provided
          const finalCategory = category || classifyIntent(description);
          const slaConfig = SLA_CONFIG[finalCategory];

          // Generate case
          const now = new Date();
          const firstResponseDue = new Date(now.getTime() + slaConfig.firstResponseHours * 60 * 60 * 1000);
          const resolutionDue = new Date(now.getTime() + slaConfig.resolutionDays * 24 * 60 * 60 * 1000);

          const newCase: HRCase = {
            caseId: generateCaseId(),
            createdDate: now.toISOString(),
            category: finalCategory,
            priority: slaConfig.priority,
            status: "new",
            subject: description.slice(0, 100) + (description.length > 100 ? "..." : ""),
            description: description,
            assignedTeam: TEAM_ASSIGNMENT[finalCategory],
            sla: {
              firstResponseDue: firstResponseDue.toISOString(),
              firstResponseMet: false,
              resolutionDue: resolutionDue.toISOString(),
              resolutionMet: false,
              hoursRemaining: slaConfig.resolutionDays * 24,
            },
            updates: [
              {
                timestamp: now.toISOString(),
                author: "System",
                authorRole: "system",
                message: `Case created and assigned to ${TEAM_ASSIGNMENT[finalCategory]} team`,
                isInternal: false,
              },
            ],
            attachments: attachChat ? ["Chat conversation transcript"] : undefined,
          };

          dataStream.write({
            type: "data-researchUpdate",
            data: {
              title: "HR case created successfully",
              timestamp: Date.now(),
              type: "completed",
            },
          });

          log.info({ ms: Date.now() - startMs, caseId: newCase.caseId }, "hrCase: create success");

          return {
            action: "create",
            case: newCase,
            message: `Case ${newCase.caseId} created successfully. The ${newCase.assignedTeam} team will respond within ${slaConfig.firstResponseHours} hours.`,
          };
        }

        if (action === "status") {
          if (!caseId) {
            return { error: "Case ID is required to check status" };
          }

          const existingCase = MOCK_EXISTING_CASES.find(c => c.caseId === caseId);
          if (!existingCase) {
            return { error: `Case ${caseId} not found` };
          }

          dataStream.write({
            type: "data-researchUpdate",
            data: {
              title: "Case status retrieved",
              timestamp: Date.now(),
              type: "completed",
            },
          });

          log.info({ ms: Date.now() - startMs, caseId }, "hrCase: status success");

          return {
            action: "status",
            case: existingCase,
          };
        }

        if (action === "list") {
          const openCases = MOCK_EXISTING_CASES.filter(c => c.status !== "resolved" && c.status !== "closed");
          const closedCases = MOCK_EXISTING_CASES.filter(c => c.status === "resolved" || c.status === "closed");

          dataStream.write({
            type: "data-researchUpdate",
            data: {
              title: "Cases retrieved",
              timestamp: Date.now(),
              type: "completed",
            },
          });

          log.info({ ms: Date.now() - startMs, openCount: openCases.length }, "hrCase: list success");

          return {
            action: "list",
            cases: MOCK_EXISTING_CASES,
            totalOpen: openCases.length,
            totalClosed: closedCases.length,
          };
        }

        return { error: "Invalid action" };
      } catch (error) {
        log.error({ error }, "hrCase: failure");
        return {
          error: `Failed to ${action} HR case: ${(error as Error).message}`,
        };
      }
    },
  });
```

### Step 4: Register Tool

Follow the same registration pattern as previous tools in:
- `lib/ai/tools/tools-definitions.ts`
- `lib/ai/types.ts`
- `lib/ai/tools/tools.ts`

---

## Frontend Implementation

### Step 1: Create UI Component

**File:** `components/hr-case-result.tsx`

```typescript
"use client";

import { Loader2, Ticket, Clock, CheckCircle, AlertCircle, MessageSquare, Paperclip } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { HRCaseInput, HRCaseOutput } from "@/lib/ai/tools/hr-case";

type HRCaseResultProps = {
  state: "input-available" | "output-available";
  input: HRCaseInput;
  output?: HRCaseOutput;
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  assigned: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  pending_employee: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "border-gray-300",
  medium: "border-blue-400",
  high: "border-amber-400",
  urgent: "border-red-400",
};

export function HRCaseResult({ state, input, output }: HRCaseResultProps) {
  // LOADING STATE
  if (state === "input-available") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 p-3 text-purple-900 text-sm dark:border-purple-800 dark:bg-purple-950 dark:text-purple-100">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>
          {input.action === "create" && "Creating HR case..."}
          {input.action === "status" && "Retrieving case status..."}
          {input.action === "list" && "Loading your cases..."}
        </span>
      </div>
    );
  }

  // RESULT STATE
  if (state === "output-available" && output) {
    if ("error" in output) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900 text-sm dark:border-red-800 dark:bg-red-950 dark:text-red-100">
          <p className="font-medium">Error</p>
          <p className="mt-1 text-xs opacity-90">{output.error}</p>
        </div>
      );
    }

    // CREATE ACTION
    if (output.action === "create") {
      const { case: hrCase, message } = output;
      return (
        <Card className={`border-l-4 ${PRIORITY_COLORS[hrCase.priority]}`}>
          <div className="p-4 space-y-3">
            {/* Success Message */}
            <div className="flex items-start gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-medium">Case Created Successfully</p>
                <p className="text-sm mt-0.5">{message}</p>
              </div>
            </div>

            <Separator />

            {/* Case Details */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono font-medium text-sm">{hrCase.caseId}</span>
                </div>
                <div className="flex gap-2">
                  <Badge className={STATUS_COLORS[hrCase.status]}>
                    {hrCase.status.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {hrCase.priority}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="font-medium text-sm">{hrCase.subject}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Assigned to: {hrCase.assignedTeam}
                </p>
              </div>

              {hrCase.attachments && hrCase.attachments.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Paperclip className="h-3 w-3" />
                  <span>{hrCase.attachments[0]}</span>
                </div>
              )}
            </div>

            {/* SLA Timeline */}
            <Card className="bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-sm mb-2">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Expected Timeline</span>
              </div>
              <div className="text-xs space-y-1">
                <p>
                  First response by:{" "}
                  <span className="font-medium">
                    {new Date(hrCase.sla.firstResponseDue).toLocaleString()}
                  </span>
                </p>
                <p>
                  Resolution by:{" "}
                  <span className="font-medium">
                    {new Date(hrCase.sla.resolutionDue).toLocaleString()}
                  </span>
                </p>
              </div>
            </Card>
          </div>
        </Card>
      );
    }

    // STATUS ACTION
    if (output.action === "status") {
      const hrCase = output.case;
      return (
        <Card className={`border-l-4 ${PRIORITY_COLORS[hrCase.priority]}`}>
          <div className="p-4 space-y-3">
            {/* Case Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono font-medium text-sm">{hrCase.caseId}</span>
                </div>
                <div className="flex gap-2">
                  <Badge className={STATUS_COLORS[hrCase.status]}>
                    {hrCase.status.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {hrCase.priority}
                  </Badge>
                  <Badge variant="secondary" className="capitalize">
                    {hrCase.category}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="font-medium">{hrCase.subject}</p>
                <p className="text-xs text-muted-foreground mt-1">{hrCase.description}</p>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Created: {new Date(hrCase.createdDate).toLocaleDateString()}</span>
                {hrCase.assignedTo && <span>Assigned to: {hrCase.assignedTo}</span>}
              </div>
            </div>

            {/* SLA Status */}
            {hrCase.status !== "resolved" && hrCase.status !== "closed" && (
              <Card className="bg-muted/50 p-3">
                <div className="flex items-center gap-2 text-sm mb-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">SLA Status</span>
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span>First response:</span>
                    {hrCase.sla.firstResponseMet ? (
                      <Badge variant="outline" className="text-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Met
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-700">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Resolution due:</span>
                    <span className="font-medium">
                      {hrCase.sla.hoursRemaining}h remaining
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* Case Updates */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4" />
                <span>Updates ({hrCase.updates.filter(u => !u.isInternal).length})</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {hrCase.updates
                  .filter(update => !update.isInternal)
                  .map((update, idx) => (
                    <Card key={idx} className="p-3 bg-muted/30">
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-medium text-xs capitalize">
                          {update.author}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(update.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs">{update.message}</p>
                    </Card>
                  ))}
              </div>
            </div>
          </div>
        </Card>
      );
    }

    // LIST ACTION
    if (output.action === "list") {
      const { cases, totalOpen, totalClosed } = output;
      return (
        <div className="space-y-3">
          {/* Summary */}
          <div className="flex gap-2">
            <Badge variant="outline">
              {totalOpen} Open Case{totalOpen !== 1 ? "s" : ""}
            </Badge>
            <Badge variant="secondary">
              {totalClosed} Closed
            </Badge>
          </div>

          {/* Cases List */}
          <div className="space-y-2">
            {cases.map((hrCase) => (
              <Card
                key={hrCase.caseId}
                className={`p-3 border-l-4 ${PRIORITY_COLORS[hrCase.priority]}`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{hrCase.caseId}</span>
                      <Badge className={STATUS_COLORS[hrCase.status]} size="sm">
                        {hrCase.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="font-medium text-sm">{hrCase.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {hrCase.assignedTeam} • Created {new Date(hrCase.createdDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs">
                    {hrCase.category}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }
  }

  return null;
}
```

### Step 2: Add to Message Parts Router

**File:** `components/message-parts.tsx`

```typescript
import { HRCaseResult } from "./hr-case-result";

if (type === "tool-hrCase") {
  const { toolCallId, state } = part;
  if (state === "input-available") {
    const { input } = part;
    return (
      <div key={toolCallId}>
        <HRCaseResult input={input} state={state} />
      </div>
    );
  }
  if (state === "output-available") {
    const { input, output } = part;
    return (
      <div key={toolCallId}>
        <HRCaseResult input={input} output={output} state={state} />
      </div>
    );
  }
}
```

---

## System Prompt Integration

**File:** `lib/ai/prompts.ts`

```typescript
**HR Case Tool** - Use when employees want to:
- Create a support ticket for HR issues
- Check status of existing cases
- List all their cases
- Report issues with payroll, benefits, equipment, policies, etc.

The tool auto-classifies issues and assigns SLA timelines.

Example: "Start a case about a payroll deduction discrepancy"
```

---

## Key Features

1. **Auto-Classification**: Analyzes description to determine category
2. **SLA Tracking**: Shows expected response and resolution times
3. **Priority Assignment**: Automatic based on category (payroll=high, equipment=low)
4. **Update Timeline**: Shows conversation history with HR team
5. **Chat Attachment**: Can attach current conversation for context
6. **Multi-Action**: Create, check status, or list all cases

---

## Mock Data Scenarios

- **Case 1**: Active benefits case with updates (in_progress)
- **Case 2**: Closed equipment request (resolved)
- New cases generated with realistic SLAs

---

## Testing Checklist

- [ ] Create case with auto-classification
- [ ] Check status of existing case
- [ ] List all cases
- [ ] SLA timelines display correctly
- [ ] Case updates render in timeline
- [ ] Priority colors show properly
- [ ] Status badges display
- [ ] Error handling
- [ ] Chat attachment option works

---

## Key File Paths

**Backend:**
- `lib/ai/tools/hr-case.ts` - New file

**Frontend:**
- `components/hr-case-result.tsx` - New file
- `components/ui/separator.tsx` - May need if not present

---

## Implementation Notes

1. **Intent Classification**: Simple keyword matching for demo; production would use ML
2. **Case ID Generation**: Random for demo; production would use database sequence
3. **SLA Configuration**: Hardcoded by category; production would pull from SLA policies
4. **Team Assignment**: Static mapping; production would use routing rules
5. **Updates**: Mock conversation history; production would integrate with ticketing system
6. **Color Scheme**: Purple theme for case management
7. **Future Enhancements**:
   - Real-time case updates via WebSocket
   - File upload for attachments
   - Case escalation workflow
   - Knowledge base article suggestions
   - Chatbot integration for common issues

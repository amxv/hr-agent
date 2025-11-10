# HR AI Assistant - Complete Integration Plan

**Project:** AgentDune Chat - HR AI Assistant Demo
**Date:** 2025-11-10
**Purpose:** Integration plan for 5 HR tools to create a comprehensive HR assistant

---

## Executive Summary

This document outlines the complete implementation plan for transforming the AgentDune Chat application into a comprehensive HR AI Assistant by adding 5 specialized tools. The system will serve three user personas with role-based access control:

1. **Employees** - Leave balances, benefits, HR case management
2. **Managers** - Team availability, leave approvals
3. **HR Personnel** - People search, org context

All tools follow the existing architecture patterns established by the semantic search tool, ensuring consistency and maintainability.

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    HR AI Assistant                       │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │           Chat Interface (Next.js)              │    │
│  │  - Message rendering                            │    │
│  │  - Tool result visualization                    │    │
│  │  - Real-time streaming                          │    │
│  └───────────────────┬────────────────────────────┘    │
│                      │                                   │
│                      ▼                                   │
│  ┌────────────────────────────────────────────────┐    │
│  │    Chat API Route (/api/chat)                  │    │
│  │  - Authentication & RBAC                        │    │
│  │  - Tool filtering by role                       │    │
│  │  - Credit management                            │    │
│  │  - Streaming with Vercel AI SDK                 │    │
│  └───────────────────┬────────────────────────────┘    │
│                      │                                   │
│                      ▼                                   │
│  ┌────────────────────────────────────────────────┐    │
│  │         Tool Registry (getTools())              │    │
│  │  - Dynamic tool registration                    │    │
│  │  - Role-based tool availability                 │    │
│  │  - Dependency injection                         │    │
│  └───────────────────┬────────────────────────────┘    │
│                      │                                   │
│                      ▼                                   │
│  ┌────────────────────────────────────────────────┐    │
│  │              HR Tools Layer                     │    │
│  │                                                 │    │
│  │  ┌─────────────────────────────────────────┐  │    │
│  │  │ Employee Tools                          │  │    │
│  │  │  - leaveBalance                         │  │    │
│  │  │  - benefitsInfo                         │  │    │
│  │  │  - hrCase                              │  │    │
│  │  └─────────────────────────────────────────┘  │    │
│  │                                                 │    │
│  │  ┌─────────────────────────────────────────┐  │    │
│  │  │ Manager Tools (RBAC)                    │  │    │
│  │  │  - teamAvailability                     │  │    │
│  │  └─────────────────────────────────────────┘  │    │
│  │                                                 │    │
│  │  ┌─────────────────────────────────────────┐  │    │
│  │  │ HR Tools (RBAC)                         │  │    │
│  │  │  - peopleSearch                         │  │    │
│  │  └─────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────┘    │
│                      │                                   │
│                      ▼                                   │
│  ┌────────────────────────────────────────────────┐    │
│  │          Mock Data Layer (Demo)                 │    │
│  │  - Employee profiles                            │    │
│  │  - Leave balances                               │    │
│  │  - Benefits enrollments                         │    │
│  │  - HR cases                                     │    │
│  │  - Team schedules                               │    │
│  │                                                 │    │
│  │  (In Production: HCM API Integration)          │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Tool Catalog

### 1. Leave Balance & Projections (`leaveBalance`)

**Purpose:** Check current leave balances, accrual schedules, carryover rules, blackout dates, and project future balances

**Scope:** Employee self-service
**RBAC:** All authenticated users
**Cost:** 2 credits

**Key Features:**
- Current vacation/sick/personal day balances
- Accrual rates and schedules
- Carryover limits and deadlines
- Department blackout dates
- "What-if" projections (e.g., "If I take 7 days in Dec, what's my Jan 1 balance?")

**Mock Data:**
- 18.5 vacation days, 12 sick days, 3 personal days
- Monthly accrual rates
- End-of-year carryover rules
- Engineering department blackout dates

**Color Theme:** Green

---

### 2. Benefits & Eligibility (`benefitsInfo`)

**Purpose:** Query medical/dental plan tiers, dependent information, coverage dates, enrollment windows, and plan comparisons

**Scope:** Employee self-service
**RBAC:** All authenticated users
**Cost:** 2 credits

**Key Features:**
- Current benefit enrollments (medical, dental, vision, 401k)
- Monthly premium costs and deductibles
- Dependents on file with coverage types
- Open enrollment window with countdown
- Side-by-side plan comparison
- HSA/FSA and 401k match information

**Mock Data:**
- PPO medical, dental, vision plans
- Spouse + 1 child as dependents
- 20 days until open enrollment ends
- 3 plan options (PPO, HMO, HDHP)

**Color Theme:** Blue

---

### 3. HR Case Intake & Status (`hrCase`)

**Purpose:** Create HR support tickets with automatic classification and check status of existing cases

**Scope:** Employee self-service
**RBAC:** All authenticated users
**Cost:** 3 credits

**Key Features:**
- Create cases with auto-classification (payroll, benefits, policy, equipment, etc.)
- Check case status with SLA tracking
- View case update timeline
- Attach chat transcript to case
- List all user's cases

**Mock Data:**
- 2 existing cases (benefits inquiry, equipment request)
- SLA timelines (4hr first response for payroll, 24hr for equipment)
- Case update conversations
- Status transitions (new → assigned → in_progress → resolved)

**Color Theme:** Purple

---

### 4. Team Availability & Approvals (`teamAvailability`)

**Purpose:** For managers to view team absences, check conflicts, and approve/deny leave requests

**Scope:** Manager-only
**RBAC:** Managers only (role check required)
**Cost:** 3 credits

**Key Features:**
- View team member absences for date range
- Coverage percentage analysis (% of team available)
- Pending leave requests with conflict detection
- Approve or deny requests with reason
- Critical date warnings (< 70% coverage)

**Mock Data:**
- 5 team members
- 3 approved absences scheduled
- 2 pending requests (one with conflict)
- Coverage analysis showing low-coverage dates

**Color Theme:** Indigo

**⚠️ RBAC Critical:** Must validate user is a manager before execution

---

### 5. People Search & Org Context (`peopleSearch`)

**Purpose:** For HR to lookup employee information with masked PII, org structure, and employment status

**Scope:** HR-only
**RBAC:** HR personnel only (role check required)
**Cost:** 2 credits

**Key Features:**
- Search by name, employee ID, or email
- View org structure (manager, direct reports)
- Employment status (active, probation, LOA, notice, terminated)
- Work authorization status with expiry dates
- Location and remote status
- Years of service

**Mock Data:**
- 5 employees across departments
- Various statuses (active, probation, LOA, notice)
- Work visa tracking with expiry dates
- Org hierarchy with manager/report relationships

**Color Theme:** Slate/Gray

**⚠️ RBAC Critical:** Must validate user is HR personnel
**⚠️ PII Masking:** Only show work email and office extension

---

## User Personas & Tool Access Matrix

| Tool | Employee | Manager | HR |
|------|----------|---------|-----|
| leaveBalance | ✅ | ✅ | ✅ |
| benefitsInfo | ✅ | ✅ | ✅ |
| hrCase | ✅ | ✅ | ✅ |
| teamAvailability | ❌ | ✅ | ✅ |
| peopleSearch | ❌ | ❌ | ✅ |

---

## Implementation Roadmap

### Phase 1: Foundation & Employee Tools (Days 1-3)

**Goal:** Implement basic employee self-service tools

1. **Day 1: Leave Balance Tool**
   - Implement backend tool (`lib/ai/tools/leave-balance.ts`)
   - Create UI component (`components/leave-balance-result.tsx`)
   - Add mock data
   - Register tool in tools.ts
   - Test with various projection scenarios

2. **Day 2: Benefits Info Tool**
   - Implement backend tool (`lib/ai/tools/benefits-info.ts`)
   - Create UI component with table for plan comparison
   - Add mock data with 3 plan options
   - Register tool
   - Test enrollment window countdown

3. **Day 3: HR Case Tool**
   - Implement backend tool (`lib/ai/tools/hr-case.ts`)
   - Create UI component with timeline view
   - Add mock existing cases
   - Test create/status/list actions
   - Test auto-classification logic

### Phase 2: Manager & HR Tools (Days 4-5)

**Goal:** Add role-restricted tools with RBAC

4. **Day 4: Team Availability Tool**
   - Implement backend with RBAC checks
   - Create UI with coverage visualization
   - Add conflict detection logic
   - Test approval/denial workflow
   - Verify permission enforcement

5. **Day 5: People Search Tool**
   - Implement backend with HR-only access
   - Create UI with org chart display
   - Add PII masking
   - Test search by name/ID/email
   - Verify RBAC enforcement

### Phase 3: Integration & Polish (Days 6-7)

**Goal:** System prompt updates, testing, and polish

6. **Day 6: System Prompt & Tool Coordination**
   - Update system prompt with all tools
   - Add tool usage examples
   - Test tool combinations (e.g., check leave balance → create case)
   - Test conversation flow across tools

7. **Day 7: End-to-End Testing & Documentation**
   - Test all user personas
   - Verify RBAC enforcement
   - Test error handling
   - Polish UI for consistency
   - Create user demo scenarios

---

## File Structure

```
lib/ai/tools/
├── leave-balance.ts          # New - Tool 1
├── benefits-info.ts           # New - Tool 2
├── hr-case.ts                 # New - Tool 3
├── team-availability.ts       # New - Tool 4 (Manager RBAC)
├── people-search.ts           # New - Tool 5 (HR RBAC)
├── tools-definitions.ts       # Update - Add 5 tool definitions
├── tools.ts                   # Update - Register 5 tools
└── semantic-search.ts         # Existing - Keep for document RAG

lib/ai/
├── types.ts                   # Update - Add 5 tool types
└── prompts.ts                 # Update - Add tool usage guidance

components/
├── leave-balance-result.tsx          # New - UI for Tool 1
├── benefits-info-result.tsx          # New - UI for Tool 2
├── hr-case-result.tsx                # New - UI for Tool 3
├── team-availability-result.tsx      # New - UI for Tool 4
├── people-search-result.tsx          # New - UI for Tool 5
├── message-parts.tsx                 # Update - Add 5 tool handlers
└── semantic-search-result.tsx        # Existing - Keep

app/(chat)/api/chat/
└── route.ts                   # Update - Add RBAC tool filtering
```

---

## Integration Steps

### Step 1: Tool Type Definitions

**File:** `lib/ai/types.ts`

```typescript
// Add to toolNameSchema
export const toolNameSchema = z.enum([
  // ... existing tools
  "semanticSearch",
  "leaveBalance",
  "benefitsInfo",
  "hrCase",
  "teamAvailability",
  "peopleSearch",
]);

// Add tool type imports
import type { leaveBalance } from "@/lib/ai/tools/leave-balance";
import type { benefitsInfo } from "@/lib/ai/tools/benefits-info";
import type { hrCase } from "@/lib/ai/tools/hr-case";
import type { teamAvailability } from "@/lib/ai/tools/team-availability";
import type { peopleSearch } from "@/lib/ai/tools/people-search";

// Infer tool types
type leaveBalanceTool = InferUITool<ReturnType<typeof leaveBalance>>;
type benefitsInfoTool = InferUITool<ReturnType<typeof benefitsInfo>>;
type hrCaseTool = InferUITool<ReturnType<typeof hrCase>>;
type teamAvailabilityTool = InferUITool<ReturnType<typeof teamAvailability>>;
type peopleSearchTool = InferUITool<ReturnType<typeof peopleSearch>>;

// Add to ChatTools type
export type ChatTools = {
  // ... existing tools
  semanticSearch: semanticSearchTool;
  leaveBalance: leaveBalanceTool;
  benefitsInfo: benefitsInfoTool;
  hrCase: hrCaseTool;
  teamAvailability: teamAvailabilityTool;
  peopleSearch: peopleSearchTool;
};
```

### Step 2: Tool Definitions

**File:** `lib/ai/tools/tools-definitions.ts`

```typescript
export const toolsDefinitions: Record<ToolName, ToolDefinition> = {
  // ... existing tools
  semanticSearch: {
    name: "semanticSearch",
    description: "Semantic Search",
    cost: 3,
  },
  leaveBalance: {
    name: "leaveBalance",
    description: "Check leave balances and projections",
    cost: 2,
  },
  benefitsInfo: {
    name: "benefitsInfo",
    description: "Query benefits and plan information",
    cost: 2,
  },
  hrCase: {
    name: "hrCase",
    description: "Create and manage HR support cases",
    cost: 3,
  },
  teamAvailability: {
    name: "teamAvailability",
    description: "View team availability and approve leave (Managers)",
    cost: 3,
  },
  peopleSearch: {
    name: "peopleSearch",
    description: "Search employee directory (HR Only)",
    cost: 2,
  },
};
```

### Step 3: Tool Registration with RBAC

**File:** `lib/ai/tools/tools.ts`

```typescript
import { leaveBalance } from "@/lib/ai/tools/leave-balance";
import { benefitsInfo } from "@/lib/ai/tools/benefits-info";
import { hrCase } from "@/lib/ai/tools/hr-case";
import { teamAvailability } from "@/lib/ai/tools/team-availability";
import { peopleSearch } from "@/lib/ai/tools/people-search";

export function getTools({
  dataStream,
  session,
  messageId,
  selectedModel,
  attachments = [],
  lastGeneratedImage = null,
  contextForLLM,
}: {
  dataStream: StreamWriter;
  session: Session;
  messageId: string;
  selectedModel: ModelId;
  attachments: FileUIPart[];
  lastGeneratedImage: { imageUrl: string; name: string } | null;
  contextForLLM: ModelMessage[];
}) {
  // Get user role from session
  const userRole = session?.user?.role || "employee";

  return {
    // ... existing tools

    // Document RAG (existing)
    ...(env.NEXT_PUBLIC_OPENAI_AVAILABLE
      ? {
          semanticSearch: semanticSearch({ dataStream }),
          fileRetrieve: fileRetrieve({ dataStream }),
        }
      : {}),

    // Employee tools - available to all
    leaveBalance: leaveBalance({ dataStream }),
    benefitsInfo: benefitsInfo({ dataStream }),
    hrCase: hrCase({ dataStream }),

    // Manager tools - conditional on role
    ...(userRole === "manager" || userRole === "admin" || userRole === "hr"
      ? {
          teamAvailability: teamAvailability({ dataStream }),
        }
      : {}),

    // HR tools - conditional on role
    ...(userRole === "hr" || userRole === "admin"
      ? {
          peopleSearch: peopleSearch({ dataStream }),
        }
      : {}),
  };
}
```

### Step 4: Message Parts Router Integration

**File:** `components/message-parts.tsx`

Add imports:

```typescript
import { LeaveBalanceResult } from "./leave-balance-result";
import { BenefitsInfoResult } from "./benefits-info-result";
import { HRCaseResult } from "./hr-case-result";
import { TeamAvailabilityResult } from "./team-availability-result";
import { PeopleSearchResult } from "./people-search-result";
```

Add handlers in `PureMessagePart` function (around line 473):

```typescript
// Leave Balance Tool
if (type === "tool-leaveBalance") {
  const { toolCallId, state } = part;
  if (state === "input-available") {
    const { input } = part;
    return <div key={toolCallId}><LeaveBalanceResult input={input} state={state} /></div>;
  }
  if (state === "output-available") {
    const { input, output } = part;
    return <div key={toolCallId}><LeaveBalanceResult input={input} output={output} state={state} /></div>;
  }
}

// Benefits Info Tool
if (type === "tool-benefitsInfo") {
  const { toolCallId, state } = part;
  if (state === "input-available") {
    const { input } = part;
    return <div key={toolCallId}><BenefitsInfoResult input={input} state={state} /></div>;
  }
  if (state === "output-available") {
    const { input, output } = part;
    return <div key={toolCallId}><BenefitsInfoResult input={input} output={output} state={state} /></div>;
  }
}

// HR Case Tool
if (type === "tool-hrCase") {
  const { toolCallId, state } = part;
  if (state === "input-available") {
    const { input } = part;
    return <div key={toolCallId}><HRCaseResult input={input} state={state} /></div>;
  }
  if (state === "output-available") {
    const { input, output } = part;
    return <div key={toolCallId}><HRCaseResult input={input} output={output} state={state} /></div>;
  }
}

// Team Availability Tool
if (type === "tool-teamAvailability") {
  const { toolCallId, state } = part;
  if (state === "input-available") {
    const { input } = part;
    return <div key={toolCallId}><TeamAvailabilityResult input={input} state={state} /></div>;
  }
  if (state === "output-available") {
    const { input, output } = part;
    return <div key={toolCallId}><TeamAvailabilityResult input={input} output={output} state={state} /></div>;
  }
}

// People Search Tool
if (type === "tool-peopleSearch") {
  const { toolCallId, state } = part;
  if (state === "input-available") {
    const { input } = part;
    return <div key={toolCallId}><PeopleSearchResult input={input} state={state} /></div>;
  }
  if (state === "output-available") {
    const { input, output } = part;
    return <div key={toolCallId}><PeopleSearchResult input={input} output={output} state={state} /></div>;
  }
}
```

### Step 5: System Prompt Update

**File:** `lib/ai/prompts.ts`

```typescript
export const systemPrompt = () => `You are an AI-powered HR Assistant for [Company Name].
Your role is to help employees, managers, and HR personnel with various HR-related tasks.

## Available Tools

You have access to the following specialized tools:

### Employee Self-Service Tools

**Semantic Search** - Search the organization's document library (policies, handbooks, etc.)
- Use for: Policy questions, handbook lookups, document searches
- Example: "What's the remote work policy?"

**Leave Balance** - Check leave balances, accrual rates, carryover rules, and project future balances
- Use for: Vacation/sick/personal day balance inquiries
- Use for: "What-if" scenarios about time off
- Use for: Carryover rules and blackout dates
- Example: "If I take 7 days in December, what will my balance be on Jan 1?"

**Benefits Info** - Query benefit enrollments, premiums, dependents, and plan comparisons
- Use for: Medical/dental/vision plan questions
- Use for: Dependent coverage inquiries
- Use for: Enrollment window information
- Use for: Comparing plan options
- Example: "What's the difference between the PPO and HMO plans?"

**HR Case** - Create support tickets and check case status
- Use for: Creating cases for payroll, benefits, policy, equipment issues
- Use for: Checking status of existing cases
- Use for: Listing all user's cases
- Auto-classifies issues and assigns SLA
- Example: "Start a case about a payroll deduction discrepancy"

### Manager Tools (Require Manager Role)

**Team Availability** - View team schedules, conflicts, and approve leave requests
- Use for: Viewing team member absences
- Use for: Checking coverage percentages
- Use for: Approving or denying leave requests
- Shows conflict warnings and coverage analysis
- ⚠️ ONLY use if user is a manager
- Example: "Who from my team is off next 2 weeks?"

### HR Tools (Require HR Role)

**People Search** - Lookup employee information with org context
- Use for: Finding employee by name, ID, or email
- Use for: Viewing org structure (manager, reports)
- Use for: Employment status and work authorization
- Returns masked PII (work email only)
- ⚠️ ONLY use if user is HR personnel
- Example: "Show Noor Al-Harbi's org, manager, status, and location"

## Tool Usage Guidelines

1. **Use semantic search FIRST** for policy/handbook questions
2. **Use leave balance** for time-off related questions
3. **Use benefits info** for insurance and retirement questions
4. **Use HR case** when employees need to report issues or request support
5. **Use team availability** ONLY for managers asking about their team
6. **Use people search** ONLY for HR personnel

## Response Format

- Always cite sources when using semantic search
- Include relevant numbers and dates from tool results
- Explain complex information clearly
- For RBAC-restricted tools, politely explain if user doesn't have access

## Important Notes

- Be helpful, professional, and empathetic
- Protect employee privacy
- Follow company policies
- Escalate sensitive issues to HR when appropriate
`;
```

---

## Demo Scenarios

### Scenario 1: Employee Time-Off Planning

**User:** "I'm planning a vacation in late December. Can you check my vacation balance and show me if there are any blackout dates?"

**AI Flow:**
1. Calls `leaveBalance` tool
2. Shows current balance: 18.5 days
3. Highlights blackout dates: Dec 15-31 (limited approval)
4. Suggests checking with manager

**Follow-up:** "If I take 7 days from Dec 18-24, what will my balance be on Jan 1?"

**AI Flow:**
1. Calls `leaveBalance` with projection parameters
2. Shows projected balance: 11.5 days
3. Notes 5-day carryover limit (would lose 6.5 days)
4. Recommends using more vacation before year-end

### Scenario 2: Benefits Enrollment

**User:** "Open enrollment is coming up. Can you compare the PPO and HMO plans?"

**AI Flow:**
1. Calls `benefitsInfo` with `compareMode=true`
2. Shows current enrollment (PPO)
3. Displays comparison table (PPO vs HMO vs HDHP)
4. Shows enrollment window: 20 days remaining
5. Highlights: HMO saves $70/month but requires Kaiser facilities

### Scenario 3: Payroll Issue

**User:** "My last paycheck had an incorrect deduction. Can you help me report this?"

**AI Flow:**
1. Calls `hrCase` with action=create
2. Auto-classifies as "payroll" category
3. Creates case HR-2025-001892
4. Assigns to Payroll Services team
5. Shows SLA: 4-hour first response, 2-day resolution
6. Provides case ID for tracking

### Scenario 4: Manager Checking Team (Manager Role)

**User:** "Who from my team is off next 2 weeks?"

**AI Flow:**
1. Verifies user is a manager
2. Calls `teamAvailability` with view_schedule action
3. Shows 2 team members with scheduled absences
4. Displays coverage analysis
5. Alerts: Nov 20-22 has only 60% coverage (conflict)

**Follow-up:** "Can you show me pending approval requests?"

**AI Flow:**
1. Calls `teamAvailability` with view_approvals action
2. Shows 2 pending requests
3. Highlights one with scheduling conflict
4. Provides approve/deny recommendations

### Scenario 5: HR Lookup (HR Role)

**User:** "Show me Noor Al-Harbi's employment status and manager"

**AI Flow:**
1. Verifies user is HR personnel
2. Calls `peopleSearch` with query="Noor Al-Harbi"
3. Shows:
   - Active employee
   - Senior Software Engineer
   - Reports to John Doe (Engineering Manager)
   - H1B visa, expires June 2026
   - 3.4 years of service
4. Masks personal PII (only work email shown)

---

## RBAC Implementation Details

### User Role Schema

```typescript
type UserRole = "employee" | "manager" | "hr" | "admin";

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  employeeId: string;
  department: string;
  isManager: boolean;
  teamMembers?: string[]; // employee IDs for managers
}
```

### Session Management

```typescript
// In app/(chat)/api/chat/route.ts

const session = await auth.api.getSession({ headers: await headers() });
const userRole = session?.user?.role || "employee";

// Pass to getTools for conditional registration
const tools = getTools({
  dataStream,
  session, // contains role
  ...
});
```

### Tool-Level Permission Checks

Each tool with RBAC requirements must verify permissions in the execute function:

```typescript
// In teamAvailability tool
execute: async (params) => {
  const user = await getUser(session);

  if (!user.isManager) {
    return {
      error: "This tool is only available to managers.",
      permissionDenied: true,
    };
  }

  // Continue with tool logic...
}
```

---

## Mock Data Strategy

### Purpose
- Demo functionality without HCM system integration
- Realistic scenarios for different user personas
- Consistent data across tools

### Mock Data Files

All mock data is defined within tool files for simplicity:

```typescript
// lib/ai/tools/leave-balance.ts
const MOCK_EMPLOYEE_DATA = { ... };

// lib/ai/tools/benefits-info.ts
const MOCK_EMPLOYEE_BENEFITS = { ... };

// lib/ai/tools/hr-case.ts
const MOCK_EXISTING_CASES = [ ... ];

// lib/ai/tools/team-availability.ts
const MOCK_MANAGER = { ... };
const APPROVED_ABSENCES = [ ... ];

// lib/ai/tools/people-search.ts
const EMPLOYEE_DIRECTORY = [ ... ];
```

### Production Migration Path

To migrate to production HCM integration:

1. **Replace mock functions with API calls:**

```typescript
// Before (Demo)
const employeeData = MOCK_EMPLOYEE_DATA;

// After (Production)
const employeeData = await hcmClient.getEmployeeLeaveBalances(employeeId);
```

2. **Add API client layer:**

```typescript
// lib/hcm/client.ts
export class HCMClient {
  async getLeaveBalances(employeeId: string) { ... }
  async getBenefitsInfo(employeeId: string) { ... }
  async createCase(params: CreateCaseParams) { ... }
  async getTeamSchedule(managerId: string, dateRange: DateRange) { ... }
  async searchEmployees(query: string) { ... }
}
```

3. **Environment configuration:**

```bash
# .env
HCM_API_URL=https://api.yourHCM.com
HCM_API_KEY=your-api-key
HCM_TENANT_ID=your-tenant-id
```

---

## Testing Strategy

### Unit Tests

Test each tool's execute function:

```typescript
describe("leaveBalance tool", () => {
  it("returns current balances", async () => {
    const result = await leaveBalance.execute({
      query: "What's my vacation balance?",
    });
    expect(result.balances).toBeDefined();
    expect(result.balances[0].leaveType).toBe("vacation");
  });

  it("projects future balance correctly", async () => {
    const result = await leaveBalance.execute({
      query: "Projection",
      projectionDate: "2026-01-01",
      daysToTake: 7,
    });
    expect(result.projection).toBeDefined();
    expect(result.projection.projectedBalance).toBe(11.5);
  });
});
```

### Integration Tests

Test tool registration and role filtering:

```typescript
describe("Tool registration with RBAC", () => {
  it("employee gets basic tools only", () => {
    const session = { user: { role: "employee" } };
    const tools = getTools({ session, ... });

    expect(tools.leaveBalance).toBeDefined();
    expect(tools.teamAvailability).toBeUndefined();
    expect(tools.peopleSearch).toBeUndefined();
  });

  it("manager gets team tools", () => {
    const session = { user: { role: "manager" } };
    const tools = getTools({ session, ... });

    expect(tools.teamAvailability).toBeDefined();
    expect(tools.peopleSearch).toBeUndefined();
  });

  it("HR gets all tools", () => {
    const session = { user: { role: "hr" } };
    const tools = getTools({ session, ... });

    expect(tools.teamAvailability).toBeDefined();
    expect(tools.peopleSearch).toBeDefined();
  });
});
```

### E2E Tests

Test complete conversation flows:

```typescript
describe("E2E: Time-off planning", () => {
  it("checks balance and creates projection", async () => {
    // User asks about vacation
    const response1 = await sendMessage("What's my vacation balance?");
    expect(response1).toContain("18.5 days");

    // User asks for projection
    const response2 = await sendMessage(
      "If I take 7 days Dec 18-24, what's my Jan 1 balance?"
    );
    expect(response2).toContain("11.5 days");
    expect(response2).toContain("carryover limit");
  });
});
```

---

## Performance Considerations

### Credit Costs

Total credit cost for comprehensive HR query:

```
Check leave balance:      2 credits
Check benefits:           2 credits
Create HR case:           3 credits
Search policy docs:       3 credits (semantic search)
---
Total:                   10 credits
```

### Caching Strategy

For production, consider caching:

1. **Leave balances** - Cache for 1 hour (updated infrequently)
2. **Benefits info** - Cache for 24 hours (mostly static)
3. **Team schedules** - Cache for 15 minutes
4. **Employee directory** - Cache for 1 hour

### API Rate Limiting

When integrating with HCM API:

```typescript
// lib/hcm/client.ts
import { RateLimiter } from "limiter";

const limiter = new RateLimiter({
  tokensPerInterval: 100,
  interval: "minute",
});

export async function callHCMAPI(endpoint: string) {
  await limiter.removeTokens(1);
  return await fetch(`${HCM_API_URL}${endpoint}`);
}
```

---

## Security Considerations

### 1. RBAC Enforcement

**Critical:** Always verify permissions in tool execute function, not just at registration:

```typescript
// ❌ BAD: Only checking at registration
const tools = userRole === "manager" ? { teamAvailability } : {};

// ✅ GOOD: Checking at execution
execute: async (params) => {
  if (!user.isManager) {
    return { error: "Unauthorized", permissionDenied: true };
  }
  // ...
}
```

### 2. PII Masking

HR tools must mask sensitive data:

```typescript
// ✅ GOOD: Masked employee data
return {
  email: employee.workEmail, // work email only
  phone: employee.officeExtension, // office extension only
  // ❌ Don't include:
  // personalPhone: employee.personalPhone,
  // homeAddress: employee.homeAddress,
  // ssn: employee.ssn,
};
```

### 3. Audit Logging

Log all HR tool usage:

```typescript
log.info(
  {
    userId: session.user.id,
    action: "peopleSearch",
    query: sanitizeQuery(query),
    timestamp: Date.now(),
  },
  "HR tool usage"
);
```

### 4. Data Scope

Managers should only see their direct reports:

```typescript
// Verify team membership
if (!manager.teamMembers.includes(employeeId)) {
  return { error: "Not authorized to view this employee" };
}
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All 5 tools implemented and tested
- [ ] UI components render correctly
- [ ] RBAC enforcement verified
- [ ] Error handling tested
- [ ] Dark mode styling checked
- [ ] System prompt updated
- [ ] Mock data is realistic
- [ ] Credit costs configured

### Deployment

- [ ] Deploy to staging environment
- [ ] Test with different user roles
- [ ] Verify tool filtering by role
- [ ] Check performance with multiple tools
- [ ] Test conversation flows
- [ ] Verify streaming works

### Post-Deployment

- [ ] Monitor tool usage metrics
- [ ] Track credit consumption
- [ ] Collect user feedback
- [ ] Monitor error rates
- [ ] Plan production HCM integration

---

## Future Enhancements

### Phase 2 Features

1. **Leave Management**
   - Direct leave request submission
   - Calendar integration
   - Team calendar view
   - Conflict resolution suggestions

2. **Benefits Administration**
   - FSA/HSA balance checking
   - Contribution changes
   - Life event processing
   - Document upload (proof of qualifying event)

3. **Performance Management**
   - Goal tracking
   - Review schedule
   - Feedback history
   - Development plan access

4. **Onboarding**
   - New hire checklist
   - Document collection
   - Training assignments
   - Equipment requests

5. **Analytics & Reporting**
   - Team attrition analysis
   - Leave usage patterns
   - Benefits utilization
   - Case resolution metrics

### Production Integration

Replace mock data with real HCM APIs:

- **Workday** - REST API for HRIS data
- **BambooHR** - API for leave, benefits, org data
- **ADP** - Payroll and benefits API
- **Greenhouse/Lever** - Recruiting data
- **Culture Amp** - Performance and engagement

---

## Conclusion

This comprehensive plan provides everything needed to transform AgentDune Chat into a fully-functional HR AI Assistant demo. The architecture follows established patterns, ensures type safety, and includes proper RBAC enforcement.

### Key Takeaways

1. **Consistent Architecture** - All tools follow the same pattern as semantic search
2. **Role-Based Access** - Tools are filtered by user role at registration and execution
3. **Mock Data** - Realistic demo data simulates HCM system integration
4. **Scalable Design** - Easy to add more tools or migrate to production APIs
5. **User-Centric** - Designed for three personas: employees, managers, HR

### Success Metrics

- **Employee Satisfaction** - Faster access to HR information
- **Manager Efficiency** - Streamlined leave approvals
- **HR Productivity** - Quick employee lookups
- **Reduced Support Tickets** - Self-service capabilities

### Next Steps

1. Review individual tool implementation plans (001-005)
2. Start with Phase 1 (employee tools)
3. Implement RBAC infrastructure
4. Add manager and HR tools
5. Polish and test
6. Deploy and gather feedback
7. Plan production HCM integration

---

**Total Implementation Effort:** 7 days
**Files Created:** 15 new files
**Files Modified:** 5 existing files
**Total Credit Cost:** 12 credits (all tools used once)

# HR Tools Implementation Analysis

**Generated:** 2025-11-11 21:52:12
**Research Question:** How are the 5 HR tools (Leave Balance, Benefits Info, HR Case, Team Availability, People Search) currently implemented, where is the mock data stored, and how do they integrate with the AI agent?

---

## Overview

The codebase implements 5 HR tools that provide HR assistant functionality through an AI chat interface. These tools enable employees and managers to access HR information, manage cases, check leave balances, view benefits, and search for employee information.

### The 5 HR Tools

1. **Leave Balance** - Check leave balances, accrual schedules, carryover rules, and blackout dates
2. **Benefits Info** - Query benefits enrollments, dependents, plan comparisons, and premium costs
3. **HR Case** - Create and manage HR support tickets/cases with SLA tracking
4. **Team Availability** - Manager-only tool for viewing team schedules and approving leave requests
5. **People Search** - HR-only tool for searching employee information and org structure

---

## Entry Points

### AI Agent Entry Point
**File:** `/home/user/agentdune-chat/lib/ai/prompts.ts:4-125`

The system prompt defines the AI agent as an "AI-powered HR Assistant" and provides detailed instructions for using each HR tool:

```typescript
export const systemPrompt = () => `You are an AI-powered HR Assistant helping employees...`
```

Key tool usage instructions (lines 18-59):
- **Leave Balance** (line 21-26): Queries for current balances, accruals, carryover, blackout dates, projections
- **Benefits Info** (line 27-34): Enrollment queries, premium costs, dependents, plan comparisons, HSA/FSA
- **HR Case** (line 35-42): Creating tickets, checking status, listing cases, auto-classification
- **Team Availability** (line 43-49): Manager-only access for schedules, approvals, coverage
- **People Search** (line 50-59): HR-only access for employee lookup, org charts, work authorization

### Tool Registration
**File:** `/home/user/agentdune-chat/lib/ai/tools/tools.ts:1-109`

All 5 HR tools are registered in the `getTools()` function at lines 100-106:

```typescript
// Lines 100-106
leaveBalance: leaveBalance({ dataStream }),
benefitsInfo: benefitsInfo({ dataStream }),
hrCase: hrCase({ dataStream }),
// Manager-only tool - RBAC check enforced in execute function
teamAvailability: teamAvailability({ dataStream }),
// HR-only tool - RBAC check enforced in execute function
peopleSearch: peopleSearch({ dataStream }),
```

The tools receive a `dataStream` parameter for writing real-time updates to the UI.

### Tool Definitions
**File:** `/home/user/agentdune-chat/lib/ai/tools/tools-definitions.ts:74-98`

Each tool has metadata defining its name, description, and cost:

```typescript
leaveBalance: { name: "leaveBalance", description: "Check leave balances and projections", cost: 2 }
benefitsInfo: { name: "benefitsInfo", description: "Query benefits and plan information", cost: 2 }
hrCase: { name: "hrCase", description: "Create and manage HR support tickets", cost: 3 }
teamAvailability: { name: "teamAvailability", description: "Team Availability & Approvals", cost: 3 }
peopleSearch: { name: "peopleSearch", description: "People Search & Org Context", cost: 2 }
```

---

## Core Implementation

### 1. Leave Balance Tool

**Implementation File:** `/home/user/agentdune-chat/lib/ai/tools/leave-balance.ts`

#### Entry Point
- **Function:** `leaveBalance()` at line 117
- **Input Schema:** lines 130-146 (Zod schema defining query, projectionDate, daysToTake, leaveType)
- **Execute Function:** lines 147-241

#### Mock Data Storage
**Lines 58-115** - Mock data stored as constant `MOCK_EMPLOYEE_DATA`:

```typescript
const MOCK_EMPLOYEE_DATA = {
  employeeId: "EMP001",
  employeeName: "John Doe",
  department: "Engineering",
  hireDate: "2020-03-15",
  balances: [...],  // Array of LeaveBalance objects (lines 63-94)
  blackoutDates: [...],  // Array of BlackoutDate objects (lines 95-108)
  policies: {...}  // Leave policies (lines 109-114)
}
```

**Mock Data Structure:**
- **Vacation Balance** (lines 64-73): 18.5 current days, 20 accrued, 1.5 used, 1.67 days/month rate
- **Sick Balance** (lines 74-83): 12 current days, no carryover
- **Personal Balance** (lines 84-93): 3 current days, 0.25 days/month rate
- **Blackout Dates** (lines 95-108): Engineering freeze Nov 15-30, Holiday season Dec 15-31
- **Policies** (lines 109-114): 14 days min notice, 15 days max consecutive, carryover rules

#### Data Flow
1. **Input Processing** (lines 147-157): Log query parameters and send loading update
2. **API Simulation** (line 171): 800ms delay to simulate API call
3. **Data Retrieval** (line 174): Fetch from MOCK_EMPLOYEE_DATA
4. **Filtering** (lines 177-180): Filter balances by leaveType if specified
5. **Projection Logic** (lines 183-211): Calculate "what if" scenarios for future balances
6. **Response** (lines 228-233): Return balances, blackoutDates, projection, policies

#### Key Features
- **Projection Calculations** (lines 191-210): Subtract daysToTake from current balance, generate warnings for negative/low balances
- **Carryover Tracking** (lines 71-72): Each leave type has carryoverLimit and carryoverDeadline
- **Blackout Dates** (lines 95-108): Department-specific dates when leave is restricted

#### UI Component
**File:** `/home/user/agentdune-chat/components/leave-balance-result.tsx`

- **Loading State** (lines 24-31): Shows "Checking leave balances..." with spinner
- **Error State** (lines 36-43): Red alert for errors
- **Results Display** (lines 45-152):
  - Projection warnings (lines 50-71)
  - Current balances cards (lines 74-111)
  - Blackout dates alerts (lines 114-140)
  - Policies info card (lines 143-150)

---

### 2. Benefits Info Tool

**Implementation File:** `/home/user/agentdune-chat/lib/ai/tools/benefits-info.ts`

#### Entry Point
- **Function:** `benefitsInfo()` at line 257
- **Input Schema:** lines 273-282 (query, category, compareMode)
- **Execute Function:** lines 283-342

#### Mock Data Storage
**Lines 83-251** - Two mock data constants:

**1. MOCK_EMPLOYEE_BENEFITS** (lines 83-165):
```typescript
const MOCK_EMPLOYEE_BENEFITS = {
  employeeId: "EMP001",
  currentEnrollments: [...],  // 4 enrollments (lines 87-132)
  dependents: [...],  // 2 dependents (lines 134-149)
  enrollmentWindow: {...},  // Open enrollment info (lines 151-158)
  benefits: {...}  // Additional benefits (lines 160-164)
}
```

**Current Enrollments:**
- Medical: Blue Shield PPO Gold, $450/mo, $1500 deductible (lines 88-99)
- Dental: Delta Dental PPO, $85/mo, $50 deductible (lines 100-111)
- Vision: VSP, $18/mo (lines 112-121)
- 401k: Fidelity Traditional 401(k) (lines 122-131)

**Dependents:**
- Spouse: Jane Doe, born 1988-07-22, covered under medical/dental/vision (lines 136-141)
- Child: Jimmy Doe, born 2015-03-10, covered under dental (lines 142-148)

**2. MOCK_PLAN_OPTIONS** (lines 167-251) - Array of 3 medical plan options for comparison:
- Blue Shield PPO Gold: $250/mo employee only, $1500 individual deductible (lines 168-194)
- Kaiser HMO Platinum: $200/mo employee only, $500 individual deductible (lines 195-222)
- Blue Shield HDHP with HSA: $150/mo employee only, $3000 individual deductible (lines 223-251)

#### Data Flow
1. **Input Processing** (lines 288-298): Log parameters and send loading update
2. **API Simulation** (line 301): 900ms delay
3. **Data Retrieval** (line 303): Fetch from MOCK_EMPLOYEE_BENEFITS
4. **Category Filtering** (lines 306-309): Filter enrollments by category if specified
5. **Plan Comparison** (lines 312-315): Include MOCK_PLAN_OPTIONS if compareMode=true
6. **Response** (lines 328-334): Return enrollments, dependents, enrollmentWindow, planComparison, benefits

#### Key Features
- **Plan Comparison Mode** (lines 312-315): When compareMode=true, returns detailed comparison of 3 medical plans
- **Enrollment Windows** (lines 151-158): Tracks open enrollment period with days remaining (20 days)
- **Multi-Tier Pricing** (lines 173-175): Each plan has pricing for employee-only, employee+spouse, and family
- **Coverage Details** (lines 182-187): In-network/out-of-network percentages, copays, prescription coverage

#### UI Component
**File:** `/home/user/agentdune-chat/components/benefits-info-result.tsx`

- **Loading State** (lines 32-39): "Retrieving benefits information..."
- **Enrollment Window Alert** (lines 63-79): Amber alert showing days remaining in open enrollment
- **Current Enrollments** (lines 82-153): Cards showing plan details, premiums, deductibles
- **Dependents Section** (lines 156-189): Cards listing covered family members
- **Plan Comparison Table** (lines 192-251): Full table comparing all plan options
- **Additional Benefits** (lines 254-271): HSA contribution, 401k matching details

---

### 3. HR Case Tool

**Implementation File:** `/home/user/agentdune-chat/lib/ai/tools/hr-case.ts`

#### Entry Point
- **Function:** `hrCase()` at line 311
- **Input Schema:** lines 331-369 (action, category, description, caseId, attachChat)
- **Execute Function:** lines 370-541

#### Mock Data Storage
**Lines 95-220** - Configuration constants and mock cases:

**1. MOCK_EXISTING_CASES** (lines 95-191) - Array of 2 sample cases:

**Case 1** (lines 96-139): FSA claim issue
- ID: HR-2025-001234
- Category: benefits
- Status: in_progress
- Priority: medium
- 3 updates including system creation, HR response, internal note (lines 114-137)
- SLA: 8 hour first response (met), 12 hours remaining for resolution

**Case 2** (lines 140-191): Equipment request
- ID: HR-2025-001198
- Category: equipment
- Status: resolved
- Priority: low
- 4 updates showing full lifecycle from creation to resolution

**2. SLA_CONFIG** (lines 194-209) - SLA timelines by category:
```typescript
payroll: { firstResponseHours: 4, resolutionDays: 2, priority: "high" }
benefits: { firstResponseHours: 8, resolutionDays: 3, priority: "medium" }
equipment: { firstResponseHours: 24, resolutionDays: 7, priority: "low" }
// ... etc
```

**3. TEAM_ASSIGNMENT** (lines 212-220) - Category to team mapping:
```typescript
payroll: "Payroll Services"
benefits: "Benefits Administration"
equipment: "IT & Facilities"
// ... etc
```

#### Helper Functions
- **classifyIntent()** (lines 225-296): Auto-classifies issues from description using keyword matching
- **generateCaseId()** (lines 299-303): Generates case ID like "HR-2025-123456"

#### Data Flow

**CREATE Action** (lines 398-467):
1. Validate description (lines 399-401)
2. Auto-classify category if not provided (line 404)
3. Calculate SLA timelines (lines 408-414): firstResponseDue and resolutionDue
4. Generate new case object (lines 416-446)
5. Add system update (lines 434-442)
6. Attach chat transcript if requested (lines 443-445)
7. Return case with success message (lines 462-466)

**STATUS Action** (lines 470-500):
1. Validate caseId (lines 471-473)
2. Find case in MOCK_EXISTING_CASES (lines 475-480)
3. Return case details (lines 496-499)

**LIST Action** (lines 503-531):
1. Filter open vs closed cases (lines 504-509)
2. Return all cases with counts (lines 525-530)

#### Key Features
- **Auto-Classification** (lines 225-296): Keyword-based intent classification for 7 categories
- **SLA Tracking** (lines 407-432): Automatic calculation of first response and resolution deadlines
- **Update Timeline** (lines 434-442): System, HR specialist, and employee updates with timestamps
- **Priority Assignment** (lines 194-209): Automatic priority based on category (payroll=high, equipment=low)

#### UI Component
**File:** `/home/user/agentdune-chat/components/hr-case-result.tsx`

- **Loading State** (lines 44-55): Context-aware loading message based on action
- **Create Result** (lines 70-143): Success message, case details, SLA timeline card
- **Status Result** (lines 147-251): Full case view with updates timeline, SLA status badges
- **List Result** (lines 255-297): Summary badges and case cards with priority color-coding
- **Priority Colors** (lines 35-40): Visual indicators for low/medium/high/urgent priority
- **Status Colors** (lines 23-33): Color-coded badges for case status lifecycle

---

### 4. Team Availability Tool

**Implementation File:** `/home/user/agentdune-chat/lib/ai/tools/team-availability.ts`

#### Entry Point
- **Function:** `teamAvailability()` at line 223
- **Input Schema:** lines 243-269 (action, startDate, endDate, employeeId, requestId, reason)
- **Execute Function:** lines 270-473

#### Mock Data Storage
**Lines 92-175** - Three mock data constants:

**1. MOCK_MANAGER** (lines 92-97) - Manager context:
```typescript
const MOCK_MANAGER: ManagerContext = {
  employeeId: "EMP001",
  isManager: true,
  teamMembers: ["EMP101", "EMP102", "EMP103", "EMP104", "EMP105"],
  department: "Engineering"
}
```

**2. TEAM_DIRECTORY** (lines 100-106) - Team member details:
- EMP101: Alice Johnson, Senior Engineer
- EMP102: Bob Smith, Engineer
- EMP103: Carol Martinez, Engineer
- EMP104: David Chen, Junior Engineer
- EMP105: Eva Patel, Senior Engineer

**3. APPROVED_ABSENCES** (lines 109-137) - Array of 3 approved absences:
- Alice Johnson: Nov 18-22 (5 days vacation)
- Carol Martinez: Nov 25-26 (2 days personal)
- David Chen: Dec 2-6 (5 days vacation)

**4. PENDING_REQUESTS** (lines 140-175) - Array of 2 pending requests:
- Bob Smith: Nov 20-27 (6 days vacation) - HAS CONFLICT with Alice, 60% coverage
- Eva Patel: Dec 9-13 (5 days vacation) - NO CONFLICT, 80% coverage

#### Helper Functions
**calculateCoverage()** (lines 180-213):
- Iterates through date range day by day
- Counts employees on leave for each date
- Calculates team size, available count, coverage percentage
- Returns array of TeamCoverage objects

#### Data Flow

**Permission Check** (lines 287-296): CRITICAL RBAC enforcement
```typescript
if (!manager.isManager) {
  return {
    error: "This tool is only available to managers...",
    permissionDenied: true
  }
}
```

**VIEW_SCHEDULE Action** (lines 312-351):
1. Default to next 14 days if dates not specified (lines 314-319)
2. Filter absences within date range (lines 321-323)
3. Calculate coverage using helper function (line 325)
4. Identify critical dates (<70% coverage) (lines 327-329)
5. Return absences, coverageSummary, criticalDates (lines 345-350)

**VIEW_APPROVALS Action** (lines 354-374):
1. Return PENDING_REQUESTS array with totalPending count (lines 369-373)

**APPROVE_REQUEST Action** (lines 377-412):
1. Validate requestId (lines 378-380)
2. Find request in PENDING_REQUESTS (lines 382-387)
3. Update status to "approved" (line 390)
4. Add manager notes with timestamp (line 391)
5. Return updated request with success message (lines 407-411)

**DENY_REQUEST Action** (lines 415-453):
1. Validate requestId and reason (lines 416-421)
2. Find request (lines 423-428)
3. Update status to "denied" (line 431)
4. Add manager's reason to managerNotes (line 432)
5. Return updated request with message (lines 448-452)

#### Key Features
- **RBAC Enforcement** (lines 284-296): Manager-only access with explicit permission check
- **Coverage Calculation** (lines 180-213): Day-by-day team availability tracking
- **Conflict Detection** (lines 152-156, 169-173): Identifies overlapping absences and coverage impact
- **Critical Date Alerts** (lines 327-329): Flags dates with <70% team coverage
- **Approval Workflow** (lines 390-391, 431-432): Status transitions with manager notes

#### UI Component
**File:** `/home/user/agentdune-chat/components/team-availability-result.tsx`

- **Permission Denied Alert** (lines 50-61): Red destructive alert for non-managers
- **View Schedule Result** (lines 64-171):
  - Low coverage warning alert (lines 70-83)
  - Team absences cards (lines 86-132)
  - Coverage summary with progress bars (lines 135-169)
- **View Approvals Result** (lines 175-276):
  - Pending count badge (lines 180-186)
  - Request cards with conflict warnings (lines 194-273)
- **Approve/Deny Result** (lines 279-343):
  - Success/denial message with icon (lines 292-310)
  - Request details card (lines 313-339)

---

### 5. People Search Tool

**Implementation File:** `/home/user/agentdune-chat/lib/ai/tools/people-search.ts`

#### Entry Point
- **Function:** `peopleSearch()` at line 321
- **Input Schema:** lines 339-349 (query, includeOrgChart, includeTeam)
- **Execute Function:** lines 350-447

#### Mock Data Storage
**Lines 102-290** - Two mock data constants:

**1. MOCK_HR_USER** (lines 102-106) - HR context for RBAC:
```typescript
const MOCK_HR_USER: HRContext = {
  employeeId: "EMP900",
  isHR: true,
  role: "hr_specialist"
}
```

**2. EMPLOYEE_DIRECTORY** (lines 109-290) - Array of 5 employee profiles:

**Employee 1** (lines 110-141): Noor Al-Harbi
- ID: EMP200, Senior Software Engineer
- H1B visa status, expires 2026-06-14
- San Francisco HQ, hybrid remote
- Reports to John Doe (EMP001)
- 3.4 years of service

**Employee 2** (lines 142-186): John Doe (Manager)
- ID: EMP001, Engineering Manager
- 6 direct reports
- Citizen work authorization
- 4.6 years of service

**Employee 3** (lines 187-216): Maria Garcia
- ID: EMP301, Product Manager
- Status: leave_of_absence
- Austin Office, fully remote
- 2.8 years of service

**Employee 4** (lines 217-248): Ahmed Hassan
- ID: EMP401, Sales Associate
- Status: probation (ends 2025-12-01)
- Dubai Office, on-site
- Work visa expiring 2027-08-31

**Employee 5** (lines 249-289): Jennifer Lee
- ID: EMP501, Marketing Manager
- Status: notice_period (leaving 2025-12-15)
- 2 direct reports
- 5.0 years of service

#### Helper Functions

**searchEmployees()** (lines 293-303):
- Searches by fullName, employeeId, email, preferredName
- Case-insensitive contains matching
- Returns array of matching EmployeeProfile objects

**getTeamMembers()** (lines 306-315):
- Takes managerId parameter
- Finds manager's directReports list
- Returns full EmployeeProfile objects for each team member

#### Data Flow

**Permission Check** (lines 359-366): CRITICAL RBAC enforcement
```typescript
if (!hrUser.isHR) {
  return {
    error: "This tool is only available to HR personnel.",
    permissionDenied: true
  }
}
```

**Search Execution** (lines 368-403):
1. Send loading update (lines 368-376)
2. Simulate 700ms search delay (line 379)
3. Execute search using helper function (line 382)
4. Handle no results case (lines 384-403)
5. Build org chart if requested (lines 406-419):
   - Only for single result
   - Include teamMembers if includeTeam=true
6. Return results with totalResults and optional orgChart (lines 435-439)

#### Key Features
- **RBAC Enforcement** (lines 358-366): HR-only access with explicit permission check
- **PII Masking** (lines 336-337 in tool description): Only returns work email and office extension
- **Org Chart Building** (lines 406-419): Includes manager, direct reports, and full team details
- **Work Authorization Tracking** (lines 68-72): Status, expiry date, renewal requirements
- **Employment Status** (lines 15-20, 61-65): Tracks active, probation, LOA, notice period, terminated
- **Multi-Dimensional Search** (lines 296-302): Name, ID, email, preferred name matching

#### UI Component
**File:** `/home/user/agentdune-chat/components/people-search-result.tsx`

**EmployeeCard Sub-Component** (lines 49-217):
- Header with name, status badge, job title (lines 54-71)
- Contact info with clickable email (lines 76-92)
- Location and department (lines 95-115)
- Reporting structure (manager card, direct reports badges) (lines 118-153)
- Employment details (hire date, years of service, probation end) (lines 156-183)
- Work authorization card with expiry tracking (lines 186-213)

**Main Component** (lines 219-321):
- **Loading State** (lines 225-234): Shows search query
- **Permission Denied Alert** (lines 239-252): Red alert for non-HR users
- **No Results State** (lines 257-266): Empty state with search tips
- **Results Display** (lines 270-317):
  - Results count header (lines 273-278)
  - Employee cards (lines 281-285)
  - Org chart team members (lines 288-315)

---

## Integration with AI Agent

### Type System Integration

**File:** `/home/user/agentdune-chat/lib/ai/types.ts`

All 5 HR tools are fully integrated into the type system:

**Tool Name Schema** (lines 31-50):
```typescript
export const toolNameSchema = z.enum([
  // ... other tools
  "leaveBalance",
  "benefitsInfo",
  "hrCase",
  "teamAvailability",
  "peopleSearch",
])
```

**Tool Type Definitions** (lines 92-96):
```typescript
type leaveBalanceTool = InferUITool<ReturnType<typeof leaveBalance>>;
type benefitsInfoTool = InferUITool<ReturnType<typeof benefitsInfo>>;
type hrCaseTool = InferUITool<ReturnType<typeof hrCase>>;
type teamAvailabilityTool = InferUITool<ReturnType<typeof teamAvailability>>;
type peopleSearchTool = InferUITool<ReturnType<typeof peopleSearch>>;
```

**ChatTools Interface** (lines 98-117):
```typescript
export type ChatTools = {
  // ... other tools
  leaveBalance: leaveBalanceTool;
  benefitsInfo: benefitsInfoTool;
  hrCase: hrCaseTool;
  teamAvailability: teamAvailabilityTool;
  peopleSearch: peopleSearchTool;
};
```

### Message Rendering Integration

**File:** `/home/user/agentdune-chat/components/message-parts.tsx`

All 5 HR tools are integrated into the message rendering system:

**Imports** (lines 11, 17-18, 22, 27):
```typescript
import { BenefitsInfoResult } from "./benefits-info-result";
import { HRCaseResult } from "./hr-case-result";
import { LeaveBalanceResult } from "./leave-balance-result";
import { PeopleSearchResult } from "./people-search-result";
import { TeamAvailabilityResult } from "./team-availability-result";
```

**Chain of Thought Integration** (lines 682-698):
```typescript
const cotTools = new Set<ChatMessage["parts"][number]["type"]>([
  "tool-semanticSearch",
  "tool-leaveBalance",
  "tool-benefitsInfo",
  "tool-hrCase",
  "tool-teamAvailability",
  "tool-peopleSearch",
]);

const hrToolsForFullDisplay = new Set<ChatMessage["parts"][number]["type"]>([
  "tool-leaveBalance",
  "tool-benefitsInfo",
  "tool-hrCase",
  "tool-teamAvailability",
  "tool-peopleSearch",
]);
```

**Tool Rendering Logic** (lines 518-616):
Each HR tool has dedicated rendering logic with two states:
- `input-available`: Shows loading state
- `output-available`: Shows full results

**Example - Leave Balance** (lines 518-536):
```typescript
if (type === "tool-leaveBalance") {
  const { toolCallId, state } = part;
  if (state === "input-available") {
    return <LeaveBalanceResult input={input} state={state} />;
  }
  if (state === "output-available") {
    return <LeaveBalanceResult input={input} output={output} state={state} />;
  }
}
```

**Special Display Treatment** (lines 740-808):
HR tools are rendered twice:
1. **Inside Chain of Thought** (lines 736-738): Collapsed view during thinking
2. **After Chain of Thought** (lines 740-743): Full UI cards before text responses

This provides both inline thinking transparency and full result display.

### Stream Updates Integration

All HR tools use the `dataStream` to write real-time updates:

**Loading Updates** - Sent at start of execution:
```typescript
dataStream.write({
  type: "data-researchUpdate",
  data: {
    title: "Checking leave balances...",
    timestamp: Date.now(),
    type: "started"
  }
})
```

**Completion Updates** - Sent when done:
```typescript
dataStream.write({
  type: "data-researchUpdate",
  data: {
    title: "Leave balances retrieved",
    timestamp: Date.now(),
    type: "completed"
  }
})
```

**Examples:**
- Leave Balance: lines 160-167 (start), 214-221 (complete) in `/home/user/agentdune-chat/lib/ai/tools/leave-balance.ts`
- Benefits Info: lines 291-298 (start), 317-324 (complete) in `/home/user/agentdune-chat/lib/ai/tools/benefits-info.ts`
- HR Case: lines 384-391 (start), 448-455 (complete) in `/home/user/agentdune-chat/lib/ai/tools/hr-case.ts`
- Team Availability: lines 298-305 (start), multiple completion points in `/home/user/agentdune-chat/lib/ai/tools/team-availability.ts`
- People Search: lines 368-376 (start), 421-428 (complete) in `/home/user/agentdune-chat/lib/ai/tools/people-search.ts`

---

## Data Flow Summary

### Complete Request Flow

1. **User Message** → User types HR question in chat
2. **AI Prompt Processing** → System prompt (prompts.ts:4-125) instructs AI on tool usage
3. **Tool Selection** → AI selects appropriate HR tool based on query
4. **Tool Execution**:
   - Tool receives input from AI
   - Sends "started" stream update
   - Simulates API delay (700-1000ms)
   - Retrieves mock data from constants
   - Processes data (filtering, calculations, projections)
   - Sends "completed" stream update
   - Returns structured output
5. **UI Rendering**:
   - message-parts.tsx detects tool type
   - Renders loading state (input-available)
   - Renders result component (output-available)
   - Shows in Chain of Thought AND as full card
6. **AI Response** → AI synthesizes tool output into natural language response

### Data Flow Diagram

```
User Query
    ↓
System Prompt (prompts.ts:4-125)
    ↓
Tool Selection (AI)
    ↓
Tool Registration (tools.ts:100-106)
    ↓
Tool Execution (tool file execute function)
    ↓
Mock Data (MOCK_* constants in tool files)
    ↓
Stream Updates (dataStream.write)
    ↓
Message Parts (message-parts.tsx:518-616)
    ↓
UI Components (*-result.tsx)
    ↓
User sees results
```

---

## Key Implementation Patterns

### 1. Consistent Tool Structure

All 5 HR tools follow the same pattern:

```typescript
export const toolName = ({ dataStream }: ToolProps) =>
  tool({
    description: "...",
    inputSchema: z.object({...}),
    execute: async (input) => {
      // 1. Log start
      log.info({ ...input }, "toolName: start");

      // 2. Send loading update
      dataStream.write({ type: "data-researchUpdate", ... });

      try {
        // 3. Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 700-1000));

        // 4. Retrieve mock data
        const data = MOCK_DATA;

        // 5. Process data
        // ... filtering, calculations, etc.

        // 6. Send completion update
        dataStream.write({ type: "data-researchUpdate", ... });

        // 7. Log success
        log.info({ ms: Date.now() - startMs }, "toolName: success");

        // 8. Return output
        return { ... };
      } catch (error) {
        log.error({ error }, "toolName: failure");
        return { error: error.message };
      }
    }
  });
```

### 2. RBAC Enforcement

**Team Availability** (teamAvailability.ts:284-296):
```typescript
if (!manager.isManager) {
  return {
    error: "This tool is only available to managers...",
    permissionDenied: true
  }
}
```

**People Search** (peopleSearch.ts:358-366):
```typescript
if (!hrUser.isHR) {
  return {
    error: "This tool is only available to HR personnel.",
    permissionDenied: true
  }
}
```

### 3. Error Handling

All tools return union types with error states:

```typescript
export type ToolOutput =
  | {
      // success fields
    }
  | {
      error: string;
      permissionDenied?: boolean;
    };
```

UI components handle errors consistently:
```typescript
if ("error" in output) {
  return <Alert variant={output.permissionDenied ? "destructive" : "default"}>...</Alert>
}
```

### 4. Mock Data Organization

Mock data is co-located with tool implementation for easy modification:

- **Leave Balance**: MOCK_EMPLOYEE_DATA at line 58
- **Benefits Info**: MOCK_EMPLOYEE_BENEFITS at line 83, MOCK_PLAN_OPTIONS at line 167
- **HR Case**: MOCK_EXISTING_CASES at line 95, SLA_CONFIG at line 194, TEAM_ASSIGNMENT at line 212
- **Team Availability**: MOCK_MANAGER at line 92, TEAM_DIRECTORY at line 100, APPROVED_ABSENCES at line 109, PENDING_REQUESTS at line 140
- **People Search**: MOCK_HR_USER at line 102, EMPLOYEE_DIRECTORY at line 109

### 5. Type Safety

Full end-to-end type safety:

```typescript
// Tool input/output types exported from tool file
export type LeaveBalanceInput = {...};
export type LeaveBalanceOutput = {...};

// UI component props use these types
type LeaveBalanceResultProps = {
  input: LeaveBalanceInput;
  output?: LeaveBalanceOutput;
  state: "input-available" | "output-available";
};

// Types flow through InferUITool to ChatTools interface
type leaveBalanceTool = InferUITool<ReturnType<typeof leaveBalance>>;
```

### 6. Real-Time Updates

All tools provide streaming updates for better UX:

```typescript
// Start
dataStream.write({
  type: "data-researchUpdate",
  data: { title: "Loading...", timestamp: Date.now(), type: "started" }
});

// Complete
dataStream.write({
  type: "data-researchUpdate",
  data: { title: "Complete", timestamp: Date.now(), type: "completed" }
});
```

These appear in the Chain of Thought UI component showing real-time progress.

---

## Configuration

### Tool Costs
**File:** `/home/user/agentdune-chat/lib/ai/tools/tools-definitions.ts:74-98`

```typescript
leaveBalance: { cost: 2 }
benefitsInfo: { cost: 2 }
hrCase: { cost: 3 }
teamAvailability: { cost: 3 }
peopleSearch: { cost: 2 }
```

### API Simulation Delays
- Leave Balance: 800ms (leave-balance.ts:171)
- Benefits Info: 900ms (benefits-info.ts:301)
- HR Case: 1000ms (hr-case.ts:395)
- Team Availability: 800ms (team-availability.ts:309)
- People Search: 700ms (people-search.ts:379)

### Logging
All tools use structured logging with the `@/lib/logger` module:

```typescript
const log = createModuleLogger("ai.tools.toolName");

log.info({ params }, "toolName: start");
log.info({ ms: Date.now() - startMs }, "toolName: success");
log.error({ error }, "toolName: failure");
```

---

## Summary

### Mock Data Locations

1. **Leave Balance**: `/home/user/agentdune-chat/lib/ai/tools/leave-balance.ts:58-115`
2. **Benefits Info**: `/home/user/agentdune-chat/lib/ai/tools/benefits-info.ts:83-251`
3. **HR Case**: `/home/user/agentdune-chat/lib/ai/tools/hr-case.ts:95-220`
4. **Team Availability**: `/home/user/agentdune-chat/lib/ai/tools/team-availability.ts:92-175`
5. **People Search**: `/home/user/agentdune-chat/lib/ai/tools/people-search.ts:102-290`

### AI Integration Points

1. **System Prompt**: `/home/user/agentdune-chat/lib/ai/prompts.ts:4-125`
2. **Tool Registration**: `/home/user/agentdune-chat/lib/ai/tools/tools.ts:100-106`
3. **Tool Definitions**: `/home/user/agentdune-chat/lib/ai/tools/tools-definitions.ts:74-98`
4. **Type System**: `/home/user/agentdune-chat/lib/ai/types.ts:31-117`
5. **Message Rendering**: `/home/user/agentdune-chat/components/message-parts.tsx:518-616, 682-698`

### Key Architectural Decisions

1. **Co-located Mock Data**: Mock data stored directly in tool implementation files for easy modification
2. **Dual Rendering**: HR tools appear in both Chain of Thought and as full result cards
3. **RBAC at Execution**: Permission checks happen in tool execute functions (Team Availability, People Search)
4. **Streaming Updates**: Real-time progress updates via dataStream for better UX
5. **Type Safety**: Full TypeScript coverage from tool definition to UI rendering
6. **Error Union Types**: Consistent error handling pattern across all tools
7. **Zod Schemas**: Runtime validation of tool inputs using Zod

### Future Enhancement Paths

1. **Database Integration**: Replace MOCK_* constants with actual database queries
2. **API Integration**: Replace simulated delays with real external API calls
3. **Authentication Context**: Pass real session/user context instead of mock RBAC values
4. **Internationalization**: Extend Arabic support mentioned in system prompt
5. **Caching**: Add caching layer for frequently accessed data
6. **Analytics**: Track tool usage patterns and performance metrics

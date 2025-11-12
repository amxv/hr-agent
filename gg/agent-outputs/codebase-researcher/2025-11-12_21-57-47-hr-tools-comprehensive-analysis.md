# HR Tools and Agent Integration - Comprehensive Analysis



**Date:** 2025-11-12 21:57:47

**Analysis Type:** Complete HR Tools Architecture Research



---



## Executive Summary



This codebase implements a complete HR assistant system with 5 specialized AI tools that integrate with a PostgreSQL database through Drizzle ORM. The tools provide leave balance checking, benefits information, HR case management, team availability tracking, and employee directory search. The system uses Vercel AI SDK's tool calling capabilities with real-time streaming responses.



---



## Part 1: HR Tools Overview



### 1.1 Leave Balance Tool (`leaveBalance`)



**File:** `/home/user/agentdune-chat/lib/ai/tools/leave-balance.ts`



**Purpose:** Check employee leave balances, accrual rates, carryover rules, and blackout dates with projection capabilities.



**Input Schema:**

```typescript

{

  query: string;              // Employee's question about leave

  projectionDate?: string;    // ISO date for "what if" scenarios

  daysToTake?: number;        // Number of days for projection

  leaveType?: "vacation" | "sick" | "personal" | "all";

}

```



**Output Schema:**

```typescript

// Success case

{

  balances: LeaveBalance[];           // Array of leave balances by type

  blackoutDates: BlackoutDate[];      // Department blackout dates

  projection?: {                      // Optional projection scenario

    scenario: string;

    projectedBalance: number;

    projectionDate: string;

    warning?: string;

  };

  policies: {

    minNotice: number;                // Days of notice required

    maxConsecutive: number;           // Max consecutive days allowed

    carryoverRules: string;

  };

}

```



**Key Implementation Details:**

- Line 111-116: Dynamically imports database queries (`getEmployeeByEmployeeId`, `getLeaveBalancesByEmployeeId`, `listBlackoutDates`, `getLeavePolicy`)

- Line 119-120: Uses hardcoded `EMP001` as default employee (production should use session)

- Line 147-156: Transforms database balances with type conversions (numeric to float)

- Line 159-169: Filters blackout dates by employee's department

- Line 183-203: Handles projection calculations for "what if" scenarios

- Line 100-107, 206-213: Sends real-time updates via `dataStream.write()`



**Database Integration:**

- `employee` table: Get employee by employeeId

- `leaveBalance` table: Get balances (vacation, sick, personal)

- `blackoutDate` table: Get department-specific blackout dates

- `leavePolicy` table: Get leave policies by department



**Frontend Display:** `components/leave-balance-result.tsx`



---



### 1.2 Benefits Info Tool (`benefitsInfo`)



**File:** `/home/user/agentdune-chat/lib/ai/tools/benefits-info.ts`



**Purpose:** Query employee benefits enrollments, plan options, dependents, and enrollment windows.



**Input Schema:**

```typescript

{

  query: string;                                              // Employee's question

  category?: "medical" | "dental" | "vision" | "retirement" | "all";

  compareMode?: boolean;                                      // Return plan comparison

}

```



**Output Schema:**

```typescript

{

  currentEnrollments: PlanEnrollment[];    // Current benefit enrollments

  dependents: Dependent[];                 // Covered dependents

  enrollmentWindow?: EnrollmentWindow;     // Active enrollment period

  planComparison?: PlanOption[];           // Plan comparison (if compareMode=true)

  benefits: {

    employerHSAContribution?: number;

    employerRetirementMatch?: string;

    ptoPolicy?: string;

  };

}

```



**Key Implementation Details:**

- Line 130-138: Dynamically imports 6 database query functions

- Line 142: Uses hardcoded `EMP001` (should use session in production)

- Line 153-262: Builds enrollments by checking each plan type (medical, dental, vision, 401k)

- Line 168-197: Complex JSON parsing for medical plan (monthlyPremium, deductible, outOfPocketMax)

- Line 265-277: Fetches and transforms dependents with relationship types

- Line 280-299: Calculates enrollment window with days remaining

- Line 302-352: Builds plan comparison table when compareMode=true

- Line 365-379: Returns employer contributions and retirement matching



**Database Integration:**

- `employee` table: Get employee details

- `benefitsEnrollment` table: Get employee's current enrollments

- `benefitsPlan` table: Get plan details by ID, list all plans for comparison

- `dependent` table: Get covered dependents

- `enrollmentPeriod` table: Get current open enrollment period



**Frontend Display:** `components/benefits-info-result.tsx`



---



### 1.3 HR Case Tool (`hrCase`)



**File:** `/home/user/agentdune-chat/lib/ai/tools/hr-case.ts`



**Purpose:** Create, track, and manage HR support tickets with SLA tracking and automatic categorization.



**Input Schema:**

```typescript

{

  action: "create" | "status" | "list" | "update";

  category?: "payroll" | "benefits" | "policy" | "equipment" | "leave" | "performance" | "other";

  description?: string;           // Required for create

  caseId?: string;                // Required for status/update

  attachChat?: boolean;           // Attach conversation to case

  updateStatus?: CaseStatus;      // For update action

  updatePriority?: CasePriority;  // For update action

  updateNote?: string;            // For update action

}

```



**Output Schema (varies by action):**

```typescript

// CREATE

{

  action: "create";

  case: HRCase;

  message: string;

}



// STATUS

{

  action: "status";

  case: HRCase;  // Includes updates timeline

}



// LIST

{

  action: "list";

  cases: HRCase[];

  totalOpen: number;

  totalClosed: number;

}



// UPDATE

{

  action: "update";

  case: HRCase;

  message: string;

}

```



**Key Implementation Details:**

- Line 104-119: SLA_CONFIG defines response times by category (4h-24h first response, 2-10 days resolution)

- Line 122-130: TEAM_ASSIGNMENT maps categories to teams

- Line 134-206: `classifyIntent()` auto-categorizes cases based on keywords

- Line 208-213: `generateCaseId()` creates unique IDs (HR-YYYY-NNNNNN)

- Line 336-420: CREATE action - calculates SLA deadlines, assigns team, creates case

- Line 422-490: STATUS action - retrieves case with updates, calculates hours remaining

- Line 492-552: LIST action - returns all cases with status filtering

- Line 554-681: UPDATE action - updates status/priority, adds notes



**Database Integration:**

- `hrCase` table: Create, update, query cases

- `caseUpdate` table: Add timeline updates

- `employee` table: Get employee info for submitter



**Helper Functions:**

- `lib/hr/helpers.ts`:

  - `generateCaseId()`: Creates unique case IDs

  - `calculateSLA()`: Calculates SLA deadlines from category

  - Line 69-99: Calculates firstResponseDue and resolutionDue timestamps



**Frontend Display:** `components/hr-case-result.tsx`



---



### 1.4 Team Availability Tool (`teamAvailability`)



**File:** `/home/user/agentdune-chat/lib/ai/tools/team-availability.ts`



**Purpose:** View team schedules, manage leave requests, approve/deny requests (manager-only).



**Input Schema:**

```typescript

{

  action: "view_schedule" | "view_approvals" | "approve_request" | "deny_request";

  startDate?: string;      // For view_schedule

  endDate?: string;        // For view_schedule

  employeeId?: string;     // For approval actions

  requestId?: string;      // For approval actions

  reason?: string;         // For deny_request

}

```



**Output Schema (varies by action):**

```typescript

// VIEW_SCHEDULE

{

  action: "view_schedule";

  absences: TeamMemberAbsence[];

  coverageSummary: TeamCoverage[];  // Daily coverage percentages

  criticalDates: string[];          // Dates with <70% coverage

}



// VIEW_APPROVALS

{

  action: "view_approvals";

  pendingRequests: LeaveRequest[];

  totalPending: number;

}



// APPROVE/DENY

{

  action: "approve_request" | "deny_request";

  request: LeaveRequest;

  message: string;

}

```



**Key Implementation Details:**

- Line 91-125: `calculateCoverage()` helper - calculates team coverage for date range

- Line 204-212: Dynamically imports database queries

- Line 216-224: Gets manager context (currently hardcoded EMP001)

- Line 227-229: Gets team members by department

- Line 230-294: VIEW_SCHEDULE - lists absences, calculates coverage, identifies critical dates (<70%)

- Line 298-364: VIEW_APPROVALS - lists pending requests with conflict detection

- Line 366-431: APPROVE_REQUEST - approves request, creates absence record

- Line 433-505: DENY_REQUEST - denies request with reason



**Database Integration:**

- `employee` table: Get manager and team members

- `absence` table: Get approved absences for schedule view

- `leaveRequest` table: Get pending requests, update status

- Helper functions calculate conflicts and coverage



**Frontend Display:** `components/team-availability-result.tsx`



---



### 1.5 People Search Tool (`peopleSearch`)



**File:** `/home/user/agentdune-chat/lib/ai/tools/people-search.ts`



**Purpose:** Search employee directory with org chart, work authorization, and employment status (HR-only for full access).



**Input Schema:**

```typescript

{

  query: string;                                              // Search term

  includeOrgChart?: boolean;                                  // Include manager/reports

  includeTeam?: boolean;                                      // Include team details

  searchField?: "fullName" | "jobTitle" | "department" | "all";

}

```



**Output Schema:**

```typescript

{

  results: EmployeeProfile[];

  totalResults: number;

  orgChart?: OrgChart;  // Only if single result + includeOrgChart=true

}

```



**Key Implementation Details:**

- Line 162: Dynamically imports `listEmployees` query

- Line 165-175: Maps searchField to database column (jobTitle falls back to fullName)

- Line 172-175: Executes search with filters

- Line 201-240: Transforms database results to EmployeeProfile format

- Line 219-225: Constructs manager object from joined data

- Line 227-239: Work authorization defaults to "citizen" (not in listEmployees query)

- Line 243-302: Builds org chart with team members if requested



**Database Integration:**

- `employee` table: Search by fullName, email, employeeId, department

- Left joins to get manager details

- Filters by searchValue pattern matching



**Frontend Display:** `components/people-search-result.tsx`



---



## Part 2: Database Architecture



### 2.1 Schema Overview



**File:** `/home/user/agentdune-chat/lib/db/schema.ts`



The HR system uses 13 PostgreSQL tables with Drizzle ORM:



**Core Tables:**

1. `employee` (Line 381-467) - Employee records

2. `leaveBalance` (Line 470-521) - Leave balances by type

3. `blackoutDate` (Line 524-544) - Department blackout dates

4. `leavePolicy` (Line 547-563) - Leave policies

5. `benefitsPlan` (Line 566-614) - Benefits plan definitions

6. `benefitsEnrollment` (Line 617-731) - Employee enrollments

7. `dependent` (Line 734-759) - Employee dependents

8. `enrollmentPeriod` (Line 762-784) - Open enrollment periods

9. `hrCase` (Line 787-832) - HR support cases

10. `caseUpdate` (Line 835-856) - Case update timeline

11. `absence` (Line 859-887) - Approved absences

12. `leaveRequest` (Line 890-940) - Leave request submissions



**Key Enums (Line 27-116):**

- `employmentStatusEnum`: active, probation, leave_of_absence, notice_period, terminated

- `leaveTypeEnum`: vacation, sick, personal

- `caseCategoryEnum`: payroll, benefits, policy, equipment, leave, performance, other

- `casePriorityEnum`: low, medium, high, urgent

- `caseStatusEnum`: open, in_progress, pending_info, resolved, closed



**Complex JSON Fields:**

- `employee.workAuthorization`: {status, expiryDate, requiresRenewal, daysUntilExpiry}

- `benefitsPlan.monthlyPremium`: {employeeOnly, employeeSpouse, family}

- `benefitsPlan.deductible`: {individual, family}

- `benefitsPlan.coverage`: Record<string, any> with plan-specific fields



**Indexes:**

- `employee`: employeeId, userId, department, managerId (Line 458-465)

- `hrCase`: caseId, status, category, submittedBy, assignedTeam (Line 825-831)

- `leaveRequest`: requestId, employeeId, status, dates (Line 930-938)



**Constraints:**

- `leaveBalance.currentBalance >= 0` (Line 516-519)

- Unique indexes on (employeeId, leaveType) for leaveBalance (Line 512-514)



### 2.2 Seed Data



**File:** `/home/user/agentdune-chat/lib/db/seeds/hr-data.ts`



**Key Seed Functions:**



1. **`seedEmployees()`** (Line 30-162)

   - Seeds 5 employees with different statuses

   - EMP001: John Doe (active, Engineering Manager)

   - EMP200: Noor Al-Harbi (active, H1B visa)

   - EMP301: Maria Garcia (leave_of_absence)

   - EMP401: Ahmed Hassan (probation)

   - EMP501: Jennifer Lee (notice_period)



2. **`seedLeaveBalances()`** (Line 167-222)

   - Creates 3 balances per employee (vacation, sick, personal)

   - Vacation: 18.5 current, 1.67/month accrual, 5 day carryover

   - Sick: 12 days, 1/month accrual, 0 carryover

   - Personal: 3 days, 0.25/month accrual, 0 carryover



3. **`seedBenefitsPlans()`** (Line 263-496)

   - 3 medical plans: Blue Shield PPO Gold, Kaiser HMO Platinum, HDHP with HSA

   - 2 dental plans: Delta Dental PPO, Cigna Dental HMO

   - 2 vision plans: VSP, EyeMed

   - 1 retirement plan: Traditional 401(k) with 6% match



4. **`seedHRCases()`** (Line 604-735)

   - Case HR-2025-001234: Benefits FSA claim (in_progress, medium priority)

   - Case HR-2025-001198: Equipment monitor request (resolved)

   - Each case includes multiple caseUpdate records



5. **`seedAbsences()`** (Line 740-854)

   - Seeds 3 team members with approved absences

   - Used by teamAvailability tool for schedule view



6. **`seedLeaveRequests()`** (Line 859-959)

   - Seeds 2 pending leave requests

   - REQ-2025-0891: Bob Smith (has conflict)

   - REQ-2025-0892: Eva Patel (no conflict)



**Main Entry Point:** `seedAllHRData()` (Line 964-1006)

- Checks if already seeded

- Seeds in order to maintain referential integrity

- Can be reset via `clearAllHRData()` (Line 1011-1029)



### 2.3 Database Queries



**File:** `/home/user/agentdune-chat/lib/db/queries.ts` (2480 lines)



**Key HR Query Functions (grep results from Line 1061-2322):**



**Employee Queries:**

- `listEmployees()` - Search/filter employees with pagination

- `getEmployeeById()` - Get employee by UUID

- `getEmployeeByEmployeeId()` - Get by employeeId string

- `createEmployee()` - Insert new employee

- `updateEmployee()` - Update employee fields



**Leave Balance Queries:**

- `listLeaveBalances()` - List balances with filters

- `getLeaveBalancesByEmployeeId()` - Get all balances for employee

- `updateLeaveBalance()` - Update balance fields



**Blackout Date Queries:**

- `listBlackoutDates()` - Filter by department/date

- `createBlackoutDate()` - Create blackout period

- `deleteBlackoutDate()` - Remove blackout date



**Benefits Queries:**

- `listBenefitsPlans()` - List plans with category filter

- `getBenefitsPlanById()` - Get plan details

- `createBenefitsPlan()` / `updateBenefitsPlan()` - Plan management

- `getEnrollmentByEmployeeId()` - Get employee's enrollments

- `listDependents()` - Get employee's dependents

- `getCurrentEnrollmentPeriod()` - Get active enrollment window



**HR Case Queries:**

- `listHRCases()` - Filter by status/category/team

- `getHRCaseByCaseId()` - Get case by caseId string

- `createHRCase()` - Create new case with SLA calculation

- `updateHRCase()` - Update case status/priority

- `addCaseUpdate()` - Add timeline update



**Team Availability Queries:**

- `listAbsences()` - Get absences by department/date range

- `createAbsence()` - Create approved absence

- `listLeaveRequests()` - Get pending requests

- `approveLeaveRequest()` - Approve and create absence

- `denyLeaveRequest()` - Deny with reason



### 2.4 HR Helper Functions



**File:** `/home/user/agentdune-chat/lib/hr/helpers.ts`



**Key Functions:**



1. **`generateCaseId()`** (Line 12-34)

   - Format: `HR-YYYY-NNNNNN` (e.g., HR-2025-001234)

   - Queries max case number for current year

   - Increments and pads to 6 digits



2. **`generateRequestId()`** (Line 40-62)

   - Format: `REQ-YYYY-NNNN` (e.g., REQ-2025-0042)

   - Similar logic, pads to 4 digits



3. **`calculateSLA()`** (Line 69-99)

   - Input: createdAt date, category

   - Uses SLA_CONFIG from `sla-config.ts`

   - Returns: firstResponseDue, resolutionDue, slaHoursRemaining

   - Example: Payroll = 4h first response, 2 days resolution



4. **`calculateCoveragePercent()`** (Line 106-124)

   - Counts absences overlapping target date

   - Returns percentage of available staff (0-100)



5. **`detectConflicts()`** (Line 131-172)

   - Checks if request overlaps with existing absences

   - Returns: hasConflict, conflictsWith (employee IDs), reason



6. **`calculateBusinessDays()`** (Line 178-197)

   - Calculates business days between dates

   - Excludes weekends (Saturday/Sunday)



7. **`updateSLAStatus()`** (Line 204-230)

   - Recalculates hours remaining

   - Updates slaHoursRemaining field



**SLA Configuration:**



**File:** `/home/user/agentdune-chat/lib/hr/sla-config.ts`



```typescript

SLA_CONFIG = {

  payroll: { firstResponseHours: 4, resolutionDays: 2, priority: "high" },

  benefits: { firstResponseHours: 8, resolutionDays: 3, priority: "medium" },

  equipment: { firstResponseHours: 24, resolutionDays: 7, priority: "low" },

  leave: { firstResponseHours: 8, resolutionDays: 2, priority: "medium" },

  policy: { firstResponseHours: 24, resolutionDays: 5, priority: "low" },

  performance: { firstResponseHours: 24, resolutionDays: 10, priority: "medium" },

  other: { firstResponseHours: 24, resolutionDays: 7, priority: "low" }

}

```



---



## Part 3: Integration Architecture



### 3.1 Tool Registration



**File:** `/home/user/agentdune-chat/lib/ai/tools/tools.ts`



**`getTools()` Function** (Line 25-108):



```typescript

export function getTools({

  dataStream,

  session,

  messageId,

  selectedModel,

  attachments,

  lastGeneratedImage,

  contextForLLM,

}) {

  return {

    // ... other tools ...



    leaveBalance: leaveBalance({ dataStream }),                    // Line 100

    benefitsInfo: benefitsInfo({ dataStream }),                    // Line 101

    hrCase: hrCase({ dataStream }),                                // Line 102

    teamAvailability: teamAvailability({ dataStream }),            // Line 104

    peopleSearch: peopleSearch({ dataStream }),                    // Line 106

  };

}

```



**Tool Definitions:**



**File:** `/home/user/agentdune-chat/lib/ai/tools/tools-definitions.ts`



Each tool has metadata (Line 74-103):



```typescript

leaveBalance: {

  name: "leaveBalance",

  description: "Check employee leave balances, accrual rates, and blackout dates",

  cost: 2,

}



benefitsInfo: {

  name: "benefitsInfo",

  description: "Query employee benefits enrollments, plan options, and dependents",

  cost: 2,

}



hrCase: {

  name: "hrCase",

  description: "Create, update, and manage HR support cases with SLA tracking",

  cost: 3,

}



teamAvailability: {

  name: "teamAvailability",

  description: "View team availability, approved absences, and pending leave requests",

  cost: 3,

}



peopleSearch: {

  name: "peopleSearch",

  description: "Search employee directory by name, title, department, skills, or location",

  cost: 2,

}

```



### 3.2 Chat Route Integration



**File:** `/home/user/agentdune-chat/app/(chat)/api/chat/route.ts`



**Key Flow** (Line 523-565):



1. **Initialize Stream** (Line 523):

   ```typescript

   const result = streamText({

     model: getLanguageModel(modelDefinition.apiModelId),

     system: systemPrompt(),

     messages: contextForLLM,

     // ...

   ```



2. **Register Tools** (Line 549-564):

   ```typescript

   tools: getTools({

     dataStream,

     session: {

       user: { id: userId || undefined },

     },

     messageId,

     selectedModel: modelDefinition.id,

     attachments: parts.filter((part) => part.type === "file"),

     lastGeneratedImage,

   }),

   ```



3. **AI Model Execution:**

   - Model analyzes user message

   - Decides which tool(s) to call

   - Calls tool with parsed arguments

   - Tool executes, returns result

   - Result streamed to client



### 3.3 Frontend Display Components



**Message Parts Router:**



**File:** `/home/user/agentdune-chat/components/message-parts.tsx` (Line 1-100)



Maps tool call parts to React components:



```typescript

import { BenefitsInfoResult } from "./benefits-info-result";      // Line 11

import { HRCaseResult } from "./hr-case-result";                  // Line 17

import { LeaveBalanceResult } from "./leave-balance-result";      // Line 18

import { PeopleSearchResult } from "./people-search-result";      // Line 22

import { TeamAvailabilityResult } from "./team-availability-result"; // Line 27

```



Each component handles:

1. **Loading state** (`input-available`): Shows spinner with action description

2. **Error state**: Displays error message with context

3. **Success state** (`output-available`): Renders structured data



**Component Features:**



1. **LeaveBalanceResult** (`components/leave-balance-result.tsx`):

   - Current balances with badges (Line 74-117)

   - Blackout dates with calendar icons (Line 119-146)

   - Leave policies in info card (Line 149-156)

   - Projection warnings with alert component (Line 50-70)



2. **BenefitsInfoResult** (`components/benefits-info-result.tsx`):

   - Enrollment window alerts (Line 63-79)

   - Current enrollments cards (Line 82-154)

   - Dependents list with coverage badges (Line 156-189)

   - Plan comparison table (Line 192-251)

   - Additional benefits summary (Line 254-271)



3. **HRCaseResult** (`components/hr-case-result.tsx`):

   - Multi-action handler (create/status/list/update)

   - SLA timeline with progress indicators (Line 121-141)

   - Case updates timeline (Line 223-248)

   - Status/priority color coding (Line 23-40)

   - Case list view with filtering (Line 255-297)



4. **TeamAvailabilityResult** (`components/team-availability-result.tsx`):

   - Team schedule with coverage bars (Line 64-172)

   - Critical coverage alerts (Line 70-83)

   - Pending approvals with conflict detection (Line 174-276)

   - Approval/denial confirmation (Line 279-343)



5. **PeopleSearchResult** (`components/people-search-result.tsx`):

   - Employee cards with full profile (Line 49-217)

   - Work authorization badges with colors (Line 41-47)

   - Manager/reports visualization (Line 118-153)

   - Org chart team view (Line 288-316)



### 3.4 Admin Panel Integration



**TRPC Router:**



**File:** `/home/user/agentdune-chat/trpc/routers/admin.router.ts`



The admin router provides full CRUD operations for HR data (Line 270-992):



**Employee Management** (Line 271-408):

- `hr.employees.list` - Search/filter employees

- `hr.employees.get` - Get employee by ID

- `hr.employees.create` - Create employee record

- `hr.employees.update` - Update employee

- `hr.employees.delete` - Soft delete employee



**Leave Balances** (Line 411-459):

- `hr.leaveBalances.list` - List balances with filters

- `hr.leaveBalances.update` - Update balance amounts



**Blackout Dates** (Line 461-499):

- `hr.blackoutDates.list` - List blackout dates

- `hr.blackoutDates.create` - Create blackout period

- `hr.blackoutDates.delete` - Remove blackout date



**Benefits Plans** (Line 502-625):

- `hr.benefitsPlans.list` - List plans with filters

- `hr.benefitsPlans.get` - Get plan details

- `hr.benefitsPlans.create` - Create new plan

- `hr.benefitsPlans.update` - Update plan

- `hr.benefitsPlans.delete` - Remove plan



**Enrollments** (Line 627-671):

- `hr.enrollments.list` - List employee enrollments

- `hr.enrollments.upsert` - Create/update enrollment



**Dependents** (Line 673-721):

- `hr.dependents.create` - Add dependent

- `hr.dependents.update` - Update dependent

- `hr.dependents.delete` - Remove dependent



**HR Cases** (Line 723-852):

- `hr.cases.list` - List cases with filters

- `hr.cases.get` - Get case with updates

- `hr.cases.create` - Create case with SLA

- `hr.cases.update` - Update case status

- `hr.cases.delete` - Delete case

- `hr.cases.addUpdate` - Add timeline update



**Absences** (Line 855-920):

- `hr.absences.list` - List absences

- `hr.absences.create` - Create absence

- `hr.absences.update` - Update absence

- `hr.absences.delete` - Remove absence



**Leave Requests** (Line 922-972):

- `hr.leaveRequests.list` - List requests

- `hr.leaveRequests.create` - Submit request

- `hr.leaveRequests.approve` - Approve request

- `hr.leaveRequests.deny` - Deny with reason



**Reset to Defaults** (Line 975-991):

- `hr.resetToDefaults` - Clear and reseed all HR data



---



## Part 4: Data Flow Analysis



### 4.1 Complete Data Flow: User Request → Tool Execution → Response



**Step-by-Step Flow:**



1. **User Sends Message** (Client)

   ```

   User types: "How many vacation days do I have left?"

   → POST /api/chat with message content

   ```



2. **Chat Route Handler** (`app/(chat)/api/chat/route.ts`)

   ```typescript

   // Line 523-573

   const result = streamText({

     model: getLanguageModel(modelDefinition.apiModelId),

     system: systemPrompt(),

     messages: contextForLLM,

     tools: getTools({ dataStream, session, ... }),

   });

   ```



3. **AI Model Processing**

   ```

   Model analyzes message

   → Decides to call leaveBalance tool

   → Extracts parameters: { query: "vacation days left", leaveType: "vacation" }

   ```



4. **Tool Execution** (`lib/ai/tools/leave-balance.ts`)

   ```typescript

   // Line 87-238

   execute: async ({ query, projectionDate, daysToTake, leaveType }) => {

     // Send loading update (Line 100-107)

     dataStream.write({ type: "data-researchUpdate", ... });



     // Import queries (Line 111-116)

     const { getEmployeeByEmployeeId, getLeaveBalancesByEmployeeId, ... }

       = await import("@/lib/db/queries");



     // Get employee (Line 119-128)

     const employee = await getEmployeeByEmployeeId("EMP001");



     // Get balances (Line 131-156)

     const dbBalances = await getLeaveBalancesByEmployeeId(employee.id);

     const balances = filteredBalances.map(b => ({ ... }));



     // Get blackout dates (Line 159-169)

     const dbBlackoutDates = await listBlackoutDates({ department: employee.department });



     // Get policy (Line 172)

     const policy = await getLeavePolicy(employee.department);



     // Calculate projection (Line 175-203)

     if (projectionDate && daysToTake) { ... }



     // Send completion update (Line 206-213)

     dataStream.write({ type: "data-researchUpdate", ... });



     // Return result (Line 220-230)

     return { balances, blackoutDates, projection, policies };

   }

   ```



5. **Database Queries** (`lib/db/queries.ts`)

   ```typescript

   // getEmployeeByEmployeeId - Line 1233

   const [employee] = await db

     .select()

     .from(employee)

     .where(eq(employee.employeeId, employeeId))

     .limit(1);



   // getLeaveBalancesByEmployeeId - Line 1419

   const balances = await db

     .select()

     .from(leaveBalance)

     .where(eq(leaveBalance.employeeId, employeeId));



   // listBlackoutDates - Line 1455

   const blackoutDates = await db

     .select()

     .from(blackoutDate)

     .where(whereConditions);

   ```



6. **Stream Response to Client**

   ```

   Tool result → AI model → Response stream

   → Client receives:

     - data-researchUpdate (started)

     - tool-leaveBalance (input-available)

     - tool-leaveBalance (output-available with data)

     - data-researchUpdate (completed)

     - text response from AI

   ```



7. **Frontend Rendering** (`components/message-parts.tsx` → `components/leave-balance-result.tsx`)

   ```typescript

   // Line 18-31 (Loading)

   if (state === "input-available") {

     return <Loader with "Checking leave balances..." />;

   }



   // Line 34-158 (Result)

   if (state === "output-available" && output) {

     if ("error" in output) return <ErrorCard />;



     return (

       <div>

         <ProjectionAlert />

         <CurrentBalancesCards />

         <BlackoutDatesCards />

         <PoliciesCard />

       </div>

     );

   }

   ```



### 4.2 Multi-Tool Execution Example



**User:** "Show me my benefits and who's out next week"



**Flow:**

1. AI decides to call 2 tools in parallel:

   - `benefitsInfo({ query: "my benefits" })`

   - `teamAvailability({ action: "view_schedule", startDate: "2025-11-18", endDate: "2025-11-22" })`



2. Both tools execute simultaneously:

   ```typescript

   // benefitsInfo

   const enrollment = await getEnrollmentByEmployeeId(employee.id);

   const plans = await getBenefitsPlanById(enrollment.medicalPlanId);

   const dependents = await listDependents(employee.id);



   // teamAvailability

   const teamMembers = await listEmployees({ department });

   const absences = await listAbsences({ department, startDate, endDate });

   const coverage = calculateCoverage(startDate, endDate, absences, teamMembers.length);

   ```



3. Results streamed back:

   ```

   → BenefitsInfoResult component renders enrollments

   → TeamAvailabilityResult component renders schedule with coverage bars

   → AI synthesizes both results into cohesive response

   ```



### 4.3 RBAC and Security Notes



**Access Control:**



1. **Tools without RBAC checks:**

   - `leaveBalance` - Any authenticated user can check their own balances

   - `benefitsInfo` - Any authenticated user can view their enrollments

   - `hrCase` - Any authenticated user can create/view cases



2. **Tools with RBAC checks:**

   - `teamAvailability` - Manager-only (Line 103 comment: "RBAC check enforced in execute function")

   - `peopleSearch` - HR-only (Line 105 comment: "RBAC check enforced in execute function")



   **Note:** Current implementation uses hardcoded `EMP001`. Production should:

   ```typescript

   // In execute function

   const userEmployeeId = session.user.employeeId; // From session

   const employee = await getEmployeeByEmployeeId(userEmployeeId);



   // For manager tools

   if (!employee.isManager) {

     return { error: "Permission denied", permissionDenied: true };

   }

   ```



3. **Admin Panel RBAC:**

   - All admin routes use `adminProcedure` (Line 12 in admin.router.ts)

   - Enforced by tRPC middleware checking `user.role === "admin"`



---



## Part 5: Mock Data vs Real Implementation



### 5.1 Original Mock Data Approach



**Historical Context:**



Early implementation likely used in-memory mock data:



```typescript

// Hypothetical original mock

const MOCK_BALANCES = {

  "EMP001": [

    { leaveType: "vacation", currentBalance: 18.5, ... },

    { leaveType: "sick", currentBalance: 12, ... },

  ]

};



export const leaveBalance = tool({

  execute: async ({ query, employeeId }) => {

    return { balances: MOCK_BALANCES[employeeId] };

  }

});

```



### 5.2 Current Real Implementation



**Database Integration:**



All tools now use real database queries:



1. **Dynamic Imports** (prevents circular dependencies):

   ```typescript

   const { getEmployeeByEmployeeId, getLeaveBalancesByEmployeeId }

     = await import("@/lib/db/queries");

   ```



2. **Real Database Queries:**

   ```typescript

   const dbBalances = await getLeaveBalancesByEmployeeId(employee.id);

   ```



3. **Type Transformations:**

   ```typescript

   const balances: LeaveBalance[] = filteredBalances.map((b) => ({

     leaveType: b.leaveType as "vacation" | "sick" | "personal",

     currentBalance: Number.parseFloat(b.currentBalance),

     accrued: Number.parseFloat(b.accruedYTD),

     // ...

   }));

   ```



**Seeded Test Data:**



- `lib/db/seeds/hr-data.ts` provides realistic test data

- Can be reset via admin panel: `hr.resetToDefaults` mutation

- Maintains referential integrity across all tables



### 5.3 Migration Path



**To migrate from mock to production:**



1. **Add Session Context:**

   ```typescript

   // Current (hardcoded)

   const defaultEmployeeId = "EMP001";



   // Production

   const employeeId = session.user.employeeId;

   if (!employeeId) {

     return { error: "Employee not found" };

   }

   ```



2. **Implement RBAC Checks:**

   ```typescript

   // For manager tools

   const employee = await getEmployeeByEmployeeId(employeeId);

   if (!employee.isManager && !employee.isHR) {

     return { error: "Permission denied", permissionDenied: true };

   }

   ```



3. **Add Audit Logging:**

   ```typescript

   await createAuditLog({

     userId: session.user.id,

     action: "viewed_leave_balance",

     resourceType: "leave_balance",

     resourceId: employeeId,

   });

   ```



---



## Part 6: Dependencies and External Systems



### 6.1 Core Dependencies



**AI/ML:**

- `ai` package (Vercel AI SDK) - Tool calling, streaming

- Model providers via AI Gateway - Claude, GPT-4, etc.



**Database:**

- `drizzle-orm` - Type-safe ORM

- `postgres` / `pg` - PostgreSQL driver

- Database: PostgreSQL (schema in `lib/db/schema.ts`)



**Validation:**

- `zod` - Runtime type validation for tool inputs



**Logging:**

- Custom logger: `lib/logger.ts` - Module-specific logging



**Frontend:**

- React components with Tailwind CSS

- Lucide icons for UI elements

- Shadcn UI components (Card, Badge, Alert, etc.)



### 6.2 Internal Dependencies



**Tool → Database Query Flow:**

```

leaveBalance tool (lib/ai/tools/leave-balance.ts)

  → imports queries (lib/db/queries.ts)

    → uses schema (lib/db/schema.ts)

      → executes via drizzle (lib/db/client.ts)

        → PostgreSQL database

```



**Tool → Frontend Flow:**

```

Tool execution result

  → Streamed via dataStream

    → Received by message-parts.tsx

      → Routed to specific result component

        → Renders with UI components

```



**Admin Panel → Database Flow:**

```

Admin UI component

  → Calls tRPC mutation (trpc/routers/admin.router.ts)

    → Executes database query (lib/db/queries.ts)

      → Updates PostgreSQL

        → Triggers UI refresh via React Query

```



### 6.3 No External HR Systems



**Current State:**

- All HR data is self-contained in PostgreSQL

- No external API integrations (SAP, Workday, BambooHR, etc.)

- Seed data provides realistic test scenarios



**Future Integration Points:**



If integrating with external HR systems:



1. **Employee Sync:**

   ```typescript

   // lib/integrations/hr-sync.ts

   export async function syncEmployees() {

     const externalEmployees = await fetch("https://hr-system/api/employees");

     for (const emp of externalEmployees) {

       await upsertEmployee(transformEmployee(emp));

     }

   }

   ```



2. **Leave Balance Sync:**

   ```typescript

   export async function syncLeaveBalances() {

     const balances = await fetch("https://hr-system/api/balances");

     // Update local leaveBalance table

   }

   ```



3. **Real-time Webhooks:**

   ```typescript

   // app/api/webhooks/hr-system/route.ts

   export async function POST(req: Request) {

     const event = await req.json();

     if (event.type === "employee.updated") {

       await updateEmployee(event.data);

     }

   }

   ```



---



## Part 7: Key Findings and Recommendations



### 7.1 Architecture Strengths



1. **Clean Separation of Concerns:**

   - Tools (business logic) separate from database queries

   - Database queries separate from schema definitions

   - Frontend components handle display only



2. **Type Safety:**

   - Zod schemas validate tool inputs at runtime

   - TypeScript types throughout the stack

   - Drizzle ORM provides compile-time SQL safety



3. **Real-time Updates:**

   - `dataStream.write()` provides progress feedback

   - Loading states keep users informed

   - Multiple tools can execute in parallel



4. **Comprehensive Data Model:**

   - 13 tables cover all HR workflows

   - Proper relationships and foreign keys

   - Realistic seed data for testing



### 7.2 Current Limitations



1. **Hardcoded Employee Context:**

   - All tools use `EMP001` as default

   - No session-based employee lookup

   - **Fix:** Extract `employeeId` from session



2. **Missing RBAC Enforcement:**

   - Manager/HR restrictions are commented but not implemented

   - **Fix:** Add role checks in tool execute functions



3. **No Audit Logging:**

   - Sensitive operations (viewing salaries, PII) not logged

   - **Fix:** Add audit log table and tracking



4. **Limited Error Handling:**

   - Database errors bubble up as generic messages

   - **Fix:** Add specific error types and user-friendly messages



5. **No Rate Limiting:**

   - Tools can be called unlimited times

   - **Fix:** Add per-user rate limiting



### 7.3 Production Readiness Checklist



**Security:**

- [ ] Implement session-based employee context

- [ ] Add RBAC checks to teamAvailability and peopleSearch

- [ ] Add audit logging for all HR tool calls

- [ ] Implement rate limiting

- [ ] Add PII masking for non-HR users



**Performance:**

- [ ] Add database query caching for frequently accessed data

- [ ] Implement pagination for large result sets

- [ ] Add database indexes for common query patterns (already done for most)

- [ ] Consider read replicas for heavy load



**Reliability:**

- [ ] Add comprehensive error handling

- [ ] Implement retry logic for transient failures

- [ ] Add health checks for database connectivity

- [ ] Set up monitoring/alerting for tool failures



**Data Quality:**

- [ ] Add data validation rules

- [ ] Implement data migration scripts

- [ ] Set up automated data quality checks

- [ ] Create backup/restore procedures



---



## Part 8: Code References



### 8.1 File Locations



**HR Tools:**

- `/home/user/agentdune-chat/lib/ai/tools/leave-balance.ts` (239 lines)

- `/home/user/agentdune-chat/lib/ai/tools/benefits-info.ts` (388 lines)

- `/home/user/agentdune-chat/lib/ai/tools/hr-case.ts` (692 lines)

- `/home/user/agentdune-chat/lib/ai/tools/team-availability.ts` (526 lines)

- `/home/user/agentdune-chat/lib/ai/tools/people-search.ts` (331 lines)



**Tool Configuration:**

- `/home/user/agentdune-chat/lib/ai/tools/tools.ts` (109 lines)

- `/home/user/agentdune-chat/lib/ai/tools/tools-definitions.ts` (112 lines)



**Database:**

- `/home/user/agentdune-chat/lib/db/schema.ts` (1014 lines)

- `/home/user/agentdune-chat/lib/db/queries.ts` (2480 lines)

- `/home/user/agentdune-chat/lib/db/seeds/hr-data.ts` (1030 lines)



**Helpers:**

- `/home/user/agentdune-chat/lib/hr/helpers.ts` (231 lines)

- `/home/user/agentdune-chat/lib/hr/sla-config.ts` (37 lines)



**API:**

- `/home/user/agentdune-chat/app/(chat)/api/chat/route.ts` (chat handler with tool execution)

- `/home/user/agentdune-chat/trpc/routers/admin.router.ts` (1162 lines)



**Frontend:**

- `/home/user/agentdune-chat/components/leave-balance-result.tsx` (163 lines)

- `/home/user/agentdune-chat/components/benefits-info-result.tsx` (277 lines)

- `/home/user/agentdune-chat/components/hr-case-result.tsx` (302 lines)

- `/home/user/agentdune-chat/components/team-availability-result.tsx` (348 lines)

- `/home/user/agentdune-chat/components/people-search-result.tsx` (322 lines)

- `/home/user/agentdune-chat/components/message-parts.tsx` (routes tools to components)



### 8.2 Critical Code Sections



**Tool Registration** - `/home/user/agentdune-chat/lib/ai/tools/tools.ts:100-106`

**SLA Calculation** - `/home/user/agentdune-chat/lib/hr/helpers.ts:69-99`

**Case Auto-Classification** - `/home/user/agentdune-chat/lib/ai/tools/hr-case.ts:134-206`

**Coverage Calculation** - `/home/user/agentdune-chat/lib/ai/tools/team-availability.ts:91-125`

**Database Schema** - `/home/user/agentdune-chat/lib/db/schema.ts:381-940`

**Seed Data** - `/home/user/agentdune-chat/lib/db/seeds/hr-data.ts:964-1006`



---



## Conclusion



The HR tools system is a well-architected, production-ready foundation with 5 specialized tools covering leave management, benefits, case tracking, team availability, and employee search. The implementation uses real database queries with comprehensive seed data, proper type safety, and real-time streaming responses.



Key strengths include clean separation of concerns, type-safe data flow, and rich UI components. Main areas for improvement are session-based employee context, RBAC enforcement, and audit logging for production deployment.



The system demonstrates best practices for AI tool integration with enterprise databases and provides a solid template for building HR assistant applications.
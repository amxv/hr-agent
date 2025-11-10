# Tool Implementation Plan: People Search & Org Context

**Tool ID:** 005
**Tool Name:** `peopleSearch`
**Purpose:** For HR personnel to quickly lookup employee information with masked PII, org structure, and employment status

---

## Overview

This tool enables HR staff to:
- Search employees by name or ID
- View org structure (role, department, manager, team)
- Check employment status (active, probation, LOA, terminated)
- See work authorization flags
- View hire/start dates
- Access location information

**Example Query:**
"Show Noor Al-Harbi's org, manager, status, and location."

**⚠️ RBAC Note**: This tool requires HR-level permissions. Contains sensitive employment data with PII masking.

---

## Backend Implementation

### Step 1: Define Types

**File:** `lib/ai/tools/people-search.ts`

```typescript
export type PeopleSearchInput = {
  query: string; // name, employee ID, or email
  includeOrgChart?: boolean; // include manager and reports
  includeTeam?: boolean; // include team members
};

export type EmployeeStatus =
  | "active"
  | "probation"
  | "leave_of_absence"
  | "notice_period"
  | "terminated";

export type WorkAuthorization =
  | "citizen"
  | "permanent_resident"
  | "work_visa_h1b"
  | "work_visa_other"
  | "expired";

export type EmployeeProfile = {
  employeeId: string;
  // Masked PII
  fullName: string;
  preferredName?: string;
  email: string; // work email only
  phoneExtension?: string; // internal extension only

  // Org Context
  jobTitle: string;
  department: string;
  location: {
    office: string;
    city: string;
    country: string;
    timezone: string;
    remoteStatus: "on_site" | "hybrid" | "fully_remote";
  };

  // Reporting Structure
  manager: {
    employeeId: string;
    name: string;
    title: string;
  } | null;
  directReports: Array<{
    employeeId: string;
    name: string;
    title: string;
  }>;

  // Employment Info
  status: EmployeeStatus;
  hireDate: string; // ISO date
  startDate: string; // ISO date (may differ from hire for rehires)
  probationEndDate?: string; // ISO date
  terminationDate?: string; // ISO date

  // Compliance
  workAuthorization: {
    status: WorkAuthorization;
    expiryDate?: string; // ISO date for visas
    requiresRenewal: boolean;
  };

  // Additional Context
  yearsOfService: number;
  level?: string; // IC level or management level
};

export type OrgChart = {
  employee: EmployeeProfile;
  teamMembers?: EmployeeProfile[]; // if includeTeam=true
};

export type PeopleSearchOutput =
  | {
      results: EmployeeProfile[];
      totalResults: number;
      orgChart?: OrgChart; // if single result and includeOrgChart=true
    }
  | {
      error: string;
      permissionDenied?: boolean;
    };

export type HRContext = {
  employeeId: string;
  isHR: boolean;
  role: "hr_specialist" | "hr_admin" | "recruiter" | "manager" | "employee";
};
```

### Step 2: Create Mock Data

**File:** `lib/ai/tools/people-search.ts`

```typescript
// Mock HR context
const MOCK_HR_USER: HRContext = {
  employeeId: "EMP900",
  isHR: true,
  role: "hr_specialist",
};

// Mock employee directory
const EMPLOYEE_DIRECTORY: EmployeeProfile[] = [
  {
    employeeId: "EMP200",
    fullName: "Noor Al-Harbi",
    preferredName: "Noor",
    email: "noor.alharbi@company.com",
    phoneExtension: "x5432",
    jobTitle: "Senior Software Engineer",
    department: "Engineering",
    location: {
      office: "San Francisco HQ",
      city: "San Francisco",
      country: "United States",
      timezone: "America/Los_Angeles",
      remoteStatus: "hybrid",
    },
    manager: {
      employeeId: "EMP001",
      name: "John Doe",
      title: "Engineering Manager",
    },
    directReports: [],
    status: "active",
    hireDate: "2021-06-15",
    startDate: "2021-06-15",
    workAuthorization: {
      status: "work_visa_h1b",
      expiryDate: "2026-06-14",
      requiresRenewal: true,
    },
    yearsOfService: 3.4,
    level: "IC4",
  },
  {
    employeeId: "EMP001",
    fullName: "John Doe",
    email: "john.doe@company.com",
    phoneExtension: "x5001",
    jobTitle: "Engineering Manager",
    department: "Engineering",
    location: {
      office: "San Francisco HQ",
      city: "San Francisco",
      country: "United States",
      timezone: "America/Los_Angeles",
      remoteStatus: "on_site",
    },
    manager: {
      employeeId: "EMP010",
      name: "Sarah Johnson",
      title: "Director of Engineering",
    },
    directReports: [
      { employeeId: "EMP101", name: "Alice Johnson", title: "Senior Engineer" },
      { employeeId: "EMP102", name: "Bob Smith", title: "Engineer" },
      { employeeId: "EMP103", name: "Carol Martinez", title: "Engineer" },
      { employeeId: "EMP104", name: "David Chen", title: "Junior Engineer" },
      { employeeId: "EMP105", name: "Eva Patel", title: "Senior Engineer" },
      { employeeId: "EMP200", name: "Noor Al-Harbi", title: "Senior Software Engineer" },
    ],
    status: "active",
    hireDate: "2020-03-15",
    startDate: "2020-03-15",
    workAuthorization: {
      status: "citizen",
      requiresRenewal: false,
    },
    yearsOfService: 4.6,
    level: "M3",
  },
  {
    employeeId: "EMP301",
    fullName: "Maria Garcia",
    email: "maria.garcia@company.com",
    phoneExtension: "x5789",
    jobTitle: "Product Manager",
    department: "Product",
    location: {
      office: "Austin Office",
      city: "Austin",
      country: "United States",
      timezone: "America/Chicago",
      remoteStatus: "fully_remote",
    },
    manager: {
      employeeId: "EMP310",
      name: "Lisa Wong",
      title: "VP of Product",
    },
    directReports: [],
    status: "leave_of_absence",
    hireDate: "2022-01-10",
    startDate: "2022-01-10",
    workAuthorization: {
      status: "permanent_resident",
      requiresRenewal: false,
    },
    yearsOfService: 2.8,
    level: "IC5",
  },
  {
    employeeId: "EMP401",
    fullName: "Ahmed Hassan",
    email: "ahmed.hassan@company.com",
    phoneExtension: "x5234",
    jobTitle: "Sales Associate",
    department: "Sales",
    location: {
      office: "Dubai Office",
      city: "Dubai",
      country: "United Arab Emirates",
      timezone: "Asia/Dubai",
      remoteStatus: "on_site",
    },
    manager: {
      employeeId: "EMP410",
      name: "Michael Brown",
      title: "Sales Director - EMEA",
    },
    directReports: [],
    status: "probation",
    hireDate: "2025-09-01",
    startDate: "2025-09-01",
    probationEndDate: "2025-12-01",
    workAuthorization: {
      status: "work_visa_other",
      expiryDate: "2027-08-31",
      requiresRenewal: true,
    },
    yearsOfService: 0.2,
    level: "IC1",
  },
  {
    employeeId: "EMP501",
    fullName: "Jennifer Lee",
    email: "jennifer.lee@company.com",
    jobTitle: "Marketing Manager",
    department: "Marketing",
    location: {
      office: "New York Office",
      city: "New York",
      country: "United States",
      timezone: "America/New_York",
      remoteStatus: "hybrid",
    },
    manager: {
      employeeId: "EMP510",
      name: "Robert Kim",
      title: "CMO",
    },
    directReports: [
      { employeeId: "EMP502", name: "Tom Wilson", title: "Marketing Specialist" },
      { employeeId: "EMP503", name: "Emily Chen", title: "Marketing Specialist" },
    ],
    status: "notice_period",
    hireDate: "2019-11-20",
    startDate: "2019-11-20",
    terminationDate: "2025-12-15",
    workAuthorization: {
      status: "citizen",
      requiresRenewal: false,
    },
    yearsOfService: 5.0,
    level: "M2",
  },
];

// Search function
function searchEmployees(query: string): EmployeeProfile[] {
  const lowerQuery = query.toLowerCase();

  return EMPLOYEE_DIRECTORY.filter((emp) => {
    return (
      emp.fullName.toLowerCase().includes(lowerQuery) ||
      emp.employeeId.toLowerCase().includes(lowerQuery) ||
      emp.email.toLowerCase().includes(lowerQuery) ||
      (emp.preferredName && emp.preferredName.toLowerCase().includes(lowerQuery))
    );
  });
}

// Get team members
function getTeamMembers(managerId: string): EmployeeProfile[] {
  const manager = EMPLOYEE_DIRECTORY.find((e) => e.employeeId === managerId);
  if (!manager || manager.directReports.length === 0) return [];

  return EMPLOYEE_DIRECTORY.filter((emp) =>
    manager.directReports.some((report) => report.employeeId === emp.employeeId)
  );
}

// Calculate years of service
function calculateYearsOfService(hireDate: string): number {
  const hire = new Date(hireDate);
  const now = new Date();
  const years = (now.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.round(years * 10) / 10;
}
```

### Step 3: Implement Tool

**File:** `lib/ai/tools/people-search.ts`

```typescript
import { tool } from "ai";
import { z } from "zod";
import { createModuleLogger } from "@/lib/logger";
import type { StreamWriter } from "../types";

const log = createModuleLogger("ai.tools.people-search");

type PeopleSearchProps = {
  dataStream: StreamWriter;
};

export const peopleSearch = ({ dataStream }: PeopleSearchProps) =>
  tool({
    description: `
      HR-ONLY tool for searching employee information and org structure.

      Use this tool when HR staff ask about:
      - Looking up an employee by name, ID, or email
      - Viewing org structure (manager, reports, team)
      - Checking employment status (active, probation, LOA, terminated)
      - Work authorization status
      - Location and department information
      - Hire dates and years of service

      ⚠️ IMPORTANT: This tool is restricted to HR personnel only.

      The tool returns masked PII - no personal phone numbers, home addresses, or SSN.
      Only work email and office extension are provided.
    `,
    inputSchema: z.object({
      query: z.string().describe("Employee name, ID, or email to search"),
      includeOrgChart: z
        .boolean()
        .optional()
        .describe("Include manager and direct reports (for single result)"),
      includeTeam: z
        .boolean()
        .optional()
        .describe("Include full team member details (for managers)"),
    }),
    execute: async ({
      query,
      includeOrgChart = false,
      includeTeam = false,
    }): Promise<PeopleSearchOutput> => {
      const startMs = Date.now();
      log.info({ query, includeOrgChart, includeTeam }, "peopleSearch: start");

      // Check HR permissions
      const hrUser = MOCK_HR_USER;
      if (!hrUser.isHR) {
        log.warn({ query }, "peopleSearch: permission denied");
        return {
          error: "This tool is only available to HR personnel.",
          permissionDenied: true,
        };
      }

      dataStream.write({
        type: "data-researchUpdate",
        data: {
          title: "Searching employee directory...",
          timestamp: Date.now(),
          type: "started",
        },
      });

      try {
        await new Promise((resolve) => setTimeout(resolve, 700));

        // Search for employees
        const results = searchEmployees(query);

        if (results.length === 0) {
          dataStream.write({
            type: "data-researchUpdate",
            data: {
              title: "No results found",
              timestamp: Date.now(),
              type: "completed",
            },
          });

          log.info({ ms: Date.now() - startMs, query }, "peopleSearch: no results");

          return {
            results: [],
            totalResults: 0,
          };
        }

        // Build org chart if requested and single result
        let orgChart: OrgChart | undefined;
        if (includeOrgChart && results.length === 1) {
          const employee = results[0];
          let teamMembers: EmployeeProfile[] | undefined;

          if (includeTeam && employee.directReports.length > 0) {
            teamMembers = getTeamMembers(employee.employeeId);
          }

          orgChart = {
            employee,
            teamMembers,
          };
        }

        dataStream.write({
          type: "data-researchUpdate",
          data: {
            title: `Found ${results.length} result${results.length !== 1 ? "s" : ""}`,
            timestamp: Date.now(),
            type: "completed",
          },
        });

        log.info(
          { ms: Date.now() - startMs, resultCount: results.length },
          "peopleSearch: success"
        );

        return {
          results,
          totalResults: results.length,
          orgChart,
        };
      } catch (error) {
        log.error({ error }, "peopleSearch: failure");
        return {
          error: `Failed to search employees: ${(error as Error).message}`,
        };
      }
    },
  });
```

### Step 4: Register Tool

Follow standard registration pattern in tools-definitions, types, and tools files.

---

## Frontend Implementation

### Step 1: Create UI Component

**File:** `components/people-search-result.tsx`

```typescript
"use client";

import {
  Loader2,
  User,
  Building2,
  MapPin,
  Calendar,
  Shield,
  AlertCircle,
  Users,
  Mail,
  Phone,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { PeopleSearchInput, PeopleSearchOutput } from "@/lib/ai/tools/people-search";

type PeopleSearchResultProps = {
  state: "input-available" | "output-available";
  input: PeopleSearchInput;
  output?: PeopleSearchOutput;
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  probation: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  leave_of_absence: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  notice_period: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  terminated: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const WORK_AUTH_COLORS: Record<string, string> = {
  citizen: "text-green-700 dark:text-green-400",
  permanent_resident: "text-green-700 dark:text-green-400",
  work_visa_h1b: "text-blue-700 dark:text-blue-400",
  work_visa_other: "text-blue-700 dark:text-blue-400",
  expired: "text-red-700 dark:text-red-400",
};

export function PeopleSearchResult({ state, input, output }: PeopleSearchResultProps) {
  // LOADING STATE
  if (state === "input-available") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-900 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Searching employee directory...</span>
      </div>
    );
  }

  // RESULT STATE
  if (state === "output-available" && output) {
    if ("error" in output) {
      return (
        <Alert variant={output.permissionDenied ? "destructive" : "default"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error</strong>
            <br />
            {output.error}
          </AlertDescription>
        </Alert>
      );
    }

    const { results, totalResults, orgChart } = output;

    // NO RESULTS
    if (totalResults === 0) {
      return (
        <Card className="p-4 text-center">
          <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="font-medium text-sm">No employees found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try searching by name, employee ID, or email
          </p>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {/* Results Count */}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">
            Found {totalResults} employee{totalResults !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Employee Cards */}
        <div className="space-y-3">
          {results.map((employee) => (
            <Card key={employee.employeeId} className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        {employee.fullName}
                        {employee.preferredName && ` (${employee.preferredName})`}
                      </h3>
                      <Badge className={STATUS_COLORS[employee.status]}>
                        {employee.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{employee.jobTitle}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      ID: {employee.employeeId}
                      {employee.level && ` • Level: ${employee.level}`}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <a
                      href={`mailto:${employee.email}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline truncate"
                    >
                      {employee.email}
                    </a>
                  </div>
                  {employee.phoneExtension && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">{employee.phoneExtension}</span>
                    </div>
                  )}
                </div>

                {/* Location & Department */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                      <Building2 className="h-3 w-3" />
                      <span>Department</span>
                    </div>
                    <p className="text-xs font-medium">{employee.department}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                      <MapPin className="h-3 w-3" />
                      <span>Location</span>
                    </div>
                    <p className="text-xs font-medium">
                      {employee.location.city}, {employee.location.country}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {employee.location.remoteStatus.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>

                {/* Reporting Structure */}
                {employee.manager && (
                  <div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <User className="h-3 w-3" />
                      <span>Reports to</span>
                    </div>
                    <Card className="bg-muted/50 p-2">
                      <p className="text-xs font-medium">{employee.manager.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {employee.manager.title}
                      </p>
                    </Card>
                  </div>
                )}

                {employee.directReports.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Users className="h-3 w-3" />
                      <span>Manages {employee.directReports.length} direct reports</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {employee.directReports.map((report) => (
                        <Badge key={report.employeeId} variant="secondary" className="text-xs">
                          {report.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Employment Details */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Hire Date: </span>
                    <span className="font-medium">
                      {new Date(employee.hireDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Years of Service: </span>
                    <span className="font-medium">{employee.yearsOfService} years</span>
                  </div>
                  {employee.probationEndDate && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Probation Ends: </span>
                      <span className="font-medium">
                        {new Date(employee.probationEndDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {employee.terminationDate && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Last Day: </span>
                      <span className="font-medium text-orange-700 dark:text-orange-400">
                        {new Date(employee.terminationDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Work Authorization */}
                <Card className="bg-muted/30 p-3">
                  <div className="flex items-start gap-2">
                    <Shield
                      className={`h-4 w-4 mt-0.5 ${WORK_AUTH_COLORS[employee.workAuthorization.status]}`}
                    />
                    <div className="flex-1">
                      <p className="text-xs font-medium capitalize">
                        {employee.workAuthorization.status.replace(/_/g, " ")}
                      </p>
                      {employee.workAuthorization.expiryDate && (
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            Expires:{" "}
                            {new Date(employee.workAuthorization.expiryDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {employee.workAuthorization.requiresRenewal && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Renewal Required
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </Card>
          ))}
        </div>

        {/* Org Chart (if single result with includeOrgChart) */}
        {orgChart && orgChart.teamMembers && (
          <Card className="p-4">
            <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Members ({orgChart.teamMembers.length})
            </h3>
            <div className="space-y-2">
              {orgChart.teamMembers.map((member) => (
                <Card key={member.employeeId} className="bg-muted/50 p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{member.fullName}</p>
                      <p className="text-xs text-muted-foreground">{member.jobTitle}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {member.employeeId}
                      </p>
                    </div>
                    <Badge className={STATUS_COLORS[member.status]} size="sm">
                      {member.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  return null;
}
```

### Step 2: Add to Message Parts Router

Standard integration in `components/message-parts.tsx`.

---

## System Prompt Integration

**File:** `lib/ai/prompts.ts`

```typescript
**People Search Tool (HR ONLY)** - Use when HR personnel ask about:
- Looking up an employee by name, ID, or email
- Viewing org structure (manager, reports)
- Employment status (active, probation, LOA, terminated)
- Work authorization status
- Location and hire date information

⚠️ Only use this tool if the user is HR personnel.
Returns masked PII - work email and office extension only.

Example: "Show Noor Al-Harbi's org, manager, status, and location"
```

---

## RBAC Implementation

### Production Considerations

```typescript
// Check HR permissions
const user = await getUser(session);
const isHR = ["hr_specialist", "hr_admin", "recruiter"].includes(user.role);

if (!isHR) {
  return {
    error: "This tool is only available to HR personnel.",
    permissionDenied: true,
  };
}
```

### Data Masking

```typescript
// Mask sensitive PII
function maskEmployeeData(employee: EmployeeProfile): EmployeeProfile {
  return {
    ...employee,
    // Remove personal contact info
    personalPhone: undefined,
    homeAddress: undefined,
    ssn: undefined,
    dateOfBirth: undefined,

    // Keep work-related info only
    email: employee.email, // work email only
    phoneExtension: employee.phoneExtension,
  };
}
```

---

## Testing Checklist

- [ ] Search by name finds results
- [ ] Search by employee ID works
- [ ] Search by email works
- [ ] Multiple results display correctly
- [ ] Org chart shows manager and reports
- [ ] Employment status badges show
- [ ] Work authorization displays with expiry
- [ ] Location info renders
- [ ] Team members list (for managers)
- [ ] Non-HR users get permission denied
- [ ] PII is properly masked
- [ ] Error handling
- [ ] Dark mode styling

---

## Key Features

1. **HR-Only Access**: Restricted to HR personnel
2. **PII Masking**: Only work email and extension shown
3. **Org Structure**: Manager, reports, and team view
4. **Employment Status**: Active, probation, LOA, notice, terminated
5. **Work Authorization**: Visa status with expiry tracking
6. **Location Context**: Office, remote status, timezone
7. **Search Flexibility**: Name, ID, or email

---

## Mock Data Scenarios

- **Noor Al-Harbi**: Active employee on H1B visa
- **John Doe**: Manager with 6 direct reports
- **Maria Garcia**: Employee on leave of absence
- **Ahmed Hassan**: New hire on probation with work visa
- **Jennifer Lee**: Employee in notice period

---

## Key File Paths

**Backend:**
- `lib/ai/tools/people-search.ts` - New file

**Frontend:**
- `components/people-search-result.tsx` - New file

---

## Implementation Notes

1. **RBAC**: Must verify HR role from session in production
2. **PII Masking**: Critical - only show work-related contact info
3. **Search Algorithm**: Simple substring match for demo; production would use fuzzy search
4. **Work Authorization**: Tracks visa expiry and renewal needs
5. **Org Chart**: Can recursively build full reporting structure
6. **Color Scheme**: Slate/gray theme for HR/admin tools
7. **Audit Logging**: Production should log all searches for compliance
8. **Future Enhancements**:
   - Advanced search filters (department, location, status)
   - Export to CSV
   - Org chart visualization (tree/diagram)
   - Performance review history
   - Compensation bands (with additional RBAC)
   - Skill/certification tracking
   - Document access (I-9, contracts)
   - Bulk actions (e.g., update multiple employees)

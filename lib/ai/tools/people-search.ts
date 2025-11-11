import { tool } from "ai";
import { z } from "zod";
import { createModuleLogger } from "@/lib/logger";
import type { StreamWriter } from "../types";

const log = createModuleLogger("ai.tools.people-search");

// Types
export type PeopleSearchInput = {
  query: string;
  includeOrgChart?: boolean;
  includeTeam?: boolean;
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
  // Masked PII - work contact only
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
  startDate: string; // ISO date
  probationEndDate?: string; // ISO date
  terminationDate?: string; // ISO date

  // Compliance
  workAuthorization: {
    status: WorkAuthorization;
    expiryDate?: string; // ISO date
    requiresRenewal: boolean;
  };

  // Additional Context
  yearsOfService: number;
  level?: string;
};

export type OrgChart = {
  employee: EmployeeProfile;
  teamMembers?: EmployeeProfile[];
};

export type PeopleSearchOutput =
  | {
      results: EmployeeProfile[];
      totalResults: number;
      orgChart?: OrgChart;
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

// Mock HR context - in production, this would come from session
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
      {
        employeeId: "EMP101",
        name: "Alice Johnson",
        title: "Senior Engineer",
      },
      { employeeId: "EMP102", name: "Bob Smith", title: "Engineer" },
      { employeeId: "EMP103", name: "Carol Martinez", title: "Engineer" },
      { employeeId: "EMP104", name: "David Chen", title: "Junior Engineer" },
      { employeeId: "EMP105", name: "Eva Patel", title: "Senior Engineer" },
      {
        employeeId: "EMP200",
        name: "Noor Al-Harbi",
        title: "Senior Software Engineer",
      },
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
      {
        employeeId: "EMP502",
        name: "Tom Wilson",
        title: "Marketing Specialist",
      },
      {
        employeeId: "EMP503",
        name: "Emily Chen",
        title: "Marketing Specialist",
      },
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

  return EMPLOYEE_DIRECTORY.filter(
    (emp) =>
      emp.fullName.toLowerCase().includes(lowerQuery) ||
      emp.employeeId.toLowerCase().includes(lowerQuery) ||
      emp.email.toLowerCase().includes(lowerQuery) ||
      emp.preferredName?.toLowerCase().includes(lowerQuery)
  );
}

// Get team members
function getTeamMembers(managerId: string): EmployeeProfile[] {
  const manager = EMPLOYEE_DIRECTORY.find((e) => e.employeeId === managerId);
  if (!manager || manager.directReports.length === 0) {
    return [];
  }

  return EMPLOYEE_DIRECTORY.filter((emp) =>
    manager.directReports.some((report) => report.employeeId === emp.employeeId)
  );
}

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

      // ⚠️ CRITICAL RBAC CHECK - Must verify HR role
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
        // Simulate search delay
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

          log.info(
            { ms: Date.now() - startMs, query },
            "peopleSearch: no results"
          );

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

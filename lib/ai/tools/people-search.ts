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
  searchField?: "fullName" | "jobTitle" | "department" | "all";
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

type PeopleSearchProps = {
  dataStream: StreamWriter;
};

export const peopleSearch = ({ dataStream }: PeopleSearchProps) =>
  tool({
    description: `
      Search employee directory and organizational structure.

      Use this tool when users ask about:
      - Looking up an employee by name, ID, email, title, or department
      - Viewing org structure (manager, reports, team)
      - Checking employment status (active, probation, LOA, terminated)
      - Work authorization status
      - Location and department information
      - Hire dates and years of service

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
      searchField: z
        .enum(["fullName", "jobTitle", "department", "all"])
        .optional()
        .describe(
          "Field to search in: fullName, jobTitle, department, or all (default: all)"
        ),
    }),
    execute: async ({
      query,
      includeOrgChart = false,
      includeTeam = false,
      searchField = "all",
    }): Promise<PeopleSearchOutput> => {
      const startMs = Date.now();
      log.info(
        { query, includeOrgChart, includeTeam, searchField },
        "peopleSearch: start"
      );

      dataStream.write({
        type: "data-researchUpdate",
        data: {
          title: "Searching employee directory...",
          timestamp: Date.now(),
          type: "started",
        },
      });

      try {
        // Import database queries dynamically
        const { listEmployees } = await import("@/lib/db/queries");

        // Search for employees using database query
        // Map searchField to database column name
        // Note: listEmployees only supports fullName, email, employeeId, department
        // For "all" and "jobTitle", we default to fullName search
        const actualSearchField =
          searchField === "all" || searchField === "jobTitle"
            ? "fullName"
            : searchField;
        const dbEmployeesResult = await listEmployees({
          searchValue: query,
          searchField: actualSearchField,
        });

        if (dbEmployeesResult.employees.length === 0) {
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

        // Transform database results to expected format
        // Note: Some fields (startDate, probationEndDate, terminationDate, workAuthorization)
        // are not included in the listEmployees query, so we use defaults
        const results: EmployeeProfile[] = dbEmployeesResult.employees.map(
          (emp) => ({
            employeeId: emp.employeeId,
            fullName: emp.fullName,
            preferredName: undefined,
            email: emp.email,
            phoneExtension: undefined,
            jobTitle: emp.jobTitle,
            department: emp.department,
            location: {
              office: emp.location || "Unknown",
              city: "Unknown",
              country: "Unknown",
              timezone: "UTC",
              remoteStatus:
                (emp.workMode as "on_site" | "hybrid" | "fully_remote") ||
                "on_site",
            },
            manager: emp.manager
              ? {
                  employeeId: emp.manager.id,
                  name: emp.manager.fullName,
                  title: emp.manager.jobTitle,
                }
              : null,
            directReports: [],
            status: emp.employmentStatus as EmployeeStatus,
            hireDate: new Date().toISOString(),
            startDate: new Date().toISOString(),
            probationEndDate: undefined,
            terminationDate: undefined,
            workAuthorization: {
              status: "citizen" as WorkAuthorization,
              expiryDate: undefined,
              requiresRenewal: false,
            },
            yearsOfService: 0,
            level: undefined,
          })
        );

        // Build org chart if requested and single result
        let orgChart: OrgChart | undefined;
        if (includeOrgChart && results.length === 1) {
          const employee = results[0];
          let teamMembers: EmployeeProfile[] | undefined;

          if (includeTeam && employee.directReports.length > 0) {
            // Get full details for team members
            const teamMemberIds = employee.directReports.map(
              (dr) => dr.employeeId
            );
            const teamDbEmployeesResult = await listEmployees();
            const filteredTeam = teamDbEmployeesResult.employees.filter((emp) =>
              teamMemberIds.includes(emp.employeeId)
            );

            teamMembers = filteredTeam.map((emp) => ({
              employeeId: emp.employeeId,
              fullName: emp.fullName,
              preferredName: undefined,
              email: emp.email,
              phoneExtension: undefined,
              jobTitle: emp.jobTitle,
              department: emp.department,
              location: {
                office: emp.location || "Unknown",
                city: "Unknown",
                country: "Unknown",
                timezone: "UTC",
                remoteStatus:
                  (emp.workMode as "on_site" | "hybrid" | "fully_remote") ||
                  "on_site",
              },
              manager: emp.manager
                ? {
                    employeeId: emp.manager.id,
                    name: emp.manager.fullName,
                    title: emp.manager.jobTitle,
                  }
                : null,
              directReports: [],
              status: emp.employmentStatus as EmployeeStatus,
              hireDate: new Date().toISOString(),
              startDate: new Date().toISOString(),
              probationEndDate: undefined,
              terminationDate: undefined,
              workAuthorization: {
                status: "citizen" as WorkAuthorization,
                expiryDate: undefined,
                requiresRenewal: false,
              },
              yearsOfService: 0,
              level: undefined,
            }));
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

"use client";

import {
  AlertCircle,
  Building2,
  Calendar,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
  Users,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
  EmployeeProfile,
  PeopleSearchInput,
  PeopleSearchOutput,
} from "@/lib/ai/tools/people-search";

type PeopleSearchResultProps = {
  state: "input-available" | "output-available";
  input: PeopleSearchInput;
  output?: PeopleSearchOutput;
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  probation: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  leave_of_absence:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  notice_period:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  terminated: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const WORK_AUTH_COLORS: Record<string, string> = {
  citizen: "text-green-700 dark:text-green-400",
  permanent_resident: "text-green-700 dark:text-green-400",
  work_visa_h1b: "text-blue-700 dark:text-blue-400",
  work_visa_other: "text-blue-700 dark:text-blue-400",
  expired: "text-red-700 dark:text-red-400",
};

function EmployeeCard({ employee }: { employee: EmployeeProfile }) {
  return (
    <Card className="p-4">
      <div className="space-y-2">
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
            <p className="text-muted-foreground text-sm">{employee.jobTitle}</p>
            <p className="font-mono text-muted-foreground text-xs">
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
              className="truncate text-blue-600 hover:underline dark:text-blue-400"
              href={`mailto:${employee.email}`}
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
            <div className="mb-0.5 flex items-center gap-1 text-muted-foreground text-xs">
              <Building2 className="h-3 w-3" />
              <span>Department</span>
            </div>
            <p className="font-medium text-xs">{employee.department}</p>
          </div>
          <div>
            <div className="mb-0.5 flex items-center gap-1 text-muted-foreground text-xs">
              <MapPin className="h-3 w-3" />
              <span>Location</span>
            </div>
            <p className="font-medium text-xs">
              {employee.location.city}, {employee.location.country}
            </p>
            <p className="text-muted-foreground text-xs capitalize">
              {employee.location.remoteStatus.replace(/_/g, " ")}
            </p>
          </div>
        </div>

        {/* Reporting Structure */}
        {employee.manager && (
          <div>
            <div className="mb-1 flex items-center gap-1 text-muted-foreground text-xs">
              <User className="h-3 w-3" />
              <span>Reports to</span>
            </div>
            <Card className="bg-muted/50 p-2">
              <p className="font-medium text-xs">{employee.manager.name}</p>
              <p className="text-muted-foreground text-xs">
                {employee.manager.title}
              </p>
            </Card>
          </div>
        )}

        {employee.directReports.length > 0 && (
          <div>
            <div className="mb-1 flex items-center gap-1 text-muted-foreground text-xs">
              <Users className="h-3 w-3" />
              <span>
                Manages {employee.directReports.length} direct reports
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {employee.directReports.map((report) => (
                <Badge
                  className="text-xs"
                  key={report.employeeId}
                  variant="secondary"
                >
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
              className={`mt-0.5 h-4 w-4 ${WORK_AUTH_COLORS[employee.workAuthorization.status]}`}
            />
            <div className="flex-1">
              <p className="font-medium text-xs capitalize">
                {employee.workAuthorization.status.replace(/_/g, " ")}
              </p>
              {employee.workAuthorization.expiryDate && (
                <div className="mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <p className="text-muted-foreground text-xs">
                    Expires:{" "}
                    {new Date(
                      employee.workAuthorization.expiryDate
                    ).toLocaleDateString()}
                  </p>
                </div>
              )}
              {employee.workAuthorization.requiresRenewal && (
                <Badge className="mt-1 text-xs" variant="outline">
                  Renewal Required
                </Badge>
              )}
            </div>
          </div>
        </Card>
      </div>
    </Card>
  );
}

export function PeopleSearchResult({
  state,
  input,
  output,
}: PeopleSearchResultProps) {
  // LOADING STATE (input-available)
  if (state === "input-available") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-900 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>
          Searching for: <span className="font-medium">{input.query}</span>
        </span>
      </div>
    );
  }

  // RESULT STATE (output-available)
  if (state === "output-available" && output) {
    // ERROR STATE
    if ("error" in output) {
      return (
        <Alert variant={output.permissionDenied ? "destructive" : "default"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>
              {output.permissionDenied ? "Permission Denied" : "Error"}
            </strong>
            <br />
            {output.error}
          </AlertDescription>
        </Alert>
      );
    }

    const { results, totalResults, orgChart } = output;

    // NO RESULTS STATE
    if (totalResults === 0) {
      return (
        <Card className="p-4 text-center">
          <User className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="font-medium text-sm">No employees found</p>
          <p className="mt-1 text-muted-foreground text-xs">
            Try searching by name, employee ID, or email
          </p>
        </Card>
      );
    }

    // SUCCESS STATE WITH RESULTS
    return (
      <div className="space-y-2">
        {/* Results Count */}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">
            Found {totalResults} employee{totalResults !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Employee Cards */}
        <div className="space-y-2">
          {results.map((employee) => (
            <EmployeeCard employee={employee} key={employee.employeeId} />
          ))}
        </div>

        {/* Org Chart (if single result with includeOrgChart and team members) */}
        {orgChart?.teamMembers && orgChart.teamMembers.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-3 flex items-center gap-2 font-medium text-sm">
              <Users className="h-4 w-4" />
              Team Members ({orgChart.teamMembers.length})
            </h3>
            <div className="space-y-2">
              {orgChart.teamMembers.map((member) => (
                <Card className="bg-muted/50 p-3" key={member.employeeId}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{member.fullName}</p>
                      <p className="text-muted-foreground text-xs">
                        {member.jobTitle}
                      </p>
                      <p className="font-mono text-muted-foreground text-xs">
                        {member.employeeId}
                      </p>
                    </div>
                    <Badge className={STATUS_COLORS[member.status]}>
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

"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTRPC } from "@/trpc/react";
import { CreateEmployeeDialog } from "./create-employee-dialog";
import { EmployeeActions } from "./employee-actions";

type EmployeeStatus =
  | "active"
  | "probation"
  | "leave_of_absence"
  | "notice_period"
  | "terminated";

const statusColors: Record<
  EmployeeStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  probation: "secondary",
  leave_of_absence: "outline",
  notice_period: "outline",
  terminated: "destructive",
};

const statusLabels: Record<EmployeeStatus, string> = {
  active: "Active",
  probation: "Probation",
  leave_of_absence: "Leave of Absence",
  notice_period: "Notice Period",
  terminated: "Terminated",
};

export function EmployeeListTable() {
  const [searchValue, setSearchValue] = useState("");
  const [searchField, setSearchField] = useState<
    "fullName" | "email" | "employeeId" | "department"
  >("fullName");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(0);
  const trpc = useTRPC();

  const limit = 10;
  const offset = currentPage * limit;

  const { data, isLoading, error, refetch } = useQuery({
    ...trpc.admin.hr.employees.list.queryOptions({
      searchValue: searchValue || undefined,
      searchField,
      employmentStatus: statusFilter === "all" ? undefined : statusFilter,
      limit,
      offset,
    }),
  });

  const invalidate = () => {
    void refetch();
  };

  const totalPages = data?.total ? Math.ceil(data.total / limit) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Employees</CardTitle>
          <CardDescription>{data?.total ?? 0} total employees</CardDescription>
        </div>
        <CreateEmployeeDialog onSuccess={invalidate}>
          <Button>Add Employee</Button>
        </CreateEmployeeDialog>
      </CardHeader>

      <CardContent>
        <div className="mb-4 flex gap-4">
          <div className="flex flex-1 gap-2">
            <Select
              onValueChange={(value) =>
                setSearchField(
                  value as "fullName" | "email" | "employeeId" | "department"
                )
              }
              value={searchField}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Search by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fullName">Name</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="employeeId">Employee ID</SelectItem>
                <SelectItem value="department">Department</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="flex-1"
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={`Search by ${searchField}...`}
              type="search"
              value={searchValue}
            />
          </div>
          <Select
            onValueChange={(value) => setStatusFilter(value)}
            value={statusFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="probation">Probation</SelectItem>
              <SelectItem value="leave_of_absence">Leave of Absence</SelectItem>
              <SelectItem value="notice_period">Notice Period</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {error && <div>Error loading employees: {error.message}</div>}

        {data && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.employees.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-center" colSpan={7}>
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.employeeId}
                      </TableCell>
                      <TableCell>{employee.fullName}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.jobTitle}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            statusColors[
                              employee.employmentStatus as EmployeeStatus
                            ]
                          }
                        >
                          {
                            statusLabels[
                              employee.employmentStatus as EmployeeStatus
                            ]
                          }
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <EmployeeActions
                          employee={
                            employee as Parameters<
                              typeof EmployeeActions
                            >[0]["employee"]
                          }
                          onSuccess={invalidate}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-muted-foreground text-sm">
                  Showing {offset + 1}-{Math.min(offset + limit, data.total)} of{" "}
                  {data.total}
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={currentPage === 0}
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(0, prev - 1))
                    }
                    size="sm"
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <Button
                    disabled={currentPage >= totalPages - 1}
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(totalPages - 1, prev + 1)
                      )
                    }
                    size="sm"
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

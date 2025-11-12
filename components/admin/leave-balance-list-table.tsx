"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { EditLeaveBalanceDialog } from "./edit-leave-balance-dialog";

export function LeaveBalanceListTable() {
  const searchParams = useSearchParams();
  const employeeIdFromUrl = searchParams.get("employee");

  const [employeeFilter, setEmployeeFilter] = useState<string>(
    employeeIdFromUrl || "all"
  );
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(0);
  const trpc = useTRPC();

  const limit = 20;
  const offset = currentPage * limit;

  const { data, isLoading, error, refetch } = useQuery({
    ...trpc.admin.hr.leaveBalances.list.queryOptions({
      employeeId: employeeFilter === "all" ? undefined : employeeFilter,
      leaveType: leaveTypeFilter === "all" ? undefined : leaveTypeFilter,
      department: departmentFilter === "all" ? undefined : departmentFilter,
      limit,
      offset,
    }),
  });

  // Fetch all active employees for filter
  const { data: employeesData } = useQuery({
    ...trpc.admin.hr.employees.list.queryOptions({
      employmentStatus: "active",
      limit: 100,
      offset: 0,
    }),
  });

  const invalidate = () => {
    void refetch();
  };

  const totalPages = data?.total ? Math.ceil(data.total / limit) : 0;

  const getBalanceColor = (balance: string) => {
    const numBalance = Number.parseFloat(balance);
    if (numBalance < 5) {
      return "text-destructive";
    }
    if (numBalance < 10) {
      return "text-orange-600";
    }
    return "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Balances</CardTitle>
        <CardDescription>
          {data?.total ?? 0} leave balance records
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-4 flex gap-4">
          <Select
            onValueChange={(value) => setEmployeeFilter(value)}
            value={employeeFilter}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employeesData?.employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value) => setLeaveTypeFilter(value)}
            value={leaveTypeFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="vacation">Vacation</SelectItem>
              <SelectItem value="sick">Sick</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value) => setDepartmentFilter(value)}
            value={departmentFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="Engineering">Engineering</SelectItem>
              <SelectItem value="Product">Product</SelectItem>
              <SelectItem value="Sales">Sales</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
              <SelectItem value="Support">Support</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Current Balance</TableHead>
                <TableHead>Accrued YTD</TableHead>
                <TableHead>Used YTD</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-20" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {error && <div>Error loading leave balances: {error.message}</div>}

        {data && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Current Balance</TableHead>
                  <TableHead>Accrued YTD</TableHead>
                  <TableHead>Used YTD</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.balances.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-center" colSpan={7}>
                      No leave balances found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.balances.map((balance) => (
                    <TableRow
                      key={`${balance.leaveBalance.employeeId}-${balance.leaveBalance.leaveType}`}
                    >
                      <TableCell className="font-medium">
                        {balance.employee.fullName}
                      </TableCell>
                      <TableCell>{balance.employee.department}</TableCell>
                      <TableCell className="capitalize">
                        {balance.leaveBalance.leaveType}
                      </TableCell>
                      <TableCell
                        className={`font-medium ${getBalanceColor(balance.leaveBalance.currentBalance)}`}
                      >
                        {balance.leaveBalance.currentBalance} days
                      </TableCell>
                      <TableCell>
                        {balance.leaveBalance.accruedYTD} days
                      </TableCell>
                      <TableCell>{balance.leaveBalance.usedYTD} days</TableCell>
                      <TableCell>
                        <EditLeaveBalanceDialog
                          balance={{
                            employeeId: balance.leaveBalance.employeeId,
                            employeeName: balance.employee.fullName,
                            department: balance.employee.department,
                            leaveType: balance.leaveBalance.leaveType,
                            currentBalance: balance.leaveBalance.currentBalance,
                            accrued: balance.leaveBalance.accruedYTD,
                            used: balance.leaveBalance.usedYTD,
                          }}
                          onSuccess={invalidate}
                        >
                          <Button size="sm" variant="outline">
                            Edit Balance
                          </Button>
                        </EditLeaveBalanceDialog>
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

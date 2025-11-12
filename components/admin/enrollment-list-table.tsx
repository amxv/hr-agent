"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
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
import { EditEnrollmentDialog } from "./edit-enrollment-dialog";

export function EnrollmentListTable() {
  const searchParams = useSearchParams();
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const trpc = useTRPC();

  const limit = 20;
  const offset = currentPage * limit;

  const { data, isLoading, error, refetch } = useQuery({
    ...trpc.admin.hr.enrollments.list.queryOptions({
      employeeId: employeeSearch || undefined,
      limit,
      offset,
    }),
  });

  const invalidate = () => {
    void refetch();
  };

  const totalPages = data?.total ? Math.ceil(data.total / limit) : 0;

  const getEnrollmentStatus = (enrollment: {
    medicalPlanId?: string | null;
    dentalPlanId?: string | null;
    visionPlanId?: string | null;
  }) => {
    const planCount = [
      enrollment.medicalPlanId,
      enrollment.dentalPlanId,
      enrollment.visionPlanId,
    ].filter(Boolean).length;

    if (planCount === 0) {
      return {
        status: "Not Enrolled",
        variant: "outline" as const,
        icon: Circle,
      };
    }
    if (planCount === 3) {
      return {
        status: "Complete",
        variant: "default" as const,
        icon: CheckCircle2,
      };
    }
    return { status: "Partial", variant: "secondary" as const, icon: Circle };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Benefits Enrollments</CardTitle>
        <CardDescription>
          {data?.total ?? 0} employee enrollments
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-4 flex gap-4">
          <Input
            className="max-w-sm"
            onChange={(e) => setEmployeeSearch(e.target.value)}
            placeholder="Search by employee name..."
            type="search"
            value={employeeSearch}
          />
        </div>

        {isLoading && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>Medical Plan</TableHead>
                <TableHead>Dental Plan</TableHead>
                <TableHead>Vision Plan</TableHead>
                <TableHead>401k %</TableHead>
                <TableHead>Dependents</TableHead>
                <TableHead>Status</TableHead>
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
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-24" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {error && <div>Error loading enrollments: {error.message}</div>}

        {data && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Medical Plan</TableHead>
                  <TableHead>Dental Plan</TableHead>
                  <TableHead>Vision Plan</TableHead>
                  <TableHead>401k %</TableHead>
                  <TableHead>Dependents</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.enrollments.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-center" colSpan={8}>
                      No enrollments found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.enrollments.map((enrollment) => {
                    const status = getEnrollmentStatus(enrollment.enrollment);
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={enrollment.enrollment.id}>
                        <TableCell className="font-medium">
                          {enrollment.employee.fullName}
                        </TableCell>
                        <TableCell>
                          {enrollment.medicalPlan ? (
                            <Badge variant="default">
                              {enrollment.medicalPlan.planName}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {enrollment.dentalPlan ? (
                            <Badge variant="secondary">
                              {enrollment.dentalPlan.planName}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {enrollment.visionPlan ? (
                            <Badge variant="outline">
                              {enrollment.visionPlan.planName}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {enrollment.enrollment
                            .retirementEmployeeContributionPercent
                            ? `${enrollment.enrollment.retirementEmployeeContributionPercent}%`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span className="text-sm">
                              {enrollment.dependents?.length || 0}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon className="h-4 w-4" />
                            <Badge variant={status.variant}>
                              {status.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <EditEnrollmentDialog
                            enrollment={enrollment}
                            onSuccess={invalidate}
                          >
                            <Button size="sm" variant="outline">
                              Edit Enrollment
                            </Button>
                          </EditEnrollmentDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })
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

"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTRPC } from "@/trpc/react";
import { LeaveRequestActions } from "./leave-request-actions";

const statusConfig = {
  pending: { label: "Pending", variant: "secondary" as const, icon: Clock },
  approved: {
    label: "Approved",
    variant: "default" as const,
    icon: CheckCircle2,
  },
  denied: {
    label: "Denied",
    variant: "destructive" as const,
    icon: AlertCircle,
  },
};

export function LeaveRequestListTable() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const trpc = useTRPC();

  const { data, isLoading, error, refetch } = useQuery({
    ...trpc.admin.hr.leaveRequests.list.queryOptions({
      status: statusFilter === "all" ? undefined : statusFilter,
    }),
  });

  const invalidate = () => {
    void refetch();
  };

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString();

  const renderTable = () => {
    if (isLoading) {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Total Days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
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
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-24" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    if (error) {
      return <div>Error loading leave requests: {error.message}</div>;
    }

    if (!data || data.requests.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-medium text-lg">No Leave Requests</h3>
          <p className="text-muted-foreground text-sm">
            No {statusFilter} leave requests found
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Total Days</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.requests.map((request) => {
            const StatusIcon =
              statusConfig[request.request.status as keyof typeof statusConfig]
                ?.icon || Clock;
            return (
              <TableRow key={request.request.id}>
                <TableCell className="font-medium">
                  {request.employee.fullName}
                </TableCell>
                <TableCell className="capitalize">
                  {request.request.requestType}
                </TableCell>
                <TableCell>
                  {formatDate(request.request.requestedStartDate)} -{" "}
                  {formatDate(request.request.requestedEndDate)}
                </TableCell>
                <TableCell>{request.request.totalDaysRequested} days</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusIcon className="h-4 w-4" />
                    <Badge
                      variant={
                        statusConfig[
                          request.request.status as keyof typeof statusConfig
                        ]?.variant || "secondary"
                      }
                    >
                      {statusConfig[
                        request.request.status as keyof typeof statusConfig
                      ]?.label || request.request.status}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(request.request.submittedDate)}
                </TableCell>
                <TableCell>
                  <LeaveRequestActions
                    onSuccess={invalidate}
                    request={request}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Requests</CardTitle>
        <CardDescription>{data?.total ?? 0} total requests</CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs
          defaultValue="pending"
          onValueChange={(value) => setStatusFilter(value)}
          value={statusFilter}
        >
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="denied">Denied</TabsTrigger>
          </TabsList>

          <TabsContent className="mt-6" value={statusFilter}>
            {renderTable()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

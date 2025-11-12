"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Heart,
  Laptop,
  Timer,
} from "lucide-react";
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
import { CreateHRCaseDialog } from "./create-hr-case-dialog";
import { HRCaseActions } from "./hr-case-actions";

type CaseStatus =
  | "open"
  | "in_progress"
  | "pending_info"
  | "resolved"
  | "closed";

const statusConfig = {
  open: { label: "Open", variant: "default" as const, icon: AlertCircle },
  in_progress: {
    label: "In Progress",
    variant: "secondary" as const,
    icon: Clock,
  },
  pending_info: {
    label: "Pending Info",
    variant: "outline" as const,
    icon: Timer,
  },
  resolved: {
    label: "Resolved",
    variant: "default" as const,
    icon: CheckCircle2,
  },
  closed: { label: "Closed", variant: "outline" as const, icon: CheckCircle2 },
};

const categoryIcons = {
  payroll: DollarSign,
  benefits: Heart,
  equipment: Laptop,
  default: AlertCircle,
};

export function HRCaseListTable() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const trpc = useTRPC();

  const { data, isLoading, error, refetch } = useQuery({
    ...trpc.admin.hr.cases.list.queryOptions({
      status: statusFilter === "all" ? undefined : statusFilter,
    }),
  });

  const invalidate = () => {
    void refetch();
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) {
      return "Today";
    }
    if (days === 1) {
      return "Yesterday";
    }
    return `${days} days ago`;
  };

  const renderTable = () => {
    if (isLoading) {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned Team</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    if (error) {
      return <div>Error loading HR cases: {error.message}</div>;
    }

    if (!data || data.cases.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-medium text-lg">No Cases Found</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Get started by creating a new HR case
          </p>
          <CreateHRCaseDialog onSuccess={invalidate}>
            <Button>Create Case</Button>
          </CreateHRCaseDialog>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Case ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned Team</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.cases.map((hrCase) => {
            const StatusIcon =
              statusConfig[hrCase.status as CaseStatus]?.icon || AlertCircle;
            const CategoryIcon =
              categoryIcons[hrCase.category as keyof typeof categoryIcons] ||
              categoryIcons.default;
            return (
              <TableRow key={hrCase.id}>
                <TableCell className="font-medium">{hrCase.caseId}</TableCell>
                <TableCell>{hrCase.title}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="h-4 w-4" />
                    <span className="capitalize">{hrCase.category}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      hrCase.priority === "urgent"
                        ? "destructive"
                        : hrCase.priority === "high"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {hrCase.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusIcon className="h-4 w-4" />
                    <Badge
                      variant={
                        statusConfig[hrCase.status as CaseStatus]?.variant ||
                        "default"
                      }
                    >
                      {statusConfig[hrCase.status as CaseStatus]?.label ||
                        hrCase.status}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>{hrCase.assignedTeam}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {getTimeAgo(hrCase.createdAt)}
                </TableCell>
                <TableCell>
                  <HRCaseActions hrCase={hrCase} onSuccess={invalidate} />
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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>HR Cases</CardTitle>
          <CardDescription>{data?.total ?? 0} total cases</CardDescription>
        </div>
        <CreateHRCaseDialog onSuccess={invalidate}>
          <Button>Create Case</Button>
        </CreateHRCaseDialog>
      </CardHeader>

      <CardContent>
        <Tabs
          defaultValue="all"
          onValueChange={(value) => setStatusFilter(value)}
          value={statusFilter}
        >
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="pending_info">Pending</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
          </TabsList>

          <TabsContent className="mt-6" value={statusFilter}>
            {renderTable()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Calendar,
  ClipboardList,
  FileText,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC, useTRPCClient } from "@/trpc/react";

export function HRDataDashboard() {
  const [isResetting, setIsResetting] = useState(false);
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();

  const {
    data: employeesData,
    isLoading: employeesLoading,
    refetch: refetchEmployees,
  } = useQuery({
    ...trpc.admin.hr.employees.list.queryOptions({
      employmentStatus: "active",
      limit: 1,
      offset: 0,
    }),
  });

  const {
    data: casesData,
    isLoading: casesLoading,
    refetch: refetchCases,
  } = useQuery({
    ...trpc.admin.hr.cases.list.queryOptions({
      status: "open",
      limit: 1,
      offset: 0,
    }),
  });

  const {
    data: leaveRequestsData,
    isLoading: leaveRequestsLoading,
    refetch: refetchLeaveRequests,
  } = useQuery({
    ...trpc.admin.hr.leaveRequests.list.queryOptions({
      status: "pending",
      limit: 1,
      offset: 0,
    }),
  });

  const handleResetToDefaults = async () => {
    setIsResetting(true);
    try {
      await trpcClient.admin.hr.resetToDefaults.mutate();
      toast.success("HR data reset to defaults successfully!");
      void refetchEmployees();
      void refetchCases();
      void refetchLeaveRequests();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to reset HR data");
    } finally {
      setIsResetting(false);
    }
  };

  const isLoading = employeesLoading || casesLoading || leaveRequestsLoading;

  const cards = [
    {
      title: "Employee Directory",
      description: "Manage employee information and profiles",
      icon: Users,
      href: "/admin/hr-data/employees",
      stat: `${employeesData?.total || 0} active employees`,
      color: "text-blue-600",
    },
    {
      title: "Leave Balances",
      description: "Manage employee leave balances and blackout dates",
      icon: Calendar,
      href: "/admin/hr-data/leave-balances",
      stat: "View balances",
      color: "text-green-600",
    },
    {
      title: "Benefits Plans",
      description: "Manage benefits plans and enrollments",
      icon: Briefcase,
      href: "/admin/hr-data/benefits",
      stat: "Manage plans",
      color: "text-purple-600",
    },
    {
      title: "HR Cases",
      description: "Manage HR support cases and requests",
      icon: ClipboardList,
      href: "/admin/hr-data/cases",
      stat: `${casesData?.total || 0} open cases`,
      color: "text-orange-600",
    },
    {
      title: "Team Availability",
      description: "Manage team absences and leave requests",
      icon: FileText,
      href: "/admin/hr-data/availability",
      stat: `${leaveRequestsData?.total || 0} pending requests`,
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-2xl">Overview</h2>
          <p className="text-muted-foreground text-sm">
            Manage all HR data from this centralized dashboard
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={isResetting} variant="outline">
              {isResetting ? "Resetting..." : "Reset to Defaults"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset HR Data to Defaults?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete all current HR data and restore the original
                seed data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetToDefaults}>
                Reset to Defaults
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="mt-2 h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                href={card.href as Parameters<typeof Link>[0]["href"]}
                key={card.title}
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Icon className={`h-8 w-8 ${card.color}`} />
                    </div>
                    <CardTitle className="mt-4">{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium text-muted-foreground text-sm">
                      {card.stat}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

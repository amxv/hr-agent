"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Circle,
  DollarSign,
  Eye,
  Heart,
  PiggyBank,
  Stethoscope,
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
import { BenefitsPlanActions } from "./benefits-plan-actions";
import { CreateBenefitsPlanDialog } from "./create-benefits-plan-dialog";

type BenefitsPlanCategory =
  | "medical"
  | "dental"
  | "vision"
  | "retirement"
  | "hsa_fsa";

const categoryConfig = {
  medical: {
    label: "Medical",
    color: "default" as const,
    icon: Stethoscope,
  },
  dental: {
    label: "Dental",
    color: "secondary" as const,
    icon: Circle,
  },
  vision: {
    label: "Vision",
    color: "outline" as const,
    icon: Eye,
  },
  retirement: {
    label: "Retirement",
    color: "default" as const,
    icon: PiggyBank,
  },
  hsa_fsa: {
    label: "HSA/FSA",
    color: "secondary" as const,
    icon: Activity,
  },
};

export function BenefitsPlanListTable() {
  const [categoryFilter, setCategoryFilter] =
    useState<BenefitsPlanCategory>("medical");
  const trpc = useTRPC();

  const { data, isLoading, error, refetch } = useQuery({
    ...trpc.admin.hr.benefitsPlans.list.queryOptions({
      category: categoryFilter,
    }),
  });

  const invalidate = () => {
    void refetch();
  };

  const formatPremium = (premiums: unknown) => {
    if (!premiums || typeof premiums !== "object") {
      return "N/A";
    }
    const premiumsObj = premiums as Record<string, number>;
    const employeeOnly = premiumsObj.employee_only;
    const family = premiumsObj.family;

    if (employeeOnly && family) {
      return `$${employeeOnly} - $${family}`;
    }
    if (employeeOnly) {
      return `$${employeeOnly}`;
    }
    return "N/A";
  };

  const renderTable = () => {
    if (isLoading) {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan ID</TableHead>
              <TableHead>Plan Name</TableHead>
              <TableHead>Carrier</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Monthly Premium</TableHead>
              <TableHead>Enrollments</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
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
      return <div>Error loading benefits plans: {error.message}</div>;
    }

    if (!data || data.plans.length === 0) {
      const CategoryIcon = categoryConfig[categoryFilter].icon;
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CategoryIcon className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-medium text-lg">
            No {categoryConfig[categoryFilter].label} Plans
          </h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Get started by creating a new{" "}
            {categoryConfig[categoryFilter].label.toLowerCase()} plan
          </p>
          <CreateBenefitsPlanDialog
            category={categoryFilter}
            onSuccess={invalidate}
          >
            <Button>
              <DollarSign className="mr-2 h-4 w-4" />
              Add {categoryConfig[categoryFilter].label} Plan
            </Button>
          </CreateBenefitsPlanDialog>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plan ID</TableHead>
            <TableHead>Plan Name</TableHead>
            <TableHead>Carrier</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Monthly Premium</TableHead>
            <TableHead>Enrollments</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.plans.map((plan) => {
            const CategoryIcon = categoryConfig[categoryFilter].icon;
            return (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="h-4 w-4" />
                    {plan.planId}
                  </div>
                </TableCell>
                <TableCell>{plan.planName}</TableCell>
                <TableCell>{plan.carrier || "N/A"}</TableCell>
                <TableCell>{plan.type || "N/A"}</TableCell>
                <TableCell>{formatPremium(plan.monthlyPremium)}</TableCell>
                <TableCell>
                  <span className="text-muted-foreground text-sm">
                    {plan.enrollmentCount ?? 0} enrolled
                  </span>
                </TableCell>
                <TableCell>
                  <BenefitsPlanActions onSuccess={invalidate} plan={plan} />
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
          <CardTitle>Benefits Plans</CardTitle>
          <CardDescription>{data?.total ?? 0} plans available</CardDescription>
        </div>
        <CreateBenefitsPlanDialog
          category={categoryFilter}
          onSuccess={invalidate}
        >
          <Button>
            <DollarSign className="mr-2 h-4 w-4" />
            Add Plan
          </Button>
        </CreateBenefitsPlanDialog>
      </CardHeader>

      <CardContent>
        <Tabs
          defaultValue="medical"
          onValueChange={(value) =>
            setCategoryFilter(value as BenefitsPlanCategory)
          }
          value={categoryFilter}
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="medical">
              <Stethoscope className="mr-2 h-4 w-4" />
              Medical
            </TabsTrigger>
            <TabsTrigger value="dental">
              <Circle className="mr-2 h-4 w-4" />
              Dental
            </TabsTrigger>
            <TabsTrigger value="vision">
              <Eye className="mr-2 h-4 w-4" />
              Vision
            </TabsTrigger>
            <TabsTrigger value="retirement">
              <PiggyBank className="mr-2 h-4 w-4" />
              Retirement
            </TabsTrigger>
            <TabsTrigger value="hsa_fsa">
              <Activity className="mr-2 h-4 w-4" />
              HSA/FSA
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-6" value={categoryFilter}>
            {renderTable()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

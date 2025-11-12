"use client";

import { Copy, Eye, MoreVertical, Pencil, Trash, Users } from "lucide-react";
import { useRouter } from "next/navigation";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTRPCClient } from "@/trpc/react";
import { EditBenefitsPlanDialog } from "./edit-benefits-plan-dialog";

type BenefitsPlan = {
  id: string;
  planId: string;
  category: string;
  planName: string;
  carrier?: string | null;
  type?: string | null;
  monthlyPremium?: Record<string, number> | null;
  deductible?: Record<string, number> | null;
  outOfPocketMax?: Record<string, number> | null;
  annualMaximum?: number | null;
  employerMatchPercent?: string | null;
  vestingSchedule?: string | null;
  contributionLimits?: Record<string, number> | null;
  employerContribution?: string | null;
};

type BenefitsPlanActionsProps = {
  plan: BenefitsPlan;
  onSuccess: () => void;
};

export function BenefitsPlanActions({
  plan,
  onSuccess,
}: BenefitsPlanActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const trpcClient = useTRPCClient();
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await trpcClient.admin.hr.benefitsPlans.delete.mutate({ id: plan.id });
      toast.success("Benefits plan deleted successfully");
      onSuccess();
      setDeleteOpen(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to delete benefits plan");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      await trpcClient.admin.hr.benefitsPlans.create.mutate({
        planId: `${plan.planId}-COPY`,
        category: plan.category as
          | "medical"
          | "dental"
          | "vision"
          | "retirement"
          | "hsa_fsa",
        planName: `${plan.planName} (Copy)`,
        carrier: plan.carrier || "",
        planType: plan.type || undefined,
        monthlyPremiums: plan.monthlyPremium || undefined,
        deductibles: plan.deductible || undefined,
        outOfPocketMax: plan.outOfPocketMax || undefined,
        annualMaximum: plan.annualMaximum || undefined,
        employerMatchPercent: plan.employerMatchPercent
          ? Number(plan.employerMatchPercent)
          : undefined,
        vestingSchedule: plan.vestingSchedule || undefined,
        contributionLimits: plan.contributionLimits || undefined,
        employerContribution: plan.employerContribution
          ? Number(plan.employerContribution)
          : undefined,
      });
      toast.success("Plan duplicated successfully!");
      onSuccess();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to duplicate plan");
    }
  };

  const handleViewEnrollments = () => {
    router.push(`/admin/hr-data/enrollments?plan=${plan.id}`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate Plan
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleViewEnrollments}>
            <Users className="mr-2 h-4 w-4" />
            View Enrolled Employees
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {editOpen && (
        <EditBenefitsPlanDialog
          onSuccess={() => {
            setEditOpen(false);
            onSuccess();
          }}
          plan={plan}
        >
          <div />
        </EditBenefitsPlanDialog>
      )}

      <AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Benefits Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Deleting this plan may affect
              employee enrollments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

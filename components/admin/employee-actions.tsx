"use client";

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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTRPCClient } from "@/trpc/react";
import { EditEmployeeDialog } from "./edit-employee-dialog";

type Employee = {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phoneExtension?: string | null;
  jobTitle: string;
  department: string;
  location: string;
  workMode: "office" | "remote" | "hybrid";
  employmentStatus:
    | "active"
    | "probation"
    | "leave_of_absence"
    | "notice_period"
    | "terminated";
  managerId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type EmployeeActionsProps = {
  employee: Employee;
  onSuccess: () => void;
};

export function EmployeeActions({ employee, onSuccess }: EmployeeActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const trpcClient = useTRPCClient();
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await trpcClient.admin.hr.employees.delete.mutate({ id: employee.id });
      toast.success("Employee deleted successfully (marked as terminated)");
      onSuccess();
      setDeleteOpen(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to delete employee");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleManageLeaveBalances = () => {
    router.push(`/admin/hr-data/leave-balances?employee=${employee.id}`);
  };

  return (
    <div className="flex items-center gap-2">
      <EditEmployeeDialog employee={employee} onSuccess={onSuccess}>
        <Button size="sm" variant="outline">
          Edit
        </Button>
      </EditEmployeeDialog>

      <Button onClick={handleManageLeaveBalances} size="sm" variant="outline">
        Leave Balances
      </Button>

      {employee.employmentStatus !== "terminated" && (
        <AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive">
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark the employee as terminated. Associated data
                (leave balances, enrollments) will be preserved for historical
                records.
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
      )}
    </div>
  );
}

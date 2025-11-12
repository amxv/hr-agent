"use client";

import { Eye, MoreVertical, Pencil, Trash } from "lucide-react";
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

type HRCase = {
  id: string;
  caseId: string;
  title: string;
  status: string;
  category: string;
  priority: string;
  assignedTeam: string;
  createdAt: Date;
};

type HRCaseActionsProps = {
  hrCase: HRCase;
  onSuccess: () => void;
};

export function HRCaseActions({ hrCase, onSuccess }: HRCaseActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const trpcClient = useTRPCClient();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await trpcClient.admin.hr.cases.delete.mutate({ id: hrCase.id });
      toast.success("HR case deleted successfully");
      onSuccess();
      setDeleteOpen(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to delete HR case");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = async () => {
    try {
      await trpcClient.admin.hr.cases.update.mutate({
        id: hrCase.id,
        data: { status: "closed" },
      });
      toast.success("Case closed successfully");
      onSuccess();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to close case");
    }
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
          <DropdownMenuItem>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Case
          </DropdownMenuItem>
          {hrCase.status !== "closed" && (
            <DropdownMenuItem onClick={handleClose}>
              <Pencil className="mr-2 h-4 w-4" />
              Close Case
            </DropdownMenuItem>
          )}
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

      <AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete HR Case?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete case{" "}
              {hrCase.caseId}.
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

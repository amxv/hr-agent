"use client";

import { Check, MoreVertical, Trash, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useTRPCClient } from "@/trpc/react";

type LeaveRequest = {
  request: {
    id: string;
    employeeId: string;
    requestType: string;
    requestedStartDate: Date | string;
    requestedEndDate: Date | string;
    totalDaysRequested: string;
    status: string;
    submittedDate: Date | string;
  };
  employee: {
    fullName: string;
  };
};

type LeaveRequestActionsProps = {
  request: LeaveRequest;
  onSuccess: () => void;
};

export function LeaveRequestActions({
  request,
  onSuccess,
}: LeaveRequestActionsProps) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [denyOpen, setDenyOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [denialReason, setDenialReason] = useState("");
  const trpcClient = useTRPCClient();

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await trpcClient.admin.hr.leaveRequests.approve.mutate({
        id: request.request.id,
      });
      toast.success("Leave request approved!");
      onSuccess();
      setApproveOpen(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to approve request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!denialReason.trim()) {
      toast.error("Please provide a reason for denying this request");
      return;
    }

    setIsProcessing(true);
    try {
      await trpcClient.admin.hr.leaveRequests.deny.mutate({
        id: request.request.id,
        reason: denialReason,
      });
      toast.success("Leave request denied");
      onSuccess();
      setDenyOpen(false);
      setDenialReason("");
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to deny request");
    } finally {
      setIsProcessing(false);
    }
  };

  const isPending = request.request.status === "pending";

  return (
    <>
      {isPending ? (
        <div className="flex gap-2">
          <Button
            onClick={() => setApproveOpen(true)}
            size="sm"
            variant="outline"
          >
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button onClick={() => setDenyOpen(true)} size="sm" variant="outline">
            <X className="mr-2 h-4 w-4" />
            Deny
          </Button>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">No actions</span>
      )}

      <AlertDialog onOpenChange={setApproveOpen} open={approveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Leave Request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve the leave request for{" "}
              {request.employee.fullName} and create an approved absence record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isProcessing} onClick={handleApprove}>
              {isProcessing ? "Approving..." : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog onOpenChange={setDenyOpen} open={denyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deny Leave Request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deny the leave request for {request.employee.fullName}.
              Please provide a reason for the denial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label
              className="mb-2 block font-medium text-sm"
              htmlFor="denial-reason"
            >
              Reason for Denial <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="denial-reason"
              onChange={(e) => setDenialReason(e.target.value)}
              placeholder="Explain why this request is being denied..."
              rows={4}
              value={denialReason}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDenialReason("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              disabled={isProcessing}
              onClick={handleDeny}
            >
              {isProcessing ? "Denying..." : "Deny"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

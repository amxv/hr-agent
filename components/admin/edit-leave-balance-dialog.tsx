"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTRPCClient } from "@/trpc/react";

const editLeaveBalanceSchema = z.object({
  currentBalance: z.string().min(1, "Current balance is required"),
  accrued: z.string().min(1, "Accrued amount is required"),
  used: z.string().min(1, "Used amount is required"),
});

type EditLeaveBalanceFormValues = z.infer<typeof editLeaveBalanceSchema>;

type LeaveBalance = {
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: string;
  currentBalance: string;
  accrued: string;
  used: string;
};

type EditLeaveBalanceDialogProps = {
  balance: LeaveBalance;
  children: React.ReactNode;
  onSuccess: () => void;
};

export function EditLeaveBalanceDialog({
  balance,
  children,
  onSuccess,
}: EditLeaveBalanceDialogProps) {
  const [open, setOpen] = useState(false);
  const trpcClient = useTRPCClient();

  const form = useForm<EditLeaveBalanceFormValues>({
    resolver: zodResolver(editLeaveBalanceSchema),
    defaultValues: {
      currentBalance: balance.currentBalance,
      accrued: balance.accrued,
      used: balance.used,
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (values: EditLeaveBalanceFormValues) => {
    setIsSubmitting(true);
    try {
      await trpcClient.admin.hr.leaveBalances.update.mutate({
        employeeId: balance.employeeId,
        leaveType: balance.leaveType,
        data: values,
      });
      toast.success("Leave balance updated successfully!");
      onSuccess();
      setOpen(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to update leave balance");
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchedValues = form.watch();
  const currentBalance = Number.parseFloat(watchedValues.currentBalance || "0");
  const accrued = Number.parseFloat(watchedValues.accrued || "0");
  const used = Number.parseFloat(watchedValues.used || "0");
  const calculatedBalance = accrued - used;
  const balanceMismatch = Math.abs(currentBalance - calculatedBalance) > 0.01;

  const handleAutoFix = () => {
    form.setValue("currentBalance", calculatedBalance.toFixed(1));
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Leave Balance - {balance.employeeName}</DialogTitle>
          <DialogDescription>
            {balance.leaveType.charAt(0).toUpperCase() +
              balance.leaveType.slice(1)}{" "}
            leave balance
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Read-only info */}
            <div className="space-y-2 rounded-md bg-muted p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Employee:</span>
                <span className="font-medium">{balance.employeeName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Department:</span>
                <span className="font-medium">{balance.department}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Leave Type:</span>
                <span className="font-medium capitalize">
                  {balance.leaveType}
                </span>
              </div>
            </div>

            {/* Editable fields */}
            <FormField
              control={form.control}
              name="currentBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Current Balance (days){" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      min="0"
                      placeholder="15.0"
                      step="0.5"
                      type="number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accrued"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Accrued YTD (days){" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      min="0"
                      placeholder="20.0"
                      step="0.5"
                      type="number"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Total days accrued year-to-date
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="used"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Used YTD (days) <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      min="0"
                      placeholder="5.0"
                      step="0.5"
                      type="number"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Total days used year-to-date
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Balance Check */}
            <div
              className={`space-y-2 rounded-md p-3 ${balanceMismatch ? "border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/20" : "bg-muted"}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Balance Check:</span>
                {balanceMismatch && (
                  <Button
                    onClick={handleAutoFix}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Auto-fix
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Current Balance should equal Accrued - Used
              </p>
              <div className="flex justify-between text-sm">
                <span>Expected Balance:</span>
                <span className="font-medium">
                  {calculatedBalance.toFixed(1)} days
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Entered Balance:</span>
                <span className="font-medium">
                  {currentBalance.toFixed(1)} days
                </span>
              </div>
              {balanceMismatch && (
                <p className="font-medium text-orange-600 text-xs">
                  Warning: Balance mismatch detected
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                onClick={() => setOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

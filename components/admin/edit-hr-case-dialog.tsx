"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC, useTRPCClient } from "@/trpc/react";
import { HRCaseDetailsDialog } from "./hr-case-details-dialog";

const editHRCaseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum([
    "payroll",
    "benefits",
    "policy",
    "equipment",
    "leave",
    "performance",
    "other",
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  description: z.string().min(1, "Description is required"),
  assignedTeam: z.string().min(1, "Assigned team is required"),
  status: z.enum(["open", "in_progress", "pending_info", "resolved", "closed"]),
  statusChangeMessage: z.string().optional(),
});

type EditHRCaseFormValues = z.infer<typeof editHRCaseSchema>;

type HRCase = {
  id: string;
  caseId: string;
  title: string;
  category: string;
  priority: string;
  description: string;
  assignedTeam: string;
  status: string;
  submittedBy?: string | null;
  createdAt: Date;
  updatedAt?: Date;
  lastUpdateAt?: Date;
  lastUpdateBy?: string;
};

type EditHRCaseDialogProps = {
  hrCase: HRCase;
  children: React.ReactNode;
  onSuccess: () => void;
};

export function EditHRCaseDialog({
  hrCase,
  children,
  onSuccess,
}: EditHRCaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [previousStatus, setPreviousStatus] = useState(hrCase.status);
  const trpcClient = useTRPCClient();
  const trpc = useTRPC();

  const { data: employeesData } = useQuery({
    ...trpc.admin.hr.employees.list.queryOptions({
      employmentStatus: "active",
      limit: 100,
      offset: 0,
    }),
    enabled: open,
  });

  const form = useForm<EditHRCaseFormValues>({
    resolver: zodResolver(editHRCaseSchema),
    defaultValues: {
      title: hrCase.title,
      category: hrCase.category as EditHRCaseFormValues["category"],
      priority: hrCase.priority as EditHRCaseFormValues["priority"],
      description: hrCase.description,
      assignedTeam: hrCase.assignedTeam,
      status: hrCase.status as EditHRCaseFormValues["status"],
      statusChangeMessage: "",
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentStatus = form.watch("status");

  const onSubmit = async (values: EditHRCaseFormValues) => {
    // If status changed, require a message
    if (currentStatus !== previousStatus && !values.statusChangeMessage) {
      form.setError("statusChangeMessage", {
        message: "Please provide a reason for the status change",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await trpcClient.admin.hr.cases.update.mutate({
        id: hrCase.id,
        data: {
          status: values.status,
          priority: values.priority,
          assignedTeam: values.assignedTeam,
        },
      });

      // TODO: If status changed, create a status change update (requires backend caseUpdates router)
      // if (currentStatus !== previousStatus && values.statusChangeMessage) {
      //   await trpcClient.admin.hr.caseUpdates.create.mutate({
      //     caseId: hrCase.id,
      //     updateType: "status_change",
      //     message: values.statusChangeMessage,
      //     newStatus: values.status,
      //     visibility: "internal",
      //   });
      // }

      toast.success("HR case updated successfully!");
      onSuccess();
      setOpen(false);
      setPreviousStatus(currentStatus);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to update HR case");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit HR Case: {hrCase.caseId}</DialogTitle>
            <DialogDescription>
              Update case information and manage case status
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              {/* Case ID (Read-only) */}
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="case-id">
                  Case ID
                </label>
                <Input disabled id="case-id" value={hrCase.caseId} />
                <p className="text-muted-foreground text-xs">
                  Case ID cannot be changed
                </p>
              </div>

              {/* Case Info */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm">Case Information</h3>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Title <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Brief description of issue"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Category <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="payroll">Payroll</SelectItem>
                            <SelectItem value="benefits">Benefits</SelectItem>
                            <SelectItem value="policy">Policy</SelectItem>
                            <SelectItem value="equipment">Equipment</SelectItem>
                            <SelectItem value="leave">Leave</SelectItem>
                            <SelectItem value="performance">
                              Performance
                            </SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Priority <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Description <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detailed description of the issue or request"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assignedTeam"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Assigned Team{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="HR">HR</SelectItem>
                          <SelectItem value="IT">IT</SelectItem>
                          <SelectItem value="Facilities">Facilities</SelectItem>
                          <SelectItem value="Payroll">Payroll</SelectItem>
                          <SelectItem value="Benefits">Benefits</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Status Section */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm">Status Management</h3>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Status <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value !== previousStatus) {
                            form.setValue("statusChangeMessage", "");
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">
                            In Progress
                          </SelectItem>
                          <SelectItem value="pending_info">
                            Pending Info
                          </SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {currentStatus !== previousStatus && (
                  <FormField
                    control={form.control}
                    name="statusChangeMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Reason for Status Change{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Explain why the status is being changed"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Last Update Info */}
              {(hrCase.lastUpdateAt || hrCase.updatedAt) && (
                <div className="space-y-2 rounded-md bg-muted p-3">
                  <p className="text-muted-foreground text-xs">
                    Last Updated:{" "}
                    {new Date(
                      hrCase.lastUpdateAt ||
                        hrCase.updatedAt ||
                        hrCase.createdAt
                    ).toLocaleString()}
                    {hrCase.lastUpdateBy && ` by ${hrCase.lastUpdateBy}`}
                  </p>
                </div>
              )}

              <DialogFooter className="flex justify-between">
                <div className="flex gap-2">
                  <Button
                    onClick={() => setDetailsOpen(true)}
                    type="button"
                    variant="outline"
                  >
                    View Timeline
                  </Button>
                </div>
                <div className="flex gap-2">
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
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {detailsOpen && (
        <HRCaseDetailsDialog
          hrCase={hrCase}
          onClose={() => setDetailsOpen(false)}
          onSuccess={onSuccess}
          open={detailsOpen}
        />
      )}
    </>
  );
}

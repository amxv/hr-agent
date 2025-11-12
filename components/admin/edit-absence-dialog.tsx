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
import { useTRPCClient } from "@/trpc/react";

const editAbsenceSchema = z.object({
  absenceType: z.enum(["vacation", "sick", "personal", "other"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  totalDays: z.string().min(1, "Total days is required"),
  approvalDate: z.string().min(1, "Approval date is required"),
});

type EditAbsenceFormValues = z.infer<typeof editAbsenceSchema>;

type Absence = {
  id: string;
  employeeId: string;
  absenceType: string;
  startDate: Date | string;
  endDate: Date | string;
  totalDays: string;
  approvalDate: Date | string;
  approvedBy?: string | null;
  employee?: {
    fullName: string;
  };
};

type EditAbsenceDialogProps = {
  absence: Absence;
  children: React.ReactNode;
  onSuccess: () => void;
};

export function EditAbsenceDialog({
  absence,
  children,
  onSuccess,
}: EditAbsenceDialogProps) {
  const [open, setOpen] = useState(false);
  const trpcClient = useTRPCClient();

  // Helper function to calculate business days between two dates
  const calculateBusinessDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    let count = 0;
    const curDate = new Date(startDate.getTime());

    while (curDate <= endDate) {
      const dayOfWeek = curDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Not Sunday (0) or Saturday (6)
        count++;
      }
      curDate.setDate(curDate.getDate() + 1);
    }

    return count.toString();
  };

  const form = useForm<EditAbsenceFormValues>({
    resolver: zodResolver(editAbsenceSchema),
    defaultValues: {
      absenceType: absence.absenceType as EditAbsenceFormValues["absenceType"],
      startDate:
        typeof absence.startDate === "string"
          ? absence.startDate.split("T")[0]
          : new Date(absence.startDate).toISOString().split("T")[0],
      endDate:
        typeof absence.endDate === "string"
          ? absence.endDate.split("T")[0]
          : new Date(absence.endDate).toISOString().split("T")[0],
      totalDays: absence.totalDays,
      approvalDate:
        typeof absence.approvalDate === "string"
          ? absence.approvalDate.split("T")[0]
          : new Date(absence.approvalDate).toISOString().split("T")[0],
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Watch date changes to recalculate total days
  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");

  // Recalculate total days when dates change
  const handleDateChange = () => {
    if (startDate && endDate) {
      const businessDays = calculateBusinessDays(startDate, endDate);
      form.setValue("totalDays", businessDays);
    }
  };

  const onSubmit = async (values: EditAbsenceFormValues) => {
    // Validate that end date is after start date
    if (new Date(values.endDate) < new Date(values.startDate)) {
      form.setError("endDate", {
        message: "End date must be after start date",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await trpcClient.admin.hr.absences.update.mutate({
        id: absence.id,
        data: values,
      });
      toast.success("Absence updated successfully!");
      onSuccess();
      setOpen(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to update absence");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Absence</DialogTitle>
          <DialogDescription>
            Update absence record information
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Employee Name (Read-only) */}
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="employee-name">
                Employee
              </label>
              <Input
                disabled
                id="employee-name"
                value={absence.employee?.fullName || "Unknown"}
              />
              <p className="text-muted-foreground text-xs">
                Employee cannot be changed for existing absence
              </p>
            </div>

            <FormField
              control={form.control}
              name="absenceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Absence Type <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="vacation">Vacation</SelectItem>
                      <SelectItem value="sick">Sick</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Start Date <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        onBlur={() => {
                          field.onBlur();
                          handleDateChange();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      End Date <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        onBlur={() => {
                          field.onBlur();
                          handleDateChange();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="totalDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Total Days <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="5" type="number" {...field} />
                  </FormControl>
                  <p className="text-muted-foreground text-xs">
                    Auto-calculated based on start and end dates (business days
                    only)
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="approvalDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Approval Date <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

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
import { useTRPC, useTRPCClient } from "@/trpc/react";

const createAbsenceSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  absenceType: z.enum(["vacation", "sick", "personal", "other"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  totalDays: z.string().min(1, "Total days is required"),
  approvalDate: z.string().min(1, "Approval date is required"),
});

type CreateAbsenceFormValues = z.infer<typeof createAbsenceSchema>;

type CreateAbsenceDialogProps = {
  children: React.ReactNode;
  onSuccess: () => void;
};

export function CreateAbsenceDialog({
  children,
  onSuccess,
}: CreateAbsenceDialogProps) {
  const [open, setOpen] = useState(false);
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

  const form = useForm<CreateAbsenceFormValues>({
    resolver: zodResolver(createAbsenceSchema),
    defaultValues: {
      employeeId: "",
      absenceType: "vacation",
      startDate: "",
      endDate: "",
      totalDays: "",
      approvalDate: new Date().toISOString().split("T")[0],
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (values: CreateAbsenceFormValues) => {
    setIsSubmitting(true);
    try {
      await trpcClient.admin.hr.absences.create.mutate(values);
      toast.success("Absence created successfully!");
      onSuccess();
      setOpen(false);
      form.reset();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to create absence");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Approved Absence</DialogTitle>
          <DialogDescription>
            Create a new approved absence record
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Employee <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employeesData?.employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      <Input type="date" {...field} />
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
                      <Input type="date" {...field} />
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
                {isSubmitting ? "Creating..." : "Create Absence"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

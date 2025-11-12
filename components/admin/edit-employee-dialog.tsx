"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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

const editEmployeeSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phoneExtension: z.string().optional(),
  jobTitle: z.string().min(1, "Job title is required"),
  department: z.string().min(1, "Department is required"),
  location: z.string().min(1, "Location is required"),
  workMode: z.enum(["office", "remote", "hybrid"]),
  employmentStatus: z.enum([
    "active",
    "probation",
    "leave_of_absence",
    "notice_period",
    "terminated",
  ]),
  managerId: z.string().optional(),
});

type EditEmployeeFormValues = z.infer<typeof editEmployeeSchema>;

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

type EditEmployeeDialogProps = {
  employee: Employee;
  children: React.ReactNode;
  onSuccess: () => void;
};

export function EditEmployeeDialog({
  employee,
  children,
  onSuccess,
}: EditEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const trpcClient = useTRPCClient();
  const trpc = useTRPC();

  // Fetch all active employees for manager selection
  const { data: employeesData } = useQuery({
    ...trpc.admin.hr.employees.list.queryOptions({
      employmentStatus: "active",
      limit: 100,
      offset: 0,
    }),
    enabled: open,
  });

  const form = useForm<EditEmployeeFormValues>({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: {
      fullName: employee.fullName,
      email: employee.email,
      phoneExtension: employee.phoneExtension || "",
      jobTitle: employee.jobTitle,
      department: employee.department,
      location: employee.location,
      workMode: employee.workMode,
      employmentStatus: employee.employmentStatus,
      managerId: employee.managerId || undefined,
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (values: EditEmployeeFormValues) => {
    setIsSubmitting(true);
    try {
      await trpcClient.admin.hr.employees.update.mutate({
        id: employee.id,
        data: values,
      });
      toast.success("Employee updated successfully!");
      onSuccess();
      setOpen(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message?.includes("email")) {
        form.setError("email", { message: "Email already exists" });
      } else {
        toast.error(err.message || "Failed to update employee");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTerminate = async () => {
    setIsTerminating(true);
    try {
      await trpcClient.admin.hr.employees.update.mutate({
        id: employee.id,
        data: { employmentStatus: "terminated" },
      });
      toast.success("Employee terminated successfully");
      onSuccess();
      setTerminateOpen(false);
      setOpen(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to terminate employee");
    } finally {
      setIsTerminating(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Employee: {employee.fullName}</DialogTitle>
          <DialogDescription>
            Update employee information. Employee ID cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Employee ID (Read-only) */}
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="employee-id">
                Employee ID
              </label>
              <Input disabled id="employee-id" value={employee.employeeId} />
              <p className="text-muted-foreground text-xs">
                Employee ID cannot be changed
              </p>
            </div>

            {/* Personal Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Full Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Email <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="john.doe@company.com"
                          type="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phoneExtension"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Extension</FormLabel>
                    <FormControl>
                      <Input placeholder="x1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Job Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Job Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Job Title <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Software Engineer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Department <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Engineering" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="managerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manager</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select manager (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Manager</SelectItem>
                        {employeesData?.employees
                          .filter((emp) => emp.id !== employee.id)
                          .map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.fullName} ({emp.jobTitle})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Employment Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Employment Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="employmentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Status <span className="text-destructive">*</span>
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
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="probation">Probation</SelectItem>
                          <SelectItem value="leave_of_absence">
                            Leave of Absence
                          </SelectItem>
                          <SelectItem value="notice_period">
                            Notice Period
                          </SelectItem>
                          <SelectItem value="terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="workMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Work Mode <span className="text-destructive">*</span>
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
                          <SelectItem value="office">Office</SelectItem>
                          <SelectItem value="remote">Remote</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Location <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="New York Office" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Audit Info */}
            {(employee.createdAt || employee.updatedAt) && (
              <div className="space-y-2 rounded-md bg-muted p-3">
                <p className="text-muted-foreground text-xs">
                  {employee.createdAt && (
                    <>
                      Created: {new Date(employee.createdAt).toLocaleString()}
                    </>
                  )}
                </p>
                {employee.updatedAt && (
                  <p className="text-muted-foreground text-xs">
                    Last updated:{" "}
                    {new Date(employee.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            <DialogFooter className="flex justify-between">
              <AlertDialog onOpenChange={setTerminateOpen} open={terminateOpen}>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive">
                    Terminate Employee
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Terminate Employee?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the employee as terminated. Associated data
                      will be preserved for historical records.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={isTerminating}
                      onClick={handleTerminate}
                    >
                      {isTerminating ? "Terminating..." : "Terminate"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

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
  );
}

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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTRPC, useTRPCClient } from "@/trpc/react";

const createBlackoutDateSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required"),
  department: z.string().optional(),
});

type CreateBlackoutDateFormValues = z.infer<typeof createBlackoutDateSchema>;

function CreateBlackoutDateDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const trpcClient = useTRPCClient();
  const trpc = useTRPC();

  // Fetch all active employees for department list
  const { data: employeesData } = useQuery({
    ...trpc.admin.hr.employees.list.queryOptions({
      employmentStatus: "active",
      limit: 100,
      offset: 0,
    }),
    enabled: open,
  });

  // Extract unique departments from employee data
  const uniqueDepartments = employeesData?.employees
    ? Array.from(
        new Set(
          employeesData.employees.map((emp) => emp.department).filter(Boolean)
        )
      ).sort()
    : [];

  const form = useForm<CreateBlackoutDateFormValues>({
    resolver: zodResolver(createBlackoutDateSchema),
    defaultValues: {
      startDate: "",
      endDate: "",
      reason: "",
      department: undefined,
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (values: CreateBlackoutDateFormValues) => {
    setIsSubmitting(true);
    try {
      await trpcClient.admin.hr.leaveBalances.blackoutDates.create.mutate({
        ...values,
        department: values.department || undefined,
      });
      toast.success("Blackout date created successfully!");
      onSuccess();
      setOpen(false);
      form.reset();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to create blackout date");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>Add Blackout Date</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Blackout Date</DialogTitle>
          <DialogDescription>
            Create a new blackout date period when leave requests should not be
            approved.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Reason <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Year-End Closing" {...field} />
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
                  <FormLabel>Department (optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || "all"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {uniqueDepartments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Leave blank for company-wide blackout
                  </FormDescription>
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
                {isSubmitting ? "Creating..." : "Create Blackout Date"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function BlackoutDatesManager() {
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();

  const { data, isLoading, error, refetch } = useQuery({
    ...trpc.admin.hr.leaveBalances.blackoutDates.list.queryOptions({
      department: departmentFilter === "all" ? undefined : departmentFilter,
    }),
  });

  // Fetch all active employees for department list
  const { data: employeesData } = useQuery({
    ...trpc.admin.hr.employees.list.queryOptions({
      employmentStatus: "active",
      limit: 100,
      offset: 0,
    }),
  });

  // Extract unique departments from employee data
  const uniqueDepartments = employeesData?.employees
    ? Array.from(
        new Set(
          employeesData.employees.map((emp) => emp.department).filter(Boolean)
        )
      ).sort()
    : [];

  const invalidate = () => {
    void refetch();
  };

  const handleDelete = async (id: string) => {
    try {
      await trpcClient.admin.hr.leaveBalances.blackoutDates.delete.mutate({ id });
      toast.success("Blackout date deleted successfully!");
      invalidate();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to delete blackout date");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Blackout Dates</CardTitle>
          <CardDescription>
            {data?.total ?? 0} blackout periods configured
          </CardDescription>
        </div>
        <CreateBlackoutDateDialog onSuccess={invalidate} />
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <Select
            onValueChange={(value) => setDepartmentFilter(value)}
            value={departmentFilter}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {uniqueDepartments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {error && <div>Error loading blackout dates: {error.message}</div>}

        {data && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.items || data.items.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center" colSpan={5}>
                    No blackout dates found
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((blackout) => (
                  <TableRow key={blackout.id}>
                    <TableCell>
                      {new Date(blackout.startDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(blackout.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{blackout.reason}</TableCell>
                    <TableCell>
                      {blackout.department || (
                        <span className="text-muted-foreground">
                          All Departments
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete Blackout Date?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this blackout period.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(blackout.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

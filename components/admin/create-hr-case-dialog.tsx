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

const createHRCaseSchema = z.object({
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
  description: z.string().min(1, "Description is required"),
  submittedBy: z.string().min(1, "Submitted by is required"),
});

type CreateHRCaseFormValues = z.infer<typeof createHRCaseSchema>;

type CreateHRCaseDialogProps = {
  children: React.ReactNode;
  onSuccess: () => void;
};

export function CreateHRCaseDialog({
  children,
  onSuccess,
}: CreateHRCaseDialogProps) {
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

  const form = useForm<CreateHRCaseFormValues>({
    resolver: zodResolver(createHRCaseSchema),
    defaultValues: {
      title: "",
      category: "other",
      description: "",
      submittedBy: "",
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (values: CreateHRCaseFormValues) => {
    setIsSubmitting(true);
    try {
      await trpcClient.admin.hr.cases.create.mutate(values);
      toast.success("HR case created successfully!");
      onSuccess();
      setOpen(false);
      form.reset();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to create HR case");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New HR Case</DialogTitle>
          <DialogDescription>
            Submit a new HR support case or request
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
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
              name="submittedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Submitted By <span className="text-destructive">*</span>
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

            <DialogFooter>
              <Button
                onClick={() => setOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? "Creating..." : "Create Case"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

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
import { DependentManager } from "./dependent-manager";

const editEnrollmentSchema = z.object({
  medicalPlanId: z.string().optional(),
  dentalPlanId: z.string().optional(),
  visionPlanId: z.string().optional(),
  medicalCoverageLevel: z.string().optional(),
  dentalCoverageLevel: z.string().optional(),
  visionCoverageLevel: z.string().optional(),
  retirement401kContribution: z.string().optional(),
  hsaEmployeeContribution: z.string().optional(),
  fsaElection: z.string().optional(),
  dependents: z.array(
    z.object({
      id: z.string().optional(),
      fullName: z.string(),
      relationship: z.string(),
      dateOfBirth: z.string(),
      coveredUnder: z.array(z.string()),
    })
  ),
});

type EditEnrollmentFormValues = z.infer<typeof editEnrollmentSchema>;

type Enrollment = {
  enrollment: {
    id: string;
    employeeId: string;
    medicalPlanId?: string | null;
    dentalPlanId?: string | null;
    visionPlanId?: string | null;
    medicalCoverageLevel?: string | null;
    dentalCoverageLevel?: string | null;
    visionCoverageLevel?: string | null;
    retirement401kContribution?: string | null;
    hsaEmployeeContribution?: string | null;
    fsaElection?: string | null;
  };
  employee: {
    fullName: string;
    department: string;
  };
  medicalPlan?: { planName: string } | null;
  dentalPlan?: { planName: string } | null;
  visionPlan?: { planName: string } | null;
  dependents?: Array<{
    id: string;
    name: string;
    relationship: string;
    dateOfBirth: string;
    coveredUnder: string[];
  }>;
};

type EditEnrollmentDialogProps = {
  enrollment: Enrollment;
  children: React.ReactNode;
  onSuccess: () => void;
};

export function EditEnrollmentDialog({
  enrollment,
  children,
  onSuccess,
}: EditEnrollmentDialogProps) {
  const [open, setOpen] = useState(false);
  const trpcClient = useTRPCClient();
  const trpc = useTRPC();

  // Fetch available plans
  const { data: medicalPlans } = useQuery({
    ...trpc.admin.hr.benefitsPlans.list.queryOptions({ category: "medical" }),
    enabled: open,
  });

  const { data: dentalPlans } = useQuery({
    ...trpc.admin.hr.benefitsPlans.list.queryOptions({ category: "dental" }),
    enabled: open,
  });

  const { data: visionPlans } = useQuery({
    ...trpc.admin.hr.benefitsPlans.list.queryOptions({ category: "vision" }),
    enabled: open,
  });

  const form = useForm<EditEnrollmentFormValues>({
    resolver: zodResolver(editEnrollmentSchema),
    defaultValues: {
      medicalPlanId: enrollment.enrollment.medicalPlanId || undefined,
      dentalPlanId: enrollment.enrollment.dentalPlanId || undefined,
      visionPlanId: enrollment.enrollment.visionPlanId || undefined,
      medicalCoverageLevel:
        enrollment.enrollment.medicalCoverageLevel || undefined,
      dentalCoverageLevel:
        enrollment.enrollment.dentalCoverageLevel || undefined,
      visionCoverageLevel:
        enrollment.enrollment.visionCoverageLevel || undefined,
      retirement401kContribution:
        enrollment.enrollment.retirement401kContribution || undefined,
      hsaEmployeeContribution:
        enrollment.enrollment.hsaEmployeeContribution || undefined,
      fsaElection: enrollment.enrollment.fsaElection || undefined,
      dependents: enrollment.dependents || [],
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (values: EditEnrollmentFormValues) => {
    setIsSubmitting(true);
    try {
      await trpcClient.admin.hr.enrollments.upsert.mutate({
        employeeId: enrollment.enrollment.employeeId,
        ...values,
      });
      toast.success("Enrollment updated successfully!");
      onSuccess();
      setOpen(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to update enrollment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Benefits Enrollment: {enrollment.employee.fullName}
          </DialogTitle>
          <DialogDescription>
            Update benefit plan selections and dependents
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Employee Info (Read-only) */}
            <div className="rounded-md bg-muted p-4">
              <h3 className="font-medium text-sm">Employee Information</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  {enrollment.employee.fullName}
                </div>
                <div>
                  <span className="text-muted-foreground">Department:</span>{" "}
                  {enrollment.employee.department}
                </div>
              </div>
            </div>

            {/* Medical Coverage */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Medical Coverage</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="medicalPlanId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medical Plan</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Plan</SelectItem>
                          {medicalPlans?.plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.planName}
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
                  name="medicalCoverageLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coverage Level</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "employee_only"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="employee_only">
                            Employee Only
                          </SelectItem>
                          <SelectItem value="employee_spouse">
                            Employee + Spouse
                          </SelectItem>
                          <SelectItem value="employee_children">
                            Employee + Children
                          </SelectItem>
                          <SelectItem value="family">Family</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Dental Coverage */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Dental Coverage</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dentalPlanId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dental Plan</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Plan</SelectItem>
                          {dentalPlans?.plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.planName}
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
                  name="dentalCoverageLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coverage Level</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "employee_only"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="employee_only">
                            Employee Only
                          </SelectItem>
                          <SelectItem value="employee_spouse">
                            Employee + Spouse
                          </SelectItem>
                          <SelectItem value="employee_children">
                            Employee + Children
                          </SelectItem>
                          <SelectItem value="family">Family</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Vision Coverage */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Vision Coverage</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="visionPlanId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vision Plan</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Plan</SelectItem>
                          {visionPlans?.plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.planName}
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
                  name="visionCoverageLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coverage Level</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "employee_only"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="employee_only">
                            Employee Only
                          </SelectItem>
                          <SelectItem value="employee_spouse">
                            Employee + Spouse
                          </SelectItem>
                          <SelectItem value="employee_children">
                            Employee + Children
                          </SelectItem>
                          <SelectItem value="family">Family</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Retirement & HSA/FSA */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Retirement & HSA/FSA</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="retirement401kContribution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>401k Contribution %</FormLabel>
                      <FormControl>
                        <Input placeholder="5" type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hsaEmployeeContribution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HSA Contribution</FormLabel>
                      <FormControl>
                        <Input placeholder="3000" type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fsaElection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FSA Election</FormLabel>
                      <FormControl>
                        <Input placeholder="2500" type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Dependents */}
            <FormField
              control={form.control}
              name="dependents"
              render={({ field }) => (
                <FormItem>
                  <DependentManager
                    dependents={field.value}
                    onChange={field.onChange}
                  />
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

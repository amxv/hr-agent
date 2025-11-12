"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { useTRPCClient } from "@/trpc/react";

const editBenefitsPlanSchema = z.object({
  planName: z.string().min(1, "Plan name is required"),
  carrier: z.string().optional(),
  planType: z.string().optional(),
  monthlyPremiums: z
    .object({
      employee_only: z.number().optional(),
      employee_spouse: z.number().optional(),
      employee_children: z.number().optional(),
      family: z.number().optional(),
    })
    .optional(),
  deductibles: z
    .object({
      individual: z.number().optional(),
      family: z.number().optional(),
    })
    .optional(),
  outOfPocketMax: z
    .object({
      individual: z.number().optional(),
      family: z.number().optional(),
    })
    .optional(),
  annualMaximum: z.number().optional(),
  employerMatchPercent: z.number().optional(),
  vestingSchedule: z.string().optional(),
  contributionLimits: z
    .object({
      employee: z.number().optional(),
      employer: z.number().optional(),
    })
    .optional(),
  employerContribution: z.number().optional(),
});

type EditBenefitsPlanFormValues = z.infer<typeof editBenefitsPlanSchema>;

type BenefitsPlan = {
  id: string;
  planId: string;
  category: string;
  planName: string;
  carrier?: string | null;
  planType?: string | null;
  monthlyPremiums?: Record<string, number> | null;
  deductibles?: Record<string, number> | null;
  outOfPocketMax?: Record<string, number> | null;
  annualMaximum?: number | null;
  employerMatchPercent?: string | null;
  vestingSchedule?: string | null;
  contributionLimits?: Record<string, number> | null;
  employerContribution?: string | null;
  enrollmentCount?: number;
};

type EditBenefitsPlanDialogProps = {
  plan: BenefitsPlan;
  children: React.ReactNode;
  onSuccess: () => void;
};

export function EditBenefitsPlanDialog({
  plan,
  children,
  onSuccess,
}: EditBenefitsPlanDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const trpcClient = useTRPCClient();

  const form = useForm<EditBenefitsPlanFormValues>({
    resolver: zodResolver(editBenefitsPlanSchema),
    defaultValues: {
      planName: plan.planName,
      carrier: plan.carrier || "",
      planType: plan.planType || "",
      monthlyPremiums: plan.monthlyPremiums
        ? {
            employee_only: plan.monthlyPremiums.employee_only,
            employee_spouse: plan.monthlyPremiums.employee_spouse,
            employee_children: plan.monthlyPremiums.employee_children,
            family: plan.monthlyPremiums.family,
          }
        : undefined,
      deductibles: plan.deductibles
        ? {
            individual: plan.deductibles.individual,
            family: plan.deductibles.family,
          }
        : undefined,
      outOfPocketMax: plan.outOfPocketMax
        ? {
            individual: plan.outOfPocketMax.individual,
            family: plan.outOfPocketMax.family,
          }
        : undefined,
      annualMaximum: plan.annualMaximum ?? undefined,
      employerMatchPercent: plan.employerMatchPercent
        ? Number(plan.employerMatchPercent)
        : undefined,
      vestingSchedule: plan.vestingSchedule || "",
      contributionLimits: plan.contributionLimits
        ? {
            employee: plan.contributionLimits.employee,
            employer: plan.contributionLimits.employer,
          }
        : undefined,
      employerContribution: plan.employerContribution
        ? Number(plan.employerContribution)
        : undefined,
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (values: EditBenefitsPlanFormValues) => {
    setIsSubmitting(true);
    try {
      await trpcClient.admin.hr.benefitsPlans.update.mutate({
        id: plan.id,
        data: values,
      });
      toast.success("Benefits plan updated successfully!");
      onSuccess();
      setOpen(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to update benefits plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await trpcClient.admin.hr.benefitsPlans.delete.mutate({ id: plan.id });
      toast.success("Benefits plan deleted successfully");
      onSuccess();
      setDeleteOpen(false);
      setOpen(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to delete benefits plan");
    } finally {
      setIsDeleting(false);
    }
  };

  const showHealthFields =
    plan.category === "medical" ||
    plan.category === "dental" ||
    plan.category === "vision";
  const showRetirementFields = plan.category === "retirement";
  const showHSAFields = plan.category === "hsa_fsa";

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Benefits Plan: {plan.planName}</DialogTitle>
          <DialogDescription>
            Update plan details. Plan ID cannot be changed.
          </DialogDescription>
        </DialogHeader>

        {plan.enrollmentCount && plan.enrollmentCount > 0 ? (
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm">
              <Badge className="mr-2" variant="secondary">
                {plan.enrollmentCount} employees enrolled
              </Badge>
              Changes will apply immediately to all enrollments.
            </p>
          </div>
        ) : null}

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Plan ID (Read-only) */}
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="plan-id">
                Plan ID
              </label>
              <Input disabled id="plan-id" value={plan.planId} />
              <p className="text-muted-foreground text-xs">
                Plan ID cannot be changed
              </p>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="planName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Plan Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Premium PPO Plan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="carrier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carrier</FormLabel>
                      <FormControl>
                        <Input placeholder="Blue Cross" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {showHealthFields && (
                  <FormField
                    control={form.control}
                    name="planType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan Type</FormLabel>
                        <FormControl>
                          <Input placeholder="PPO, HMO, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Monthly Premiums (Health Plans) */}
            {showHealthFields && (
              <div className="space-y-4">
                <h3 className="font-medium text-sm">Monthly Premiums</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="monthlyPremiums.employee_only"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee Only</FormLabel>
                        <FormControl>
                          <Input
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined
                              )
                            }
                            placeholder="250"
                            type="number"
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="monthlyPremiums.employee_spouse"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee + Spouse</FormLabel>
                        <FormControl>
                          <Input
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined
                              )
                            }
                            placeholder="500"
                            type="number"
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="monthlyPremiums.employee_children"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee + Children</FormLabel>
                        <FormControl>
                          <Input
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined
                              )
                            }
                            placeholder="450"
                            type="number"
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="monthlyPremiums.family"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Family</FormLabel>
                        <FormControl>
                          <Input
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined
                              )
                            }
                            placeholder="650"
                            type="number"
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Deductibles & Out of Pocket Max (Medical/Dental/Vision) */}
            {showHealthFields && (
              <div className="space-y-4">
                <h3 className="font-medium text-sm">Deductibles</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deductibles.individual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Individual Deductible</FormLabel>
                        <FormControl>
                          <Input
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined
                              )
                            }
                            placeholder="1500"
                            type="number"
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deductibles.family"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Family Deductible</FormLabel>
                        <FormControl>
                          <Input
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined
                              )
                            }
                            placeholder="3000"
                            type="number"
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <h3 className="font-medium text-sm">Out-of-Pocket Maximum</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="outOfPocketMax.individual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Individual OOP Max</FormLabel>
                        <FormControl>
                          <Input
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined
                              )
                            }
                            placeholder="6000"
                            type="number"
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="outOfPocketMax.family"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Family OOP Max</FormLabel>
                        <FormControl>
                          <Input
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined
                              )
                            }
                            placeholder="12000"
                            type="number"
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Annual Maximum (Dental/Vision) */}
            {(plan.category === "dental" || plan.category === "vision") && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="annualMaximum"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual Maximum</FormLabel>
                      <FormControl>
                        <Input
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined
                            )
                          }
                          placeholder="2000"
                          type="number"
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Retirement Fields */}
            {showRetirementFields && (
              <div className="space-y-4">
                <h3 className="font-medium text-sm">Retirement Plan Details</h3>
                <FormField
                  control={form.control}
                  name="employerMatchPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employer Match %</FormLabel>
                      <FormControl>
                        <Input
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined
                            )
                          }
                          placeholder="5"
                          type="number"
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vestingSchedule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vesting Schedule</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="20% per year over 5 years"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* HSA/FSA Fields */}
            {showHSAFields && (
              <div className="space-y-4">
                <h3 className="font-medium text-sm">HSA/FSA Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contributionLimits.employee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee Contribution Limit</FormLabel>
                        <FormControl>
                          <Input
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined
                              )
                            }
                            placeholder="3000"
                            type="number"
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="employerContribution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employer Contribution</FormLabel>
                        <FormControl>
                          <Input
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined
                              )
                            }
                            placeholder="500"
                            type="number"
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="flex justify-between">
              <AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive">
                    Delete Plan
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Benefits Plan?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {plan.enrollmentCount && plan.enrollmentCount > 0 ? (
                        <>
                          Warning: {plan.enrollmentCount} employees are
                          currently enrolled in this plan. Deleting will affect
                          their enrollments.
                        </>
                      ) : (
                        <>This action cannot be undone.</>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={isDeleting}
                      onClick={handleDelete}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
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

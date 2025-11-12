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
import { Textarea } from "@/components/ui/textarea";
import { useTRPCClient } from "@/trpc/react";

const createBenefitsPlanSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  category: z.enum(["medical", "dental", "vision", "retirement", "hsa_fsa"]),
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
  coverageDetails: z.record(z.string(), z.unknown()).optional(),
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

type CreateBenefitsPlanFormValues = z.infer<typeof createBenefitsPlanSchema>;

type CreateBenefitsPlanDialogProps = {
  children: React.ReactNode;
  category?: string;
  onSuccess: () => void;
};

export function CreateBenefitsPlanDialog({
  children,
  category: defaultCategory,
  onSuccess,
}: CreateBenefitsPlanDialogProps) {
  const [open, setOpen] = useState(false);
  const trpcClient = useTRPCClient();

  const form = useForm<CreateBenefitsPlanFormValues>({
    resolver: zodResolver(createBenefitsPlanSchema),
    defaultValues: {
      planId: "",
      category:
        (defaultCategory as CreateBenefitsPlanFormValues["category"]) ||
        "medical",
      planName: "",
      carrier: "",
      planType: "",
      monthlyPremiums: {
        employee_only: undefined,
        employee_spouse: undefined,
        employee_children: undefined,
        family: undefined,
      },
      deductibles: {
        individual: undefined,
        family: undefined,
      },
      outOfPocketMax: {
        individual: undefined,
        family: undefined,
      },
      annualMaximum: undefined,
      employerMatchPercent: undefined,
      vestingSchedule: "",
      contributionLimits: {
        employee: undefined,
        employer: undefined,
      },
      employerContribution: undefined,
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedCategory = form.watch("category");

  const onSubmit = async (values: CreateBenefitsPlanFormValues) => {
    setIsSubmitting(true);
    try {
      await trpcClient.admin.hr.benefitsPlans.create.mutate(values);
      toast.success("Benefits plan created successfully!");
      onSuccess();
      setOpen(false);
      form.reset();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to create benefits plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showHealthFields =
    selectedCategory === "medical" ||
    selectedCategory === "dental" ||
    selectedCategory === "vision";
  const showRetirementFields = selectedCategory === "retirement";
  const showHSAFields = selectedCategory === "hsa_fsa";

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Benefits Plan</DialogTitle>
          <DialogDescription>
            Create a new benefits plan with coverage details and premiums.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Plan Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="planId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Plan ID <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="MED-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          <SelectItem value="medical">Medical</SelectItem>
                          <SelectItem value="dental">Dental</SelectItem>
                          <SelectItem value="vision">Vision</SelectItem>
                          <SelectItem value="retirement">Retirement</SelectItem>
                          <SelectItem value="hsa_fsa">HSA/FSA</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
            {(selectedCategory === "dental" ||
              selectedCategory === "vision") && (
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

            <DialogFooter>
              <Button
                onClick={() => setOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? "Creating..." : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

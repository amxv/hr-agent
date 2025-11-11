"use client";

import { Calendar, DollarSign, Heart, Loader2, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  BenefitsInfoInput,
  BenefitsInfoOutput,
} from "@/lib/ai/tools/benefits-info";

type BenefitsInfoResultProps = {
  state: "input-available" | "output-available";
  input: BenefitsInfoInput;
  output?: BenefitsInfoOutput;
};

export function BenefitsInfoResult({
  state,
  input,
  output,
}: BenefitsInfoResultProps) {
  // LOADING STATE
  if (state === "input-available") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-900 text-sm dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Retrieving benefits information...</span>
      </div>
    );
  }

  // RESULT STATE
  if (state === "output-available" && output) {
    if ("error" in output) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900 text-sm dark:border-red-800 dark:bg-red-950 dark:text-red-100">
          <p className="font-medium">Error retrieving benefits</p>
          <p className="mt-1 text-xs opacity-90">{output.error}</p>
        </div>
      );
    }

    const {
      currentEnrollments,
      dependents,
      enrollmentWindow,
      planComparison,
      benefits,
    } = output;

    return (
      <div className="space-y-4">
        {/* Enrollment Window Alert */}
        {enrollmentWindow && enrollmentWindow.daysRemaining > 0 && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <Calendar className="h-4 w-4" />
            <AlertDescription>
              <strong>
                {enrollmentWindow.type.replace(/_/g, " ").toUpperCase()}
              </strong>
              <br />
              {enrollmentWindow.description}
              <br />
              <span className="font-bold text-amber-900 dark:text-amber-100">
                {enrollmentWindow.daysRemaining} days remaining
              </span>{" "}
              (ends {new Date(enrollmentWindow.endDate).toLocaleDateString()})
            </AlertDescription>
          </Alert>
        )}

        {/* Current Enrollments */}
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 font-medium text-sm">
            <Heart className="h-4 w-4" />
            Current Enrollments
          </h3>
          <div className="grid gap-2">
            {currentEnrollments.map((enrollment, idx) => (
              <Card className="p-3" key={idx}>
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {enrollment.planName}
                        </span>
                        <Badge className="capitalize" variant="outline">
                          {enrollment.planType}
                        </Badge>
                        <Badge
                          variant={
                            enrollment.status === "active"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {enrollment.status}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-muted-foreground text-xs">
                        {enrollment.carrier} • {enrollment.tier}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        ${enrollment.monthlyPremium}/mo
                      </p>
                      <p className="text-muted-foreground text-xs">Your cost</p>
                    </div>
                  </div>

                  {enrollment.deductible !== undefined && (
                    <div className="flex gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">
                          Deductible:{" "}
                        </span>
                        <span className="font-medium">
                          ${enrollment.deductible.toLocaleString()}
                        </span>
                      </div>
                      {enrollment.outOfPocketMax && (
                        <div>
                          <span className="text-muted-foreground">
                            Max OOP:{" "}
                          </span>
                          <span className="font-medium">
                            ${enrollment.outOfPocketMax.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-muted-foreground text-xs">
                    Effective:{" "}
                    {new Date(enrollment.effectiveDate).toLocaleDateString()}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Dependents */}
        {dependents.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <Users className="h-4 w-4" />
              Dependents ({dependents.length})
            </h3>
            <div className="grid gap-2">
              {dependents.map((dependent) => (
                <Card className="p-3" key={dependent.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{dependent.name}</p>
                      <p className="text-muted-foreground text-xs capitalize">
                        {dependent.relationship.replace(/_/g, " ")} • Born{" "}
                        {new Date(dependent.dateOfBirth).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {dependent.coverageTypes.map((type) => (
                        <Badge
                          className="text-xs"
                          key={type}
                          variant="secondary"
                        >
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Plan Comparison Table */}
        {planComparison && planComparison.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Plan Comparison</h3>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Premium (EE Only)</TableHead>
                      <TableHead>Deductible</TableHead>
                      <TableHead>Max OOP</TableHead>
                      <TableHead>PCP Co-pay</TableHead>
                      <TableHead>Highlights</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planComparison.map((plan) => (
                      <TableRow key={plan.planId}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {plan.planName}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {plan.carrier}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          ${plan.monthlyPremiumEmployeeOnly}/mo
                        </TableCell>
                        <TableCell>
                          ${plan.deductibleIndividual.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          ${plan.outOfPocketMaxIndividual.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {plan.coPayPrimaryCare > 0
                            ? `$${plan.coPayPrimaryCare}`
                            : "After deductible"}
                        </TableCell>
                        <TableCell>
                          <ul className="list-inside list-disc space-y-0.5 text-xs">
                            {plan.highlights
                              .slice(0, 3)
                              .map((highlight, idx) => (
                                <li key={idx}>{highlight}</li>
                              ))}
                          </ul>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}

        {/* Additional Benefits */}
        <Card className="border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
          <h3 className="mb-2 flex items-center gap-2 font-medium text-sm">
            <DollarSign className="h-4 w-4" />
            Additional Benefits
          </h3>
          <div className="space-y-1 text-green-900 text-xs dark:text-green-100">
            {benefits.employerHSAContribution && (
              <p>
                • Employer HSA contribution: $
                {benefits.employerHSAContribution.toLocaleString()}/year
              </p>
            )}
            {benefits.employerRetirementMatch && (
              <p>• 401(k) matching: {benefits.employerRetirementMatch}</p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return null;
}

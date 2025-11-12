import { tool } from "ai";
import { z } from "zod";
import { createModuleLogger } from "@/lib/logger";
import type { StreamWriter } from "../types";

const log = createModuleLogger("ai.tools.benefits-info");

export type BenefitsInfoInput = {
  query: string;
  category?: "medical" | "dental" | "vision" | "retirement" | "all";
  compareMode?: boolean; // if true, return plan comparison
};

export type Dependent = {
  id: string;
  name: string;
  relationship: "spouse" | "domestic_partner" | "child";
  dateOfBirth: string;
  coverageTypes: string[]; // ["medical", "dental"]
};

export type PlanEnrollment = {
  planType: "medical" | "dental" | "vision" | "401k" | "fsa" | "hsa";
  planName: string;
  tier: string; // "Employee Only", "Employee + Spouse", "Family"
  carrier: string;
  monthlyPremium: number; // employee portion
  deductible?: number;
  outOfPocketMax?: number;
  effectiveDate: string; // ISO date
  terminationDate?: string | null; // ISO date, null if active
  status: "active" | "pending" | "terminated";
};

export type PlanOption = {
  planId: string;
  planType: "medical" | "dental" | "vision";
  planName: string;
  carrier: string;
  monthlyPremiumEmployeeOnly: number;
  monthlyPremiumEmployeeSpouse: number;
  monthlyPremiumFamily: number;
  deductibleIndividual: number;
  deductibleFamily: number;
  outOfPocketMaxIndividual: number;
  outOfPocketMaxFamily: number;
  coPayPrimaryCare: number;
  coPaySpecialist: number;
  coverage: {
    inNetworkCoverage: number; // percentage
    outOfNetworkCoverage: number; // percentage
    preventiveCare: "Covered 100%" | "After deductible";
    prescriptionDrugs: string;
  };
  highlights: string[];
};

export type EnrollmentWindow = {
  type: "open_enrollment" | "new_hire" | "qualifying_event";
  startDate: string; // ISO date
  endDate: string; // ISO date
  daysRemaining: number;
  description: string;
};

export type BenefitsInfoOutput =
  | {
      currentEnrollments: PlanEnrollment[];
      dependents: Dependent[];
      enrollmentWindow?: EnrollmentWindow;
      planComparison?: PlanOption[]; // if compareMode is true
      benefits: {
        employerHSAContribution?: number;
        employerRetirementMatch?: string;
        ptoPolicy?: string;
      };
    }
  | {
      error: string;
    };

type BenefitsInfoProps = {
  dataStream: StreamWriter;
};

export const benefitsInfo = ({ dataStream }: BenefitsInfoProps) =>
  tool({
    description: `
      Query employee benefits information including medical, dental, vision, and retirement plans.

      Use this tool when employees ask about:
      - Current benefit enrollments and coverage
      - Dependents on their plan
      - Premium costs and out-of-pocket maximums
      - Enrollment windows and deadlines
      - Comparing different plan options
      - HSA/FSA information
      - 401(k) matching and retirement benefits

      Can provide plan comparisons when employees are deciding between options.
    `,
    inputSchema: z.object({
      query: z.string().describe("The employee's question about benefits"),
      category: z
        .enum(["medical", "dental", "vision", "retirement", "all"])
        .optional(),
      compareMode: z
        .boolean()
        .optional()
        .describe("Set to true to return plan comparison data"),
    }),
    execute: async ({
      query,
      category = "all",
      compareMode = false,
    }: BenefitsInfoInput): Promise<BenefitsInfoOutput> => {
      const startMs = Date.now();
      log.info({ query, category, compareMode }, "benefitsInfo: start");

      dataStream.write({
        type: "data-researchUpdate",
        data: {
          title: "Retrieving benefits information...",
          timestamp: Date.now(),
          type: "started",
        },
      });

      try {
        // Import database queries dynamically
        const {
          getEmployeeByEmployeeId,
          getEnrollmentByEmployeeId,
          getBenefitsPlanById,
          listBenefitsPlans,
          getCurrentEnrollmentPeriod,
          listDependents,
        } = await import("@/lib/db/queries");

        // For now, use a default employee ID since the tool doesn't have employee context
        // In production, this would come from session or be parsed from the query
        const defaultEmployeeId = "EMP001";

        // Get employee data
        const employee = await getEmployeeByEmployeeId(defaultEmployeeId);
        if (!employee) {
          return {
            error: "Employee not found. Please contact HR for assistance.",
          };
        }

        // Get enrollment data for the employee
        const enrollment = await getEnrollmentByEmployeeId(employee.id);

        // Build current enrollments array
        const currentEnrollments: PlanEnrollment[] = [];

        if (enrollment) {
          // Add medical enrollment if exists
          if (
            enrollment.medicalPlanId &&
            (category === "all" || category === "medical")
          ) {
            const medicalPlan = await getBenefitsPlanById(
              enrollment.medicalPlanId
            );
            if (medicalPlan) {
              const monthlyPremium = medicalPlan.monthlyPremium as {
                employeeOnly?: number;
                employeeSpouse?: number;
                family?: number;
              } | null;
              const deductible = medicalPlan.deductible as {
                individual?: number;
                family?: number;
              } | null;
              const outOfPocketMax = medicalPlan.outOfPocketMax as {
                individual?: number;
                family?: number;
              } | null;

              currentEnrollments.push({
                planType: "medical",
                planName: medicalPlan.planName,
                tier: enrollment.medicalCoverageLevel || "Employee Only",
                carrier: medicalPlan.carrier || "Unknown",
                monthlyPremium: enrollment.medicalEmployeeContribution
                  ? Number.parseFloat(enrollment.medicalEmployeeContribution)
                  : 0,
                deductible: deductible?.individual,
                outOfPocketMax: outOfPocketMax?.individual,
                effectiveDate: enrollment.updatedAt.toISOString(),
                terminationDate: null,
                status: "active",
              });
            }
          }

          // Add dental enrollment if exists
          if (
            enrollment.dentalPlanId &&
            (category === "all" || category === "dental")
          ) {
            const dentalPlan = await getBenefitsPlanById(
              enrollment.dentalPlanId
            );
            if (dentalPlan) {
              const coverage = dentalPlan.coverage as {
                annualMaxBenefit?: number;
              } | null;

              currentEnrollments.push({
                planType: "dental",
                planName: dentalPlan.planName,
                tier: enrollment.dentalCoverageLevel || "Employee Only",
                carrier: dentalPlan.carrier || "Unknown",
                monthlyPremium: enrollment.dentalEmployeeContribution
                  ? Number.parseFloat(enrollment.dentalEmployeeContribution)
                  : 0,
                deductible: coverage?.annualMaxBenefit,
                effectiveDate: enrollment.updatedAt.toISOString(),
                terminationDate: null,
                status: "active",
              });
            }
          }

          // Add vision enrollment if exists
          if (
            enrollment.visionPlanId &&
            (category === "all" || category === "vision")
          ) {
            const visionPlan = await getBenefitsPlanById(
              enrollment.visionPlanId
            );
            if (visionPlan) {
              currentEnrollments.push({
                planType: "vision",
                planName: visionPlan.planName,
                tier: enrollment.visionCoverageLevel || "Employee Only",
                carrier: visionPlan.carrier || "Unknown",
                monthlyPremium: enrollment.visionMonthlyPremium
                  ? Number.parseFloat(enrollment.visionMonthlyPremium)
                  : 0,
                effectiveDate: enrollment.updatedAt.toISOString(),
                terminationDate: null,
                status: "active",
              });
            }
          }

          // Add 401k enrollment if exists
          if (category === "all" || category === "retirement") {
            currentEnrollments.push({
              planType: "401k",
              planName: "Traditional 401(k)",
              tier: "Employee",
              carrier: "Fidelity",
              monthlyPremium: 0,
              effectiveDate: enrollment.updatedAt.toISOString(),
              terminationDate: null,
              status: "active",
            });
          }
        }

        // Get dependents
        const dbDependents = enrollment
          ? await listDependents(employee.id)
          : [];
        const dependents: Dependent[] = dbDependents.map((d) => ({
          id: d.id,
          name: d.name,
          relationship: d.relationship as
            | "spouse"
            | "domestic_partner"
            | "child",
          dateOfBirth: d.dateOfBirth,
          coverageTypes: Array.isArray(d.coveredUnder) ? d.coveredUnder : [],
        }));

        // Get enrollment period
        const enrollmentPeriod = await getCurrentEnrollmentPeriod();
        let enrollmentWindow: EnrollmentWindow | undefined;
        if (enrollmentPeriod) {
          const endDate = new Date(enrollmentPeriod.openEnrollmentEnd);
          const now = new Date();
          const daysRemaining = Math.max(
            0,
            Math.ceil(
              (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )
          );

          enrollmentWindow = {
            type: "open_enrollment",
            startDate: enrollmentPeriod.openEnrollmentStart,
            endDate: enrollmentPeriod.openEnrollmentEnd,
            daysRemaining,
            description: `Annual open enrollment period for ${enrollmentPeriod.planYear} benefits. Changes will be effective ${enrollmentPeriod.effectiveDate}.`,
          };
        }

        // Get plan comparison if requested
        let planComparison: PlanOption[] | undefined;
        if (compareMode) {
          const dbPlansResult = await listBenefitsPlans();
          const dbPlans = dbPlansResult.plans;
          planComparison = dbPlans
            .filter((p) => p.category === "medical")
            .map((p) => {
              const monthlyPremium = p.monthlyPremium as {
                employeeOnly?: number;
                employeeSpouse?: number;
                family?: number;
              } | null;
              const deductible = p.deductible as {
                individual?: number;
                family?: number;
              } | null;
              const outOfPocketMax = p.outOfPocketMax as {
                individual?: number;
                family?: number;
              } | null;
              const coverage = p.coverage as Record<string, any> | null;

              return {
                planId: p.planId,
                planType: "medical" as const,
                planName: p.planName,
                carrier: p.carrier || "Unknown",
                monthlyPremiumEmployeeOnly: monthlyPremium?.employeeOnly || 0,
                monthlyPremiumEmployeeSpouse:
                  monthlyPremium?.employeeSpouse || 0,
                monthlyPremiumFamily: monthlyPremium?.family || 0,
                deductibleIndividual: deductible?.individual || 0,
                deductibleFamily: deductible?.family || 0,
                outOfPocketMaxIndividual: outOfPocketMax?.individual || 0,
                outOfPocketMaxFamily: outOfPocketMax?.family || 0,
                coPayPrimaryCare: coverage?.coPayPrimaryCare || 0,
                coPaySpecialist: coverage?.coPaySpecialist || 0,
                coverage: {
                  inNetworkCoverage: coverage?.inNetworkCoverage || 0,
                  outOfNetworkCoverage: coverage?.outOfNetworkCoverage || 0,
                  preventiveCare:
                    (coverage?.preventiveCare as
                      | "Covered 100%"
                      | "After deductible") || "After deductible",
                  prescriptionDrugs:
                    coverage?.prescriptionDrugs || "Not covered",
                },
                highlights: coverage?.highlights || [],
              };
            });
        }

        dataStream.write({
          type: "data-researchUpdate",
          data: {
            title: "Benefits information retrieved",
            timestamp: Date.now(),
            type: "completed",
          },
        });

        log.info({ ms: Date.now() - startMs }, "benefitsInfo: success");

        return {
          currentEnrollments,
          dependents,
          enrollmentWindow,
          planComparison,
          benefits: {
            employerHSAContribution: enrollment?.hsaEmployerContribution
              ? Number.parseFloat(enrollment.hsaEmployerContribution)
              : undefined,
            employerRetirementMatch: enrollment?.retirementEmployerMatchPercent
              ? `${enrollment.retirementEmployerMatchPercent}% match`
              : undefined,
            ptoPolicy: "Check leave balance tool for PTO details",
          },
        };
      } catch (error) {
        log.error({ error }, "benefitsInfo: failure");
        return {
          error: `Failed to retrieve benefits information: ${(error as Error).message}`,
        };
      }
    },
  });

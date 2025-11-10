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

// Mock data
const MOCK_EMPLOYEE_BENEFITS = {
	employeeId: "EMP001",
	employeeName: "John Doe",

	currentEnrollments: [
		{
			planType: "medical" as const,
			planName: "Blue Shield PPO Gold",
			tier: "Employee + Spouse",
			carrier: "Blue Shield of California",
			monthlyPremium: 450,
			deductible: 1500,
			outOfPocketMax: 6000,
			effectiveDate: "2025-01-01",
			terminationDate: null,
			status: "active" as const,
		},
		{
			planType: "dental" as const,
			planName: "Delta Dental PPO",
			tier: "Family",
			carrier: "Delta Dental",
			monthlyPremium: 85,
			deductible: 50,
			outOfPocketMax: 2000,
			effectiveDate: "2025-01-01",
			terminationDate: null,
			status: "active" as const,
		},
		{
			planType: "vision" as const,
			planName: "VSP Vision Care",
			tier: "Employee + Spouse",
			carrier: "VSP",
			monthlyPremium: 18,
			effectiveDate: "2025-01-01",
			terminationDate: null,
			status: "active" as const,
		},
		{
			planType: "401k" as const,
			planName: "Traditional 401(k)",
			tier: "Employee",
			carrier: "Fidelity",
			monthlyPremium: 0, // contribution is pre-tax
			effectiveDate: "2020-04-01",
			terminationDate: null,
			status: "active" as const,
		},
	],

	dependents: [
		{
			id: "DEP001",
			name: "Jane Doe",
			relationship: "spouse" as const,
			dateOfBirth: "1988-07-22",
			coverageTypes: ["medical", "dental", "vision"],
		},
		{
			id: "DEP002",
			name: "Jimmy Doe",
			relationship: "child" as const,
			dateOfBirth: "2015-03-10",
			coverageTypes: ["dental"],
		},
	],

	enrollmentWindow: {
		type: "open_enrollment" as const,
		startDate: "2025-11-01",
		endDate: "2025-11-30",
		daysRemaining: 20,
		description:
			"Annual open enrollment period for 2026 benefits. Changes will be effective January 1, 2026.",
	},

	benefits: {
		employerHSAContribution: 1000, // annual
		employerRetirementMatch: "100% match up to 6% of salary",
		ptoPolicy: "20 vacation days, 12 sick days, 3 personal days per year",
	},
};

const MOCK_PLAN_OPTIONS: PlanOption[] = [
	{
		planId: "MED001",
		planType: "medical",
		planName: "Blue Shield PPO Gold",
		carrier: "Blue Shield of California",
		monthlyPremiumEmployeeOnly: 250,
		monthlyPremiumEmployeeSpouse: 450,
		monthlyPremiumFamily: 650,
		deductibleIndividual: 1500,
		deductibleFamily: 3000,
		outOfPocketMaxIndividual: 6000,
		outOfPocketMaxFamily: 12000,
		coPayPrimaryCare: 25,
		coPaySpecialist: 50,
		coverage: {
			inNetworkCoverage: 80,
			outOfNetworkCoverage: 60,
			preventiveCare: "Covered 100%",
			prescriptionDrugs: "$10 generic, $30 brand name, $50 specialty",
		},
		highlights: [
			"Access to large provider network",
			"No referrals needed for specialists",
			"Higher out-of-pocket costs",
			"Good for frequent healthcare users",
		],
	},
	{
		planId: "MED002",
		planType: "medical",
		planName: "Kaiser HMO Platinum",
		carrier: "Kaiser Permanente",
		monthlyPremiumEmployeeOnly: 200,
		monthlyPremiumEmployeeSpouse: 380,
		monthlyPremiumFamily: 550,
		deductibleIndividual: 500,
		deductibleFamily: 1000,
		outOfPocketMaxIndividual: 4000,
		outOfPocketMaxFamily: 8000,
		coPayPrimaryCare: 15,
		coPaySpecialist: 30,
		coverage: {
			inNetworkCoverage: 100,
			outOfNetworkCoverage: 0,
			preventiveCare: "Covered 100%",
			prescriptionDrugs: "$5 generic, $20 brand name, $40 specialty",
		},
		highlights: [
			"Integrated care model",
			"Lower monthly premiums",
			"Must use Kaiser facilities",
			"Referrals required for specialists",
			"No out-of-network coverage",
		],
	},
	{
		planId: "MED003",
		planType: "medical",
		planName: "Blue Shield HDHP with HSA",
		carrier: "Blue Shield of California",
		monthlyPremiumEmployeeOnly: 150,
		monthlyPremiumEmployeeSpouse: 300,
		monthlyPremiumFamily: 450,
		deductibleIndividual: 3000,
		deductibleFamily: 6000,
		outOfPocketMaxIndividual: 6000,
		outOfPocketMaxFamily: 12000,
		coPayPrimaryCare: 0, // after deductible
		coPaySpecialist: 0, // after deductible
		coverage: {
			inNetworkCoverage: 100,
			outOfNetworkCoverage: 70,
			preventiveCare: "Covered 100%",
			prescriptionDrugs: "After deductible, then 80% covered",
		},
		highlights: [
			"Lowest monthly premium",
			"HSA-eligible (employer contributes $1,000/year)",
			"High deductible",
			"Best for healthy individuals",
			"Tax-advantaged savings",
		],
	},
];

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
				await new Promise((resolve) => setTimeout(resolve, 900));

				const employeeData = MOCK_EMPLOYEE_BENEFITS;

				// Filter enrollments by category if specified
				let enrollments = employeeData.currentEnrollments;
				if (category !== "all") {
					enrollments = enrollments.filter((e) => e.planType === category);
				}

				// Include plan comparison if requested
				let planComparison = undefined;
				if (compareMode) {
					planComparison = MOCK_PLAN_OPTIONS;
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
					currentEnrollments: enrollments,
					dependents: employeeData.dependents,
					enrollmentWindow: employeeData.enrollmentWindow,
					planComparison,
					benefits: employeeData.benefits,
				};
			} catch (error) {
				log.error({ error }, "benefitsInfo: failure");
				return {
					error: `Failed to retrieve benefits information: ${(error as Error).message}`,
				};
			}
		},
	});

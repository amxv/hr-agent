import { tool } from "ai";
import { z } from "zod";
import { createModuleLogger } from "@/lib/logger";
import type { StreamWriter } from "../types";

const log = createModuleLogger("ai.tools.hr-case");

// ===== TYPE DEFINITIONS =====

export type HRCaseInput = {
  action: "create" | "status" | "list";
  category?:
    | "payroll"
    | "benefits"
    | "policy"
    | "equipment"
    | "leave"
    | "performance"
    | "other";
  description?: string;
  caseId?: string;
  attachChat?: boolean;
};

export type CaseCategory =
  | "payroll"
  | "benefits"
  | "policy"
  | "equipment"
  | "leave"
  | "performance"
  | "other";

export type CasePriority = "low" | "medium" | "high" | "urgent";

export type CaseStatus =
  | "new"
  | "assigned"
  | "in_progress"
  | "pending_employee"
  | "resolved"
  | "closed";

export type CaseUpdate = {
  timestamp: string;
  author: string;
  authorRole: "employee" | "hr_specialist" | "system";
  message: string;
  isInternal: boolean;
};

export type HRCase = {
  caseId: string;
  createdDate: string;
  category: CaseCategory;
  priority: CasePriority;
  status: CaseStatus;
  subject: string;
  description: string;
  assignedTo?: string;
  assignedTeam: string;
  sla: {
    firstResponseDue: string;
    firstResponseMet: boolean;
    resolutionDue: string;
    resolutionMet: boolean;
    hoursRemaining: number;
  };
  updates: CaseUpdate[];
  attachments?: string[];
};

export type HRCaseOutput =
  | {
      action: "create";
      case: HRCase;
      message: string;
    }
  | {
      action: "status";
      case: HRCase;
    }
  | {
      action: "list";
      cases: HRCase[];
      totalOpen: number;
      totalClosed: number;
    }
  | {
      error: string;
    };

// ===== CONFIGURATION =====

// SLA configurations by category
const SLA_CONFIG: Record<
  CaseCategory,
  { firstResponseHours: number; resolutionDays: number; priority: CasePriority }
> = {
  payroll: { firstResponseHours: 4, resolutionDays: 2, priority: "high" },
  benefits: { firstResponseHours: 8, resolutionDays: 3, priority: "medium" },
  policy: { firstResponseHours: 24, resolutionDays: 5, priority: "low" },
  equipment: { firstResponseHours: 24, resolutionDays: 7, priority: "low" },
  leave: { firstResponseHours: 8, resolutionDays: 2, priority: "medium" },
  performance: {
    firstResponseHours: 24,
    resolutionDays: 7,
    priority: "medium",
  },
  other: { firstResponseHours: 24, resolutionDays: 5, priority: "low" },
};

// Team assignments by category
const TEAM_ASSIGNMENT: Record<CaseCategory, string> = {
  payroll: "Payroll Services",
  benefits: "Benefits Administration",
  policy: "HR Policy & Compliance",
  equipment: "IT & Facilities",
  leave: "Leave Management",
  performance: "Employee Relations",
  other: "General HR Support",
};

// ===== HELPER FUNCTIONS =====

// Function to classify intent from description (auto-classification logic)
function classifyIntent(description: string): CaseCategory {
  const lower = description.toLowerCase();

  if (
    lower.includes("payroll") ||
    lower.includes("paycheck") ||
    lower.includes("deduction") ||
    lower.includes("salary") ||
    lower.includes("wage")
  ) {
    return "payroll";
  }

  if (
    lower.includes("benefit") ||
    lower.includes("insurance") ||
    lower.includes("medical") ||
    lower.includes("dental") ||
    lower.includes("health") ||
    lower.includes("fsa") ||
    lower.includes("hsa") ||
    lower.includes("401k") ||
    lower.includes("retirement")
  ) {
    return "benefits";
  }

  if (
    lower.includes("policy") ||
    lower.includes("handbook") ||
    lower.includes("rule") ||
    lower.includes("guideline") ||
    lower.includes("compliance")
  ) {
    return "policy";
  }

  if (
    lower.includes("equipment") ||
    lower.includes("laptop") ||
    lower.includes("monitor") ||
    lower.includes("computer") ||
    lower.includes("hardware") ||
    lower.includes("keyboard") ||
    lower.includes("mouse")
  ) {
    return "equipment";
  }

  if (
    lower.includes("leave") ||
    lower.includes("vacation") ||
    lower.includes("pto") ||
    lower.includes("sick day") ||
    lower.includes("time off") ||
    lower.includes("absence")
  ) {
    return "leave";
  }

  if (
    lower.includes("performance") ||
    lower.includes("review") ||
    lower.includes("manager") ||
    lower.includes("feedback") ||
    lower.includes("evaluation")
  ) {
    return "performance";
  }

  return "other";
}

// Generate case ID
function generateCaseId(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 900_000) + 100_000;
  return `HR-${year}-${randomNum}`;
}

// ===== TOOL IMPLEMENTATION =====

type HRCaseProps = {
  dataStream: StreamWriter;
};

export const hrCase = ({ dataStream }: HRCaseProps) =>
  tool({
    description: `
      Create and manage HR support tickets for employee inquiries and issues.

      Use this tool when employees want to:
      - Create a new HR support ticket/case for any HR-related issue
      - Check status of an existing case by case ID
      - List all their cases (open and closed)
      - Report issues with payroll, benefits, equipment, policies, leave, performance, etc.

      The tool automatically classifies the issue type based on the description and assigns appropriate priority and SLA timelines.

      Categories: payroll, benefits, policy, equipment, leave, performance, other

      Examples:
      - "Start a case about a payroll deduction discrepancy"
      - "Check status of case HR-2025-001234"
      - "List all my HR cases"
    `,
    inputSchema: z.object({
      action: z
        .enum(["create", "status", "list"])
        .describe(
          "Action to perform: create new case, check status, or list all cases"
        ),
      category: z
        .enum([
          "payroll",
          "benefits",
          "policy",
          "equipment",
          "leave",
          "performance",
          "other",
        ])
        .optional()
        .describe(
          "Category of the issue (for create action). If not provided, will be auto-classified from description."
        ),
      description: z
        .string()
        .optional()
        .describe(
          "Description of the issue (required for create action). Used for auto-classification if category not provided."
        ),
      caseId: z
        .string()
        .optional()
        .describe(
          "Case ID to query (required for status action, e.g. HR-2025-001234)"
        ),
      attachChat: z
        .boolean()
        .optional()
        .describe(
          "Whether to attach current conversation transcript to the case for context"
        ),
    }),
    execute: async ({
      action,
      category,
      description,
      caseId,
      attachChat = false,
    }: HRCaseInput): Promise<HRCaseOutput> => {
      const startMs = Date.now();
      log.info(
        { action, category, description, caseId, attachChat },
        "hrCase: start"
      );

      // Write start update to stream
      dataStream.write({
        type: "data-researchUpdate",
        data: {
          title: `${action === "create" ? "Creating" : action === "status" ? "Retrieving" : "Listing"} HR case...`,
          timestamp: Date.now(),
          type: "started",
        },
      });

      try {
        // Import database queries dynamically
        const { listHRCases, getHRCaseByCaseId, createHRCase } = await import(
          "@/lib/db/queries"
        );

        // ===== CREATE ACTION =====
        if (action === "create") {
          if (!description) {
            return { error: "Description is required to create a case" };
          }

          // Auto-classify if category not provided
          const finalCategory = category || classifyIntent(description);
          const slaConfig = SLA_CONFIG[finalCategory];

          // Generate case with SLA timelines
          const now = new Date();
          const firstResponseDue = new Date(
            now.getTime() + slaConfig.firstResponseHours * 60 * 60 * 1000
          );
          const resolutionDue = new Date(
            now.getTime() + slaConfig.resolutionDays * 24 * 60 * 60 * 1000
          );

          // Default employee for submission (in production, get from session)
          const submittedBy = "EMP001";
          const submittedByName = "Demo User"; // In production, get from employee record

          // Create the case in database
          const dbCase = await createHRCase(
            {
              title:
                description.slice(0, 100) +
                (description.length > 100 ? "..." : ""),
              description,
              category: finalCategory,
              priority: slaConfig.priority,
              status: "open",
              assignedTeam: TEAM_ASSIGNMENT[finalCategory],
              submittedBy,
              submittedByName,
              createdBy: submittedBy,
              updatedBy: submittedBy,
            },
            submittedBy
          );

          // Build response matching expected format
          const newCase: HRCase = {
            caseId: dbCase.caseId,
            createdDate: dbCase.createdAt.toISOString(),
            category: dbCase.category as CaseCategory,
            priority: dbCase.priority as CasePriority,
            status: dbCase.status as CaseStatus,
            subject: dbCase.title,
            description: dbCase.description,
            assignedTo: undefined,
            assignedTeam: dbCase.assignedTeam,
            sla: {
              firstResponseDue: dbCase.firstResponseDue.toISOString(),
              firstResponseMet: false,
              resolutionDue: dbCase.resolutionDue.toISOString(),
              resolutionMet: false,
              hoursRemaining: slaConfig.resolutionDays * 24,
            },
            updates: [],
            attachments: attachChat
              ? ["Chat conversation transcript"]
              : undefined,
          };

          dataStream.write({
            type: "data-researchUpdate",
            data: {
              title: "HR case created successfully",
              timestamp: Date.now(),
              type: "completed",
            },
          });

          log.info(
            { ms: Date.now() - startMs, caseId: newCase.caseId },
            "hrCase: create success"
          );

          return {
            action: "create",
            case: newCase,
            message: `Case ${newCase.caseId} created successfully. The ${newCase.assignedTeam} team will respond within ${slaConfig.firstResponseHours} hours.`,
          };
        }

        // ===== STATUS ACTION =====
        if (action === "status") {
          if (!caseId) {
            return { error: "Case ID is required to check status" };
          }

          const dbCase = await getHRCaseByCaseId(caseId);
          if (!dbCase) {
            return { error: `Case ${caseId} not found` };
          }

          // Calculate SLA hours remaining
          const resolutionDueDate = new Date(dbCase.resolutionDue);
          const now = new Date();
          const hoursRemaining = Math.round(
            (resolutionDueDate.getTime() - now.getTime()) / (1000 * 60 * 60)
          );

          const existingCase: HRCase = {
            caseId: dbCase.caseId,
            createdDate: dbCase.createdAt.toISOString(),
            category: dbCase.category as CaseCategory,
            priority: dbCase.priority as CasePriority,
            status: dbCase.status as CaseStatus,
            subject: dbCase.title,
            description: dbCase.description,
            assignedTo: undefined,
            assignedTeam: dbCase.assignedTeam,
            sla: {
              firstResponseDue: dbCase.firstResponseDue.toISOString(),
              firstResponseMet: dbCase.firstResponseMet,
              resolutionDue: dbCase.resolutionDue.toISOString(),
              resolutionMet:
                dbCase.status === "resolved" || dbCase.status === "closed",
              hoursRemaining,
            },
            updates:
              dbCase.updates?.map((u) => ({
                timestamp: u.timestamp.toISOString(),
                author: u.author,
                authorRole: (u.type === "system"
                  ? "system"
                  : u.type === "hr_response"
                    ? "hr_specialist"
                    : "employee") as "employee" | "hr_specialist" | "system",
                message: u.message,
                isInternal: u.visibility === "internal",
              })) || [],
          };

          dataStream.write({
            type: "data-researchUpdate",
            data: {
              title: "Case status retrieved",
              timestamp: Date.now(),
              type: "completed",
            },
          });

          log.info(
            { ms: Date.now() - startMs, caseId },
            "hrCase: status success"
          );

          return {
            action: "status",
            case: existingCase,
          };
        }

        // ===== LIST ACTION =====
        if (action === "list") {
          const dbCasesResult = await listHRCases();

          const cases: HRCase[] = dbCasesResult.cases.map((dbCase) => {
            const resolutionDueDate = new Date(dbCase.resolutionDue);
            const now = new Date();
            const hoursRemaining = Math.round(
              (resolutionDueDate.getTime() - now.getTime()) / (1000 * 60 * 60)
            );

            return {
              caseId: dbCase.caseId,
              createdDate: dbCase.createdAt.toISOString(),
              category: dbCase.category as CaseCategory,
              priority: dbCase.priority as CasePriority,
              status: dbCase.status as CaseStatus,
              subject: dbCase.title,
              description: dbCase.description,
              assignedTo: undefined,
              assignedTeam: dbCase.assignedTeam,
              sla: {
                firstResponseDue: dbCase.firstResponseDue.toISOString(),
                firstResponseMet: dbCase.firstResponseMet,
                resolutionDue: dbCase.resolutionDue.toISOString(),
                resolutionMet:
                  dbCase.status === "resolved" || dbCase.status === "closed",
                hoursRemaining,
              },
              updates: [],
            };
          });

          const openCases = cases.filter(
            (c) => c.status !== "resolved" && c.status !== "closed"
          );
          const closedCases = cases.filter(
            (c) => c.status === "resolved" || c.status === "closed"
          );

          dataStream.write({
            type: "data-researchUpdate",
            data: {
              title: "Cases retrieved",
              timestamp: Date.now(),
              type: "completed",
            },
          });

          log.info(
            { ms: Date.now() - startMs, openCount: openCases.length },
            "hrCase: list success"
          );

          return {
            action: "list",
            cases,
            totalOpen: openCases.length,
            totalClosed: closedCases.length,
          };
        }

        return { error: "Invalid action" };
      } catch (error) {
        log.error({ error }, "hrCase: failure");
        return {
          error: `Failed to ${action} HR case: ${(error as Error).message}`,
        };
      }
    },
  });

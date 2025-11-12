import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  json,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ============================================================================
// HR Data Enums
// ============================================================================

// Employment and Work Mode
export const employmentStatusEnum = pgEnum("employment_status", [
  "active",
  "probation",
  "leave_of_absence",
  "notice_period",
  "terminated",
]);

export const workModeEnum = pgEnum("work_mode", ["office", "remote", "hybrid"]);

// Leave Management
export const leaveTypeEnum = pgEnum("leave_type", [
  "vacation",
  "sick",
  "personal",
]);

export const accrualScheduleEnum = pgEnum("accrual_schedule", [
  "monthly",
  "bi_weekly",
  "quarterly",
  "annually",
]);

export const absenceTypeEnum = pgEnum("absence_type", [
  "vacation",
  "sick",
  "personal",
  "other",
]);

export const leaveRequestStatusEnum = pgEnum("leave_request_status", [
  "pending",
  "approved",
  "denied",
]);

// Benefits
export const benefitsCategoryEnum = pgEnum("benefits_category", [
  "medical",
  "dental",
  "vision",
  "retirement",
  "hsa_fsa",
]);

export const relationshipEnum = pgEnum("relationship", [
  "spouse",
  "domestic_partner",
  "child",
  "other",
]);

// HR Cases
export const caseCategoryEnum = pgEnum("case_category", [
  "payroll",
  "benefits",
  "policy",
  "equipment",
  "leave",
  "performance",
  "other",
]);

export const casePriorityEnum = pgEnum("case_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const caseStatusEnum = pgEnum("case_status", [
  "open",
  "in_progress",
  "pending_info",
  "resolved",
  "closed",
]);

export const caseUpdateTypeEnum = pgEnum("case_update_type", [
  "system",
  "hr_response",
  "internal_note",
  "status_change",
]);

export const updateVisibilityEnum = pgEnum("update_visibility", [
  "public",
  "internal",
]);

// ============================================================================
// Existing Tables
// ============================================================================

export type User = InferSelectModel<typeof user>;

export const userCredit = pgTable("UserCredit", {
  userId: text("userId")
    .primaryKey()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  credits: integer("credits").notNull().default(10_000),
  reservedCredits: integer("reservedCredits").notNull().default(0),
});

export type UserCredit = InferSelectModel<typeof userCredit>;

export const uploadedDocument = pgTable(
  "UploadedDocument",
  {
    // Identity
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    filename: text("filename").notNull(),

    // Ownership and timestamps
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),

    // File metadata
    fileSize: integer("file_size").notNull(),
    contentType: text("content_type").notNull(),

    // Storage references
    blobUrl: text("blob_url").notNull(),
    blobPathname: text("blob_pathname").notNull(),

    // OpenAI references
    openaiFileId: text("openai_file_id").notNull().unique(),
    vectorStoreId: text("vector_store_id").notNull(),

    // Processing status
    status: varchar("status", {
      enum: ["uploading", "processing", "ready", "failed"],
    })
      .notNull()
      .default("uploading"),
    errorMessage: text("error_message"),

    // Organization
    tags: json("tags").$type<string[]>().notNull().default([]),
  },
  (table) => ({
    uploadedByIdx: index("uploaded_document_uploaded_by_idx").on(
      table.uploadedBy
    ),
    statusIdx: index("uploaded_document_status_idx").on(table.status),
    vectorStoreIdx: index("uploaded_document_vector_store_id_idx").on(
      table.vectorStoreId
    ),
    deletedAtIdx: index("uploaded_document_deleted_at_idx").on(table.deletedAt),
  })
);

export const vectorStoreConfig = pgTable("VectorStoreConfig", {
  id: text("id").primaryKey().default("singleton"),
  vectorStoreId: text("vector_store_id").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UploadedDocument = InferSelectModel<typeof uploadedDocument>;
export type InsertUploadedDocument = InferInsertModel<typeof uploadedDocument>;
export type VectorStoreConfig = InferSelectModel<typeof vectorStoreConfig>;
export type InsertVectorStoreConfig = InferInsertModel<
  typeof vectorStoreConfig
>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  title: text("title").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  isPinned: boolean("isPinned").notNull().default(false),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id, {
      onDelete: "cascade",
    }),
  parentMessageId: uuid("parentMessageId"),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  annotations: json("annotations"),
  isPartial: boolean("isPartial").notNull().default(false),
  selectedModel: varchar("selectedModel", { length: 256 }).default(""),
  selectedTool: varchar("selectedTool", { length: 256 }).default(""),
  lastContext: json("lastContext"),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
  "Vote",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id, {
        onDelete: "cascade",
      }),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id, {
        onDelete: "cascade",
      }),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  })
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "sheet"] })
      .notNull()
      .default("text"),
    userId: text("userId")
      .notNull()
      .references(() => user.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id, {
        onDelete: "cascade",
      }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.createdAt] }),
  })
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: text("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const schema = { user, session, account, verification };

// ============================================================================
// HR Data Tables
// ============================================================================

// Employee Table
export const employee = pgTable(
  "employee",
  {
    // Identity
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    employeeId: text("employee_id").notNull().unique(),

    // Personal Information
    fullName: text("full_name").notNull(),
    preferredName: text("preferred_name"),
    email: text("email").notNull(),
    phoneExtension: text("phone_extension"),

    // Job Information
    jobTitle: text("job_title").notNull(),
    department: text("department").notNull(),
    team: text("team"),

    // Organizational Hierarchy
    managerId: uuid("manager_id").references((): any => employee.id, {
      onDelete: "set null",
    }),
    directReports: json("direct_reports")
      .$type<string[]>()
      .notNull()
      .default([]),

    // Employment Status and Location
    employmentStatus: employmentStatusEnum("employment_status").notNull(),
    location: text("location").notNull(),
    workMode: workModeEnum("work_mode").notNull(),
    officeLocation: text("office_location"),

    // Work Authorization
    workAuthorization: json("work_authorization")
      .$type<{
        status: string;
        expiryDate: string | null;
        requiresRenewal: boolean;
        daysUntilExpiry: number | null;
      }>()
      .notNull(),

    // Tenure
    startDate: date("start_date").notNull(),
    yearsOfService: numeric("years_of_service", {
      precision: 4,
      scale: 1,
    }).notNull(),

    // Skills and Certifications
    skills: json("skills").$type<string[]>().notNull().default([]),
    certifications: json("certifications")
      .$type<string[]>()
      .notNull()
      .default([]),

    // Status-Specific Dates
    expectedReturnDate: date("expected_return_date"),
    probationEndDate: date("probation_end_date"),
    lastWorkingDay: date("last_working_day"),

    // Audit Fields
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    employeeIdIdx: index("employee_employee_id_idx").on(table.employeeId),
    userIdIdx: index("employee_user_id_idx").on(table.userId),
    employmentStatusIdx: index("employee_employment_status_idx").on(
      table.employmentStatus
    ),
    departmentIdx: index("employee_department_idx").on(table.department),
    managerIdIdx: index("employee_manager_id_idx").on(table.managerId),
    emailIdx: index("employee_email_idx").on(table.email),
  })
);

// Leave Balance Table
export const leaveBalance = pgTable(
  "leave_balance",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employee.id, { onDelete: "cascade" }),
    leaveType: leaveTypeEnum("leave_type").notNull(),

    // Balance Fields
    currentBalance: numeric("current_balance", {
      precision: 5,
      scale: 2,
    }).notNull(),
    accruedYTD: numeric("accrued_ytd", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    usedYTD: numeric("used_ytd", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),

    // Accrual Configuration
    accrualRate: numeric("accrual_rate", { precision: 5, scale: 2 }).notNull(),
    accrualSchedule: accrualScheduleEnum("accrual_schedule").notNull(),

    // Carryover
    carryoverLimit: integer("carryover_limit").notNull().default(0),
    carryoverDeadline: date("carryover_deadline"),

    // Projection
    projectedYearEnd: numeric("projected_year_end", {
      precision: 5,
      scale: 2,
    }).notNull(),

    // Audit Fields
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    employeeLeaveTypeIdx: uniqueIndex(
      "leave_balance_employee_leave_type_idx"
    ).on(table.employeeId, table.leaveType),
    leaveTypeIdx: index("leave_balance_leave_type_idx").on(table.leaveType),
    currentBalanceCheck: check(
      "leave_balance_current_balance_check",
      sql`${table.currentBalance} >= 0`
    ),
  })
);

// Blackout Date Table
export const blackoutDate = pgTable(
  "blackout_date",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    reason: text("reason").notNull(),
    department: text("department"),

    // Audit Fields
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    departmentIdx: index("blackout_date_department_idx").on(table.department),
    startDateIdx: index("blackout_date_start_date_idx").on(table.startDate),
    endDateIdx: index("blackout_date_end_date_idx").on(table.endDate),
  })
);

// Leave Policy Table
export const leavePolicy = pgTable("leave_policy", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  department: text("department").unique(),
  minimumNotice: integer("minimum_notice").notNull(),
  maxConsecutiveDays: integer("max_consecutive_days").notNull(),
  requireApproval: boolean("require_approval").notNull().default(true),

  // Audit Fields
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  updatedBy: text("updated_by")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Benefits Plan Table
export const benefitsPlan = pgTable(
  "benefits_plan",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    planId: text("plan_id").notNull().unique(),
    category: benefitsCategoryEnum("category").notNull(),
    planName: text("plan_name").notNull(),
    carrier: text("carrier"),
    type: text("type"),

    // Cost Fields
    monthlyPremium: json("monthly_premium").$type<{
      employeeOnly?: number;
      employeeSpouse?: number;
      family?: number;
    }>(),
    deductible: json("deductible").$type<{
      individual?: number;
      family?: number;
    }>(),
    outOfPocketMax: json("out_of_pocket_max").$type<{
      individual?: number;
      family?: number;
    }>(),

    // Plan-Specific Fields
    coverage: json("coverage").$type<Record<string, any>>(),
    annualMaximum: integer("annual_maximum"),
    employerMatchPercent: numeric("employer_match_percent", {
      precision: 5,
      scale: 2,
    }),
    vestingSchedule: text("vesting_schedule"),

    // Audit Fields
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    planIdIdx: index("benefits_plan_plan_id_idx").on(table.planId),
    categoryIdx: index("benefits_plan_category_idx").on(table.category),
  })
);

// Benefits Enrollment Table
export const benefitsEnrollment = pgTable(
  "benefits_enrollment",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .unique()
      .references(() => employee.id, { onDelete: "cascade" }),

    // Medical Enrollment
    medicalPlanId: uuid("medical_plan_id").references(() => benefitsPlan.id, {
      onDelete: "set null",
    }),
    medicalCoverageLevel: text("medical_coverage_level"),
    medicalMonthlyPremium: numeric("medical_monthly_premium", {
      precision: 8,
      scale: 2,
    }),
    medicalEmployeeContribution: numeric("medical_employee_contribution", {
      precision: 8,
      scale: 2,
    }),
    medicalEmployerContribution: numeric("medical_employer_contribution", {
      precision: 8,
      scale: 2,
    }),
    medicalEnrollmentDate: date("medical_enrollment_date"),

    // Dental Enrollment
    dentalPlanId: uuid("dental_plan_id").references(() => benefitsPlan.id, {
      onDelete: "set null",
    }),
    dentalCoverageLevel: text("dental_coverage_level"),
    dentalMonthlyPremium: numeric("dental_monthly_premium", {
      precision: 8,
      scale: 2,
    }),
    dentalEmployeeContribution: numeric("dental_employee_contribution", {
      precision: 8,
      scale: 2,
    }),
    dentalEmployerContribution: numeric("dental_employer_contribution", {
      precision: 8,
      scale: 2,
    }),

    // Vision Enrollment
    visionPlanId: uuid("vision_plan_id").references(() => benefitsPlan.id, {
      onDelete: "set null",
    }),
    visionCoverageLevel: text("vision_coverage_level"),
    visionMonthlyPremium: numeric("vision_monthly_premium", {
      precision: 8,
      scale: 2,
    }),

    // Retirement Enrollment
    retirementPlanId: uuid("retirement_plan_id").references(
      () => benefitsPlan.id,
      {
        onDelete: "set null",
      }
    ),
    retirementEmployeeContributionPercent: numeric(
      "retirement_employee_contribution_percent",
      {
        precision: 5,
        scale: 2,
      }
    ),
    retirementEmployerMatchPercent: numeric(
      "retirement_employer_match_percent",
      {
        precision: 5,
        scale: 2,
      }
    ),
    retirementCurrentBalance: numeric("retirement_current_balance", {
      precision: 12,
      scale: 2,
    }),
    retirementVestingSchedule: text("retirement_vesting_schedule"),

    // HSA/FSA
    hsaEmployerContribution: numeric("hsa_employer_contribution", {
      precision: 8,
      scale: 2,
    }),
    hsaEmployeeContribution: numeric("hsa_employee_contribution", {
      precision: 8,
      scale: 2,
    }),
    fsaElection: numeric("fsa_election", { precision: 8, scale: 2 }),

    // Audit Fields
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    employeeIdIdx: index("benefits_enrollment_employee_id_idx").on(
      table.employeeId
    ),
    medicalPlanIdIdx: index("benefits_enrollment_medical_plan_id_idx").on(
      table.medicalPlanId
    ),
    dentalPlanIdIdx: index("benefits_enrollment_dental_plan_id_idx").on(
      table.dentalPlanId
    ),
    visionPlanIdIdx: index("benefits_enrollment_vision_plan_id_idx").on(
      table.visionPlanId
    ),
  })
);

// Dependent Table
export const dependent = pgTable(
  "dependent",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employee.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    relationship: relationshipEnum("relationship").notNull(),
    dateOfBirth: date("date_of_birth").notNull(),
    coveredUnder: json("covered_under").$type<string[]>().notNull().default([]),

    // Audit Fields
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    employeeIdIdx: index("dependent_employee_id_idx").on(table.employeeId),
  })
);

// Enrollment Period Table
export const enrollmentPeriod = pgTable(
  "enrollment_period",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    planYear: integer("plan_year").notNull().unique(),
    openEnrollmentStart: date("open_enrollment_start").notNull(),
    openEnrollmentEnd: date("open_enrollment_end").notNull(),
    effectiveDate: date("effective_date").notNull(),

    // Audit Fields
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    planYearIdx: index("enrollment_period_plan_year_idx").on(table.planYear),
  })
);

// HR Case Table
export const hrCase = pgTable(
  "hr_case",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    caseId: text("case_id").notNull().unique(),
    title: text("title").notNull(),
    category: caseCategoryEnum("category").notNull(),
    description: text("description").notNull(),
    priority: casePriorityEnum("priority").notNull(),
    status: caseStatusEnum("status").notNull(),

    // Submitter and Assignment
    submittedBy: uuid("submitted_by").references(() => employee.id, {
      onDelete: "set null",
    }),
    submittedByName: text("submitted_by_name").notNull(),
    assignedTeam: text("assigned_team").notNull(),

    // SLA Fields
    firstResponseDue: timestamp("first_response_due").notNull(),
    firstResponseMet: boolean("first_response_met").notNull().default(false),
    resolutionDue: timestamp("resolution_due").notNull(),
    slaHoursRemaining: numeric("sla_hours_remaining", {
      precision: 8,
      scale: 2,
    }),

    // Audit Fields
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    caseIdIdx: index("hr_case_case_id_idx").on(table.caseId),
    statusIdx: index("hr_case_status_idx").on(table.status),
    categoryIdx: index("hr_case_category_idx").on(table.category),
    submittedByIdx: index("hr_case_submitted_by_idx").on(table.submittedBy),
    createdAtIdx: index("hr_case_created_at_idx").on(table.createdAt),
    assignedTeamIdx: index("hr_case_assigned_team_idx").on(table.assignedTeam),
  })
);

// Case Update Table
export const caseUpdate = pgTable(
  "case_update",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => hrCase.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    author: text("author").notNull(),
    type: caseUpdateTypeEnum("type").notNull(),
    message: text("message").notNull(),
    visibility: updateVisibilityEnum("visibility").notNull().default("public"),
    createdBy: text("created_by").references(() => user.id),
  },
  (table) => ({
    caseIdIdx: index("case_update_case_id_idx").on(table.caseId),
    caseIdTimestampIdx: index("case_update_case_id_timestamp_idx").on(
      table.caseId,
      table.timestamp
    ),
  })
);

// Absence Table
export const absence = pgTable(
  "absence",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employee.id, { onDelete: "cascade" }),
    absenceType: absenceTypeEnum("absence_type").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    totalDays: numeric("total_days", { precision: 5, scale: 1 }).notNull(),
    approvalDate: date("approval_date").notNull(),
    approvedBy: uuid("approved_by").references(() => employee.id, {
      onDelete: "set null",
    }),

    // Audit Fields
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    employeeIdIdx: index("absence_employee_id_idx").on(table.employeeId),
    startDateIdx: index("absence_start_date_idx").on(table.startDate),
    endDateIdx: index("absence_end_date_idx").on(table.endDate),
    absenceTypeIdx: index("absence_absence_type_idx").on(table.absenceType),
  })
);

// Leave Request Table
export const leaveRequest = pgTable(
  "leave_request",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    requestId: text("request_id").notNull().unique(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employee.id, { onDelete: "cascade" }),
    requestType: absenceTypeEnum("request_type").notNull(),
    requestedStartDate: date("requested_start_date").notNull(),
    requestedEndDate: date("requested_end_date").notNull(),
    totalDaysRequested: numeric("total_days_requested", {
      precision: 5,
      scale: 1,
    }).notNull(),
    submittedDate: date("submitted_date").notNull().defaultNow(),
    status: leaveRequestStatusEnum("status").notNull().default("pending"),

    // Conflict Tracking
    hasConflict: boolean("has_conflict").notNull().default(false),
    conflictsWith: json("conflicts_with")
      .$type<string[]>()
      .notNull()
      .default([]),
    conflictReason: text("conflict_reason"),
    coveragePercent: integer("coverage_percent"),
    notes: text("notes"),

    // Review
    reviewedBy: text("reviewed_by").references(() => user.id),
    reviewedAt: timestamp("reviewed_at"),

    // Audit Fields
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    requestIdIdx: index("leave_request_request_id_idx").on(table.requestId),
    employeeIdIdx: index("leave_request_employee_id_idx").on(table.employeeId),
    statusIdx: index("leave_request_status_idx").on(table.status),
    requestedStartDateIdx: index("leave_request_requested_start_date_idx").on(
      table.requestedStartDate
    ),
    requestedEndDateIdx: index("leave_request_requested_end_date_idx").on(
      table.requestedEndDate
    ),
  })
);

// ============================================================================
// Type Exports - Base Types
// ============================================================================

// Employee Types
export type Employee = InferSelectModel<typeof employee>;
export type InsertEmployee = InferInsertModel<typeof employee>;

// Leave Balance Types
export type LeaveBalance = InferSelectModel<typeof leaveBalance>;
export type InsertLeaveBalance = InferInsertModel<typeof leaveBalance>;

// Blackout Date Types
export type BlackoutDate = InferSelectModel<typeof blackoutDate>;
export type InsertBlackoutDate = InferInsertModel<typeof blackoutDate>;

// Leave Policy Types
export type LeavePolicy = InferSelectModel<typeof leavePolicy>;
export type InsertLeavePolicy = InferInsertModel<typeof leavePolicy>;

// Benefits Plan Types
export type BenefitsPlan = InferSelectModel<typeof benefitsPlan>;
export type InsertBenefitsPlan = InferInsertModel<typeof benefitsPlan>;

// Benefits Enrollment Types
export type BenefitsEnrollment = InferSelectModel<typeof benefitsEnrollment>;
export type InsertBenefitsEnrollment = InferInsertModel<
  typeof benefitsEnrollment
>;

// Dependent Types
export type Dependent = InferSelectModel<typeof dependent>;
export type InsertDependent = InferInsertModel<typeof dependent>;

// Enrollment Period Types
export type EnrollmentPeriod = InferSelectModel<typeof enrollmentPeriod>;
export type InsertEnrollmentPeriod = InferInsertModel<typeof enrollmentPeriod>;

// HR Case Types
export type HRCase = InferSelectModel<typeof hrCase>;
export type InsertHRCase = InferInsertModel<typeof hrCase>;

// Case Update Types
export type CaseUpdate = InferSelectModel<typeof caseUpdate>;
export type InsertCaseUpdate = InferInsertModel<typeof caseUpdate>;

// Absence Types
export type Absence = InferSelectModel<typeof absence>;
export type InsertAbsence = InferInsertModel<typeof absence>;

// Leave Request Types
export type LeaveRequest = InferSelectModel<typeof leaveRequest>;
export type InsertLeaveRequest = InferInsertModel<typeof leaveRequest>;

// ============================================================================
// Type Exports - Enum Types
// ============================================================================

export type EmploymentStatus = (typeof employmentStatusEnum.enumValues)[number];
export type WorkMode = (typeof workModeEnum.enumValues)[number];
export type LeaveType = (typeof leaveTypeEnum.enumValues)[number];
export type AccrualSchedule = (typeof accrualScheduleEnum.enumValues)[number];
export type AbsenceType = (typeof absenceTypeEnum.enumValues)[number];
export type LeaveRequestStatus =
  (typeof leaveRequestStatusEnum.enumValues)[number];
export type BenefitsCategory = (typeof benefitsCategoryEnum.enumValues)[number];
export type Relationship = (typeof relationshipEnum.enumValues)[number];
export type CaseCategory = (typeof caseCategoryEnum.enumValues)[number];
export type CasePriority = (typeof casePriorityEnum.enumValues)[number];
export type CaseStatus = (typeof caseStatusEnum.enumValues)[number];
export type CaseUpdateType = (typeof caseUpdateTypeEnum.enumValues)[number];
export type UpdateVisibility = (typeof updateVisibilityEnum.enumValues)[number];

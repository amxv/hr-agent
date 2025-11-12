import { TRPCError } from "@trpc/server";
import { and, count, eq, ilike, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { user, userCredit } from "@/lib/db/schema";
import { generateSecurePassword } from "@/lib/utils/password";
import { adminProcedure, createTRPCRouter } from "@/trpc/init";

export const adminRouter = createTRPCRouter({
  listUsers: adminProcedure
    .input(
      z.object({
        searchValue: z.string().optional(),
        searchField: z.enum(["email", "name"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        filterField: z.enum(["role", "status"]).optional(),
        filterValue: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const whereConditions = [];

      // Apply search filter
      if (input.searchValue && input.searchField) {
        if (input.searchField === "email") {
          whereConditions.push(ilike(user.email, `%${input.searchValue}%`));
        } else if (input.searchField === "name") {
          whereConditions.push(ilike(user.name, `%${input.searchValue}%`));
        }
      }

      // Apply role filter
      if (input.filterField === "role" && input.filterValue) {
        whereConditions.push(eq(user.role, input.filterValue));
      }

      // Apply status filter
      if (input.filterField === "status" && input.filterValue) {
        if (input.filterValue === "active") {
          whereConditions.push(eq(user.banned, false));
        } else if (input.filterValue === "inactive") {
          whereConditions.push(eq(user.banned, true));
        }
      }

      // Query users with filters and credits
      const users = await db
        .select({
          user,
          credits: userCredit.credits,
        })
        .from(user)
        .leftJoin(userCredit, eq(user.id, userCredit.userId))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .limit(input.limit)
        .offset(input.offset);

      // Query total count
      const [totalResult] = await db
        .select({ count: count() })
        .from(user)
        .where(
          whereConditions.length > 0 ? and(...whereConditions) : undefined
        );

      // Transform users to include status field and credits
      const transformedUsers = users.map((row) => ({
        id: row.user.id,
        email: row.user.email,
        name: row.user.name,
        role: (row.user.role || "user") as "admin" | "user",
        status: (row.user.banned ? "inactive" : "active") as
          | "active"
          | "inactive",
        createdAt: row.user.createdAt,
        banned: row.user.banned || false,
        banReason: row.user.banReason,
        credits: row.credits ?? 0,
      }));

      return {
        users: transformedUsers,
        total: totalResult?.count || 0,
      };
    }),

  createUser: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(1),
        password: z.string().min(8).optional(),
        role: z.enum(["admin", "user"]).default("user"),
      })
    )
    .mutation(async ({ input }) => {
      // Generate password if not provided
      const passwordWasGenerated = !input.password;
      const password = input.password || generateSecurePassword(16);

      try {
        // Call Better Auth admin API to create user
        const result = await auth.api.createUser({
          body: {
            email: input.email,
            name: input.name,
            password,
            role: input.role,
          },
          headers: await headers(),
        });

        return {
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role || "user",
          },
          generatedPassword: passwordWasGenerated ? password : undefined,
        };
      } catch (error) {
        // Handle duplicate email error
        if (
          error instanceof Error &&
          (error.message.includes("duplicate") ||
            error.message.includes("unique") ||
            error.message.includes("email"))
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Email already exists",
          });
        }
        throw error;
      }
    }),

  updateUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Update user email directly via database
        await db
          .update(user)
          .set({ email: input.email })
          .where(eq(user.id, input.userId));

        return { success: true };
      } catch (error) {
        // Handle duplicate email error
        if (
          error instanceof Error &&
          (error.message.includes("duplicate") ||
            error.message.includes("unique") ||
            error.message.includes("email"))
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Email already exists",
          });
        }
        throw error;
      }
    }),

  resetUserPassword: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      // Call Better Auth admin API to reset password
      await auth.api.setUserPassword({
        body: {
          userId: input.userId,
          newPassword: input.newPassword,
        },
        headers: await headers(),
      });

      return { success: true };
    }),

  deactivateUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Prevent self-deactivation
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot deactivate yourself",
        });
      }

      // Check if this is the last admin
      const [targetUser] = await db
        .select()
        .from(user)
        .where(eq(user.id, input.userId));

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (targetUser.role === "admin") {
        // Count active admins
        const [result] = await db
          .select({ count: count() })
          .from(user)
          .where(and(eq(user.role, "admin"), eq(user.banned, false)));

        if (result && result.count <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot deactivate the last admin",
          });
        }
      }

      // Deactivate via ban system
      await auth.api.banUser({
        body: {
          userId: input.userId,
          banReason: "User deactivated by admin",
        },
        headers: await headers(),
      });

      return { success: true };
    }),

  reactivateUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Call Better Auth admin API to unban user
      await auth.api.unbanUser({
        body: { userId: input.userId },
        headers: await headers(),
      });

      return { success: true };
    }),

  // ============================================================================
  // HR Data Management - Employee Procedures
  // ============================================================================

  hr: {
    employees: {
      list: adminProcedure
        .input(
          z.object({
            searchField: z
              .enum(["fullName", "email", "employeeId", "department"])
              .optional(),
            searchValue: z.string().optional(),
            employmentStatus: z.string().optional(),
            department: z.string().optional(),
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
          })
        )
        .query(async ({ input }) => {
          const { listEmployees } = await import("@/lib/db/queries");
          return await listEmployees(input);
        }),

      get: adminProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
          const { getEmployeeById } = await import("@/lib/db/queries");
          const employee = await getEmployeeById(input.id);
          if (!employee) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Employee not found",
            });
          }
          return employee;
        }),

      create: adminProcedure
        .input(
          z.object({
            employeeId: z.string().min(1),
            fullName: z.string().min(1),
            email: z.string().email(),
            phoneExtension: z.string().optional(),
            jobTitle: z.string().min(1),
            department: z.string().min(1),
            location: z.string().min(1),
            city: z.string().min(1),
            country: z.string().min(1),
            timezone: z.string().min(1),
            workMode: z.enum(["office", "remote", "hybrid"]),
            employmentStatus: z.enum([
              "active",
              "probation",
              "leave_of_absence",
              "notice_period",
              "terminated",
            ]),
            hireDate: z.string(),
            startDate: z.string(),
            managerId: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { createEmployee } = await import("@/lib/db/queries");
          return await createEmployee({
            ...input,
            userId: ctx.user.id, // Link to user account
            workAuthorization: {
              status: "citizen",
              expiryDate: null,
              requiresRenewal: false,
              daysUntilExpiry: null,
            }, // Default value
            yearsOfService: "0", // Will be calculated based on hire date
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          });
        }),

      update: adminProcedure
        .input(
          z.object({
            id: z.string(),
            data: z.object({
              fullName: z.string().optional(),
              email: z.string().email().optional(),
              phoneExtension: z.string().optional(),
              jobTitle: z.string().optional(),
              department: z.string().optional(),
              location: z.string().optional(),
              workMode: z.enum(["office", "remote", "hybrid"]).optional(),
              employmentStatus: z
                .enum([
                  "active",
                  "probation",
                  "leave_of_absence",
                  "notice_period",
                  "terminated",
                ])
                .optional(),
              managerId: z.string().optional(),
            }),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { updateEmployee } = await import("@/lib/db/queries");
          return await updateEmployee(input.id, input.data, ctx.user.id);
        }),

      delete: adminProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input, ctx }) => {
          const { softDeleteEmployee } = await import("@/lib/db/queries");
          await softDeleteEmployee(input.id, ctx.user.id);
          return { success: true };
        }),
    },

    // Leave Balance Procedures
    leaveBalances: {
      list: adminProcedure
        .input(
          z.object({
            employeeId: z.string().optional(),
            leaveType: z.string().optional(),
            department: z.string().optional(),
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
          })
        )
        .query(async ({ input }) => {
          const { listLeaveBalances } = await import("@/lib/db/queries");
          return await listLeaveBalances(input);
        }),

      update: adminProcedure
        .input(
          z.object({
            employeeId: z.string(),
            leaveType: z.string(),
            data: z.object({
              currentBalance: z.string().optional(),
              accrued: z.string().optional(),
              used: z.string().optional(),
            }),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { updateLeaveBalance } = await import("@/lib/db/queries");
          return await updateLeaveBalance(
            input.employeeId,
            input.leaveType,
            input.data,
            ctx.user.id
          );
        }),
    },

    blackoutDates: {
      list: adminProcedure
        .input(
          z.object({
            department: z.string().optional(),
            startDate: z.date().optional(),
          })
        )
        .query(async ({ input }) => {
          const { listBlackoutDates } = await import("@/lib/db/queries");
          return await listBlackoutDates(input);
        }),

      create: adminProcedure
        .input(
          z.object({
            startDate: z.string(),
            endDate: z.string(),
            reason: z.string(),
            department: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { createBlackoutDate } = await import("@/lib/db/queries");
          return await createBlackoutDate({
            ...input,
            createdBy: ctx.user.id,
            createdAt: new Date(),
          });
        }),

      delete: adminProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
          const { deleteBlackoutDate } = await import("@/lib/db/queries");
          await deleteBlackoutDate(input.id);
          return { success: true };
        }),
    },

    // Benefits Procedures
    benefitsPlans: {
      list: adminProcedure
        .input(
          z.object({
            category: z.string().optional(),
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
          })
        )
        .query(async ({ input }) => {
          const { listBenefitsPlans } = await import("@/lib/db/queries");
          return await listBenefitsPlans(input);
        }),

      get: adminProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
          const { getBenefitsPlanById } = await import("@/lib/db/queries");
          const plan = await getBenefitsPlanById(input.id);
          if (!plan) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Benefits plan not found",
            });
          }
          return plan;
        }),

      create: adminProcedure
        .input(
          z.object({
            planId: z.string(),
            category: z.enum([
              "medical",
              "dental",
              "vision",
              "retirement",
              "hsa_fsa",
            ]),
            planName: z.string(),
            carrier: z.string(),
            monthlyPremiumEmployeeOnly: z.string().optional(),
            monthlyPremiumEmployeeSpouse: z.string().optional(),
            monthlyPremiumFamily: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { createBenefitsPlan } = await import("@/lib/db/queries");
          return await createBenefitsPlan({
            ...input,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }),

      update: adminProcedure
        .input(
          z.object({
            id: z.string(),
            data: z.object({
              planName: z.string().optional(),
              carrier: z.string().optional(),
              monthlyPremiumEmployeeOnly: z.string().optional(),
              monthlyPremiumEmployeeSpouse: z.string().optional(),
              monthlyPremiumFamily: z.string().optional(),
            }),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { updateBenefitsPlan } = await import("@/lib/db/queries");
          return await updateBenefitsPlan(input.id, input.data, ctx.user.id);
        }),

      delete: adminProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
          const { deleteBenefitsPlan } = await import("@/lib/db/queries");
          await deleteBenefitsPlan(input.id);
          return { success: true };
        }),
    },

    enrollments: {
      list: adminProcedure
        .input(
          z.object({
            employeeId: z.string().optional(),
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
          })
        )
        .query(async ({ input }) => {
          const { listEnrollments } = await import("@/lib/db/queries");
          return await listEnrollments(input);
        }),

      upsert: adminProcedure
        .input(
          z.object({
            employeeId: z.string(),
            medicalPlanId: z.string().optional(),
            dentalPlanId: z.string().optional(),
            visionPlanId: z.string().optional(),
            retirementPlanId: z.string().optional(),
            coverageTier: z
              .enum([
                "employee_only",
                "employee_spouse",
                "employee_children",
                "family",
              ])
              .optional(),
            effectiveDate: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { upsertEnrollment } = await import("@/lib/db/queries");
          return await upsertEnrollment(
            {
              ...input,
              updatedBy: ctx.user.id,
              updatedAt: new Date(),
            },
            ctx.user.id
          );
        }),
    },

    dependents: {
      create: adminProcedure
        .input(
          z.object({
            employeeId: z.string(),
            name: z.string(),
            relationship: z.enum(["spouse", "domestic_partner", "child"]),
            dateOfBirth: z.string(),
            coveredUnder: z.array(z.string()),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { createDependent } = await import("@/lib/db/queries");
          return await createDependent({
            ...input,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }),

      update: adminProcedure
        .input(
          z.object({
            id: z.string(),
            data: z.object({
              name: z.string().optional(),
              relationship: z
                .enum(["spouse", "domestic_partner", "child", "other"])
                .optional(),
              dateOfBirth: z.string().optional(),
              coveredUnder: z.array(z.string()).optional(),
            }),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { updateDependent } = await import("@/lib/db/queries");
          return await updateDependent(input.id, input.data, ctx.user.id);
        }),

      delete: adminProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
          const { deleteDependent } = await import("@/lib/db/queries");
          await deleteDependent(input.id);
          return { success: true };
        }),
    },

    // HR Cases Procedures
    cases: {
      list: adminProcedure
        .input(
          z.object({
            status: z.string().optional(),
            category: z.string().optional(),
            assignedTeam: z.string().optional(),
            submittedBy: z.string().optional(),
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
          })
        )
        .query(async ({ input }) => {
          const { listHRCases } = await import("@/lib/db/queries");
          return await listHRCases(input);
        }),

      get: adminProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
          const { getHRCaseById } = await import("@/lib/db/queries");
          const hrCase = await getHRCaseById(input.id);
          if (!hrCase) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "HR case not found",
            });
          }
          return hrCase;
        }),

      create: adminProcedure
        .input(
          z.object({
            title: z.string(),
            category: z.enum([
              "payroll",
              "benefits",
              "equipment",
              "leave",
              "policy",
              "performance",
              "other",
            ]),
            description: z.string(),
            submittedBy: z.string(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { createHRCase } = await import("@/lib/db/queries");
          const { TEAM_ASSIGNMENT } = await import("@/lib/hr/sla-config");
          const { SLA_CONFIG } = await import("@/lib/hr/sla-config");

          return await createHRCase(
            {
              ...input,
              priority: SLA_CONFIG[input.category].priority,
              status: "open",
              assignedTeam: TEAM_ASSIGNMENT[input.category],
              firstResponseMet: false,
              submittedByName: "Admin User", // TODO: Get from user profile
              createdBy: ctx.user.id,
              updatedBy: ctx.user.id,
            },
            ctx.user.id
          );
        }),

      update: adminProcedure
        .input(
          z.object({
            id: z.string(),
            data: z.object({
              status: z
                .enum([
                  "open",
                  "in_progress",
                  "pending_info",
                  "resolved",
                  "closed",
                ])
                .optional(),
              priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
              assignedTeam: z.string().optional(),
            }),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { updateHRCase } = await import("@/lib/db/queries");
          return await updateHRCase(input.id, input.data, ctx.user.id);
        }),

      delete: adminProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
          const { deleteHRCase } = await import("@/lib/db/queries");
          await deleteHRCase(input.id);
          return { success: true };
        }),

      addUpdate: adminProcedure
        .input(
          z.object({
            caseId: z.string(),
            author: z.string(),
            type: z.enum([
              "system",
              "hr_response",
              "internal_note",
              "status_change",
            ]),
            message: z.string(),
            visibility: z.enum(["public", "internal"]).default("public"),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { addCaseUpdate } = await import("@/lib/db/queries");
          return await addCaseUpdate(input.caseId, input, ctx.user.id);
        }),
    },

    // Team Availability Procedures
    absences: {
      list: adminProcedure
        .input(
          z.object({
            employeeId: z.string().optional(),
            department: z.string().optional(),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
            absenceType: z.string().optional(),
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
          })
        )
        .query(async ({ input }) => {
          const { listAbsences } = await import("@/lib/db/queries");
          return await listAbsences(input);
        }),

      create: adminProcedure
        .input(
          z.object({
            employeeId: z.string(),
            absenceType: z.enum(["vacation", "sick", "personal", "other"]),
            startDate: z.string(),
            endDate: z.string(),
            approvalDate: z.string(),
            approvedBy: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { createAbsence } = await import("@/lib/db/queries");
          // createAbsence calculates totalDays automatically
          return await createAbsence({
            ...input,
            totalDays: "0", // Will be recalculated in createAbsence
            createdBy: ctx.user.id,
            createdAt: new Date(),
          });
        }),

      update: adminProcedure
        .input(
          z.object({
            id: z.string(),
            data: z.object({
              startDate: z.string().optional(),
              endDate: z.string().optional(),
              absenceType: z
                .enum(["vacation", "sick", "personal", "other"])
                .optional(),
            }),
          })
        )
        .mutation(async ({ input }) => {
          const { updateAbsence } = await import("@/lib/db/queries");
          return await updateAbsence(input.id, input.data);
        }),

      delete: adminProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
          const { deleteAbsence } = await import("@/lib/db/queries");
          await deleteAbsence(input.id);
          return { success: true };
        }),
    },

    leaveRequests: {
      list: adminProcedure
        .input(
          z.object({
            employeeId: z.string().optional(),
            status: z.string().optional(),
            department: z.string().optional(),
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
          })
        )
        .query(async ({ input }) => {
          const { listLeaveRequests } = await import("@/lib/db/queries");
          return await listLeaveRequests(input);
        }),

      create: adminProcedure
        .input(
          z.object({
            employeeId: z.string(),
            requestType: z.enum(["vacation", "sick", "personal", "other"]),
            requestedStartDate: z.string(),
            requestedEndDate: z.string(),
            notes: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { createLeaveRequest } = await import("@/lib/db/queries");
          // createLeaveRequest handles all required fields internally
          return await createLeaveRequest(input, ctx.user.id);
        }),

      approve: adminProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input, ctx }) => {
          const { approveLeaveRequest } = await import("@/lib/db/queries");
          return await approveLeaveRequest(input.id, ctx.user.id);
        }),

      deny: adminProcedure
        .input(
          z.object({
            id: z.string(),
            reason: z.string(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { denyLeaveRequest } = await import("@/lib/db/queries");
          return await denyLeaveRequest(input.id, ctx.user.id, input.reason);
        }),
    },

    // Reset to Defaults Procedure
    resetToDefaults: adminProcedure.mutation(async ({ ctx }) => {
      const { clearAllHRData, seedAllHRData } = await import(
        "@/lib/db/seeds/hr-data"
      );

      try {
        await clearAllHRData();
        await seedAllHRData(ctx.user.id);
        return { success: true };
      } catch (error) {
        console.error("Failed to reset HR data to defaults:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reset HR data to defaults",
        });
      }
    }),
  },

  // ============================================================================
  // Document Management Procedures
  // ============================================================================

  documents: {
    list: adminProcedure
      .input(
        z.object({
          searchTerm: z.string().optional(),
          tags: z.array(z.string()).optional(),
          status: z
            .enum(["uploading", "processing", "ready", "failed"])
            .optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        const { listDocuments } = await import("@/lib/db/queries");
        return await listDocuments(input);
      }),

    getById: adminProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const { getUploadedDocumentById } = await import("@/lib/db/queries");
        const document = await getUploadedDocumentById(input.id);

        if (!document) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Document not found",
          });
        }

        return document;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const { getUploadedDocumentById, softDeleteDocument } = await import(
          "@/lib/db/queries"
        );
        const { removeFileFromVectorStore } = await import(
          "@/lib/openai/vector-store"
        );
        const { deleteFileFromOpenAI } = await import("@/lib/openai/files");

        // Get document by ID
        const document = await getUploadedDocumentById(input.id);

        if (!document) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Document not found",
          });
        }

        try {
          // Remove from vector store
          await removeFileFromVectorStore(
            document.vectorStoreId,
            document.openaiFileId
          );

          // Delete from OpenAI Files
          await deleteFileFromOpenAI(document.openaiFileId);

          // Soft delete in database
          await softDeleteDocument(input.id);

          return { success: true };
        } catch (error) {
          console.error("Failed to delete document:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete document",
          });
        }
      }),

    updateTags: adminProcedure
      .input(
        z.object({
          id: z.string(),
          tags: z.array(z.string()),
        })
      )
      .mutation(async ({ input }) => {
        const { updateDocumentTags } = await import("@/lib/db/queries");
        await updateDocumentTags(input.id, input.tags);
        return { success: true };
      }),

    getAllTags: adminProcedure.query(async () => {
      const { getAllTags } = await import("@/lib/db/queries");
      const tags = await getAllTags();
      return { tags };
    }),

    refreshStatus: adminProcedure.mutation(async () => {
      const {
        DOCUMENT_PROCESSING_TIMEOUT_MESSAGE,
        getDocumentsRequiringStatusRefresh,
        updateDocumentStatus,
      } = await import("@/lib/db/queries");
      const { getVectorStoreFileStatus } = await import(
        "@/lib/openai/vector-store"
      );

      const processingDocs = await getDocumentsRequiringStatusRefresh();

      if (processingDocs.length === 0) {
        return {
          updated: 0,
          completed: 0,
          failed: 0,
        };
      }

      let completed = 0;
      let failed = 0;

      // Check each document's individual file status
      for (const doc of processingDocs) {
        try {
          const fileStatus = await getVectorStoreFileStatus(
            doc.vectorStoreId,
            doc.openaiFileId
          );

          if (fileStatus.status === "completed") {
            await updateDocumentStatus(doc.id, "ready");
            completed++;
          } else if (fileStatus.status === "failed") {
            await updateDocumentStatus(
              doc.id,
              "failed",
              fileStatus.lastError?.message || "Unknown error"
            );
            failed++;
          }
          if (fileStatus.status === "in_progress") {
            if (doc.status !== "processing") {
              await updateDocumentStatus(
                doc.id,
                "processing",
                DOCUMENT_PROCESSING_TIMEOUT_MESSAGE
              );
            }
          }
        } catch (error) {
          console.error(
            `Failed to check status for document ${doc.id}:`,
            error
          );
        }
      }

      return {
        updated: completed + failed,
        completed,
        failed,
      };
    }),
  },
});

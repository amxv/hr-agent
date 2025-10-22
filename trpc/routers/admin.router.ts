import { TRPCError } from "@trpc/server";
import { and, count, eq, ilike, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/schema";
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

      // Query users with filters
      const users = await db
        .select()
        .from(user)
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

      // Transform users to include status field
      const transformedUsers = users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: (u.role || "user") as "admin" | "user",
        status: (u.banned ? "inactive" : "active") as "active" | "inactive",
        createdAt: u.createdAt,
        banned: u.banned || false,
        banReason: u.banReason,
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
      const { getVectorStoreId } = await import("@/lib/db/queries");
      const { pollVectorStoreStatus } = await import(
        "@/lib/openai/vector-store"
      );

      const vsId = await getVectorStoreId();

      if (!vsId) {
        return {
          inProgress: 0,
          completed: 0,
          failed: 0,
        };
      }

      const counts = await pollVectorStoreStatus(vsId);
      return counts;
    }),
  },
});

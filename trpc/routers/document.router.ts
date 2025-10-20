import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ArtifactKind } from "@/lib/artifacts/artifact-kind";
import {
  getDocumentById,
  getDocumentsById,
  getPublicDocumentsById,
  getSuggestionsByDocumentId,
  saveDocument,
} from "@/lib/db/queries";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/trpc/init";

export const documentRouter = createTRPCRouter({
  getDocuments: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const documents = await getDocumentsById({
        id: input.id,
        userId: ctx.user.id,
      });

      if (documents.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      return documents;
    }),

  getPublicDocuments: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const documents = await getPublicDocumentsById({ id: input.id });

      if (documents.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Public document not found",
        });
      }

      return documents;
    }),

  getSuggestions: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Validate document belongs to user
      const documents = await getDocumentsById({
        id: input.documentId,
        userId: ctx.user.id,
      });

      if (documents.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const suggestions = await getSuggestionsByDocumentId({
        documentId: input.documentId,
      });
      return suggestions ?? [];
    }),

  saveDocument: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.string(),
        title: z.string(),
        kind: z.custom<ArtifactKind>(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const lastDocument = await getDocumentById({ id: input.id });

      if (!lastDocument) {
        throw new Error("Document not found");
      }

      const _document = await saveDocument({
        id: input.id,
        content: input.content,
        title: input.title,
        kind: input.kind,
        userId: ctx.user.id,
        messageId: lastDocument.messageId,
      });

      return { success: true };
    }),
});

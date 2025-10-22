import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { uploadFile } from "@/lib/blob";
import { db } from "@/lib/db/client";
import { getUploadedDocumentById } from "@/lib/db/queries";
import { uploadedDocument } from "@/lib/db/schema";
import { deleteFileFromOpenAI, uploadFileToOpenAI } from "@/lib/openai/files";
import {
  addFileToVectorStore,
  removeFileFromVectorStore,
} from "@/lib/openai/vector-store";

// Supported document types based on OpenAI's file upload API
const SUPPORTED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/json",
  "text/javascript",
  "application/javascript",
  "text/x-python",
  "application/x-python-code",
  "text/x-java",
  "text/x-c",
  "text/x-c++",
  "text/x-csharp",
  "text/x-go",
  "text/x-ruby",
  "text/x-php",
  "text/html",
  "text/css",
];

const DocumentFileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 512 * 1024 * 1024, {
      message: "File size should be less than 512MB",
    })
    .refine((file) => SUPPORTED_DOCUMENT_TYPES.includes(file.type), {
      message: "File type not supported",
    }),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  // Await params for Next.js 15
  const params = await context.params;

  try {
    // Get existing document
    const existingDocument = await getUploadedDocumentById(params.id);

    if (!existingDocument) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = DocumentFileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.issues
        .map((issue) => issue.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename and tags from formData
    const filename = (formData.get("file") as File).name;
    const tagsString = formData.get("tags") as string | null;
    const tags = tagsString ? JSON.parse(tagsString) : existingDocument.tags;

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    try {
      // Remove old file from vector store
      await removeFileFromVectorStore(
        existingDocument.vectorStoreId,
        existingDocument.openaiFileId
      );

      // Delete old file from OpenAI
      await deleteFileFromOpenAI(existingDocument.openaiFileId);

      // Upload new file to Vercel Blob
      const blobResult = await uploadFile(filename, fileBuffer);

      // Upload new file to OpenAI
      const newOpenaiFileId = await uploadFileToOpenAI(filename, fileBuffer);

      // Add new file to vector store
      await addFileToVectorStore(
        existingDocument.vectorStoreId,
        newOpenaiFileId
      );

      // Update document record in database
      await db
        .update(uploadedDocument)
        .set({
          filename,
          fileSize: file.size,
          contentType: file.type,
          blobUrl: blobResult.url,
          blobPathname: blobResult.pathname,
          openaiFileId: newOpenaiFileId,
          status: "processing",
          errorMessage: null,
          tags,
          updatedAt: new Date(),
        })
        .where(eq(uploadedDocument.id, params.id));

      return NextResponse.json({
        success: true,
        documentId: params.id,
      });
    } catch (error) {
      console.error("Failed to update document:", error);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
  } catch (error) {
    console.error("Failed to process request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

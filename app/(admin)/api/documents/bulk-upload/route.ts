import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { uploadFile } from "@/lib/blob";
import { saveUploadedDocument } from "@/lib/db/queries";
import { uploadFileToOpenAI } from "@/lib/openai/files";
import { pollDocumentStatus } from "@/lib/openai/status-polling";
import {
  addFileToVectorStore,
  getOrCreateVectorStore,
} from "@/lib/openai/vector-store";

// Map file extensions to MIME types
const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  txt: "text/plain",
  md: "text/markdown",
  json: "application/json",
};

const BulkUploadSchema = z.object({
  documents: z.array(
    z.object({
      category: z.string(),
      title: z.string(),
      file_type: z.string(),
      url: z.string().url(),
    })
  ),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validatedData = BulkUploadSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const { documents } = validatedData.data;

    // Get or create vector store once
    const vectorStoreId = await getOrCreateVectorStore();

    const results = [];

    for (const doc of documents) {
      try {
        console.log(`Processing: ${doc.title}`);

        // Download the file
        const response = await fetch(doc.url);
        if (!response.ok) {
          throw new Error(`Failed to download: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        const filename = `${doc.title}.${doc.file_type}`;
        const contentType =
          MIME_TYPES[doc.file_type] || "application/octet-stream";

        // Upload to Vercel Blob
        const blobResult = await uploadFile(filename, fileBuffer);

        // Upload to OpenAI Files
        const openaiFileId = await uploadFileToOpenAI(filename, fileBuffer);

        // Add file to vector store
        await addFileToVectorStore(vectorStoreId, openaiFileId);

        // Save document to database
        const document = await saveUploadedDocument({
          filename,
          fileSize: fileBuffer.length,
          contentType,
          blobUrl: blobResult.url,
          blobPathname: blobResult.pathname,
          openaiFileId,
          vectorStoreId,
          status: "processing",
          uploadedBy: session.user.id,
          tags: [doc.category],
        });

        // Start background status polling
        pollDocumentStatus(document.id, vectorStoreId, openaiFileId).catch(
          (error) => {
            console.error(
              `Background status polling failed for document ${document.id}:`,
              error
            );
          }
        );

        results.push({
          success: true,
          title: doc.title,
          documentId: document.id,
        });

        console.log(`✓ Successfully uploaded: ${doc.title}`);
      } catch (error) {
        console.error(`✗ Failed to upload ${doc.title}:`, error);
        results.push({
          success: false,
          title: doc.title,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Bulk upload completed: ${successCount} succeeded, ${failureCount} failed`,
      results,
      stats: {
        total: documents.length,
        succeeded: successCount,
        failed: failureCount,
      },
    });
  } catch (error) {
    console.error("Bulk upload failed:", error);
    return NextResponse.json(
      { error: "Bulk upload failed" },
      { status: 500 }
    );
  }
}

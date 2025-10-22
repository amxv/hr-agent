import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { uploadFile } from "@/lib/blob";
import { saveUploadedDocument } from "@/lib/db/queries";
import { uploadFileToOpenAI } from "@/lib/openai/files";
import {
  addFileToVectorStore,
  getOrCreateVectorStore,
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

export async function POST(request: Request) {
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

  try {
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
    const tags = tagsString ? JSON.parse(tagsString) : [];

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    try {
      // Upload to Vercel Blob
      const blobResult = await uploadFile(filename, fileBuffer);

      // Upload to OpenAI Files
      const openaiFileId = await uploadFileToOpenAI(filename, fileBuffer);

      // Get or create vector store
      const vectorStoreId = await getOrCreateVectorStore();

      // Add file to vector store (initiates async indexing)
      await addFileToVectorStore(vectorStoreId, openaiFileId);

      // Save document to database
      const document = await saveUploadedDocument({
        filename,
        fileSize: file.size,
        contentType: file.type,
        blobUrl: blobResult.url,
        blobPathname: blobResult.pathname,
        openaiFileId,
        vectorStoreId,
        status: "processing",
        uploadedBy: session.user.id,
        tags,
      });

      return NextResponse.json({
        success: true,
        documentId: document.id,
      });
    } catch (error) {
      console.error("Failed to upload document:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } catch (error) {
    console.error("Failed to process request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

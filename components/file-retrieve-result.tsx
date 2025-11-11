"use client";

import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  FileRetrieveInput,
  FileRetrieveOutput,
} from "@/lib/ai/tools/file-retrieve";

type FileRetrieveResultProps = {
  state: "input-available" | "output-available";
  input: FileRetrieveInput;
  output?: FileRetrieveOutput | { error: string };
};

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 Bytes";
  }
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
}

export function FileRetrieveResult({
  state,
  input,
  output,
}: FileRetrieveResultProps) {
  // Input Available State - Loading
  if (state === "input-available") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-900 text-sm dark:border-green-800 dark:bg-green-950 dark:text-green-100">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading document...</span>
      </div>
    );
  }

  // Output Available State
  if (state === "output-available" && output) {
    // Error State
    if ("error" in output) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900 text-sm dark:border-red-800 dark:bg-red-950 dark:text-red-100">
          <p className="font-medium">Error retrieving document</p>
          <p className="mt-1 text-xs opacity-90">{output.error}</p>
          <p className="mt-2 text-xs opacity-75">
            Try using semantic search instead to find relevant passages.
          </p>
        </div>
      );
    }

    // Success State
    const { documentName, content, pageCount, fileSize } = output;

    // Create a preview (first 500 chars)
    const preview =
      content.length > 500 ? `${content.substring(0, 500)}...` : content;

    return (
      <Card className="p-4">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
            <div className="flex-1 space-y-1">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                {documentName}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-gray-600 text-xs dark:text-gray-400">
                <span>{formatBytes(fileSize)}</span>
                {pageCount && (
                  <>
                    <span>•</span>
                    <span>
                      {pageCount} page{pageCount !== 1 ? "s" : ""}
                    </span>
                  </>
                )}
                <span>•</span>
                <span>{content.length.toLocaleString()} characters</span>
              </div>
            </div>
          </div>

          {/* Content Preview */}
          <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
            <p className="font-medium text-gray-700 text-xs dark:text-gray-300">
              Content Preview:
            </p>
            <p className="mt-2 whitespace-pre-wrap text-gray-600 text-xs dark:text-gray-400">
              {preview}
            </p>
            {content.length > 500 && (
              <p className="mt-2 text-gray-500 text-xs italic dark:text-gray-500">
                Showing first 500 characters. Full content loaded into context.
              </p>
            )}
          </div>

          {/* Note */}
          <p className="text-gray-600 text-xs dark:text-gray-400">
            <span className="font-medium">Note:</span> The full document content
            has been loaded and is available for the AI to reference in its
            responses.
          </p>
        </div>
      </Card>
    );
  }

  return null;
}

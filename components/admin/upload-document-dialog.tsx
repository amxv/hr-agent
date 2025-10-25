"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useTRPC } from "@/trpc/react";
import { DocumentTagsInput } from "./document-tags-input";

type UploadDocumentDialogProps = {
  children: React.ReactNode;
  onSuccess: () => void;
};

type FileUploadStatus = {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
};

export function UploadDocumentDialog({
  children,
  onSuccess,
}: UploadDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatuses, setUploadStatuses] = useState<
    Map<string, FileUploadStatus>
  >(new Map());
  const trpc = useTRPC();

  // Fetch available tags for auto-suggest
  const { data: tagsData } = useQuery({
    ...trpc.admin.documents.getAllTags.queryOptions(),
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    maxSize: 512 * 1024 * 1024, // 512 MB
  });

  const uploadSingleFile = async (file: File): Promise<void> => {
    const fileKey = `${file.name}-${file.size}`;

    setUploadStatuses((prev) => {
      const next = new Map(prev);
      next.set(fileKey, { file, status: "uploading" });
      return next;
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tags", JSON.stringify(tags));

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      setUploadStatuses((prev) => {
        const next = new Map(prev);
        next.set(fileKey, { file, status: "success" });
        return next;
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      setUploadStatuses((prev) => {
        const next = new Map(prev);
        next.set(fileKey, {
          file,
          status: "error",
          error: err.message || "Upload failed",
        });
        return next;
      });
      throw error;
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    setIsUploading(true);

    // Initialize all files as pending
    const initialStatuses = new Map<string, FileUploadStatus>();
    for (const file of files) {
      const fileKey = `${file.name}-${file.size}`;
      initialStatuses.set(fileKey, { file, status: "pending" });
    }
    setUploadStatuses(initialStatuses);

    try {
      // Upload all files in parallel
      const uploadResults = await Promise.allSettled(
        files.map((file) => uploadSingleFile(file))
      );

      // Count successes and failures
      const successCount = uploadResults.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failureCount = uploadResults.filter(
        (result) => result.status === "rejected"
      ).length;

      // Show summary toast
      if (failureCount === 0) {
        toast.success(
          `${successCount} ${successCount === 1 ? "document" : "documents"} uploaded successfully!`
        );

        // Close dialog and reset state on full success
        setTimeout(() => {
          setOpen(false);
          setFiles([]);
          setTags([]);
          setUploadStatuses(new Map());
        }, 1500);
      } else if (successCount === 0) {
        toast.error("All uploads failed. Please try again.");
      } else {
        toast.warning(
          `${successCount} succeeded, ${failureCount} failed. Check details below.`
        );
      }

      // Trigger refetch of documents list
      await onSuccess();
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileStatus = (file: File) => {
    const fileKey = `${file.name}-${file.size}`;
    return uploadStatuses.get(fileKey);
  };

  const getUploadProgress = () => {
    if (uploadStatuses.size === 0) {
      return 0;
    }
    const completed = Array.from(uploadStatuses.values()).filter(
      (status) => status.status === "success" || status.status === "error"
    ).length;
    return (completed / uploadStatuses.size) * 100;
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Upload one or more documents to make them searchable by the AI
            assistant. Supports PDF, DOCX, TXT, and MD files (max 512 MB each).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isUploading && (
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto mb-4 size-12 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-muted-foreground text-sm">
                  Drop files here...
                </p>
              ) : (
                <div>
                  <p className="mb-2 font-medium text-sm">
                    Drag & drop files here, or click to browse
                  </p>
                  <p className="text-muted-foreground text-xs">
                    PDF, DOCX, TXT, MD (max 512 MB per file)
                  </p>
                </div>
              )}
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">
                  {files.length} {files.length === 1 ? "file" : "files"}{" "}
                  selected
                </p>
                {!isUploading && (
                  <Button
                    onClick={() => setFiles([])}
                    size="sm"
                    variant="ghost"
                  >
                    Clear all
                  </Button>
                )}
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <Progress className="h-2" value={getUploadProgress()} />
                  <p className="text-muted-foreground text-xs">
                    Uploading {files.length}{" "}
                    {files.length === 1 ? "file" : "files"}...
                  </p>
                </div>
              )}

              <div className="max-h-64 space-y-2 overflow-y-auto">
                {files.map((file, index) => {
                  const status = getFileStatus(file);
                  return (
                    <div
                      className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3"
                      key={`${file.name}-${index}`}
                    >
                      <FileText className="size-6 flex-shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">
                          {file.name}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatFileSize(file.size)}
                        </p>
                        {status?.status === "error" && status.error && (
                          <p className="text-destructive text-xs">
                            {status.error}
                          </p>
                        )}
                      </div>

                      {!isUploading && (
                        <Button
                          onClick={() => removeFile(index)}
                          size="sm"
                          variant="ghost"
                        >
                          <X className="size-4" />
                        </Button>
                      )}

                      {status && (
                        <div className="flex-shrink-0">
                          {status.status === "pending" && (
                            <div className="size-5 rounded-full border-2 border-muted-foreground/25" />
                          )}
                          {status.status === "uploading" && (
                            <Loader2 className="size-5 animate-spin text-primary" />
                          )}
                          {status.status === "success" && (
                            <CheckCircle2 className="size-5 text-green-600" />
                          )}
                          {status.status === "error" && (
                            <AlertCircle className="size-5 text-destructive" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isUploading && files.length > 0 && (
            <div>
              <div className="mb-2 font-medium text-sm">
                Tags (optional, applied to all files)
              </div>
              <DocumentTagsInput
                onChange={setTags}
                suggestions={tagsData?.tags || []}
                value={tags}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={isUploading}
            onClick={() => {
              setOpen(false);
              setFiles([]);
              setTags([]);
              setUploadStatuses(new Map());
            }}
            type="button"
            variant="outline"
          >
            {isUploading ? "Uploading..." : "Cancel"}
          </Button>
          <Button
            disabled={files.length === 0 || isUploading}
            onClick={handleUpload}
          >
            {isUploading
              ? "Uploading..."
              : `Upload ${files.length} ${files.length === 1 ? "Document" : "Documents"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

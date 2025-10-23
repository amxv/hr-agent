"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, Upload } from "lucide-react";
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
import { useTRPC } from "@/trpc/react";
import { DocumentTagsInput } from "./document-tags-input";

type UploadDocumentDialogProps = {
  children: React.ReactNode;
  onSuccess: () => void;
};

export function UploadDocumentDialog({
  children,
  onSuccess,
}: UploadDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const trpc = useTRPC();

  // Fetch available tags for auto-suggest
  const { data: tagsData } = useQuery({
    ...trpc.admin.documents.getAllTags.queryOptions(),
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
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
    maxFiles: 1,
    maxSize: 512 * 1024 * 1024, // 512 MB
  });

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setIsUploading(true);

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

      toast.success("Document uploaded successfully!");

      // Close dialog first for better UX, then invalidate queries
      setOpen(false);
      setFile(null);
      setTags([]);

      // Trigger refetch of documents list
      await onSuccess();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to upload document");
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

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document to make it searchable by the AI assistant.
            Supports PDF, DOCX, TXT, and MD files (max 512 MB).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
                Drop the file here...
              </p>
            ) : (
              <div>
                <p className="mb-2 font-medium text-sm">
                  Drag & drop a file here, or click to browse
                </p>
                <p className="text-muted-foreground text-xs">
                  PDF, DOCX, TXT, MD (max 512 MB)
                </p>
              </div>
            )}
          </div>

          {file && (
            <div className="flex items-center gap-3 rounded-xl border bg-muted/50 p-3">
              <FileText className="size-8 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-muted-foreground text-xs">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Button onClick={() => setFile(null)} size="sm" variant="ghost">
                Remove
              </Button>
            </div>
          )}

          <div>
            <div className="mb-2 font-medium text-sm">Tags (optional)</div>
            <DocumentTagsInput
              onChange={setTags}
              suggestions={tagsData?.tags || []}
              value={tags}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => {
              setOpen(false);
              setFile(null);
              setTags([]);
            }}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={!file || isUploading} onClick={handleUpload}>
            {isUploading ? "Uploading..." : "Upload Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

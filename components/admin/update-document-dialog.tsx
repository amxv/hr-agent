"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FileText, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTRPC } from "@/trpc/react";
import { DocumentTagsInput } from "./document-tags-input";

type UpdateDocumentDialogProps = {
  documentId: string;
  currentFilename: string;
  currentTags: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function UpdateDocumentDialog({
  documentId,
  currentFilename,
  currentTags,
  open,
  onOpenChange,
  onSuccess,
}: UpdateDocumentDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>(currentTags);
  const [isUploading, setIsUploading] = useState(false);
  const trpc = useTRPC();

  // Reset tags when dialog opens with new document
  useEffect(() => {
    if (open) {
      setTags(currentTags);
      setFile(null);
    }
  }, [open, currentTags]);

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

  const handleUpdate = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tags", JSON.stringify(tags));

      const response = await fetch(`/api/documents/${documentId}/update`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Update failed");
      }

      toast.success("Document updated successfully!");
      onSuccess();
      onOpenChange(false);
      setFile(null);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to update document");
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
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Update Document</DialogTitle>
          <DialogDescription>
            Replace the existing document with a new version. The old version
            will be removed from the vector store.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="size-4" />
            <AlertDescription>
              Current file: <strong>{currentFilename}</strong>
              <br />
              This will replace the existing document in the vector store.
            </AlertDescription>
          </Alert>

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
                  Drag & drop a new file here, or click to browse
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
            <div className="mb-2 font-medium text-sm">Tags</div>
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
              onOpenChange(false);
              setFile(null);
            }}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={!file || isUploading} onClick={handleUpdate}>
            {isUploading ? "Updating..." : "Update Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

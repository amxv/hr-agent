"use client";

import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UploadedDocument } from "@/lib/db/schema";
import { useTRPC, useTRPCClient } from "@/trpc/react";
import { DocumentTagsInput } from "./document-tags-input";
import { UpdateDocumentDialog } from "./update-document-dialog";

type DocumentActionsProps = {
  document: UploadedDocument;
  onUpdate: () => void;
  onDelete: () => void;
  onTagsUpdate: () => void;
};

export function DocumentActions({
  document,
  onUpdate,
  onDelete,
  onTagsUpdate,
}: DocumentActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showTagsDialog, setShowTagsDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tempTags, setTempTags] = useState(document.tags || []);

  const trpcClient = useTRPCClient();
  const trpc = useTRPC();

  // Fetch available tags for auto-suggest
  const { data: tagsData } = useQuery({
    ...trpc.admin.documents.getAllTags.queryOptions(),
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await trpcClient.admin.documents.delete.mutate({
        id: document.id,
      });
      toast.success("Document deleted successfully");
      onDelete();
      setShowDeleteDialog(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveTags = async () => {
    try {
      await trpcClient.admin.documents.updateTags.mutate({
        id: document.id,
        tags: tempTags,
      });
      toast.success("Tags updated successfully");
      onTagsUpdate();
      setShowTagsPopover(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to update tags");
    }
  };

  // Disable actions when document is uploading or processing
  const isProcessing =
    document.status === "uploading" || document.status === "processing";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button disabled={isProcessing} size="sm" variant="ghost">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowUpdateDialog(true)}>
            <Pencil className="mr-2 size-4" />
            Update
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowTagsPopover(true)}>
            <Tags className="mr-2 size-4" />
            Edit Tags
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{document.filename}</strong>? This will remove the
              document from the vector store and delete the file. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Document Dialog */}
      <UpdateDocumentDialog
        currentFilename={document.filename}
        currentTags={document.tags || []}
        documentId={document.id}
        onOpenChange={setShowUpdateDialog}
        onSuccess={onUpdate}
        open={showUpdateDialog}
      />

      {/* Edit Tags Dialog */}
      <Dialog onOpenChange={setShowTagsDialog} open={showTagsDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Tags</DialogTitle>
            <DialogDescription>
              Add or remove tags for {document.filename}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <DocumentTagsInput
              onChange={setTempTags}
              suggestions={tagsData?.tags || []}
              value={tempTags}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowTagsDialog(false);
                setTempTags(document.tags || []);
              }}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTags} type="button">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

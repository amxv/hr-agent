"use client";

import type { Attachment } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import { PreviewAttachment } from "./preview-attachment";

type AttachmentListProps = {
  attachments: Attachment[];
  uploadQueue?: string[];
  onRemove?: (attachment: Attachment) => void;
  onImageClick?: (imageUrl: string, imageName?: string) => void;
  testId?: string;
  className?: string;
};

export function AttachmentList({
  attachments,
  uploadQueue = [],
  onRemove,
  onImageClick,
  testId = "attachments",
  className,
}: AttachmentListProps) {
  if (attachments.length === 0 && uploadQueue.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex flex-row items-end gap-2 overflow-x-auto", className)}
      data-testid={testId}
    >
      {attachments.map((attachment) => (
        <PreviewAttachment
          attachment={attachment}
          key={attachment.url}
          onImageClick={onImageClick}
          onRemove={onRemove ? () => onRemove(attachment) : undefined}
        />
      ))}

      {uploadQueue.map((filename) => (
        <PreviewAttachment
          attachment={{
            url: "",
            name: filename,
            contentType: "",
          }}
          isUploading={true}
          key={filename}
        />
      ))}
    </div>
  );
}

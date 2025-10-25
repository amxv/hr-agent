"use client";

import { motion } from "motion/react";
import { PromptInputContextBar } from "@/components/ai-elements/prompt-input";
import { AttachmentList } from "@/components/attachment-list";
import type { AppModelId } from "@/lib/ai/app-models";
import type { Attachment } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

export function ContextBar({
  attachments,
  uploadQueue,
  onRemove,
  onImageClick,
  selectedModelId,
  parentMessageId,
  className,
}: {
  attachments: Attachment[];
  uploadQueue: string[];
  onRemove: (attachment: Attachment) => void;
  onImageClick: (url: string, name?: string) => void;
  selectedModelId: AppModelId;
  parentMessageId: string | null;
  className?: string;
}) {
  const hasBarContent = attachments.length > 0 || uploadQueue.length > 0;

  if (!hasBarContent) {
    return null;
  }

  return (
    <motion.div
      animate={{
        height: hasBarContent ? "auto" : 0,
        opacity: hasBarContent ? 1 : 0,
      }}
      className={cn(className)}
      style={{ overflow: "hidden" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <PromptInputContextBar className="w-full border-b">
        <AttachmentList
          attachments={attachments}
          className="grow px-3 py-2"
          onImageClick={onImageClick}
          onRemove={onRemove}
          testId="attachments-preview"
          uploadQueue={uploadQueue}
        />
      </PromptInputContextBar>
    </motion.div>
  );
}

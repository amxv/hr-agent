"use client";

import type { ModelId } from "@ai-models/vercel-gateway";
import type { LanguageModelUsage } from "ai";
import { motion } from "motion/react";
import { useMemo } from "react";
import type { ModelId as TokenLensModelId } from "tokenlens";
import { getContextWindow } from "tokenlens";
import {
  Context,
  ContextContent,
  ContextContentHeader,
  ContextTrigger,
} from "@/components/ai-elements/context";
import { PromptInputContextBar } from "@/components/ai-elements/prompt-input";
import { AttachmentList } from "@/components/attachment-list";
import {
  type AppModelDefinition,
  type AppModelId,
  getAppModelDefinition,
} from "@/lib/ai/app-models";
import type { Attachment } from "@/lib/ai/types";
import { useLastUsageUntilMessageId } from "@/lib/stores/hooks";
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
  const usage = useLastUsageUntilMessageId(parentMessageId);
  const hasBarContent =
    attachments.length > 0 || uploadQueue.length > 0 || usage;

  if (!hasBarContent) {
    return null;
  }

  const modelDefinition = getAppModelDefinition(selectedModelId);

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
        {(attachments.length > 0 || uploadQueue.length > 0) && (
          <AttachmentList
            attachments={attachments}
            className="grow px-3 py-2"
            onImageClick={onImageClick}
            onRemove={onRemove}
            testId="attachments-preview"
            uploadQueue={uploadQueue}
          />
        )}
        {usage && (
          <div className="ml-auto">
            <ContextUsage
              modelDefinition={modelDefinition}
              selectedModelId={modelDefinition.apiModelId}
              usage={usage}
            />
          </div>
        )}
      </PromptInputContextBar>
    </motion.div>
  );
}

function ContextUsage({
  usage,
  selectedModelId,
  modelDefinition,
}: {
  usage: LanguageModelUsage;
  selectedModelId: ModelId;
  modelDefinition: AppModelDefinition;
}) {
  const contextMax = useMemo(() => {
    // First, try to get context window from our model data
    if (modelDefinition?.context_window) {
      return modelDefinition.context_window;
    }

    // Fall back to tokenlens for models not in our data
    try {
      const cw = getContextWindow(selectedModelId as unknown as string);
      return cw.combinedMax ?? cw.inputMax ?? 0;
    } catch {
      return 0;
    }
  }, [selectedModelId, modelDefinition]);

  const usedTokens = useMemo(() => {
    if (!usage) {
      return 0;
    }
    const input = (usage as any).inputTokens ?? 0;
    const cached = (usage as any).cachedInputTokens ?? 0;
    return input + cached;
  }, [usage]);

  return (
    <Context
      maxTokens={contextMax}
      modelId={selectedModelId.split("/").join(":") as TokenLensModelId}
      usage={usage as LanguageModelUsage | undefined}
      usedTokens={usedTokens}
    >
      <ContextTrigger />
      <ContextContent align="end">
        <ContextContentHeader />
      </ContextContent>
    </Context>
  );
}

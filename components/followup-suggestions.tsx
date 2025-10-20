"use client";

import { PlusIcon } from "lucide-react";
import { useCallback } from "react";
import type { ChatMessage, UiToolName } from "@/lib/ai/types";
import { useChatStoreApi } from "@/lib/stores/chat-store-context";
import {
  useMessagePartByPartIdx,
  useMessagePartTypesById,
} from "@/lib/stores/hooks-message-parts";
import { cn, generateUUID } from "@/lib/utils";
import { useChatInput } from "@/providers/chat-input-provider";
import { Button } from "./ui/button";

export function FollowUpSuggestions({
  suggestions,
  className,
}: {
  suggestions: string[];
  className?: string;
}) {
  const storeApi = useChatStoreApi();
  const { selectedModelId, selectedTool } = useChatInput();

  const handleClick = useCallback(
    (suggestion: string) => {
      const sendMessage = storeApi.getState().currentChatHelpers?.sendMessage;
      if (!sendMessage) {
        return;
      }

      const parentMessageId = storeApi.getState().getLastMessageId();

      const message: ChatMessage = {
        id: generateUUID(),
        role: "user",
        parts: [
          {
            type: "text",
            text: suggestion,
          },
        ],
        metadata: {
          createdAt: new Date(),
          parentMessageId,
          selectedModel: selectedModelId,
          selectedTool: (selectedTool as UiToolName | null) || undefined,
        },
      };

      sendMessage(message);
    },
    [storeApi, selectedModelId, selectedTool]
  );

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className={cn("mt-2 mb-2 flex flex-col gap-2", className)}>
      <div className="font-medium text-muted-foreground text-xs">Related</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {suggestions.map((s) => (
          <Button
            className="h-7 rounded-full bg-muted/40 px-2.5 text-muted-foreground text-xs shadow-none hover:bg-muted hover:text-foreground"
            key={s}
            onClick={() => handleClick(s)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {s}
            <PlusIcon className="size-3 opacity-70" />
          </Button>
        ))}
      </div>
    </div>
  );
}

export function FollowUpSuggestionsParts({ messageId }: { messageId: string }) {
  const types = useMessagePartTypesById(messageId);

  const partIdx = types.indexOf("data-followupSuggestions");
  if (partIdx === -1) {
    return null;
  }
  return <FollowUpSuggestionsPart messageId={messageId} partIdx={partIdx} />;
}

function FollowUpSuggestionsPart({
  messageId,
  partIdx,
}: {
  messageId: string;
  partIdx: number;
}) {
  const part = useMessagePartByPartIdx(
    messageId,
    partIdx,
    "data-followupSuggestions"
  );
  const { data } = part;

  return <FollowUpSuggestions suggestions={data.suggestions} />;
}

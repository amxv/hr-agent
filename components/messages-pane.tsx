"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import { memo } from "react";
import { CloneChatButton } from "@/components/clone-chat-button";
import type { ChatMessage } from "@/lib/ai/types";
import type { Vote } from "@/lib/db/schema";
import { useLastMessageId } from "@/lib/stores/hooks-base";
import { cn } from "@/lib/utils";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";

export type MessagesPaneProps = {
  chatId: string;
  status: UseChatHelpers<ChatMessage>["status"];
  votes: Vote[] | undefined;
  isReadonly: boolean;
  isVisible: boolean;
  className?: string;
};

function PureMessagesPane({
  chatId,
  status,
  votes,
  isReadonly,
  isVisible,
  className,
}: MessagesPaneProps) {
  const parentMessageId = useLastMessageId();

  return (
    <div
      className={cn("flex h-full min-h-0 w-full flex-1 flex-col", className)}
    >
      <Messages isReadonly={isReadonly} isVisible={isVisible} votes={votes} />

      <div className="relative bottom-4 z-10 w-full">
        {isReadonly ? (
          <CloneChatButton chatId={chatId} className="w-full" />
        ) : (
          <div className="mx-auto w-full p-2 @[400px]:px-4 @[400px]:pb-4 md:max-w-3xl @[400px]:md:pb-6">
            <MultimodalInput
              chatId={chatId}
              parentMessageId={parentMessageId}
              status={status}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export const MessagesPane = memo(PureMessagesPane);

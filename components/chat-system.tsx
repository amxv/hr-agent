"use client";

import { memo } from "react";
import { Chat } from "@/components/chat";
import { ChatSync } from "@/components/chat-sync";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { ArtifactProvider } from "@/hooks/use-artifact";
import type { AppModelId } from "@/lib/ai/app-models";
import type { ChatMessage, UiToolName } from "@/lib/ai/types";
import { ChatStoreProvider } from "@/lib/stores/chat-store-context";
import { ChatInputProvider } from "@/providers/chat-input-provider";
import { MessageTreeProvider } from "@/providers/message-tree-provider";

export const ChatSystem = memo(function ChatSystem({
  id,
  initialMessages,
  isReadonly,
  initialTool = null,
  overrideModelId,
}: {
  id: string;
  initialMessages: ChatMessage[];
  isReadonly: boolean;
  initialTool?: UiToolName | null;
  overrideModelId?: AppModelId;
}) {
  return (
    <ArtifactProvider>
      <DataStreamProvider>
        <ChatStoreProvider initialMessages={initialMessages}>
          <MessageTreeProvider>
            {isReadonly ? (
              <>
                <ChatSync id={id} initialMessages={initialMessages} />
                <Chat
                  id={id}
                  initialMessages={initialMessages}
                  isReadonly={isReadonly}
                  key={id}
                />
              </>
            ) : (
              <ChatInputProvider
                initialTool={initialTool ?? null}
                localStorageEnabled={true}
                overrideModelId={overrideModelId}
              >
                <ChatSync id={id} initialMessages={initialMessages} />
                <Chat
                  id={id}
                  initialMessages={initialMessages}
                  isReadonly={isReadonly}
                  key={id}
                />
                <DataStreamHandler id={id} />
              </ChatInputProvider>
            )}
          </MessageTreeProvider>
        </ChatStoreProvider>
      </DataStreamProvider>
    </ArtifactProvider>
  );
});

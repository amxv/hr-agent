"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useDataStream } from "@/components/data-stream-provider";
import { useSaveMessageMutation } from "@/hooks/chat-sync-hooks";
import { useAutoResume } from "@/hooks/use-auto-resume";
import type { ChatMessage } from "@/lib/ai/types";
import {
  useChatStateInstance,
  useChatStoreApi,
  ZustandChat,
} from "@/lib/stores/chat-store-context";
import { fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { useSession } from "@/providers/session-provider";

function useRecreateChat(id: string, initialMessages: ChatMessage[]) {
  const chatStore = useChatStoreApi();
  useEffect(() => {
    if (id !== chatStore.getState().id) {
      chatStore.getState().setNewChat(id, initialMessages || []);
    }
  }, [id, initialMessages, chatStore]);
}

export function ChatSync({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: ChatMessage[];
}) {
  const chatStore = useChatStoreApi();
  const { data: session } = useSession();
  const { mutate: saveChatMessage } = useSaveMessageMutation();
  const { setDataStream } = useDataStream();

  useRecreateChat(id, initialMessages);

  const isAuthenticated = !!session?.user;
  const chatState = useChatStateInstance();

  const chat = useMemo(() => {
    const instance = new ZustandChat<ChatMessage>({
      state: chatState,
      id,
      generateId: generateUUID,
      onFinish: ({ message }) => {
        saveChatMessage({ message, chatId: id });
      },
      transport: new DefaultChatTransport({
        api: "/api/chat",
        fetch: fetchWithErrorHandlers,
        prepareSendMessagesRequest({ messages, id, body }) {
          return {
            body: {
              id,
              message: messages.at(-1),
              prevMessages: isAuthenticated ? [] : messages.slice(0, -1),
              ...body,
            },
          };
        },
      }),
      onData: (dataPart) => {
        setDataStream((ds) => (ds ? [...ds, dataPart] : []));
      },
      onError: (error) => {
        console.error(error);
        const cause = error.cause;
        if (cause && typeof cause === "string") {
          toast.error(error.message ?? "An error occured, please try again!", {
            description: cause,
          });
        } else {
          toast.error(error.message ?? "An error occured, please try again!");
        }
      },
    });
    return instance;
  }, [id, saveChatMessage, setDataStream, isAuthenticated, chatState]);

  const helpers = useChat<ChatMessage>({
    // @ts-expect-error private field
    chat,
    experimental_throttle: 100,
  });

  useEffect(() => {
    console.log("setting current chat helpers");
    chatStore.getState().setCurrentChatHelpers({
      stop: helpers.stop,
      sendMessage: helpers.sendMessage,
      regenerate: helpers.regenerate,
    });
  }, [helpers.stop, helpers.sendMessage, helpers.regenerate, chatStore]);

  useAutoResume({
    autoResume: true,
    initialMessages,
    resumeStream: helpers.resumeStream,
  });

  return null;
}

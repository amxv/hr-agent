"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ChatMessage } from "@/lib/ai/types";
import { useSetMessages } from "@/lib/stores/hooks";
import {
  buildThreadFromLeaf,
  findLeafDfsToRightFromMessageId,
} from "@/lib/thread-utils";
import { useTRPC } from "@/trpc/react";
import { useChatId } from "./chat-id-provider";

type MessageSiblingInfo = {
  siblings: ChatMessage[];
  siblingIndex: number;
};

type MessageTreeContextType = {
  getMessageSiblingInfo: (messageId: string) => MessageSiblingInfo | null;
  navigateToSibling: (messageId: string, direction: "prev" | "next") => void;
};

const MessageTreeContext = createContext<MessageTreeContextType | undefined>(
  undefined
);

type MessageTreeProviderProps = {
  children: React.ReactNode;
};

export function MessageTreeProvider({ children }: MessageTreeProviderProps) {
  const { id, type } = useChatId();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const setMessages = useSetMessages();

  // Select the appropriate chat ID based on isShared flag
  // Subscribe to query cache changes for the specific chat messages query
  useEffect(() => {
    // TODO: IS this effect still needed or can it be replaced with a useQuery ?
    if (type === "provisional" && window.location.pathname === "/") {
      // New chat
      setAllMessages([]);
    }

    const queryKey =
      type === "shared"
        ? trpc.chat.getPublicChatMessages.queryKey({ chatId: id })
        : trpc.chat.getChatMessages.queryKey({ chatId: id });

    // Get initial data
    const initialData = queryClient.getQueryData<ChatMessage[]>(queryKey);
    if (initialData) {
      console.log("initialData", initialData);
      setAllMessages(initialData);
    }

    // Subscribe to cache changes
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Check if this event is for our specific query
      if (event.type === "updated" && event.query.queryKey) {
        const eventQueryKey = event.query.queryKey;

        // Get current query key to avoid stale closure issues
        const currentQueryKey =
          type === "shared"
            ? trpc.chat.getPublicChatMessages.queryKey({
                chatId: id,
              })
            : trpc.chat.getChatMessages.queryKey({ chatId: id });

        // Compare query keys (simple deep comparison for this case)
        if (JSON.stringify(eventQueryKey) === JSON.stringify(currentQueryKey)) {
          console.log("event.query.state.data", event.query.state.data);
          const newData = event.query.state.data as ChatMessage[] | undefined;
          if (newData) {
            setAllMessages(newData);
          }
        }
      }
    });

    return unsubscribe;
  }, [
    id,
    type,
    trpc.chat.getChatMessages,
    trpc.chat.getPublicChatMessages,
    queryClient,
  ]);

  // Build parent->children mapping once
  const childrenMap = useMemo(() => {
    const map = new Map<string | null, ChatMessage[]>();
    if (!allMessages) {
      return map;
    }
    allMessages.forEach((message) => {
      const parentId = message.metadata?.parentMessageId || null;

      if (!map.has(parentId)) {
        map.set(parentId, []);
      }
      const siblings = map.get(parentId);
      if (siblings) {
        siblings.push(message);
      }
    });

    // Sort siblings by createdAt
    map.forEach((siblings) => {
      siblings.sort(
        (a, b) =>
          new Date(a.metadata?.createdAt || new Date()).getTime() -
          new Date(b.metadata?.createdAt || new Date()).getTime()
      );
    });

    return map;
  }, [allMessages]);

  const getMessageSiblingInfo = useCallback(
    (messageId: string): MessageSiblingInfo | null => {
      if (!allMessages) {
        return null;
      }
      const message = allMessages.find((m) => m.id === messageId);
      if (!message) {
        return null;
      }

      const siblings =
        childrenMap.get(message.metadata?.parentMessageId || null) || [];
      const siblingIndex = siblings.findIndex((s) => s.id === messageId);

      return {
        siblings,
        siblingIndex,
      };
    },
    [allMessages, childrenMap]
  );

  const navigateToSibling = useCallback(
    (messageId: string, direction: "prev" | "next") => {
      if (!(allMessages && id)) {
        return;
      }
      const siblingInfo = getMessageSiblingInfo(messageId);
      if (!siblingInfo || siblingInfo.siblings.length <= 1) {
        return;
      }

      const { siblings, siblingIndex } = siblingInfo;
      const nextIndex =
        direction === "next"
          ? (siblingIndex + 1) % siblings.length
          : (siblingIndex - 1 + siblings.length) % siblings.length;

      const targetSibling = siblings[nextIndex];
      const leaf = findLeafDfsToRightFromMessageId(
        childrenMap,
        targetSibling.id
      );
      const newThread = buildThreadFromLeaf(
        allMessages,
        leaf ? leaf.id : targetSibling.id
      );

      setMessages(newThread);
    },
    [allMessages, getMessageSiblingInfo, childrenMap, id, setMessages]
  );

  const value = useMemo(
    () => ({
      getMessageSiblingInfo,
      navigateToSibling,
    }),
    [getMessageSiblingInfo, navigateToSibling]
  );

  return (
    <MessageTreeContext.Provider value={value}>
      {children}
    </MessageTreeContext.Provider>
  );
}

export function useMessageTree() {
  const context = useContext(MessageTreeContext);
  if (!context) {
    throw new Error("useMessageTree must be used within MessageTreeProvider");
  }
  return context;
}

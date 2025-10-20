"use client";

import { createContext, useContext, useRef } from "react";
import type { ChatMessage } from "@/lib/ai/types";
import { createChatStore } from "./chat-store";
import { ZustandChatState } from "./zustand-chat-adapter";

export { ZustandChat } from "./zustand-chat-adapter";

type ChatStoreApi = ReturnType<typeof createChatStore<ChatMessage>>;

const ChatStoreContext = createContext<ChatStoreApi | undefined>(undefined);

export function ChatStoreProvider({
  children,
  initialMessages,
}: {
  children: React.ReactNode;
  initialMessages: ChatMessage[];
}) {
  const storeRef = useRef<ChatStoreApi | null>(null);
  const chatStateRef = useRef<ZustandChatState<ChatMessage> | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createChatStore<ChatMessage>(initialMessages);
  }
  if (chatStateRef.current === null) {
    chatStateRef.current = new ZustandChatState<ChatMessage>(storeRef.current);
  }
  return (
    <ChatStoreContext.Provider value={storeRef.current}>
      <ChatStateContext.Provider value={chatStateRef.current ?? undefined}>
        {children}
      </ChatStateContext.Provider>
    </ChatStoreContext.Provider>
  );
}

// ZustandChatState instance per provider
const ChatStateContext = createContext<
  ZustandChatState<ChatMessage> | undefined
>(undefined);

export function useChatStateInstance() {
  const state = useContext(ChatStateContext);
  if (!state) {
    throw new Error(
      "useChatStateInstance must be used within ChatStateProvider"
    );
  }
  return state;
}

export function useChatStoreContext() {
  const store = useContext(ChatStoreContext);
  if (!store) {
    throw new Error(
      "useChatStoreContext must be used within ChatStoreProvider"
    );
  }
  return store;
}

// Convenience alias expected by components: returns the store API from context
export function useChatStoreApi() {
  const store = useContext(ChatStoreContext);
  if (!store) {
    throw new Error("useChatStoreApi must be used within ChatStoreProvider");
  }
  return store;
}

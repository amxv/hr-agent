import equal from "fast-deep-equal";
import { shallow } from "zustand/shallow";
import { useStoreWithEqualityFn } from "zustand/traditional";
import type { ChatMessage } from "../ai/types";
import type { BaseChatStoreState } from "./chat-store-base";
import { useChatStoreContext } from "./chat-store-context";

export function useBaseChatStore<T = BaseChatStoreState<ChatMessage>>(
  selector?: (store: BaseChatStoreState<ChatMessage>) => T,
  equalityFn?: (a: T, b: T) => boolean
) {
  const store = useChatStoreContext();
  if (!store) {
    throw new Error("useBaseChatStore must be used within ChatStoreProvider");
  }
  const selectorOrIdentity =
    (selector as (store: BaseChatStoreState<ChatMessage>) => T) ??
    ((s: BaseChatStoreState<ChatMessage>) => s);
  return useStoreWithEqualityFn(store, selectorOrIdentity, equalityFn);
}

// Base selector hooks using throttled messages where relevant
export const useChatMessages = () =>
  useBaseChatStore((state) => state.getThrottledMessages());
export const useChatStatus = () => useBaseChatStore((state) => state.status);
export const useChatError = () => useBaseChatStore((state) => state.error);
export const useChatId = () => useBaseChatStore((state) => state.id);
export const useMessageIds = () =>
  useBaseChatStore((state) => state.getMessageIds(), shallow);

export const useLastUsageUntilMessageId = (messageId: string | null) =>
  useBaseChatStore((state) => {
    if (!messageId) {
      return;
    }
    const messages = state._throttledMessages || state.messages;
    const messageIdx = messages.findIndex((m) => m.id === messageId);
    if (messageIdx === -1) {
      return;
    }

    const sliced = messages.slice(0, messageIdx + 1);
    return sliced.findLast((m) => m.role === "assistant" && m.metadata?.usage)
      ?.metadata?.usage;
  }, shallow);

export const useMessageById = (messageId: string): ChatMessage =>
  useBaseChatStore((state) => {
    const message = state
      .getThrottledMessages()
      .find((m) => m.id === messageId);
    if (!message) {
      throw new Error(`Message not found for id: ${messageId}`);
    }
    return message;
  });

export const useMessageRoleById = (messageId: string): ChatMessage["role"] =>
  useBaseChatStore((state) => {
    const message = state
      .getThrottledMessages()
      .find((m) => m.id === messageId);
    if (!message) {
      throw new Error(`Message not found for id: ${messageId}`);
    }
    return message.role;
  });
export const useMessagePartsById = (messageId: string): ChatMessage["parts"] =>
  useBaseChatStore((state) => {
    const message = state
      .getThrottledMessages()
      .find((m) => m.id === messageId);
    if (!message) {
      throw new Error(`Message not found for id: ${messageId}`);
    }
    return message.parts;
  }, shallow);
export const useMessageResearchUpdatePartsById = (
  messageId: string
): Extract<ChatMessage["parts"][number], { type: "data-researchUpdate" }>[] =>
  useBaseChatStore((state) => {
    const message = state
      .getThrottledMessages()
      .find((m) => m.id === messageId);
    if (!message) {
      throw new Error(`Message not found for id: ${messageId}`);
    }
    return message.parts.filter(
      (p) => p.type === "data-researchUpdate"
    ) as Extract<
      ChatMessage["parts"][number],
      { type: "data-researchUpdate" }
    >[];
  }, equal);
export const useMessageMetadataById = (
  messageId: string
): ChatMessage["metadata"] =>
  useBaseChatStore((state) => {
    const message = state
      .getThrottledMessages()
      .find((m) => m.id === messageId);
    if (!message) {
      throw new Error(`Message not found for id: ${messageId}`);
    }
    return message.metadata;
  }, shallow);

export const useChatActions = () =>
  useBaseChatStore(
    (state) => ({
      setMessages: state.setMessages,
      pushMessage: state.pushMessage,
      popMessage: state.popMessage,
      replaceMessage: state.replaceMessage,
      setStatus: state.setStatus,
      setError: state.setError,
      setId: state.setId,
      setNewChat: state.setNewChat,
    }),
    shallow
  );
export const useSetMessages = () =>
  useBaseChatStore((state) => state.setMessages);
export const useChatHelperStop = () =>
  useBaseChatStore((state) => state.currentChatHelpers?.stop);
export const useSendMessage = () =>
  useBaseChatStore((state) => state.currentChatHelpers?.sendMessage);

export const useLastMessageId = () =>
  useBaseChatStore((state) => state.getLastMessageId());

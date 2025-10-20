import { useStoreWithEqualityFn } from "zustand/traditional";
import type { ChatMessage } from "../ai/types";
import { useChatStoreContext } from "./chat-store-context";
import type { MarkdownMemoAugmentedState } from "./with-markdown-memo";

export function useMarkdownStore<T>(
  selector: (store: MarkdownMemoAugmentedState<ChatMessage>) => T,
  equalityFn?: (a: T, b: T) => boolean
): T {
  const store = useChatStoreContext();
  if (!store) {
    throw new Error("useMarkdownStore must be used within ChatStoreProvider");
  }
  return useStoreWithEqualityFn(store, selector, equalityFn);
}

export const useMarkdownBlocksForPart = (messageId: string, partIdx: number) =>
  useMarkdownStore((state) =>
    state.getMarkdownBlocksForPart(messageId, partIdx)
  );

export const useMarkdownBlockIndexesForPart = (
  messageId: string,
  partIdx: number
) =>
  useMarkdownStore((state) =>
    state.getMarkdownBlockCountForPart(messageId, partIdx)
  );

export const useMarkdownBlockCountForPart = (
  messageId: string,
  partIdx: number
) =>
  useMarkdownStore((state) =>
    state.getMarkdownBlockCountForPart(messageId, partIdx)
  );

export const useMarkdownBlockByIndex = (
  messageId: string,
  partIdx: number,
  blockIdx: number
) =>
  useMarkdownStore((state) =>
    state.getMarkdownBlockByIndex(messageId, partIdx, blockIdx)
  );

import { type RefObject, useEffect, useRef } from "react";

export function useScrollToBottom<T extends HTMLElement>(): [
  RefObject<T>,
  RefObject<T>,
] {
  const containerRef = useRef<T>(null);
  const endRef = useRef<T>(null);
  const oneTimeScrollRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;

    if (container && end) {
      // Immediate scroll to bottom on initial load
      end.scrollIntoView({ behavior: "instant", block: "end" });

      // Keep track of previous message count and content
      let prevMessageCount = container.querySelectorAll(
        '[data-role="user"], [data-role="assistant"]'
      ).length;
      let lastMessageTextLength = 0;
      const observer = new MutationObserver((_mutations) => {
        // Check if new messages were added or content is streaming
        const currentMessageCount = container.querySelectorAll(
          '[data-role="user"], [data-role="assistant"]'
        ).length;
        const messages = container.querySelectorAll(
          '[data-role="user"], [data-role="assistant"]'
        );

        // If there are messages, check the last one for streaming content changes
        let shouldScroll = false;

        if (currentMessageCount > 0) {
          const lastMessage = Array.from(messages).at(-1);
          const lastMessageContent = lastMessage?.textContent ?? "";

          // Determine if we should scroll based on:
          // 1. New message was added
          // 2. Last message content is growing (streaming)
          if (currentMessageCount !== prevMessageCount) {
            shouldScroll = true;
            prevMessageCount = currentMessageCount;
          } else if (lastMessageContent.length > lastMessageTextLength) {
            // Streaming text detection - content is growing
            shouldScroll = true;
          }

          // Update content length tracking
          lastMessageTextLength = lastMessageContent.length;
        }

        if (shouldScroll) {
          end.scrollIntoView({ behavior: "instant", block: "end" });
          oneTimeScrollRef.current = false;
        } else if (oneTimeScrollRef.current === false) {
          end.scrollIntoView({ behavior: "instant", block: "end" });
          oneTimeScrollRef.current = true;
        }
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });

      return () => observer.disconnect();
    }
  }, []);

  return [containerRef, endRef];
}

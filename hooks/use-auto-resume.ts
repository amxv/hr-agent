"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { useEffect } from "react";
import { useDataStream } from "@/components/data-stream-provider";
import type { ChatMessage } from "@/lib/ai/types";
import { useSetMessages } from "@/lib/stores/hooks";

export type UseAutoResumeProps = {
  autoResume: boolean;
  initialMessages: ChatMessage[];
  resumeStream: UseChatHelpers<ChatMessage>["resumeStream"];
};

export function useAutoResume({
  autoResume,
  initialMessages,
  resumeStream,
}: UseAutoResumeProps) {
  const { dataStream } = useDataStream();
  const setMessages = useSetMessages();

  useEffect(() => {
    if (!autoResume) {
      return;
    }

    const mostRecentMessage = initialMessages.at(-1);
    console.log("mostRecentMessage", mostRecentMessage);
    if (
      mostRecentMessage?.role === "user" ||
      (mostRecentMessage?.role === "assistant" &&
        mostRecentMessage.metadata?.isPartial)
    ) {
      console.log("Running experimental_resume");
      resumeStream();
    }
    // we intentionally run this once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoResume, initialMessages, resumeStream]);

  useEffect(() => {
    if (!dataStream) {
      return;
    }
    if (dataStream.length === 0) {
      return;
    }

    const dataPart = dataStream[0];

    if (dataPart.type === "data-appendMessage") {
      const message = JSON.parse(dataPart.data);
      setMessages([...initialMessages, message]);
    }
  }, [dataStream, initialMessages, setMessages]);
}

"use client";
import equal from "fast-deep-equal";
import { memo } from "react";
import { useMessageRoleById } from "@/lib/stores/hooks";
import { AssistantMessage } from "./assistant-message";
import { type BaseMessageProps, UserMessage } from "./user-message";

const PurePreviewMessage = ({
  messageId,
  vote,
  isLoading,
  isReadonly,
  parentMessageId,
}: BaseMessageProps) => {
  const role = useMessageRoleById(messageId);
  if (!role) {
    return null;
  }

  return (
    <>
      {role === "user" ? (
        <UserMessage
          isLoading={isLoading}
          isReadonly={isReadonly}
          messageId={messageId}
          parentMessageId={parentMessageId}
          vote={vote}
        />
      ) : (
        <AssistantMessage
          isLoading={isLoading}
          isReadonly={isReadonly}
          messageId={messageId}
          vote={vote}
        />
      )}
    </>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }
    if (prevProps.messageId !== nextProps.messageId) {
      return false;
    }
    if (!equal(prevProps.vote, nextProps.vote)) {
      return false;
    }
    if (prevProps.parentMessageId !== nextProps.parentMessageId) {
      return false;
    }

    return true;
  }
);

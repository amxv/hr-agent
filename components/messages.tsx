import { memo } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import type { Vote } from "@/lib/db/schema";
import { useChatId, useChatStatus, useMessageIds } from "@/lib/stores/hooks";
import { Greeting } from "./greeting";
import { PreviewMessage } from "./message";
import { ResponseErrorMessage } from "./response-error-message";
import { ThinkingMessage } from "./thinking-message";

type PureMessagesInternalProps = {
  votes: Vote[] | undefined;
  isReadonly: boolean;
};

const PureMessagesInternal = memo(function PureMessagesInternal({
  votes,
  isReadonly,
}: PureMessagesInternalProps) {
  const chatId = useChatId();
  const status = useChatStatus();
  const messageIds = useMessageIds() as string[];

  if (!chatId) {
    return null;
  }

  if (messageIds.length === 0) {
    return <Greeting />;
  }

  return (
    <>
      {messageIds.map((messageId, index) => (
        <PreviewMessage
          isLoading={status === "streaming" && messageIds.length - 1 === index}
          isReadonly={isReadonly}
          key={messageId}
          messageId={messageId}
          parentMessageId={index > 0 ? messageIds[index - 1] : null}
          vote={
            votes
              ? votes.find((vote) => vote.messageId === messageId)
              : undefined
          }
        />
      ))}

      {status === "submitted" && messageIds.length > 0 && (
        // messages[messages.length - 1].role === 'user' &&
        <ThinkingMessage />
      )}

      {status === "error" && <ResponseErrorMessage />}
    </>
  );
});

export type MessagesProps = {
  votes: Vote[] | undefined;
  isReadonly: boolean;
  isVisible: boolean;
  onModelChange?: (modelId: string) => void;
};

function PureMessages({
  votes,
  isReadonly,
  isVisible: _isVisible,
}: MessagesProps) {
  return (
    <Conversation className="flex w-full flex-1 flex-col">
      <ConversationContent className="container mx-auto flex h-full min-w-0 flex-col pb-10 sm:max-w-2xl md:max-w-3xl">
        <PureMessagesInternal isReadonly={isReadonly} votes={votes} />
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.votes !== nextProps.votes) {
    return false;
  }
  if (prevProps.isReadonly !== nextProps.isReadonly) {
    return false;
  }
  // NOTE: isVisible avoids re-renders when the messages aren't visible
  if (prevProps.isVisible !== nextProps.isVisible) {
    return false;
  }

  return true;
});

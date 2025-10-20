"use client";
import equal from "fast-deep-equal";
import { memo, useState } from "react";
import {
  Message as AIMessage,
  MessageContent as AIMessageContent,
} from "@/components/ai-elements/message";
import type { Vote } from "@/lib/db/schema";
import { useChatId, useMessageById } from "@/lib/stores/hooks";
import { cn, getAttachmentsFromMessage } from "@/lib/utils";
import { AttachmentList } from "./attachment-list";
import { ImageModal } from "./image-modal";
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";

export type BaseMessageProps = {
  messageId: string;
  vote: Vote | undefined;
  isLoading: boolean;
  isReadonly: boolean;
  parentMessageId: string | null;
};

export const PureUserMessage = ({
  messageId,
  vote,
  isLoading,
  isReadonly,
  parentMessageId,
}: BaseMessageProps) => {
  const chatId = useChatId();
  const message = useMessageById(messageId);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [imageModal, setImageModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    imageName?: string;
  }>({
    isOpen: false,
    imageUrl: "",
    imageName: undefined,
  });

  const handleImageClick = (imageUrl: string, imageName?: string) => {
    setImageModal({
      isOpen: true,
      imageUrl,
      imageName,
    });
  };

  const handleImageModalClose = () => {
    setImageModal({
      isOpen: false,
      imageUrl: "",
      imageName: undefined,
    });
  };

  if (!message) {
    return null;
  }
  const textPart = message.parts.find((part) => part.type === "text");
  if (!(textPart && chatId)) {
    return null;
  }

  return (
    <>
      <AIMessage
        className={cn(
          // TODO: Consider not using this max-w class override when editing is cohesive with displaying the message
          mode === "edit" ? "max-w-full [&>div]:max-w-full" : undefined,
          "py-1"
        )}
        from="user"
      >
        <div
          className={cn(
            "flex w-full flex-col gap-2",
            message.role === "user" && mode !== "edit" && "items-end"
          )}
        >
          {mode === "view" ? (
            isReadonly ? (
              <AIMessageContent
                className="text-left"
                data-testid="message-content"
              >
                <AttachmentList
                  attachments={getAttachmentsFromMessage(message)}
                  onImageClick={handleImageClick}
                  testId="message-attachments"
                />
                <pre className="whitespace-pre-wrap font-sans">
                  {textPart.text}
                </pre>
              </AIMessageContent>
            ) : (
              <button
                className="cursor-pointer text-left transition-opacity hover:opacity-80"
                data-testid="message-content"
                onClick={() => setMode("edit")}
                type="button"
              >
                <AIMessageContent
                  className="text-left"
                  data-testid="message-content"
                >
                  <AttachmentList
                    attachments={getAttachmentsFromMessage(message)}
                    onImageClick={handleImageClick}
                    testId="message-attachments"
                  />
                  <pre className="whitespace-pre-wrap font-sans">
                    {textPart.text}
                  </pre>
                </AIMessageContent>
              </button>
            )
          ) : (
            <div className="flex flex-row items-start gap-2">
              <MessageEditor
                chatId={chatId}
                key={message.id}
                message={message}
                parentMessageId={parentMessageId}
                setMode={setMode}
              />
            </div>
          )}

          <div className="self-end">
            <MessageActions
              chatId={chatId}
              isEditing={mode === "edit"}
              isLoading={isLoading}
              isReadOnly={isReadonly}
              key={`action-${message.id}`}
              messageId={message.id}
              onCancelEdit={() => setMode("view")}
              onStartEdit={() => setMode("edit")}
              vote={vote}
            />
          </div>
        </div>
      </AIMessage>
      <ImageModal
        imageName={imageModal.imageName}
        imageUrl={imageModal.imageUrl}
        isOpen={imageModal.isOpen}
        onClose={handleImageModalClose}
      />
    </>
  );
};

export const UserMessage = memo(PureUserMessage, (prevProps, nextProps) => {
  if (prevProps.messageId !== nextProps.messageId) {
    return false;
  }
  if (prevProps.isReadonly !== nextProps.isReadonly) {
    return false;
  }
  if (prevProps.parentMessageId !== nextProps.parentMessageId) {
    return false;
  }
  if (!equal(prevProps.vote, nextProps.vote)) {
    return false;
  }
  if (prevProps.isLoading !== nextProps.isLoading) {
    return false;
  }
  return true;
});

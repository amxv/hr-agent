import { useMutation, useQueryClient } from "@tanstack/react-query";
import equal from "fast-deep-equal";
import { Pencil, PencilOff } from "lucide-react";
import { memo } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import { Action, Actions } from "@/components/ai-elements/actions";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Vote } from "@/lib/db/schema";
import { useChatStoreApi } from "@/lib/stores/chat-store-context";
import { useMessageById, useMessageRoleById } from "@/lib/stores/hooks";
import { useSession } from "@/providers/session-provider";
import { useTRPC } from "@/trpc/react";
import { CopyIcon, ThumbDownIcon, ThumbUpIcon } from "./icons";
import { MessageSiblings } from "./message-siblings";
import { RetryButton } from "./retry-button";
import { Tag } from "./tag";
export function PureMessageActions({
  chatId,
  messageId,
  vote,
  isLoading,
  isReadOnly,
  isEditing,
  onStartEdit,
  onCancelEdit,
}: {
  chatId: string;
  messageId: string;
  vote: Vote | undefined;
  isLoading: boolean;
  isReadOnly: boolean;
  isEditing?: boolean;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
}) {
  const storeApi = useChatStoreApi();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [_, copyToClipboard] = useCopyToClipboard();
  const { data: session } = useSession();
  const role = useMessageRoleById(messageId);

  const isAuthenticated = !!session?.user;
  const isMobile = useIsMobile();

  const voteMessageMutation = useMutation(
    trpc.vote.voteMessage.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.vote.getVotes.queryKey({ chatId }),
        });
      },
    })
  );

  // Version selector and model tag handled by MessageVersionAndModel component

  if (isLoading) {
    return <div className="h-7" />;
  }

  const showActionsWithoutHover = isMobile || isEditing || role === "assistant";
  return (
    <Actions
      className={
        showActionsWithoutHover
          ? ""
          : "opacity-0 transition-opacity duration-150 focus-within:opacity-100 hover:opacity-100 group-hover/message:opacity-100 group-hover:opacity-100"
      }
    >
      {role === "user" &&
        !isReadOnly &&
        (isEditing ? (
          <Action
            className="h-7 w-7 p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => onCancelEdit?.()}
            tooltip="Cancel edit"
          >
            <PencilOff className="h-3.5 w-3.5" />
          </Action>
        ) : (
          <Action
            className="h-7 w-7 p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => onStartEdit?.()}
            tooltip="Edit message"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Action>
        ))}
      <Action
        className="h-7 w-7 p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        onClick={async () => {
          const message = storeApi
            .getState()
            .messages.find((m) => m.id === messageId);
          if (!message) {
            return;
          }

          const textFromParts = message.parts
            ?.filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n")
            .trim();

          if (!textFromParts) {
            toast.error("There's no text to copy!");
            return;
          }

          await copyToClipboard(textFromParts);
          toast.success("Copied to clipboard!");
        }}
        tooltip="Copy"
      >
        <CopyIcon size={14} />
      </Action>

      <MessageSiblings isReadOnly={isReadOnly} messageId={messageId} />

      {role === "assistant" && !isReadOnly && isAuthenticated && (
        <>
          <Action
            className="pointer-events-auto! h-7 w-7 p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            data-testid="message-upvote"
            disabled={vote?.isUpvoted || !isAuthenticated}
            onClick={() => {
              toast.promise(
                voteMessageMutation.mutateAsync({
                  chatId,
                  messageId,
                  type: "up" as const,
                }),
                {
                  loading: "Upvoting Response...",
                  success: "Upvoted Response!",
                  error: "Failed to upvote response.",
                }
              );
            }}
            tooltip="Upvote Response"
          >
            <ThumbUpIcon size={14} />
          </Action>

          <Action
            className="pointer-events-auto! h-7 w-7 p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            data-testid="message-downvote"
            disabled={(vote && !vote.isUpvoted) || !session?.user}
            onClick={() => {
              toast.promise(
                voteMessageMutation.mutateAsync({
                  chatId,
                  messageId,
                  type: "down" as const,
                }),
                {
                  loading: "Downvoting Response...",
                  success: "Downvoted Response!",
                  error: "Failed to downvote response.",
                }
              );
            }}
            tooltip="Downvote Response"
          >
            <ThumbDownIcon size={14} />
          </Action>

          {!isReadOnly && <RetryButton messageId={messageId} />}
          <SelectedModelId messageId={messageId} />
        </>
      )}
    </Actions>
  );
}

function SelectedModelId({ messageId }: { messageId: string }) {
  const message = useMessageById(messageId);
  return message?.metadata?.selectedModel ? (
    <div className="ml-2 flex items-center">
      <Tag>{message.metadata.selectedModel}</Tag>
    </div>
  ) : null;
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (!equal(prevProps.vote, nextProps.vote)) {
      return false;
    }
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.messageId !== nextProps.messageId) {
      return false;
    }
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }
    if (prevProps.isReadOnly !== nextProps.isReadOnly) {
      return false;
    }
    if (prevProps.isEditing !== nextProps.isEditing) {
      return false;
    }
    if (prevProps.onStartEdit !== nextProps.onStartEdit) {
      return false;
    }
    if (prevProps.onCancelEdit !== nextProps.onCancelEdit) {
      return false;
    }

    return true;
  }
);

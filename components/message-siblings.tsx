import { ChevronLeft, ChevronRight } from "lucide-react";
import { memo } from "react";
import { Action } from "@/components/ai-elements/actions";
import { useMessageById, useMessageRoleById } from "@/lib/stores/hooks";
import { useMessageTree } from "@/providers/message-tree-provider";
import { useSession } from "@/providers/session-provider";

export function PureMessageSiblings({
  messageId,
  isReadOnly: _isReadOnly,
}: {
  messageId: string;
  isReadOnly: boolean;
}) {
  const { data: session } = useSession();
  const _isAuthenticated = !!session?.user;

  const { getMessageSiblingInfo, navigateToSibling } = useMessageTree();
  const siblingInfo = getMessageSiblingInfo(messageId);
  const hasSiblings = siblingInfo && siblingInfo.siblings.length > 1;

  const _role = useMessageRoleById(messageId);
  const _message = useMessageById(messageId);

  return (
    <div className="flex items-center justify-center gap-1">
      {hasSiblings && (
        <>
          <Action
            className="h-7 w-7 px-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            disabled={siblingInfo.siblingIndex === 0}
            onClick={() => navigateToSibling(messageId, "prev")}
            tooltip="Previous version"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Action>

          <span className="text-muted-foreground text-xs">
            {siblingInfo.siblingIndex + 1}/{siblingInfo.siblings.length}
          </span>

          <Action
            className="h-7 w-7 px-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            disabled={
              siblingInfo.siblingIndex === siblingInfo.siblings.length - 1
            }
            onClick={() => navigateToSibling(messageId, "next")}
            tooltip="Next version"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Action>
        </>
      )}
    </div>
  );
}

export const MessageSiblings = memo(PureMessageSiblings);

"use client";
import { Share } from "lucide-react";
import { memo } from "react";
import { HeaderActions } from "@/components/header-actions";
import { SidebarToggle } from "@/components/sidebar-toggle";
import type { Session } from "@/lib/auth";
import { ShareButton } from "./share-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

function PureChatHeader({
  chatId,
  isReadonly,
  hasMessages,
  user,
}: {
  chatId: string;
  isReadonly: boolean;
  hasMessages: boolean;
  user: Session["user"];
}) {
  return (
    <header className="sticky top-0 flex h-(--header-height) items-center justify-between gap-2 bg-background px-2 py-1.5 md:px-2">
      <div className="flex items-center gap-2">
        <SidebarToggle />

        {!isReadonly && hasMessages && <ShareButton chatId={chatId} />}
        {isReadonly && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-muted-foreground text-sm">
                <Share className="opacity-70" size={14} />
                <span>Shared</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <div className="font-medium">Shared Chat</div>
                <div className="mt-1 text-muted-foreground text-xs">
                  This is a shared chat
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <HeaderActions user={user} />
    </header>
  );
}

export const ChatHeader = memo(
  PureChatHeader,
  (prevProps, nextProps) => prevProps.hasMessages === nextProps.hasMessages
);

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlusIcon } from "@/components/icons";
import { getNewChatShortcutText } from "@/components/keyboard-shortcuts";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { useChatId } from "@/providers/chat-id-provider";

export function NewChatButton() {
  const { setOpenMobile } = useSidebar();
  const { refreshChatID } = useChatId();
  const [shortcutText, setShortcutText] = useState("Ctrl+Shift+O");

  useEffect(() => {
    setShortcutText(getNewChatShortcutText());
  }, []);

  return (
    <SidebarMenuButton asChild className="mt-4">
      <Link
        className="flex w-full items-center gap-2"
        href="/chat"
        onClick={() => {
          setOpenMobile(false);
          refreshChatID();
        }}
      >
        <PlusIcon />
        <span className="transition-opacity duration-150 ease-in-out group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:delay-0 group-data-[state=expanded]:delay-100">
          New Chat
        </span>
        <span className="ml-auto text-muted-foreground text-xs transition-opacity duration-150 ease-in-out group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:delay-0 group-data-[state=expanded]:delay-100">
          {shortcutText}
        </span>
      </Link>
    </SidebarMenuButton>
  );
}

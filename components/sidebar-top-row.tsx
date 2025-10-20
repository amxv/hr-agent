"use client";

import Image from "next/image";
import Link from "next/link";
import { useSidebar } from "@/components/ui/sidebar";
import { useChatId } from "@/providers/chat-id-provider";

export function SidebarTopRow() {
  const { setOpenMobile, open, openMobile } = useSidebar();
  const { refreshChatID } = useChatId();

  return (
    <Link
      className="flex flex-row items-center gap-2 group-data-[collapsible=icon]:w-fit"
      href="/"
      onClick={() => {
        setOpenMobile(false);
        refreshChatID();
      }}
    >
      <span className="flex cursor-pointer items-center gap-2 rounded-md p-1 font-semibold text-lg group-data-[collapsible=icon]:w-fit group-data-[state=expanded]:hover:bg-muted">
        <Image
          alt="AgentDune Chat"
          className="h-6 w-6 shrink-0"
          height={24}
          src="/icon.svg"
          width={24}
        />
        <span className="transition-opacity duration-150 ease-in-out group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:delay-0 group-data-[state=expanded]:delay-100 overflow-hidden whitespace-nowrap">
          AgentDune Chat
        </span>
      </span>
    </Link>
  );
}

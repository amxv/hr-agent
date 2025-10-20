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
      className="flex flex-row items-center gap-2"
      href="/"
      onClick={() => {
        setOpenMobile(false);
        refreshChatID();
      }}
    >
      <span className="flex cursor-pointer items-center gap-2 rounded-md p-1 font-semibold text-lg hover:bg-muted">
        <Image
          alt="AgentDune Chat"
          className="h-6 w-6"
          height={24}
          src="/icon.svg"
          width={24}
        />
        {(open || openMobile) && "AgentDune Chat"}
      </span>
    </Link>
  );
}

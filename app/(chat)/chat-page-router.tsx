"use client";

import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChatPage } from "@/app/(chat)/chat/[id]/chat-page";
import { useChatId } from "@/providers/chat-id-provider";
import { ChatHome } from "./chat-home";
import { SharedChatPage } from "./share/[id]/shared-chat-page";

export function ChatPageRouter() {
  const { id, type } = useChatId();

  if (!id) {
    return notFound();
  }

  // Render appropriate page based on type
  if (type === "provisional") {
    return <ChatHome id={id} />;
  }

  if (type === "shared") {
    return <SharedChatPage id={id} />;
  }

  if (type === "chat") {
    return (
      <Suspense>
        <ChatPage id={id} />
      </Suspense>
    );
  }

  return notFound();
}

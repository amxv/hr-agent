"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { useChatId } from "@/providers/chat-id-provider";

export function KeyboardShortcuts() {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const { refreshChatID } = useChatId();

  // Keyboard shortcut for new chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "O" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpenMobile(false);
        refreshChatID();
        router.push("/");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setOpenMobile, refreshChatID, router]);

  return null; // This component only handles keyboard events
}

// Helper function to get platform-specific shortcut text
export function getNewChatShortcutText() {
  if (typeof window === "undefined") {
    return "Ctrl+Shift+O";
  }

  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  return isMac ? "Cmd+Shift+O" : "Ctrl+Shift+O";
}

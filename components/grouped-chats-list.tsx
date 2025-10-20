import { isToday, isYesterday, subMonths, subWeeks } from "date-fns";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import type { UIChat } from "@/lib/types/uiChat";
import { SidebarChatItem } from "./sidebar-chat-item";

type GroupedChats = {
  pinned: UIChat[];
  today: UIChat[];
  yesterday: UIChat[];
  lastWeek: UIChat[];
  lastMonth: UIChat[];
  older: UIChat[];
};

type GroupedChatsListProps = {
  chats: UIChat[];
  onDelete: (chatId: string) => void;
  onRename: (chatId: string, title: string) => void;
  onPin: (chatId: string, isPinned: boolean) => void;
  setOpenMobile: (open: boolean) => void;
};

export function GroupedChatsList({
  chats,
  onDelete,
  onRename,
  onPin,
  setOpenMobile,
}: GroupedChatsListProps) {
  const pathname = usePathname();

  // Extract chatId from URL for /chat routes
  const chatId = useMemo(() => {
    if (pathname?.startsWith("/chat/")) {
      return pathname.replace("/chat/", "") || null;
    }
    return null;
  }, [pathname]);

  const groupedChats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = subWeeks(now, 1);
    const oneMonthAgo = subMonths(now, 1);

    // Separate pinned and non-pinned chats
    const pinnedChats = chats.filter((chat) => chat.isPinned);
    const nonPinnedChats = chats.filter((chat) => !chat.isPinned);

    const groups = nonPinnedChats.reduce(
      (groups, chat) => {
        const chatDate = new Date(chat.updatedAt);

        if (isToday(chatDate)) {
          groups.today.push(chat);
        } else if (isYesterday(chatDate)) {
          groups.yesterday.push(chat);
        } else if (chatDate > oneWeekAgo) {
          groups.lastWeek.push(chat);
        } else if (chatDate > oneMonthAgo) {
          groups.lastMonth.push(chat);
        } else {
          groups.older.push(chat);
        }

        return groups;
      },
      {
        pinned: [],
        today: [],
        yesterday: [],
        lastWeek: [],
        lastMonth: [],
        older: [],
      } as GroupedChats
    );

    // Add pinned chats (sorted by most recently updated first)
    groups.pinned = pinnedChats.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return groups;
  }, [chats]);

  return (
    <>
      {groupedChats.pinned.length > 0 && (
        <>
          <div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
            Pinned
          </div>
          {groupedChats.pinned.map((chat) => (
            <SidebarChatItem
              chat={chat}
              isActive={chat.id === chatId}
              key={chat.id}
              onDelete={onDelete}
              onPin={onPin}
              onRename={onRename}
              setOpenMobile={setOpenMobile}
            />
          ))}
        </>
      )}

      {groupedChats.today.length > 0 && (
        <>
          <div
            className={`px-2 py-1 text-sidebar-foreground/50 text-xs ${groupedChats.pinned.length > 0 ? "mt-6" : ""}`}
          >
            Today
          </div>
          {groupedChats.today.map((chat) => (
            <SidebarChatItem
              chat={chat}
              isActive={chat.id === chatId}
              key={chat.id}
              onDelete={onDelete}
              onPin={onPin}
              onRename={onRename}
              setOpenMobile={setOpenMobile}
            />
          ))}
        </>
      )}

      {groupedChats.yesterday.length > 0 && (
        <>
          <div className="mt-6 px-2 py-1 text-sidebar-foreground/50 text-xs">
            Yesterday
          </div>
          {groupedChats.yesterday.map((chat) => (
            <SidebarChatItem
              chat={chat}
              isActive={chat.id === chatId}
              key={chat.id}
              onDelete={onDelete}
              onPin={onPin}
              onRename={onRename}
              setOpenMobile={setOpenMobile}
            />
          ))}
        </>
      )}

      {groupedChats.lastWeek.length > 0 && (
        <>
          <div className="mt-6 px-2 py-1 text-sidebar-foreground/50 text-xs">
            Last 7 days
          </div>
          {groupedChats.lastWeek.map((chat) => (
            <SidebarChatItem
              chat={chat}
              isActive={chat.id === chatId}
              key={chat.id}
              onDelete={onDelete}
              onPin={onPin}
              onRename={onRename}
              setOpenMobile={setOpenMobile}
            />
          ))}
        </>
      )}

      {groupedChats.lastMonth.length > 0 && (
        <>
          <div className="mt-6 px-2 py-1 text-sidebar-foreground/50 text-xs">
            Last 30 days
          </div>
          {groupedChats.lastMonth.map((chat) => (
            <SidebarChatItem
              chat={chat}
              isActive={chat.id === chatId}
              key={chat.id}
              onDelete={onDelete}
              onPin={onPin}
              onRename={onRename}
              setOpenMobile={setOpenMobile}
            />
          ))}
        </>
      )}

      {groupedChats.older.length > 0 && (
        <>
          <div className="mt-6 px-2 py-1 text-sidebar-foreground/50 text-xs">
            Older
          </div>
          {groupedChats.older.map((chat) => (
            <SidebarChatItem
              chat={chat}
              isActive={chat.id === chatId}
              key={chat.id}
              onDelete={onDelete}
              onPin={onPin}
              onRename={onRename}
              setOpenMobile={setOpenMobile}
            />
          ))}
        </>
      )}
    </>
  );
}

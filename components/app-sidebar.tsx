import { Cpu } from "lucide-react";
import Link from "next/link";
import { NewChatButton } from "@/components/new-chat-button";
import { SearchChatsButton } from "@/components/search-chats";
import { SidebarTopRow } from "@/components/sidebar-top-row";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { AppSidebarFooterConditional } from "./app-sidebar-footer-conditional";
import { AppSidebarHistoryConditional } from "./app-sidebar-history-conditional";

export function AppSidebar() {
  return (
    <Sidebar
      className="grid max-h-dvh grid-rows-[auto_1fr_auto] group-data-[side=left]:border-r-0"
      collapsible="icon"
    >
      <SidebarHeader className="shrink-0">
        <SidebarMenu>
          <div className="flex flex-row items-center justify-between">
            <SidebarTopRow />
          </div>

          <NewChatButton />

          <SidebarMenuItem>
            <SearchChatsButton />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Models">
              <Link href="/models">
                <Cpu className="size-4" />
                <span className="group-data-[collapsible=icon]:hidden">
                  Models
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <ScrollArea className="relative flex-1 overflow-y-auto">
        <SidebarContent className="max-w-(--sidebar-width) pr-2">
          <AppSidebarHistoryConditional />
        </SidebarContent>
      </ScrollArea>

      <AppSidebarFooterConditional />
    </Sidebar>
  );
}

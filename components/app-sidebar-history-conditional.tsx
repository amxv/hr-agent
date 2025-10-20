"use client";

import { SidebarHistory } from "@/components/sidebar-history";
import { useSidebar } from "@/components/ui/sidebar";

export function AppSidebarHistoryConditional() {
  const { open, openMobile } = useSidebar();

  if (!(open || openMobile)) {
    return null;
  }

  return <SidebarHistory />;
}

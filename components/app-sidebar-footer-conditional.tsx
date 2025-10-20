"use client";

import { SidebarCredits } from "@/components/sidebar-credits";
import {
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebarFooterConditional() {
  const { open, openMobile } = useSidebar();

  if (!(open || openMobile)) {
    return null;
  }

  return (
    <>
      <SidebarSeparator />
      <SidebarFooter className="shrink-0">
        <SidebarCredits />
      </SidebarFooter>
    </>
  );
}

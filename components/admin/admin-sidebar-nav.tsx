"use client";

import {
  AdminSidebar,
  AdminSidebarBody,
  AdminSidebarLink,
} from "@/components/admin/admin-sidebar";
import { FileText, Users } from "lucide-react";
import { useState } from "react";

export function AdminSidebarNav() {
  const [open, setOpen] = useState(false);

  const links = [
    {
      label: "Users",
      href: "/admin/users",
      icon: (
        <Users className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Documents",
      href: "/admin/documents",
      icon: (
        <FileText className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
  ];

  return (
    <AdminSidebar open={open} setOpen={setOpen}>
      <AdminSidebarBody className="justify-between gap-10">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          <div className="mt-6 flex flex-col gap-2">
            {links.map((link, idx) => (
              <AdminSidebarLink key={`${link.label}-${idx}`} link={link} />
            ))}
          </div>
        </div>
      </AdminSidebarBody>
    </AdminSidebar>
  );
}

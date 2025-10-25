"use client";

import {
  AdminSidebar,
  AdminSidebarBody,
  AdminSidebarLink,
  useAdminSidebar,
} from "@/components/admin/admin-sidebar";
import { HeaderUserNav } from "@/components/sidebar-user-nav";
import { useSession } from "@/providers/session-provider";
import { FileText, Home, Users } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";

function AdminUserButton() {
  const { open, animate } = useAdminSidebar();
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex items-center justify-start gap-3 py-3 pl-1 pr-2.5">
      <HeaderUserNav user={session.user} />
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-sm whitespace-pre inline-block !p-0 !m-0 text-black dark:text-white truncate"
      >
        {session.user.email}
      </motion.span>
    </div>
  );
}

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

  const bottomLinks = [
    {
      label: "Home",
      href: "/",
      icon: (
        <Home className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
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
        <div className="flex flex-col gap-2">
          {bottomLinks.map((link, idx) => (
            <AdminSidebarLink key={`${link.label}-${idx}`} link={link} />
          ))}
          <AdminUserButton />
        </div>
      </AdminSidebarBody>
    </AdminSidebar>
  );
}

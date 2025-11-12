"use client";

import { Briefcase, FileText, Home, Users } from "lucide-react";
import { motion } from "motion/react";
import type { Route } from "next";
import Image from "next/image";
import { useState } from "react";
import {
  AdminSidebar,
  AdminSidebarBody,
  AdminSidebarLink,
  useAdminSidebar,
} from "@/components/admin/admin-sidebar";
import { HeaderUserNav } from "@/components/sidebar-user-nav";
import { useSession } from "@/providers/session-provider";

function AdminUserButton() {
  const { open, animate } = useAdminSidebar();
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex items-center justify-start gap-3 py-3 pr-2.5 pl-1">
      <HeaderUserNav user={session.user} />
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="!p-0 !m-0 inline-block truncate whitespace-pre text-black text-sm dark:text-white"
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
      href: "/admin/users" as Route,
      icon: (
        <Users className="h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Documents",
      href: "/admin/documents" as Route,
      icon: (
        <FileText className="h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "HR Data",
      href: "/admin/hr-data" as Route,
      icon: (
        <Briefcase className="h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
  ];

  const bottomLinks = [
    {
      label: "Home",
      href: "/" as Route,
      icon: (
        <Home className="h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
  ];

  return (
    <AdminSidebar open={open} setOpen={setOpen}>
      <AdminSidebarBody className="justify-between gap-10">
        <div className="scrollbar-hide flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
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

"use client";

import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Route } from "next";
import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext, useState } from "react";
import { cn } from "@/lib/utils";

interface Links {
  label: string;
  href: Route;
  icon: ReactNode;
}

interface AdminSidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const AdminSidebarContext = createContext<AdminSidebarContextProps | undefined>(
  undefined
);

export const useAdminSidebar = () => {
  const context = useContext(AdminSidebarContext);
  if (!context) {
    throw new Error(
      "useAdminSidebar must be used within an AdminSidebarProvider"
    );
  }
  return context;
};

export const AdminSidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <AdminSidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </AdminSidebarContext.Provider>
  );
};

export const AdminSidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => (
  <AdminSidebarProvider animate={animate} open={open} setOpen={setOpen}>
    {children}
  </AdminSidebarProvider>
);

export const AdminSidebarBody = (
  props: React.ComponentProps<typeof motion.div>
) => (
  <>
    <AdminDesktopSidebar {...props} />
    <AdminMobileSidebar {...(props as React.ComponentProps<"div">)} />
  </>
);

export const AdminDesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useAdminSidebar();
  return (
    <motion.div
      animate={{
        width: animate ? (open ? "220px" : "75px") : "220px",
      }}
      className={cn(
        "hidden h-full w-[220px] flex-shrink-0 bg-background px-4 py-4 md:flex md:flex-col dark:bg-neutral-800",
        className
      )}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const AdminMobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useAdminSidebar();
  return (
    <>
      <div
        className={cn(
          "flex h-10 w-full flex-row items-center bg-white px-4 py-4 md:hidden dark:bg-neutral-800"
        )}
        {...props}
      >
        <div className="z-20 flex w-full justify-start">
          <Menu
            className="cursor-pointer text-black dark:text-white"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              animate={{ x: 0, opacity: 1 }}
              className={cn(
                "fixed inset-0 z-[100] flex h-full w-full flex-col justify-between bg-white p-10 dark:bg-neutral-900",
                className
              )}
              exit={{ x: "-100%", opacity: 0 }}
              initial={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
            >
              <button
                className="absolute top-10 right-10 z-50 m-0 cursor-pointer border-none bg-transparent p-0 text-black dark:text-white"
                onClick={() => setOpen(!open)}
                type="button"
              >
                <X />
              </button>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const AdminSidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
  props?: LinkProps<string>;
}) => {
  const { open, animate } = useAdminSidebar();
  const pathname = usePathname();

  // Check if current path starts with the link path
  const isActive =
    pathname.startsWith(link.href) && (link.href !== "/" || pathname === "/");

  return (
    <Link
      className={cn(
        "group/sidebar flex items-center justify-start gap-4 rounded-2xl border border-transparent px-2.5 py-3 transition-all duration-200 hover:bg-orange-50/50 dark:hover:bg-neutral-700",
        isActive &&
          "border-primary/60 bg-white/50 dark:border-neutral-600 dark:bg-neutral-700",
        className
      )}
      href={link.href}
      {...props}
    >
      <div className={cn(isActive ? "text-primary dark:text-primary" : "")}>
        {link.icon}
      </div>
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className={cn(
          "!p-0 !m-0 inline-block whitespace-pre text-sm",
          isActive
            ? "font-medium text-black dark:text-primary"
            : "text-black dark:text-white"
        )}
      >
        {link.label}
      </motion.span>
    </Link>
  );
};

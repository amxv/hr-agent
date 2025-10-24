"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, createContext, useContext, useState } from "react";

interface Links {
  label: string;
  href: string;
  icon: ReactNode;
}

interface AdminSidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const AdminSidebarContext = createContext<
  AdminSidebarContextProps | undefined
>(undefined);

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
}) => {
  return (
    <AdminSidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </AdminSidebarProvider>
  );
};

export const AdminSidebarBody = (
  props: React.ComponentProps<typeof motion.div>
) => {
  return (
    <>
      <AdminDesktopSidebar {...props} />
      <AdminMobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const AdminDesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useAdminSidebar();
  return (
    <motion.div
      className={cn(
        "h-full px-4 py-4 hidden md:flex md:flex-col bg-background dark:bg-neutral-800 w-[220px] flex-shrink-0",
        className
      )}
      animate={{
        width: animate ? (open ? "220px" : "75px") : "220px",
      }}
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
          "h-10 px-4 py-4 flex flex-row md:hidden items-center bg-white dark:bg-neutral-800 w-full"
        )}
        {...props}
      >
        <div className="flex justify-start z-20 w-full">
          <Menu
            className="text-black dark:text-white cursor-pointer"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-white dark:bg-neutral-900 p-10 z-[100] flex flex-col justify-between",
                className
              )}
            >
              <button
                type="button"
                className="absolute right-10 top-10 z-50 text-black dark:text-white cursor-pointer bg-transparent border-none p-0 m-0"
                onClick={() => setOpen(!open)}
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
      href={link.href as string}
      className={cn(
        "flex items-center justify-start gap-4 group/sidebar py-3 px-2.5 rounded-2xl transition-all duration-200 hover:bg-orange-50/50 dark:hover:bg-neutral-700 border border-transparent",
        isActive &&
          "bg-white/50 border-primary/60 dark:bg-neutral-700 dark:border-neutral-600",
        className
      )}
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
          "text-sm whitespace-pre inline-block !p-0 !m-0",
          isActive
            ? "text-black dark:text-primary font-medium"
            : "text-black dark:text-white"
        )}
      >
        {link.label}
      </motion.span>
    </Link>
  );
};

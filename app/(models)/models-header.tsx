"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { memo } from "react";
import { HeaderActions } from "@/components/header-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session-provider";

function PureModelsHeader({ className }: { className?: string }) {
  const pathname = usePathname();
  const _router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const _isAuthenticated = !!user;

  const isActive = (path: string) => {
    if (path === "/chat") {
      return pathname === "/chat";
    }
    return pathname.startsWith(path);
  };

  return (
    <header
      className={cn(
        "relative flex h-(--header-height) w-full items-center gap-2 bg-background px-2 sm:px-3",
        className
      )}
    >
      <Link aria-label="HR Agent home" className="py-2" href="/chat">
        <span className="flex h-9 cursor-pointer items-center gap-2 rounded-md px-2 font-semibold text-lg hover:bg-muted">
          <Image
            alt="HR Agent"
            className="size-6"
            height={24}
            src="/icon.svg"
            width={24}
          />
          <span className="hidden sm:inline">HR Agent</span>
        </span>
      </Link>

      <nav className="-translate-x-1/2 absolute left-1/2 hidden items-center gap-6 sm:flex">
        <Link
          className={cn(
            "font-medium text-sm transition-colors hover:text-foreground",
            isActive("/chat") ? "text-foreground" : "text-muted-foreground"
          )}
          href="/chat"
        >
          Chat
        </Link>
        {!env.NEXT_PUBLIC_DISABLE_MODEL_SELECTION && (
          <>
            <Link
              className={cn(
                "font-medium text-sm transition-colors hover:text-foreground",
                isActive("/models")
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
              href="/models"
            >
              Models
            </Link>
            <Link
              className={cn(
                "font-medium text-sm transition-colors hover:text-foreground",
                isActive("/compare")
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
              // @ts-expect-error - Compare is a valid route
              href="/compare"
            >
              Compare
            </Link>
          </>
        )}
      </nav>

      {/* Right side: actions + mobile menu */}
      <div className="ml-auto flex items-center gap-1">
        <HeaderActions user={user} />
        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Open navigation menu"
                size="icon"
                variant="ghost"
              >
                <Menu className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-40"
              side="bottom"
              sideOffset={8}
            >
              <DropdownMenuItem asChild>
                <Link className={cn(isActive("/chat") && "font-semibold")} href="/chat">
                  Chat
                </Link>
              </DropdownMenuItem>
              {!env.NEXT_PUBLIC_DISABLE_MODEL_SELECTION && (
                <>
                  <DropdownMenuItem asChild>
                    <Link
                      className={cn(isActive("/models") && "font-semibold")}
                      href="/models"
                    >
                      Models
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      className={cn(isActive("/compare") && "font-semibold")}
                      // @ts-expect-error - Compare is a valid route
                      href="/compare"
                    >
                      Compare
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export const ModelsHeader = memo(PureModelsHeader);

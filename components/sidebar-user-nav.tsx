"use client";
import { Coins } from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGetCredits } from "@/hooks/chat-sync-hooks";
import type { Session } from "@/lib/auth";
import authClient from "@/lib/auth-client";

export function HeaderUserNav({
  user,
}: {
  user: NonNullable<Session["user"]>;
}) {
  const { setTheme, theme } = useTheme();
  const { credits } = useGetCredits();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Open user menu"
          size="icon"
          type="button"
          variant="ghost"
        >
          <Image
            alt={user.email ?? "User Avatar"}
            className="rounded-full"
            height={24}
            src={user.image ?? `https://avatar.vercel.sh/${user.email}`}
            width={24}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" side="bottom">
        <DropdownMenuItem disabled>
          <span className="font-medium">{user.email}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <div className="flex items-center text-muted-foreground">
            <Coins className="mr-1 size-4" />
            <span>Credits: {credits ?? "Loading..."}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {`Toggle ${theme === "light" ? "dark" : "light"} mode`}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <button
            className="w-full cursor-pointer"
            onClick={async () => {
              await authClient.signOut();
              window.location.href = "/";
            }}
            type="button"
          >
            Sign out
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

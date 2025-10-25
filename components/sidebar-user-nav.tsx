"use client";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Session } from "@/lib/auth";
import authClient from "@/lib/auth-client";

export function HeaderUserNav({
  user,
}: {
  user: NonNullable<Session["user"]>;
}) {
  const { setTheme, theme } = useTheme();

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
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {`Toggle ${theme === "light" ? "dark" : "light"} mode`}
        </DropdownMenuItem>
        {user.role === "admin" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link className="cursor-pointer" href={"/admin" as string}>
                Admin Panel
              </Link>
            </DropdownMenuItem>
          </>
        )}
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

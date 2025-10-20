"use client";

import { Coins, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useGetCredits } from "@/hooks/chat-sync-hooks";
import { useSession } from "@/providers/session-provider";

export function SidebarCredits() {
  const { credits, isLoadingCredits } = useGetCredits();
  const { data: session } = useSession();
  const router = useRouter();
  const isAuthenticated = !!session?.user;

  if (isLoadingCredits) {
    return (
      <div className="rounded-lg bg-muted/50 px-4 py-3 text-muted-foreground text-sm">
        Loading credits...
      </div>
    );
  }

  const remaining = credits ?? 0;

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-muted/50 px-4 py-3 text-muted-foreground text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            <span>Credits remaining</span>
          </div>
          <span className="font-semibold">{remaining}</span>
        </div>
      </div>

      {!isAuthenticated && (
        <Button
          className="w-full justify-start gap-2"
          onClick={() => {
            router.push("/login");
            router.refresh();
          }}
          variant="outline"
        >
          <LogIn className="h-4 w-4" />
          Sign in to reset your limits
        </Button>
      )}
    </div>
  );
}

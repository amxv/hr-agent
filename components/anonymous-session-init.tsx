"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  clearAnonymousSession,
  createAnonymousSession,
  getAnonymousSession,
  setAnonymousSession,
} from "@/lib/anonymous-session-client";
import type { AnonymousSession } from "@/lib/types/anonymous";
import { useSession } from "@/providers/session-provider";
import { useTRPC } from "@/trpc/react";

// Schema validation function
function isValidAnonymousSession(obj: any): obj is AnonymousSession {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.id === "string" &&
    typeof obj.remainingCredits === "number" &&
    (obj.createdAt instanceof Date || typeof obj.createdAt === "string")
  );
}

export function AnonymousSessionInit() {
  const { data: session, isPending } = useSession();
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  useEffect(() => {
    // Only initialize for non-authenticated users after session is loaded
    if (isPending) {
      return;
    }
    if (session?.user) {
      return;
    }

    // Get raw session data and validate/migrate
    const existingSession = getAnonymousSession();

    if (existingSession) {
      // Validate the existing session schema
      if (!isValidAnonymousSession(existingSession)) {
        console.warn(
          "Invalid session schema detected during init, clearing and creating new session"
        );
        clearAnonymousSession();
        const newSession = createAnonymousSession();
        setAnonymousSession(newSession);
        // Ensure UI refetches credits after creating a valid anonymous session
        queryClient.invalidateQueries({
          queryKey: trpc.credits.getAvailableCredits.queryKey(),
        });
        return;
      }

      console.log("Valid anonymous session found");
    } else {
      // Create new session if none exists
      console.log("No anonymous session found, creating new one");
      const newSession = createAnonymousSession();
      setAnonymousSession(newSession);
      // Ensure UI refetches credits after first-time session creation
      queryClient.invalidateQueries({
        queryKey: trpc.credits.getAvailableCredits.queryKey(),
      });
    }
  }, [session, isPending, queryClient, trpc.credits.getAvailableCredits]);

  return null; // This component doesn't render anything
}

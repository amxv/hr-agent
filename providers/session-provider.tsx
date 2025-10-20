"use client";

import { createContext, useContext, useMemo } from "react";
import type { Session } from "@/lib/auth";
import authClient from "@/lib/auth-client";

type SessionContextValue = {
  data: Session | undefined;
  isPending: boolean;
};

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined
);

export function SessionProvider({
  initialSession,
  children,
}: {
  initialSession?: Session;
  children: React.ReactNode;
}) {
  const { data: clientSessionRaw, isPending } = authClient.useSession();

  const clientSession = clientSessionRaw ? clientSessionRaw : undefined;

  const value = useMemo<SessionContextValue>(() => {
    const effective = isPending
      ? (initialSession ?? clientSession)
      : clientSession;
    return { data: effective, isPending };
  }, [clientSession, initialSession, isPending]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}

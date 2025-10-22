import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SessionProvider } from "@/providers/session-provider";
import { TRPCReactProvider } from "@/trpc/react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const raw = await auth.api.getSession({ headers: await headers() });
  const session = raw
    ? {
        user: raw.user
          ? {
              id: raw.user.id,
              name: raw.user.name ?? null,
              email: raw.user.email ?? null,
              image: raw.user.image ?? null,
            }
          : undefined,
        expires: raw.session?.expiresAt
          ? new Date(raw.session.expiresAt).toISOString()
          : undefined,
      }
    : undefined;

  return (
    <TRPCReactProvider>
      <SessionProvider initialSession={session}>{children}</SessionProvider>
    </TRPCReactProvider>
  );
}

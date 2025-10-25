import { headers } from "next/headers";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
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
              role: raw.user.role ?? null,
              banned: raw.user.banned ?? null,
            }
          : undefined,
        expires: raw.session?.expiresAt
          ? new Date(raw.session.expiresAt).toISOString()
          : undefined,
      }
    : undefined;

  return (
    <TRPCReactProvider>
      <SessionProvider initialSession={session}>
        <div className="flex h-screen w-full overflow-hidden">
          <AdminSidebarNav />
          <div className="mt-3 mr-3 flex h-[calc(100%-1.5rem)] w-full flex-1 flex-col gap-2 overflow-y-auto rounded-[2rem] border border-primary/40 bg-white/75 shadow-lg shadow-primary/60 md:px-4 md:pb-10 dark:border-neutral-700 dark:bg-neutral-900">
            {children}
            <div className="h-8 md:h-12" />
          </div>
        </div>
      </SessionProvider>
    </TRPCReactProvider>
  );
}

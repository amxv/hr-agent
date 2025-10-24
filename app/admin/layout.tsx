import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SessionProvider } from "@/providers/session-provider";
import { TRPCReactProvider } from "@/trpc/react";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";

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
      <SessionProvider initialSession={session}>
        <div className="flex h-screen w-full overflow-hidden">
          <AdminSidebarNav />
          <div className="md:px-4 md:pb-10 rounded-[2rem] mt-3 mr-3 border border-primary/40 dark:border-neutral-700 bg-white/75 dark:bg-neutral-900 flex flex-col gap-2 flex-1 w-full h-[calc(100%-1.5rem)] overflow-y-auto shadow-lg shadow-primary/60">
            {children}
            <div className="h-8 md:h-12" />
          </div>
        </div>
      </SessionProvider>
    </TRPCReactProvider>
  );
}

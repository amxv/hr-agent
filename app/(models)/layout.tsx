import { allModels, providers } from "@ai-models/vercel-gateway";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { SessionProvider } from "@/providers/session-provider";
import { TRPCReactProvider } from "@/trpc/react";
import { auth } from "../../lib/auth";
import { ModelsHeader } from "./models-header";

const totalModels = allModels.length;
const totalProviders = providers.length;

const pageTitle = "Models | HR Agent";
const pageDescription = `Browse ${totalModels} models across ${totalProviders} providers available in HR Agent. Filter and compare by provider, context window, and pricing.`;

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  keywords: [
    "HR Agent",
    "Vercel AI Gateway",
    "models",
    "LLM",
    "AI models",
    "providers",
  ],
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/models",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
  },
  alternates: {
    canonical: "/models",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const HEADER_HEIGHT = "2.75rem";

export default async function ModelsLayout({
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
        <div
          className="grid h-dvh max-h-dvh grid-rows-[auto_1fr]"
          style={
            {
              "--header-height": HEADER_HEIGHT,
            } as React.CSSProperties
          }
        >
          <ModelsHeader />
          <div className="relative min-h-0 flex-1">{children}</div>
        </div>
      </SessionProvider>
    </TRPCReactProvider>
  );
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";

export default async function proxy(req: NextRequest) {
  // Mirror previous authorized() logic using Better Auth session
  const url = req.nextUrl;

  // Block signup API endpoint - only admins can create users
  const isSignupEndpoint = url.pathname.startsWith("/api/auth/sign-up");
  if (isSignupEndpoint) {
    return NextResponse.json(
      {
        error:
          "Self-service registration is disabled. Please contact an administrator.",
      },
      { status: 403 }
    );
  }

  const isApiAuthRoute = url.pathname.startsWith("/api/auth");
  if (isApiAuthRoute) {
    return;
  }

  const isMetadataRoute =
    url.pathname === "/sitemap.xml" ||
    url.pathname === "/robots.txt" ||
    url.pathname === "/manifest.webmanifest";
  if (isMetadataRoute) {
    return;
  }

  const isTrpcApi = url.pathname.startsWith("/api/trpc");
  if (isTrpcApi) {
    return;
  }

  const isChatApiRoute = url.pathname === "/api/chat";
  if (isChatApiRoute) {
    return;
  }

  const session = await auth.api.getSession({ headers: req.headers });
  const isLoggedIn = !!session?.user;

  // Check for admin routes
  const isOnAdminRoute = url.pathname.startsWith("/admin");

  if (isOnAdminRoute) {
    // Require authentication for admin routes
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", url));
    }

    // Require admin role
    if (session.user.role !== "admin") {
      // Redirect non-admins to home with error message
      return NextResponse.redirect(new URL("/?error=forbidden", url));
    }

    // Admin authenticated - allow access
    return;
  }

  const isOnLandingPage = url.pathname === "/";
  const isOnChat = url.pathname === "/chat" || url.pathname.startsWith("/chat/");
  const isOnModels = url.pathname.startsWith("/models");
  const isOnCompare = url.pathname.startsWith("/compare");
  const isOnLoginPage = url.pathname.startsWith("/login");
  const isOnRegisterPage = url.pathname.startsWith("/register");
  const isOnSharePage = url.pathname.startsWith("/share/");
  const isOnPrivacyPage = url.pathname.startsWith("/privacy");
  const isOnTermsPage = url.pathname.startsWith("/terms");

  if (isLoggedIn && (isOnLoginPage || isOnRegisterPage)) {
    return NextResponse.redirect(new URL("/", url));
  }
  if (isOnRegisterPage || isOnLoginPage) {
    return;
  }
  if (isOnSharePage) {
    return;
  }
  if (isOnPrivacyPage || isOnTermsPage) {
    return;
  }
  if (isOnLandingPage) {
    return;
  }

  // Require authentication for models and compare pages
  if (isOnModels || isOnCompare) {
    // Redirect to home if model selection is disabled
    if (env.DISABLE_MODEL_SELECTION) {
      return NextResponse.redirect(new URL("/", url));
    }
    // Require authentication
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", url));
    }
    return;
  }

  // Require authentication for chat routes
  if (isOnChat) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", url));
    }
    return;
  }

  if (isLoggedIn) {
    return NextResponse.redirect(new URL("/", url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, opengraph-image (favicon and og image)
     * - manifest files (.json, .webmanifest)
     * - Images and other static assets (.svg, .png, .jpg, .jpeg, .gif, .webp, .ico)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|opengraph-image|manifest|privacy|terms|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest)$).*)",
  ],
};

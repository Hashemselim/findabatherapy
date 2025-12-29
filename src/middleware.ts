import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard"];

// Routes that should redirect authenticated users (auth pages)
const AUTH_ROUTES = ["/auth/sign-in", "/auth/sign-up"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Update session and get user
  const { supabaseResponse, user, supabase } = await updateSession(request);

  // Check if the route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Check if the route is an auth route
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // If protected route and not authenticated, redirect to sign in
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL("/auth/sign-in", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If auth route and authenticated, redirect to dashboard
  if (isAuthRoute && user) {
    // Check if user has completed onboarding
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .single();

    // If no profile or onboarding not completed, redirect to onboarding
    if (!profile || !profile.onboarding_completed_at) {
      return NextResponse.redirect(new URL("/dashboard/onboarding", request.url));
    }

    // Otherwise redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Note: Onboarding gating is handled at the page level, not in middleware.
  // Pages that require onboarding show a "Complete Onboarding" message instead of redirecting.

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

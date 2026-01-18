import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import { domains, type Brand } from "@/lib/utils/domains";

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard"];

// Routes that should redirect authenticated users (auth pages)
const AUTH_ROUTES = ["/auth/sign-in", "/auth/sign-up"];

// Public routes that look like dashboard but don't require auth
const PUBLIC_DASHBOARD_ROUTES = ["/demo"];

// =============================================================================
// MULTI-DOMAIN CONFIGURATION
// =============================================================================

// Jobs site specific routes (these are served from the (jobs) route group)
// All job-related routes now live under /jobs/* for clean namespace separation
const JOBS_ROUTES = [
  "/jobs",  // Jobs homepage, search, and state pages (e.g., /jobs/california)
  "/job/",  // Individual job pages (e.g., /job/senior-bcba-phoenix)
  "/employers", // Employer directory and detail pages
  "/bcba-jobs",
  "/bcaba-jobs",
  "/rbt-jobs",
  "/bt-jobs",
  "/clinical-director-jobs",
  "/regional-director-jobs",
  "/executive-director-jobs",
  "/admin-jobs",
];

// Provider careers pages pattern (e.g., /provider/acme-aba/careers)
const PROVIDER_CAREERS_PATTERN = /^\/provider\/[^/]+\/careers$/;

/**
 * Detect which brand/site the request is for
 */
function getBrandFromRequest(request: NextRequest): Brand {
  const host = request.headers.get("host") || "";
  const normalizedHost = host.toLowerCase().replace(/:\d+$/, "");

  // Check jobs domains
  if (domains.jobs.domains.some((d) => normalizedHost.includes(d))) {
    return "jobs";
  }

  // Check parent (Behavior Work) domains
  if (domains.parent.domains.some((d) => normalizedHost.includes(d))) {
    return "parent";
  }

  // In development, check path for jobs routes on localhost
  if (process.env.NODE_ENV === "development" && normalizedHost.includes("localhost")) {
    const pathname = request.nextUrl.pathname;
    if (isJobsRoute(pathname)) {
      return "jobs";
    }
  }

  // Default to therapy (main site)
  return "therapy";
}

/**
 * Check if the pathname is a jobs route
 */
function isJobsRoute(pathname: string): boolean {
  // Check specific jobs routes (all under /jobs/* namespace)
  if (JOBS_ROUTES.some((route) => pathname.startsWith(route))) {
    return true;
  }

  // Check provider careers pattern (e.g., /provider/acme-aba/careers)
  if (PROVIDER_CAREERS_PATTERN.test(pathname)) {
    return true;
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const brand = getBrandFromRequest(request);

  // Skip middleware for PostHog proxy routes
  if (pathname.startsWith("/ingest")) {
    return NextResponse.next();
  }

  // =============================================================================
  // MULTI-DOMAIN ROUTING LOGIC
  // =============================================================================

  // Jobs site routing: Handle requests to the jobs domain
  if (brand === "jobs") {
    // Jobs site homepage - rewrite root to /jobs page
    if (pathname === "/" || pathname === "") {
      const url = request.nextUrl.clone();
      url.pathname = "/jobs";
      return NextResponse.rewrite(url);
    }

    // For jobs site, allow access to:
    // - Jobs routes (search, job details, careers pages)
    // - Dashboard routes (for providers managing jobs)
    // - Auth routes (for providers to sign in)
    // - API routes
    // - Static assets

    // Block access to main site routes from jobs domain
    const mainSiteOnlyRoutes = [
      "/contact",
      "/intake",
      "/removal-request",
      "/demo",
    ];

    if (mainSiteOnlyRoutes.some((route) => pathname.startsWith(route))) {
      // Redirect to main site
      const mainSiteUrl = new URL(pathname, domains.therapy.production);
      return NextResponse.redirect(mainSiteUrl);
    }
  }

  // Parent site (behaviorwork.com) routing
  if (brand === "parent") {
    // Parent site serves the unified dashboard
    // Allow all dashboard routes, auth routes, and API routes
    // Block public-facing therapy/jobs content routes
    const publicContentRoutes = [
      "/search",
      "/learn",
      "/faq",
      "/insurance",
      "/centers",
      "/contact",
      "/intake",
    ];

    if (publicContentRoutes.some((route) => pathname.startsWith(route))) {
      // Redirect to therapy site for public content
      const therapySiteUrl = new URL(pathname, domains.therapy.production);
      return NextResponse.redirect(therapySiteUrl);
    }
  }

  // =============================================================================
  // REDIRECT OLD /intake/[slug] URLs to /contact/[slug]
  // (but keep /intake/[slug]/client for the full client intake form)
  // =============================================================================
  const intakeRedirectMatch = pathname.match(/^\/intake\/([^/]+)$/);
  if (intakeRedirectMatch) {
    const slug = intakeRedirectMatch[1];
    const redirectUrl = new URL(`/contact/${slug}`, request.url);
    return NextResponse.redirect(redirectUrl, 301);
  }

  // Therapy site routing: Redirect jobs routes to jobs site
  if (brand === "therapy" && isJobsRoute(pathname)) {
    // In production, redirect to the jobs domain
    if (process.env.NODE_ENV === "production") {
      const jobsUrl = new URL(pathname + request.nextUrl.search, domains.jobs.production);
      return NextResponse.redirect(jobsUrl);
    }
    // In development, allow serving from the same domain for easier testing
  }

  // Update session and get user
  const { supabaseResponse, user, supabase } = await updateSession(request);

  // Allow demo routes without auth
  const isDemoRoute = PUBLIC_DASHBOARD_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  if (isDemoRoute) {
    return supabaseResponse;
  }

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
     * - ingest (PostHog proxy)
     */
    "/((?!_next/static|_next/image|favicon.ico|ingest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

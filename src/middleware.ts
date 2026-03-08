import { NextResponse, type NextRequest } from "next/server";

import {
  evaluateOnboardingFlow,
  isAllowedPreOnboardingPath,
  resolveLegacyOnboardingRedirect,
} from "@/lib/onboarding/flow";
import { isDevOnboardingPreviewEnabled } from "@/lib/onboarding-preview";
import { updateSession } from "@/lib/supabase/middleware";
import { domains } from "@/lib/utils/domains";

const PROTECTED_ROUTES = ["/dashboard"];
const AUTH_ROUTES = ["/auth/sign-in", "/auth/sign-up"];
const PUBLIC_DASHBOARD_ROUTES = ["/demo"];
const CANONICAL_GOODABA_PREFIXES = ["/auth", "/dashboard"];

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/:\d+$/, "");
}

function getRequestHost(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    return forwardedHost.split(",")[0]?.trim() || forwardedHost;
  }

  return request.headers.get("host") || "";
}

function withPlatformRequestHeaders(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-platform-marketing-page", "1");
  return requestHeaders;
}

function isGoodabaHost(host: string): boolean {
  const normalizedHost = normalizeHost(host);
  return domains.goodaba.domains.some((domain) => normalizedHost === domain);
}

function isLegacyBehaviorWorkHost(host: string): boolean {
  const normalizedHost = normalizeHost(host);
  return (
    domains.goodaba.legacyDomains?.some((domain) => normalizedHost === domain) ??
    false
  );
}

function isLegacyJobsHost(host: string): boolean {
  const normalizedHost = normalizeHost(host);
  return (
    domains.jobs.legacyDomains?.some((domain) => normalizedHost === domain) ??
    false
  );
}

function isLocalhost(host: string): boolean {
  const normalizedHost = normalizeHost(host);
  return normalizedHost.includes("localhost") || normalizedHost.includes("127.0.0.1");
}

function matchesRoleJobsPath(pathname: string): RegExpMatchArray | null {
  return pathname.match(
    /^\/(bcba|bcaba|rbt|bt|clinical-director|regional-director|executive-director|admin)-jobs$/
  );
}

function isProviderControlledGoodabaPath(pathname: string): boolean {
  return /^\/provider\/[^/]+\/(website|contact|intake|resources|careers|jobs)(\/.*)?$/.test(
    pathname
  );
}

function isLegacyProviderPath(pathname: string): boolean {
  return (
    /^\/p\/[^/]+$/.test(pathname) ||
    /^\/site\/[^/]+(\/.*)?$/.test(pathname) ||
    /^\/contact\/[^/]+$/.test(pathname) ||
    /^\/intake\/[^/]+\/client$/.test(pathname) ||
    /^\/resources\/[^/]+(\/.*)?$/.test(pathname) ||
    /^\/careers\/[^/]+(\/[^/]+)?$/.test(pathname)
  );
}

function mapLegacyProviderPath(pathname: string): string | null {
  const brochureMatch = pathname.match(/^\/p\/([^/]+)$/);
  if (brochureMatch) {
    return `/provider/${brochureMatch[1]}`;
  }

  const websiteMatch = pathname.match(/^\/site\/([^/]+)(\/.*)?$/);
  if (websiteMatch) {
    return `/provider/${websiteMatch[1]}/website${websiteMatch[2] ?? ""}`;
  }

  const contactMatch = pathname.match(/^\/contact\/([^/]+)$/);
  if (contactMatch) {
    return `/provider/${contactMatch[1]}/contact`;
  }

  const intakeMatch = pathname.match(/^\/intake\/([^/]+)\/client$/);
  if (intakeMatch) {
    return `/provider/${intakeMatch[1]}/intake`;
  }

  const resourcesMatch = pathname.match(/^\/resources\/([^/]+)(\/.*)?$/);
  if (resourcesMatch) {
    return `/provider/${resourcesMatch[1]}/resources${resourcesMatch[2] ?? ""}`;
  }

  const careersJobMatch = pathname.match(/^\/careers\/([^/]+)\/([^/]+)$/);
  if (careersJobMatch) {
    return `/provider/${careersJobMatch[1]}/jobs/${careersJobMatch[2]}`;
  }

  const careersMatch = pathname.match(/^\/careers\/([^/]+)$/);
  if (careersMatch) {
    return `/provider/${careersMatch[1]}/careers`;
  }

  return null;
}

function mapLegacyJobsPath(pathname: string): string {
  if (pathname === "/" || pathname === "") {
    return "/jobs";
  }

  const postMatch = pathname.match(/^\/job\/([^/]+)$/);
  if (postMatch) {
    return `/jobs/post/${postMatch[1]}`;
  }

  const roleMatch = matchesRoleJobsPath(pathname);
  if (roleMatch) {
    return `/jobs/role/${roleMatch[1]}`;
  }

  const brandedJobMatch = pathname.match(/^\/careers\/([^/]+)\/([^/]+)$/);
  if (brandedJobMatch) {
    return `/provider/${brandedJobMatch[1]}/jobs/${brandedJobMatch[2]}`;
  }

  const careersMatch = pathname.match(/^\/careers\/([^/]+)$/);
  if (careersMatch) {
    return `/provider/${careersMatch[1]}/careers`;
  }

  if (pathname === "/employers") {
    return "/jobs/employers";
  }

  if (pathname === "/employers/post") {
    return "/jobs/employers/post";
  }

  const employerDetailMatch = pathname.match(/^\/employers\/([^/]+)$/);
  if (employerDetailMatch) {
    return `/jobs/employers/${employerDetailMatch[1]}`;
  }

  if (pathname.startsWith("/jobs")) {
    return pathname;
  }

  if (pathname.startsWith("/auth") || pathname.startsWith("/dashboard")) {
    return pathname;
  }

  return "/jobs";
}

function redirectToGoodaba(
  request: NextRequest,
  pathname: string,
  status: number = 308
) {
  const target = new URL(`${pathname}${request.nextUrl.search}`, domains.goodaba.production);
  return NextResponse.redirect(target, status);
}

function redirectToTherapy(
  request: NextRequest,
  pathname: string,
  status: number = 308
) {
  const target = new URL(`${pathname}${request.nextUrl.search}`, domains.therapy.production);
  return NextResponse.redirect(target, status);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = getRequestHost(request);
  const normalizedHost = normalizeHost(host);
  const production = process.env.NODE_ENV === "production";
  const onGoodabaHost = isGoodabaHost(normalizedHost);
  const onLegacyBehaviorWorkHost = isLegacyBehaviorWorkHost(normalizedHost);
  const onLegacyJobsHost = isLegacyJobsHost(normalizedHost);
  const onLocalhost = isLocalhost(normalizedHost);

  if (pathname.startsWith("/ingest")) {
    return NextResponse.next();
  }

  if (onLegacyBehaviorWorkHost && production) {
    if (pathname === "/" || pathname === "/pricing") {
      return redirectToGoodaba(request, "/");
    }

    return redirectToGoodaba(request, pathname);
  }

  if (onLegacyJobsHost && production) {
    return redirectToGoodaba(request, mapLegacyJobsPath(pathname));
  }

  if (
    production &&
    !onGoodabaHost &&
    CANONICAL_GOODABA_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return redirectToGoodaba(request, pathname);
  }

  if (pathname === "/get-listed" && production) {
    return redirectToGoodaba(request, "/");
  }

  if (
    pathname === "/behaviorwork" || pathname.startsWith("/behaviorwork/")
  ) {
    const canonicalPath =
      pathname === "/behaviorwork/get-started" ? "/pricing" : "/";
    if (production) {
      return redirectToGoodaba(request, canonicalPath);
    }
    return NextResponse.redirect(new URL(canonicalPath, request.url), 308);
  }

  if (pathname === "/goodaba" || pathname === "/goodaba/pricing") {
    const canonicalPath = pathname === "/goodaba/pricing" ? "/pricing" : "/";

    if (production) {
      return redirectToGoodaba(request, canonicalPath);
    }

    const url = request.nextUrl.clone();
    url.pathname =
      pathname === "/goodaba/pricing"
        ? "/goodaba-internal/pricing"
        : "/goodaba-internal";
    return NextResponse.rewrite(url, {
      request: {
        headers: withPlatformRequestHeaders(request),
      },
    });
  }

  if (pathname === "/pricing") {
    if (onGoodabaHost || onLocalhost) {
      const url = request.nextUrl.clone();
      url.pathname = "/goodaba-internal/pricing";
      return NextResponse.rewrite(url, {
        request: {
          headers: withPlatformRequestHeaders(request),
        },
      });
    }

    if (production) {
      return redirectToGoodaba(request, "/pricing");
    }
  }

  if (onGoodabaHost) {
    if (pathname === "/" || pathname === "") {
      const url = request.nextUrl.clone();
      url.pathname = "/goodaba-internal";
      return NextResponse.rewrite(url, {
        request: {
          headers: withPlatformRequestHeaders(request),
        },
      });
    }

    if (pathname.startsWith("/p/")) {
      const canonicalPath = mapLegacyProviderPath(pathname);
      if (canonicalPath) {
        return redirectToGoodaba(request, canonicalPath);
      }
    }

    if (isLegacyProviderPath(pathname)) {
      const canonicalPath = mapLegacyProviderPath(pathname);
      if (canonicalPath) {
        return redirectToGoodaba(request, canonicalPath);
      }
    }

    if (pathname.startsWith("/job/")) {
      return redirectToGoodaba(request, mapLegacyJobsPath(pathname));
    }

    if (matchesRoleJobsPath(pathname)) {
      return redirectToGoodaba(request, mapLegacyJobsPath(pathname));
    }

    if (pathname === "/employers" || pathname === "/employers/post" || pathname.startsWith("/employers/")) {
      return redirectToGoodaba(request, mapLegacyJobsPath(pathname));
    }

    const brochureMatch = pathname.match(/^\/provider\/([^/]+)$/);
    if (brochureMatch) {
      const url = request.nextUrl.clone();
      url.pathname = `/p/${brochureMatch[1]}`;
      return NextResponse.rewrite(url);
    }
  }

  if (
    (onGoodabaHost || onLocalhost) &&
    (pathname === "/goodaba-internal" ||
      pathname.startsWith("/goodaba-internal/"))
  ) {
    return NextResponse.next({
      request: {
        headers: withPlatformRequestHeaders(request),
      },
    });
  }

  if (!onGoodabaHost && isLegacyProviderPath(pathname) && production) {
    const canonicalPath = mapLegacyProviderPath(pathname);
    if (canonicalPath) {
      return redirectToGoodaba(request, canonicalPath);
    }
  }

  if (
    !onGoodabaHost &&
    (pathname.startsWith("/jobs") ||
      pathname.startsWith("/job/") ||
      pathname === "/employers" ||
      pathname === "/employers/post" ||
      pathname.startsWith("/employers/") ||
      Boolean(matchesRoleJobsPath(pathname))) &&
    production
  ) {
    return redirectToGoodaba(request, mapLegacyJobsPath(pathname));
  }

  if (!onGoodabaHost && isProviderControlledGoodabaPath(pathname) && production) {
    return redirectToGoodaba(request, pathname);
  }

  if (onGoodabaHost) {
    const explicitGoodabaPath =
      pathname.startsWith("/jobs") ||
      pathname.startsWith("/provider") ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/pricing") ||
      pathname.startsWith("/behaviorwork");

    const clearlyTherapyPath =
      pathname.startsWith("/search") ||
      pathname.startsWith("/learn") ||
      pathname.startsWith("/faq") ||
      pathname.startsWith("/insurance") ||
      pathname.startsWith("/centers") ||
      pathname.startsWith("/states") ||
      /^\/[a-z-]+$/.test(pathname) ||
      /^\/[a-z-]+\/[a-z-]+$/.test(pathname) ||
      /^\/[a-z-]+\/guide$/.test(pathname);

    if (!explicitGoodabaPath && clearlyTherapyPath && production) {
      return redirectToTherapy(request, pathname);
    }
  }

  const intakeRedirectMatch = pathname.match(/^\/intake\/([^/]+)$/);
  if (intakeRedirectMatch) {
    const slug = intakeRedirectMatch[1];
    const redirectUrl = new URL(`/contact/${slug}`, request.url);
    return NextResponse.redirect(redirectUrl, 301);
  }

  const { supabaseResponse, user, supabase } = await updateSession(request);

  const isDemoRoute = PUBLIC_DASHBOARD_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  if (isDemoRoute) {
    return supabaseResponse;
  }

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (
    isDevOnboardingPreviewEnabled() &&
    pathname.startsWith("/dashboard/onboarding") &&
    !user
  ) {
    return supabaseResponse;
  }

  if (isProtectedRoute && !user) {
    const redirectUrl = new URL("/auth/sign-in", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isProtectedRoute && user) {
    const legacyRedirect = resolveLegacyOnboardingRedirect(pathname);
    if (legacyRedirect) {
      return NextResponse.redirect(new URL(legacyRedirect, request.url));
    }

    const [{ data: profile }, { data: listing }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "agency_name, contact_email, plan_tier, billing_interval, onboarding_completed_at, subscription_status"
        )
        .eq("id", user.id)
        .single(),
      supabase
        .from("listings")
        .select("id, description")
        .eq("profile_id", user.id)
        .single(),
    ]);

    let hasLocationStep = false;
    let hasServicesStep = false;

    if (listing?.id) {
      const [{ count }, { data: servicesAttr }] = await Promise.all([
        supabase
          .from("locations")
          .select("id", { count: "exact", head: true })
          .eq("listing_id", listing.id),
        supabase
          .from("listing_attribute_values")
          .select("value_json")
          .eq("listing_id", listing.id)
          .eq("attribute_key", "services_offered")
          .maybeSingle(),
      ]);

      hasLocationStep = (count || 0) > 0;
      hasServicesStep =
        Array.isArray(servicesAttr?.value_json) &&
        servicesAttr.value_json.length > 0;
    }

    const flow = evaluateOnboardingFlow({
      onboardingCompleted: Boolean(profile?.onboarding_completed_at),
      selectedPlan: profile?.plan_tier,
      billingInterval: profile?.billing_interval,
      subscriptionStatus: profile?.subscription_status,
      hasAgencyStep:
        Boolean(profile?.agency_name) &&
        Boolean(profile?.contact_email) &&
        Boolean(listing?.description?.trim()),
      hasLocationStep,
      hasServicesStep,
    });

    if (!flow.isComplete && !isAllowedPreOnboardingPath(pathname)) {
      return NextResponse.redirect(new URL(flow.firstIncompletePath, request.url));
    }
  }

  if (isAuthRoute && user) {
    const [{ data: profile }, { data: listing }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "agency_name, contact_email, plan_tier, billing_interval, onboarding_completed_at, subscription_status"
        )
        .eq("id", user.id)
        .single(),
      supabase
        .from("listings")
        .select("id, description")
        .eq("profile_id", user.id)
        .single(),
    ]);

    let hasLocationStep = false;
    let hasServicesStep = false;

    if (listing?.id) {
      const [{ count }, { data: servicesAttr }] = await Promise.all([
        supabase
          .from("locations")
          .select("id", { count: "exact", head: true })
          .eq("listing_id", listing.id),
        supabase
          .from("listing_attribute_values")
          .select("value_json")
          .eq("listing_id", listing.id)
          .eq("attribute_key", "services_offered")
          .maybeSingle(),
      ]);

      hasLocationStep = (count || 0) > 0;
      hasServicesStep =
        Array.isArray(servicesAttr?.value_json) &&
        servicesAttr.value_json.length > 0;
    }

    const flow = evaluateOnboardingFlow({
      onboardingCompleted: Boolean(profile?.onboarding_completed_at),
      selectedPlan: profile?.plan_tier,
      billingInterval: profile?.billing_interval,
      subscriptionStatus: profile?.subscription_status,
      hasAgencyStep:
        Boolean(profile?.agency_name) &&
        Boolean(profile?.contact_email) &&
        Boolean(listing?.description?.trim()),
      hasLocationStep,
      hasServicesStep,
    });

    if (!flow.isComplete) {
      return NextResponse.redirect(new URL(flow.firstIncompletePath, request.url));
    }

    return NextResponse.redirect(
      new URL("/dashboard/clients/pipeline", request.url)
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|ingest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

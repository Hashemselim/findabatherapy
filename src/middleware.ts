import { NextResponse, type NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { isDevOnboardingPreviewEnabled } from "@/lib/onboarding-preview";
import { domains, isGoodabaAppPath } from "@/lib/utils/domains";

const CANONICAL_GOODABA_PREFIXES = ["/auth", "/dashboard"];
const matchesClerkProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);
const matchesClerkAuthRoute = createRouteMatcher([
  "/auth/sign-in(.*)",
  "/auth/sign-up(.*)",
]);

function getAuthCallbackNextTarget(request: NextRequest): string {
  return (
    request.nextUrl.searchParams.get("redirect") ||
    request.nextUrl.searchParams.get("next") ||
    "/dashboard/clients/pipeline"
  );
}

function buildClerkAuthCallbackUrl(request: NextRequest): URL {
  const redirectUrl = new URL("/auth/callback", request.url);
  redirectUrl.searchParams.set("next", getAuthCallbackNextTarget(request));

  for (const key of ["invite", "plan", "interval", "intent", "email", "auth_mode", "portal_slug", "portal_token"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) {
      redirectUrl.searchParams.set(key, value);
    }
  }

  return redirectUrl;
}

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
  return /^\/provider\/[^/]+\/(website|contact|intake|documents|resources|careers|jobs)(\/.*)?$/.test(
    pathname
  );
}

function isLegacyProviderPath(pathname: string): boolean {
  return (
    /^\/p\/[^/]+$/.test(pathname) ||
    /^\/site\/[^/]+(\/.*)?$/.test(pathname) ||
    /^\/contact\/[^/]+$/.test(pathname) ||
    /^\/intake\/[^/]+\/(client|documents)$/.test(pathname) ||
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

  const documentsMatch = pathname.match(/^\/intake\/([^/]+)\/documents$/);
  if (documentsMatch) {
    return `/provider/${documentsMatch[1]}/documents`;
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

async function handlePlatformRouting(request: NextRequest) {
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

  if (
    pathname === "/demo" ||
    pathname.startsWith("/demo/") ||
    pathname === "/demo-preview" ||
    pathname.startsWith("/demo-preview/")
  ) {
    const redirectUrl = new URL("/auth/sign-up", request.url);
    redirectUrl.searchParams.set("plan", "free");
    redirectUrl.searchParams.set("intent", "therapy");
    return NextResponse.redirect(redirectUrl, 308);
  }

  if (onLocalhost && (pathname === "/" || pathname === "")) {
    const url = request.nextUrl.clone();
    url.pathname = "/goodaba-internal";
    return NextResponse.rewrite(url, {
      request: {
        headers: withPlatformRequestHeaders(request),
      },
    });
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
    !onLocalhost &&
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

  if (!onGoodabaHost && !onLocalhost && isLegacyProviderPath(pathname) && production) {
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

  if (!onGoodabaHost && !onLocalhost && isProviderControlledGoodabaPath(pathname) && production) {
    return redirectToGoodaba(request, pathname);
  }

  if (onGoodabaHost) {
    const explicitGoodabaPath =
      isGoodabaAppPath(pathname) || pathname.startsWith("/provider");

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

  return null;
}

const handleClerkMiddleware = clerkMiddleware(async (auth, request) => {
  const platformResponse = await handlePlatformRouting(request);
  if (platformResponse) {
    return platformResponse;
  }

  const { pathname, search } = request.nextUrl;
  const isProtectedRoute = matchesClerkProtectedRoute(request);
  const isAuthRoute = matchesClerkAuthRoute(request);
  const authState = await auth();

  if (
    isDevOnboardingPreviewEnabled() &&
    pathname.startsWith("/dashboard/onboarding") &&
    !authState.userId
  ) {
    return NextResponse.next();
  }

  if (isProtectedRoute && !authState.userId) {
    const redirectUrl = new URL("/auth/sign-in", request.url);
    redirectUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && authState.userId) {
    return NextResponse.redirect(buildClerkAuthCallbackUrl(request));
  }

  return NextResponse.next();
});

export default function middleware(request: NextRequest, event: Parameters<typeof handleClerkMiddleware>[1]) {
  return handleClerkMiddleware(request, event);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|ingest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

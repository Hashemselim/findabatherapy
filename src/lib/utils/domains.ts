/**
 * Multi-domain configuration and utilities
 *
 * Public brand model:
 * - findabatherapy.org: family-facing directory and SEO surface
 * - goodaba.com: provider-facing platform and public jobs marketplace
 * - findabajobs.org / behaviorwork.com: legacy redirect-only domains
 */

export type Brand = "therapy" | "jobs" | "goodaba";

type DomainConfig = {
  production: string;
  domains: string[];
  legacyDomains?: string[];
  name: string;
  supportEmail: string;
  noReplyEmail: string;
};

export const domains: Record<Brand, DomainConfig> = {
  therapy: {
    production: "https://www.findabatherapy.org",
    domains: ["findabatherapy.org", "www.findabatherapy.org"],
    name: "Find ABA Therapy",
    supportEmail: "support@findabatherapy.org",
    noReplyEmail: "noreply@findabatherapy.org",
  },
  jobs: {
    // Jobs are now a section of GoodABA rather than a standalone domain.
    production: "https://www.goodaba.com",
    domains: ["goodaba.com", "www.goodaba.com"],
    legacyDomains: [
      "findabajobs.org",
      "www.findabajobs.org",
      "jobs.findabatherapy.org",
    ],
    name: "GoodABA Jobs",
    supportEmail: "support@goodaba.com",
    noReplyEmail: "noreply@goodaba.com",
  },
  goodaba: {
    production: "https://www.goodaba.com",
    domains: ["goodaba.com", "www.goodaba.com"],
    legacyDomains: ["behaviorwork.com", "www.behaviorwork.com"],
    name: "GoodABA",
    supportEmail: "support@goodaba.com",
    noReplyEmail: "noreply@goodaba.com",
  },
};

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/:\d+$/, "");
}

function extractForwardedHost(host: string): string {
  return host.split(",")[0]?.trim() || host;
}

/**
 * Detect brand from hostname.
 */
export function getBrandFromHost(host: string): Brand {
  const normalizedHost = normalizeHost(host);

  if (domains.goodaba.domains.some((domain) => normalizedHost === domain)) {
    return "goodaba";
  }

  if (
    domains.jobs.legacyDomains?.some((domain) => normalizedHost === domain)
  ) {
    return "jobs";
  }

  if (
    domains.goodaba.legacyDomains?.some((domain) => normalizedHost === domain)
  ) {
    return "goodaba";
  }

  return "therapy";
}

/**
 * Detect brand from pathname (useful on localhost).
 */
export function getBrandFromPath(pathname: string): Brand {
  if (
    pathname.startsWith("/jobs") ||
    pathname.startsWith("/job/") ||
    pathname.startsWith("/employers") ||
    pathname.startsWith("/behaviorwork") ||
    pathname.startsWith("/pricing") ||
    pathname.match(
      /^\/(bcba|bcaba|rbt|bt|clinical-director|regional-director|executive-director|admin)-jobs/
    )
  ) {
    return "goodaba";
  }

  return "therapy";
}

export function getBrandFromRequest(headers: {
  get: (name: string) => string | null;
}): Brand {
  const host = headers.get("host") || headers.get("x-forwarded-host") || "";
  return getBrandFromHost(host);
}

function validateProductionUrl(url: string, context: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  const isLocalhost = url.includes("localhost") || url.includes("127.0.0.1");

  if (isProduction && isLocalhost) {
    console.error(
      `CRITICAL ERROR: Localhost URL detected in production for ${context}. URL: ${url}`
    );
    return domains.therapy.production;
  }

  return url;
}

export function getBaseUrl(brand: Brand): string {
  if (process.env.NODE_ENV === "development") {
    return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  }

  return domains[brand].production;
}

export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return validateProductionUrl(url, "getSiteUrl()");
}

export function getValidatedOrigin(
  requestOrigin?: string | null,
  brand: Brand = "therapy"
): string {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (requestOrigin) {
      const isLocalhost =
        requestOrigin.includes("localhost") ||
        requestOrigin.includes("127.0.0.1");
      if (!isLocalhost) {
        return requestOrigin;
      }

      console.error(
        `CRITICAL ERROR: Localhost request origin detected in production. Origin: ${requestOrigin}`
      );
    }

    return domains[brand].production;
  }

  return (
    requestOrigin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  );
}

export function getRequestOrigin(
  headers: { get: (name: string) => string | null },
  fallbackBrand: Brand = "therapy"
): string {
  const explicitOrigin = headers.get("origin");
  if (explicitOrigin) {
    return getValidatedOrigin(explicitOrigin, fallbackBrand);
  }

  const forwardedHost =
    extractForwardedHost(
      headers.get("x-forwarded-host") || headers.get("host") || ""
    );

  if (forwardedHost) {
    const forwardedProto =
      headers.get("x-forwarded-proto") ||
      (process.env.NODE_ENV === "production" ? "https" : "http");

    return getValidatedOrigin(
      `${forwardedProto}://${normalizeHost(forwardedHost)}`,
      fallbackBrand
    );
  }

  return getValidatedOrigin(null, fallbackBrand);
}

export function buildBrandUrl(brand: Brand, path: string): string {
  const baseUrl = getBaseUrl(brand);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

function extractEmailAddress(input: string): string {
  const match = input.match(/<([^>]+)>/);
  return match ? match[1] : input;
}

export function getFromEmail(brand: Brand): string {
  const envVars = {
    therapy: process.env.EMAIL_FROM_THERAPY,
    jobs: process.env.EMAIL_FROM_JOBS,
    goodaba: process.env.EMAIL_FROM_PARENT ?? process.env.EMAIL_FROM_GOODABA,
  };

  if (envVars[brand]) {
    return extractEmailAddress(envVars[brand]!);
  }

  if (process.env.EMAIL_FROM) {
    return extractEmailAddress(process.env.EMAIL_FROM);
  }

  return domains[brand].supportEmail;
}

export function getFormattedFromEmail(brand: Brand): string {
  const email = getFromEmail(brand);
  const brandName = domains[brand].name;
  return `${brandName} <${email}>`;
}

export function getSupportEmail(brand: Brand): string {
  return domains[brand].supportEmail;
}

export function getBrandName(brand: Brand): string {
  return domains[brand].name;
}

export function isJobsDomain(host: string): boolean {
  const normalizedHost = normalizeHost(host);
  return (
    domains.jobs.legacyDomains?.some((domain) => normalizedHost === domain) ??
    false
  );
}

export function isGoodabaDomain(host: string): boolean {
  const normalizedHost = normalizeHost(host);
  return domains.goodaba.domains.some((domain) => normalizedHost === domain);
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getAllProductionDomains(): string[] {
  return [
    ...domains.therapy.domains,
    ...domains.goodaba.domains,
    ...(domains.goodaba.legacyDomains ?? []),
    ...(domains.jobs.legacyDomains ?? []),
  ].map((domain) => `https://${domain}`);
}

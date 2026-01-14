/**
 * Multi-domain configuration and utilities
 *
 * This module provides centralized domain configuration for the multi-brand platform:
 * - findabatherapy.org - Provider directory
 * - findabajobs.org - Job board
 * - behaviorwork.com - Parent platform (unified dashboard)
 */

// =============================================================================
// DOMAIN CONFIGURATION
// =============================================================================

export type Brand = "therapy" | "jobs" | "parent";

export const domains = {
  therapy: {
    production: "https://www.findabatherapy.org",
    domains: ["findabatherapy.org", "www.findabatherapy.org"],
    name: "Find ABA Therapy",
    supportEmail: "support@findabatherapy.org",
    noReplyEmail: "noreply@findabatherapy.org",
  },
  jobs: {
    production: "https://www.findabajobs.org",
    domains: [
      "findabajobs.org",
      "www.findabajobs.org",
      "jobs.findabatherapy.org",
    ],
    name: "Find ABA Jobs",
    supportEmail: "support@findabajobs.org",
    noReplyEmail: "noreply@findabajobs.org",
  },
  parent: {
    production: "https://www.behaviorwork.com",
    domains: ["behaviorwork.com", "www.behaviorwork.com"],
    name: "Behavior Work",
    supportEmail: "support@behaviorwork.com",
    noReplyEmail: "noreply@behaviorwork.com",
  },
} as const;

// =============================================================================
// BRAND DETECTION
// =============================================================================

/**
 * Detect brand from hostname
 */
export function getBrandFromHost(host: string): Brand {
  const normalizedHost = host.toLowerCase().replace(/:\d+$/, ""); // Remove port

  if (domains.jobs.domains.some((d) => normalizedHost.includes(d))) {
    return "jobs";
  }

  if (domains.parent.domains.some((d) => normalizedHost.includes(d))) {
    return "parent";
  }

  // Default to therapy (main site)
  return "therapy";
}

/**
 * Detect brand from pathname (for development/localhost)
 */
export function getBrandFromPath(pathname: string): Brand {
  // Jobs routes
  if (
    pathname.startsWith("/jobs") ||
    pathname.startsWith("/job/") ||
    pathname.startsWith("/employers") ||
    pathname.match(/^\/(bcba|bcaba|rbt|bt|clinical-director|regional-director|executive-director|admin)-jobs/)
  ) {
    return "jobs";
  }

  // Dashboard/parent routes could be parent brand
  // For now, default to therapy
  return "therapy";
}

/**
 * Detect brand from request headers (for server-side use)
 * Works with Next.js headers() or request object
 */
export function getBrandFromRequest(headers: {
  get: (name: string) => string | null;
}): Brand {
  const host = headers.get("host") || headers.get("x-forwarded-host") || "";
  return getBrandFromHost(host);
}

// =============================================================================
// URL GENERATION
// =============================================================================

/**
 * CRITICAL: Validate that a URL is safe to use in production
 * Throws an error if localhost is detected in production environment
 */
function validateProductionUrl(url: string, context: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  const isLocalhost = url.includes("localhost") || url.includes("127.0.0.1");

  if (isProduction && isLocalhost) {
    console.error(
      `CRITICAL ERROR: Localhost URL detected in production for ${context}! ` +
        `URL: ${url}. This is likely a configuration error. ` +
        `Ensure NEXT_PUBLIC_SITE_URL is set correctly in production environment.`
    );
    // In production, fall back to therapy production URL to prevent broken links
    // This is a safety net - the real fix is setting NEXT_PUBLIC_SITE_URL correctly
    return domains.therapy.production;
  }

  return url;
}

/**
 * Get the base URL for a brand
 */
export function getBaseUrl(brand: Brand): string {
  if (process.env.NODE_ENV === "development") {
    return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  }

  return domains[brand].production;
}

/**
 * Get the current site URL based on environment
 * For server-side use when you need the request origin
 *
 * IMPORTANT: In production, this will NEVER return localhost.
 * If NEXT_PUBLIC_SITE_URL is not set or contains localhost in production,
 * it will fall back to the therapy production URL and log an error.
 */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return validateProductionUrl(url, "getSiteUrl()");
}

/**
 * Get a validated origin URL, ensuring it's safe for production use.
 * Use this for Stripe redirects and other external service callbacks.
 *
 * @param requestOrigin - The origin from the request headers (optional)
 * @param brand - The brand to use for production fallback (defaults to therapy)
 * @returns A validated URL that is safe to use in production
 */
export function getValidatedOrigin(requestOrigin?: string | null, brand: Brand = "therapy"): string {
  const isProduction = process.env.NODE_ENV === "production";

  // In production, prefer the brand's production URL
  if (isProduction) {
    // If we have a request origin, validate it
    if (requestOrigin) {
      const isLocalhost = requestOrigin.includes("localhost") || requestOrigin.includes("127.0.0.1");
      if (!isLocalhost) {
        return requestOrigin;
      }
      // Log error if request origin is localhost in production
      console.error(
        `CRITICAL ERROR: Localhost request origin detected in production! ` +
          `Origin: ${requestOrigin}. Falling back to ${domains[brand].production}`
      );
    }

    // Fall back to production URL for the brand
    return domains[brand].production;
  }

  // In development, use request origin or env var or localhost
  return requestOrigin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/**
 * Build a full URL for a specific brand
 */
export function buildBrandUrl(brand: Brand, path: string): string {
  const baseUrl = getBaseUrl(brand);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

// =============================================================================
// EMAIL CONFIGURATION
// =============================================================================

/**
 * Single sending domain strategy:
 * All emails sent from behaviorwork.com (parent domain) with brand-specific display names.
 * This avoids needing to verify multiple domains in Resend ($20 cost).
 *
 * Examples:
 * - "Find ABA Jobs <noreply@behaviorwork.com>" for job applicant confirmations
 * - "Find ABA Therapy <noreply@behaviorwork.com>" for therapy site emails
 */
const UNIFIED_EMAIL_DOMAIN = "behaviorwork.com";

/**
 * Extract just the email address from a potentially formatted string
 * "Name <email@example.com>" -> "email@example.com"
 * "email@example.com" -> "email@example.com"
 */
function extractEmailAddress(input: string): string {
  const match = input.match(/<([^>]+)>/);
  return match ? match[1] : input;
}

/**
 * Get the raw "from" email address (without display name)
 * Uses unified behaviorwork.com domain by default
 */
export function getFromEmail(brand: Brand): string {
  // Check for brand-specific override (if user wants separate domains)
  const envVars = {
    therapy: process.env.EMAIL_FROM_THERAPY,
    jobs: process.env.EMAIL_FROM_JOBS,
    parent: process.env.EMAIL_FROM_PARENT,
  };

  if (envVars[brand]) {
    return extractEmailAddress(envVars[brand]!);
  }

  // Fall back to generic EMAIL_FROM if set
  if (process.env.EMAIL_FROM) {
    return extractEmailAddress(process.env.EMAIL_FROM);
  }

  // Default: unified domain
  return `noreply@${UNIFIED_EMAIL_DOMAIN}`;
}

/**
 * Get the formatted "from" email with brand display name
 * Format: "Brand Name <email@domain.com>"
 *
 * This is the recommended function for sending emails - it includes
 * the brand name so recipients see a recognizable sender.
 */
export function getFormattedFromEmail(brand: Brand): string {
  const email = getFromEmail(brand);
  const brandName = domains[brand].name;
  return `${brandName} <${email}>`;
}

/**
 * Get the support email for a brand
 */
export function getSupportEmail(brand: Brand): string {
  return domains[brand].supportEmail;
}

/**
 * Get the brand name for display
 */
export function getBrandName(brand: Brand): string {
  return domains[brand].name;
}

// =============================================================================
// DOMAIN CHECKING
// =============================================================================

/**
 * Check if a host matches the jobs domain
 */
export function isJobsDomain(host: string): boolean {
  return getBrandFromHost(host) === "jobs";
}

/**
 * Check if a host matches the parent domain
 */
export function isParentDomain(host: string): boolean {
  return getBrandFromHost(host) === "parent";
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Get all production domains for CORS/CSP configuration
 */
export function getAllProductionDomains(): string[] {
  return [
    ...domains.therapy.domains,
    ...domains.jobs.domains,
    ...domains.parent.domains,
  ].map((d) => `https://${d}`);
}

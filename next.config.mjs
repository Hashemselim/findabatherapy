import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const clerkIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN?.replace(
  /^https?:\/\//,
  "",
);
const clerkOrigin = clerkIssuerDomain ? `https://${clerkIssuerDomain}` : null;
const clerkScriptSources = [
  "https://*.clerk.accounts.dev",
  "https://*.clerk.dev",
  clerkOrigin,
].filter(Boolean);
const clerkConnectSources = [
  "https://*.clerk.accounts.dev",
  "https://*.clerk.dev",
  "https://api.clerk.com",
  clerkOrigin,
].filter(Boolean);
const clerkImageSources = [
  "https://img.clerk.com",
  "https://*.clerk.accounts.dev",
  "https://*.clerk.dev",
  clerkOrigin,
].filter(Boolean);
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexHost = convexUrl
  ? new URL(convexUrl).hostname
  : "*.convex.cloud";
const convexHttpOrigin = `https://${convexHost}`;
const convexWsOrigin = `wss://${convexHost}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  turbopack: {
    root: __dirname,
  },

  // Increase body size limit for Server Actions (photo uploads)
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },

  // Required for PostHog proxy to work correctly
  skipTrailingSlashRedirect: true,

  // PostHog reverse proxy to avoid ad blockers
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },

  async redirects() {
    return [
      {
        source:
          "/:position(bcba|bcaba|rbt|bt|clinical-director|regional-director|executive-director|admin)-jobs",
        destination: "/jobs/role/:position",
        permanent: true,
      },
    ];
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: convexHost,
        pathname: "/api/storage/**",
      },
    ],
    // Enable modern image formats for better performance
    formats: ["image/avif", "image/webp"],
    // Minimize image size
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Enable compression
  compress: true,

  // Powered by header (optional: can hide for security)
  poweredByHeader: false,

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // DNS prefetch for external resources (performance)
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          // HSTS - enforce HTTPS (1 year, include subdomains, allow preload)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          // CSP - prevent XSS and other injection attacks
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              [
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                "https://challenges.cloudflare.com",
                "https://www.googletagmanager.com",
                "https://maps.googleapis.com",
                ...clerkScriptSources,
              ].join(" "),
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              [
                "img-src 'self' data: blob:",
                "https://images.unsplash.com",
                "https://placehold.co",
                convexHttpOrigin,
                "https://maps.googleapis.com",
                "https://maps.gstatic.com",
                "https://www.googletagmanager.com",
                ...clerkImageSources,
              ].join(" "),
              [
                "connect-src 'self'",
                convexHttpOrigin,
                convexWsOrigin,
                "https://api.stripe.com",
                "https://maps.googleapis.com",
                "https://places.googleapis.com",
                "https://www.google-analytics.com",
                "https://challenges.cloudflare.com",
                "https://us.i.posthog.com",
                "https://us-assets.i.posthog.com",
                ...clerkConnectSources,
              ].join(" "),
              "worker-src 'self' blob:",
              "frame-src 'self' https://challenges.cloudflare.com https://js.stripe.com https://www.youtube.com https://player.vimeo.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          // Permissions Policy - restrict browser features
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
          },
        ],
      },
      {
        // Cache static assets aggressively
        source: "/(.*)\\.(ico|png|jpg|jpeg|gif|svg|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

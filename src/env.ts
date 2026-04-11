import "server-only";

import { z } from "zod";

/**
 * Custom validator that prevents localhost URLs in production
 */
const productionSafeUrl = z
  .string()
  .url()
  .refine(
    (url) => {
      const isProduction = process.env.NODE_ENV === "production";
      const isLocalhost = url.includes("localhost") || url.includes("127.0.0.1");
      // In production, localhost URLs are not allowed
      return !(isProduction && isLocalhost);
    },
    {
      message:
        "CRITICAL: NEXT_PUBLIC_SITE_URL cannot be localhost in production! " +
        "Set it to your production domain (e.g., https://www.findabatherapy.org)",
    }
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // In development, default to localhost. In production, this MUST be set explicitly
  // and CANNOT be localhost (enforced by productionSafeUrl validator)
  NEXT_PUBLIC_SITE_URL: productionSafeUrl.default("http://localhost:3000"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_CONVEX_URL: z.string().url().optional(),
  // Stripe — always required (Stripe is used in both modes)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  // Cloudflare Turnstile for bot protection
  TURNSTILE_SECRET_KEY: z.string().min(1),
  // Google Maps API for geocoding and places autocomplete
  GOOGLE_MAPS_API_KEY: z.string().min(1),
  // Firecrawl for optional referral-source website enrichment
  FIRECRAWL_API_KEY: z.string().optional(),
  // Resend for transactional emails (optional - emails disabled if not set)
  RESEND_API_KEY: z.string().optional(),
  // Email address for sending emails (defaults to onboarding@resend.dev for testing)
  EMAIL_FROM: z.string().min(1).optional().default("onboarding@resend.dev"),
  EMAIL_FROM_THERAPY: z.string().min(1).optional(),
  EMAIL_FROM_JOBS: z.string().min(1).optional(),
  EMAIL_FROM_PARENT: z.string().min(1).optional(),
  EMAIL_FROM_GOODABA: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_FROM_THERAPY: process.env.EMAIL_FROM_THERAPY,
  EMAIL_FROM_JOBS: process.env.EMAIL_FROM_JOBS,
  EMAIL_FROM_PARENT: process.env.EMAIL_FROM_PARENT,
  EMAIL_FROM_GOODABA: process.env.EMAIL_FROM_GOODABA,
});

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

if (parsed.data.NODE_ENV === "production") {
  if (!parsed.data.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    throw new Error(
      "Production requires NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    );
  }

  if (!parsed.data.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error("Production requires NEXT_PUBLIC_CONVEX_URL");
  }
}

export const env = parsed.data;

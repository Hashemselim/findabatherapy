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
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  // Cloudflare Turnstile for bot protection
  TURNSTILE_SECRET_KEY: z.string().min(1),
  // Google Maps API for geocoding and places autocomplete
  GOOGLE_MAPS_API_KEY: z.string().min(1),
  // Resend for transactional emails (optional - emails disabled if not set)
  RESEND_API_KEY: z.string().optional(),
  // Email address for sending emails (defaults to onboarding@resend.dev for testing)
  EMAIL_FROM: z.string().min(1).optional().default("onboarding@resend.dev"),
});

// Skip validation during build time (when collecting page data)
// Environment variables will be validated at runtime when actually used
const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";

const parsed = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
});

if (!parsed.success && !isBuildTime) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

// During build time, provide placeholder values to allow static analysis
// These will never be used at runtime - actual env vars are validated when accessed
export const env = parsed.success
  ? parsed.data
  : {
      NODE_ENV: "production" as const,
      NEXT_PUBLIC_SITE_URL: "https://placeholder.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "placeholder",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "placeholder",
      STRIPE_SECRET_KEY: "placeholder",
      STRIPE_WEBHOOK_SECRET: "placeholder",
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      TURNSTILE_SECRET_KEY: "placeholder",
      GOOGLE_MAPS_API_KEY: "placeholder",
      RESEND_API_KEY: undefined,
      EMAIL_FROM: "onboarding@resend.dev",
    };

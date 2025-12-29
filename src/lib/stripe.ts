import Stripe from "stripe";

import { env } from "@/env";

// API version matches the stripe SDK v19.2.0 default version
// See: node_modules/stripe/types/apiVersion.d.ts
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
  appInfo: {
    name: "Find ABA Therapy",
  },
});

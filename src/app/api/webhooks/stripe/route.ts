// Re-export from the canonical location
// Stripe CLI is configured to send webhooks to /api/webhooks/stripe
// but our handler lives at /api/stripe/webhooks
export { POST } from "@/app/api/stripe/webhooks/route";

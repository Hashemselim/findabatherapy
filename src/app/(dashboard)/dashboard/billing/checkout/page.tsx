"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createCheckoutSession } from "@/lib/stripe/actions";
import { STRIPE_PLANS, type BillingInterval } from "@/lib/stripe/config";
import {
  trackCheckoutPageViewed,
  trackCheckoutStarted,
  trackCheckoutStripeRedirect,
  trackCheckoutError,
  trackError,
} from "@/lib/posthog/events";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const planTier = searchParams.get("plan") as "pro" | "enterprise" | null;
  const intervalParam = searchParams.get("interval");
  // Accept both "annual" and "year" as annual billing (normalize to "year" for Stripe)
  const billingInterval: BillingInterval = intervalParam === "annual" || intervalParam === "year" ? "year" : "month";
  const returnTo = searchParams.get("return_to") || undefined;

  useEffect(() => {
    async function initiateCheckout() {
      if (!planTier || (planTier !== "pro" && planTier !== "enterprise")) {
        setError("Invalid plan selected");
        setIsLoading(false);
        return;
      }

      // Track checkout page viewed
      trackCheckoutPageViewed({
        planTier,
        billingInterval: billingInterval === "year" ? "year" : "month",
        source: returnTo || "billing",
      });

      // Track checkout started
      trackCheckoutStarted({
        planTier,
        billingInterval: billingInterval === "year" ? "year" : "month",
        source: returnTo || "billing",
      });

      const result = await createCheckoutSession(planTier, billingInterval, returnTo);

      if (!result.success) {
        // Track checkout error
        trackCheckoutError({
          planTier,
          billingInterval: billingInterval === "year" ? "year" : "month",
          errorMessage: result.error,
        });
        trackError({
          errorType: "api",
          errorMessage: result.error,
          componentName: "CheckoutPage",
        });
        setError(result.error);
        setIsLoading(false);
        return;
      }

      if (result.data?.url) {
        // Track redirect to Stripe
        trackCheckoutStripeRedirect({
          planTier,
          billingInterval: billingInterval === "year" ? "year" : "month",
        });
        window.location.href = result.data.url;
      } else {
        trackCheckoutError({
          planTier,
          billingInterval: billingInterval === "year" ? "year" : "month",
          errorMessage: "Failed to create checkout session",
        });
        setError("Failed to create checkout session");
        setIsLoading(false);
      }
    }

    initiateCheckout();
  }, [planTier, billingInterval, returnTo]);

  const plan = planTier ? STRIPE_PLANS[planTier] : null;

  if (error) {
    // Check if this is a subscription schedule error
    const isScheduleError = error.includes("schedule") || error.includes("pending");
    const friendlyError = isScheduleError
      ? "You have a pending plan change. Please cancel the scheduled change first before making other modifications."
      : error;

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-slate-900">Unable to Process</CardTitle>
            <CardDescription className="text-slate-600">
              {friendlyError}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              onClick={() => router.push("/dashboard/billing")}
              variant="outline"
              className="border-slate-200"
            >
              Return to Billing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Redirecting to Checkout</CardTitle>
          <CardDescription>
            {plan ? (
              <>
                You&apos;re subscribing to the <strong>{plan.name}</strong> plan at{" "}
                <strong>
                  ${billingInterval === "year" ? plan.annual.price : plan.monthly.price}/month
                  {billingInterval === "year" && ` ($${plan.annual.totalPrice}/year)`}
                </strong>
              </>
            ) : (
              "Preparing your checkout..."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {plan && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="mb-2 text-sm font-medium text-foreground">
                {plan.name} Plan includes:
              </p>
              <ul className="space-y-1">
                {plan.features.slice(0, 4).map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            You&apos;ll be redirected to Stripe&apos;s secure checkout page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function CheckoutLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Preparing Checkout</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutContent />
    </Suspense>
  );
}

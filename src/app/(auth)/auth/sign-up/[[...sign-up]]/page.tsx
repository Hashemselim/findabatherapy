"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

import { SignupPageTracker } from "@/components/analytics/signup-tracker";

function buildClerkAuthCallbackPath(searchParams: URLSearchParams) {
  const callbackParams = new URLSearchParams();
  const nextTarget =
    searchParams.get("redirect") ||
    searchParams.get("next") ||
    "/dashboard/clients/pipeline";
  callbackParams.set("next", nextTarget);

  for (const key of ["invite", "plan", "interval", "intent", "email"]) {
    const value = searchParams.get(key);
    if (value) {
      callbackParams.set(key, value);
    }
  }

  return `/auth/callback?${callbackParams.toString()}`;
}

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get("plan");
  const billingInterval = searchParams.get("interval") || "monthly";
  const callbackUrl = buildClerkAuthCallbackPath(searchParams);
  const signInParams = new URLSearchParams(searchParams.toString());
  const signInUrl = `/auth/sign-in${signInParams.toString() ? `?${signInParams.toString()}` : ""}`;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <SignupPageTracker
        selectedPlan={selectedPlan}
        billingInterval={billingInterval}
      />
      <SignUp
        routing="path"
        path="/auth/sign-up"
        forceRedirectUrl={callbackUrl}
        signInUrl={signInUrl}
      />
    </div>
  );
}

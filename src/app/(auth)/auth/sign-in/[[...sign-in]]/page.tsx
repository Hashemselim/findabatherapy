"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

function buildClerkAuthCallbackPath(searchParams: URLSearchParams) {
  const callbackParams = new URLSearchParams();
  const nextTarget =
    searchParams.get("redirect") ||
    searchParams.get("next") ||
    "/dashboard/clients/pipeline";
  callbackParams.set("next", nextTarget);

  for (const key of ["invite", "plan", "interval", "intent", "email", "auth_mode", "portal_slug", "portal_token"]) {
    const value = searchParams.get(key);
    if (value) {
      callbackParams.set(key, value);
    }
  }

  return `/auth/callback?${callbackParams.toString()}`;
}

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = buildClerkAuthCallbackPath(searchParams);
  const signUpParams = new URLSearchParams(searchParams.toString());
  const signUpUrl = `/auth/sign-up${signUpParams.toString() ? `?${signUpParams.toString()}` : ""}`;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <SignIn
        routing="path"
        path="/auth/sign-in"
        forceRedirectUrl={callbackUrl}
        signUpUrl={signUpUrl}
      />
    </div>
  );
}

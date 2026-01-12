"use client";

import { useState, useTransition, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Check, ShieldCheck } from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { signUpWithEmail, signInWithOAuth } from "@/lib/auth/actions";
import { SignupPageTracker, useSignupTracking } from "@/components/analytics/signup-tracker";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [isMicrosoftPending, setIsMicrosoftPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  // Get selected plan and billing interval from URL if coming from pricing page
  const selectedPlan = searchParams.get("plan");
  const billingInterval = searchParams.get("interval") || "monthly";

  // PostHog tracking
  const tracking = useSignupTracking(selectedPlan);

  async function handleSubmit(formData: FormData) {
    if (!acceptedTerms) {
      setError("Please accept the terms of service and privacy policy");
      tracking.trackError("Please accept the terms of service and privacy policy", "terms");
      return;
    }

    if (!turnstileToken) {
      setError("Please complete the security verification");
      tracking.trackError("Please complete the security verification", "captcha");
      return;
    }

    setError(null);
    setSuccess(null);

    // Track form submission
    tracking.trackFormSubmitted("email", billingInterval);

    // Add selected plan, billing interval, and turnstile token to form data
    if (selectedPlan) {
      formData.set("selectedPlan", selectedPlan);
    }
    formData.set("billingInterval", billingInterval);
    formData.set("turnstileToken", turnstileToken);

    startTransition(async () => {
      const result = await signUpWithEmail(formData);

      if ("error" in result) {
        setError(result.message);
        tracking.trackError(result.message);
        // Reset Turnstile on error
        turnstileRef.current?.reset();
        setTurnstileToken(null);
      } else if (result.message) {
        // Email confirmation required
        setSuccess(result.message);
        tracking.trackEmailSent();
      } else {
        // Direct signup - plan is already saved in DB
        tracking.trackCompleted("email", billingInterval);
        router.push("/dashboard/onboarding");
        router.refresh();
      }
    });
  }

  async function handleGoogleSignIn() {
    setError(null);
    setIsGooglePending(true);
    tracking.trackMethodSelected("google");
    tracking.trackFormSubmitted("google", billingInterval);

    // For OAuth, we pass plan and interval via URL state (handled in callback)
    const result = await signInWithOAuth("google", selectedPlan || undefined, billingInterval);

    if ("error" in result) {
      setError(result.message);
      tracking.trackError(result.message);
      setIsGooglePending(false);
    } else {
      window.location.href = result.url;
    }
  }

  async function handleMicrosoftSignIn() {
    setError(null);
    setIsMicrosoftPending(true);
    tracking.trackMethodSelected("microsoft");
    tracking.trackFormSubmitted("microsoft", billingInterval);

    // For OAuth, we pass plan and interval via URL state (handled in callback)
    const result = await signInWithOAuth("azure", selectedPlan || undefined, billingInterval);

    if ("error" in result) {
      setError(result.message);
      tracking.trackError(result.message);
      setIsMicrosoftPending(false);
    } else {
      window.location.href = result.url;
    }
  }

  const isLoading = isPending || isGooglePending || isMicrosoftPending;

  // PRD 3.2.1: Step 1 – Create Account
  return (
    <>
      <SignupPageTracker selectedPlan={selectedPlan} billingInterval={billingInterval} />
      <Card>
        <CardHeader className="space-y-4 text-center">
        <Badge className="mx-auto rounded-full border border-border/60 bg-gradient-to-r from-[#5788FF]/10 via-transparent to-[#10B981]/10 px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
          For ABA Providers
        </Badge>
        <CardTitle className="text-3xl">Create your account</CardTitle>
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/sign-in" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
        {selectedPlan && selectedPlan !== "free" && (
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-600">
            <Check className="h-4 w-4" />
            {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} plan · {billingInterval === "annual" ? "Annual billing" : "Monthly billing"}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">
            {success}
          </div>
        )}

        {/* PRD 3.2.1: OAuth buttons first */}
        <div className="grid gap-2">
          <Button
            variant="outline"
            className="w-full rounded-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            {isGooglePending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Continue with Google
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-full"
            onClick={handleMicrosoftSignIn}
            disabled={isLoading}
          >
            {isMicrosoftPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
            )}
            Continue with Microsoft
          </Button>
        </div>

        {/* PRD 3.2.1: Divider "or sign up with email" */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              or sign up with email
            </span>
          </div>
        </div>

        {/* PRD 3.2.1: Email form - Email, Password, Terms checkbox, Continue button */}
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              placeholder="you@company.com"
              type="email"
              required
              disabled={isLoading}
              onFocus={() => tracking.trackFormStarted()}
              onBlur={(e) => {
                if (e.target.value) tracking.trackFieldCompleted("email");
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              placeholder="At least 8 characters"
              type="password"
              minLength={8}
              required
              disabled={isLoading}
              onBlur={(e) => {
                if (e.target.value) tracking.trackFieldCompleted("password");
              }}
            />
          </div>

          {/* PRD 3.2.1: Terms checkbox */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked: boolean | "indeterminate") => {
                setAcceptedTerms(checked === true);
                if (checked === true) tracking.trackTermsAccepted();
              }}
              disabled={isLoading}
            />
            <label
              htmlFor="terms"
              className="text-xs leading-tight text-muted-foreground"
            >
              I agree to the{" "}
              <Link
                href="/legal/terms"
                className="text-primary hover:underline"
              >
                Terms
              </Link>{" "}
              &{" "}
              <Link
                href="/legal/privacy"
                className="text-primary hover:underline"
              >
                Privacy Policy
              </Link>
            </label>
          </div>

          {/* Security Verification */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              <span>Security verification</span>
            </div>
            <div className="flex justify-center overflow-hidden">
              <Turnstile
                ref={turnstileRef}
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                onSuccess={(token) => {
                  setTurnstileToken(token);
                  tracking.trackCaptchaCompleted();
                }}
                onError={() => {
                  setTurnstileToken(null);
                  setError("Security verification failed. Please try again.");
                  tracking.trackError("Security verification failed", "captcha");
                }}
                onExpire={() => setTurnstileToken(null)}
                options={{
                  theme: "light",
                  size: "flexible",
                }}
              />
            </div>
          </div>

          {/* PRD 3.2.1: Primary button "Continue" */}
          <Button
            type="submit"
            className="w-full rounded-full"
            disabled={isLoading || !acceptedTerms || !turnstileToken}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </CardContent>
      </Card>
    </>
  );
}

function SignUpSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-4 text-center">
        <Badge className="mx-auto rounded-full border border-border/60 bg-gradient-to-r from-[#5788FF]/10 via-transparent to-[#10B981]/10 px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
          For ABA Providers
        </Badge>
        <CardTitle className="text-3xl">Create your account</CardTitle>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

export default function SignUpPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-6 sm:py-10">
      <Suspense fallback={<SignUpSkeleton />}>
        <SignUpForm />
      </Suspense>
    </div>
  );
}

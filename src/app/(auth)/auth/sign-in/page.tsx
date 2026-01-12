"use client";

import { useState, useTransition, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
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
import { signInWithEmail, signInWithOAuth } from "@/lib/auth/actions";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [isMicrosoftPending, setIsMicrosoftPending] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error")
  );
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const showTurnstile = failedAttempts >= 2;

  async function handleSubmit(formData: FormData) {
    // Require Turnstile after 2 failed attempts
    if (showTurnstile && !turnstileToken) {
      setError("Please complete the security verification");
      return;
    }

    setError(null);

    // Add turnstile token if required
    if (turnstileToken) {
      formData.set("turnstileToken", turnstileToken);
    }

    startTransition(async () => {
      const result = await signInWithEmail(formData);

      if ("error" in result) {
        setError(result.message);
        setFailedAttempts((prev) => prev + 1);
        // Reset Turnstile on failure
        if (turnstileRef.current) {
          turnstileRef.current.reset();
          setTurnstileToken(null);
        }
      } else {
        // Use server-determined redirect, or fall back to URL param/dashboard
        const destination = result.redirectTo || redirectTo;
        router.push(destination);
        router.refresh();
      }
    });
  }

  async function handleGoogleSignIn() {
    setError(null);
    setIsGooglePending(true);

    const result = await signInWithOAuth("google");

    if ("error" in result) {
      setError(result.message);
      setIsGooglePending(false);
    } else {
      // Redirect to OAuth provider
      window.location.href = result.url;
    }
  }

  async function handleMicrosoftSignIn() {
    setError(null);
    setIsMicrosoftPending(true);

    const result = await signInWithOAuth("azure");

    if ("error" in result) {
      setError(result.message);
      setIsMicrosoftPending(false);
    } else {
      // Redirect to OAuth provider
      window.location.href = result.url;
    }
  }

  const isLoading = isPending || isGooglePending || isMicrosoftPending;

  return (
    <Card>
      <CardHeader className="space-y-4 text-center">
        <Badge className="mx-auto rounded-full border border-border/60 bg-gradient-to-r from-[#5788FF]/10 via-transparent to-[#10B981]/10 px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
          For ABA Providers
        </Badge>
        <CardTitle className="text-3xl">Sign in to your account</CardTitle>
        <p className="text-sm text-muted-foreground">
          Access your dashboard. Don&apos;t have an account?{" "}
          <Link href="/auth/sign-up" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* OAuth buttons first */}
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

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              or sign in with email
            </span>
          </div>
        </div>

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
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/auth/reset-password"
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              placeholder="••••••••"
              type="password"
              required
              disabled={isLoading}
            />
          </div>

          {/* Show Turnstile after failed attempts */}
          {showTurnstile && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                <span>Security verification required</span>
              </div>
              <div className="flex justify-center overflow-hidden">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onError={() => {
                    setTurnstileToken(null);
                    setError("Security verification failed. Please try again.");
                  }}
                  onExpire={() => setTurnstileToken(null)}
                  options={{
                    theme: "light",
                    size: "flexible",
                  }}
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full rounded-full"
            disabled={isLoading || (showTurnstile && !turnstileToken)}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SignInSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-4 text-center">
        <Badge className="mx-auto rounded-full border border-border/60 bg-gradient-to-r from-[#5788FF]/10 via-transparent to-[#10B981]/10 px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
          For ABA Providers
        </Badge>
        <CardTitle className="text-3xl">Sign in to your account</CardTitle>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

export default function SignInPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-6 sm:py-10">
      <Suspense fallback={<SignInSkeleton />}>
        <SignInForm />
      </Suspense>
    </div>
  );
}

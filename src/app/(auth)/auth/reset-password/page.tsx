"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck, ArrowLeft, Mail } from "lucide-react";
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
import { resetPassword } from "@/lib/auth/actions";

export default function ResetPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  async function handleSubmit(formData: FormData) {
    if (!turnstileToken) {
      setError("Please complete the security verification");
      return;
    }

    setError(null);
    setSuccess(null);

    // Add turnstile token to form data
    formData.set("turnstileToken", turnstileToken);

    startTransition(async () => {
      const result = await resetPassword(formData);

      if ("error" in result) {
        setError(result.message);
        // Reset Turnstile on error
        turnstileRef.current?.reset();
        setTurnstileToken(null);
      } else {
        setSuccess(result.message || "Password reset email sent. Please check your inbox.");
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader className="space-y-4 text-center">
          <Badge className="mx-auto rounded-full border border-[#5788FF]/40 bg-gradient-to-r from-[#5788FF]/15 to-[#5788FF]/5 px-4 py-1.5 text-sm font-semibold text-[#5788FF] shadow-sm">
            Account Recovery
          </Badge>
          <CardTitle className="text-3xl">Reset your password</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {success ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 rounded-lg bg-emerald-500/10 p-4 text-center">
                <Mail className="h-8 w-8 text-emerald-600" />
                <p className="text-sm text-emerald-600">{success}</p>
              </div>
              <Button
                variant="outline"
                className="w-full rounded-full"
                asChild
              >
                <Link href="/auth/sign-in">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to sign in
                </Link>
              </Button>
            </div>
          ) : (
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  placeholder="you@company.com"
                  type="email"
                  required
                  disabled={isPending}
                />
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

              <Button
                type="submit"
                className="w-full rounded-full"
                disabled={isPending || !turnstileToken}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                asChild
              >
                <Link href="/auth/sign-in">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to sign in
                </Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

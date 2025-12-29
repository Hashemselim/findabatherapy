"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { ClipboardList, ArrowRight, CheckCircle2 } from "lucide-react";

import { BubbleBackground } from "@/components/ui/bubble-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";

interface OnboardingGateProps {
  /** Feature name to display in the message */
  featureName: string;
  /** Content to show when onboarding is complete */
  children: ReactNode;
}

/**
 * Onboarding gate component
 * Shows a message when onboarding is incomplete, otherwise shows children.
 */
export function OnboardingGate({ featureName, children }: OnboardingGateProps) {
  const { isOnboardingComplete, loading } = useAuth();

  // Show children while loading to avoid flash
  if (loading) {
    return <>{children}</>;
  }

  // If onboarding is complete, show children
  if (isOnboardingComplete) {
    return <>{children}</>;
  }

  // Show onboarding prompt
  return (
    <Card className="overflow-hidden border-slate-200">
      <BubbleBackground
        interactive={false}
        size="default"
        className="bg-gradient-to-br from-white via-yellow-50/50 to-blue-50/50"
        colors={{
          first: "255,255,255",
          second: "255,236,170",
          third: "135,176,255",
          fourth: "255,248,210",
          fifth: "190,210,255",
          sixth: "240,248,255",
        }}
      >
        <CardContent className="flex flex-col items-center py-12 px-6 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5788FF] shadow-lg shadow-[#5788FF]/25">
            <ClipboardList className="h-8 w-8 text-white" />
          </div>

          <h3 className="text-xl font-semibold text-slate-900">
            Complete Onboarding to Access {featureName}
          </h3>

          <p className="mt-3 max-w-md text-sm text-slate-600">
            Finish setting up your practice profile to unlock all dashboard features.
          </p>

          {/* Quick benefits */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {["Manage your listing", "Track analytics", "Respond to inquiries"].map((benefit) => (
              <span
                key={benefit}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-[#5788FF]" />
                {benefit}
              </span>
            ))}
          </div>

          <Button asChild size="lg" className="mt-8">
            <Link href="/dashboard/onboarding" className="gap-2">
              Continue Setup
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </BubbleBackground>
    </Card>
  );
}

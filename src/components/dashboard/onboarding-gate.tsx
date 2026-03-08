"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { ClipboardList, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardEmptyState } from "@/components/dashboard/ui";
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
    <DashboardEmptyState
      icon={ClipboardList}
      title={`Complete Onboarding to Access ${featureName}`}
      description="Finish setting up your practice profile to unlock all dashboard features."
      benefits={["Manage your listing", "Track analytics", "Respond to inquiries"]}
      action={(
        <Button asChild size="lg">
          <Link href="/dashboard/onboarding" className="gap-2">
            Continue Setup
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    />
  );
}

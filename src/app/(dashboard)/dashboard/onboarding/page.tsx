"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Heart, Users, Briefcase } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateProfileIntent } from "@/lib/actions/onboarding";

export default function OnboardingWelcomePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleContinue() {
    startTransition(async () => {
      // Default intent to "both" — no longer asking users to choose
      await updateProfileIntent("both");
      router.push("/dashboard/onboarding/details");
    });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Let&apos;s set up your agency
        </h1>
        <p className="mx-auto max-w-lg text-muted-foreground">
          In under 5 minutes, you&apos;ll have a professional listing, branded
          pages, and tools to manage your clients.
        </p>
      </div>

      {/* What you'll get */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-[#5788FF]/20">
          <CardContent className="p-5 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#5788FF]/10">
              <Heart className="h-5 w-5 text-[#5788FF]" />
            </div>
            <h3 className="font-semibold text-foreground">Get Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Professional listing on our ABA therapy directory
            </p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20">
          <CardContent className="p-5 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-foreground">Branded Pages</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A shareable agency page for referral partners and families
            </p>
          </CardContent>
        </Card>
        <Card className="border-violet-500/20">
          <CardContent className="p-5 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10">
              <Briefcase className="h-5 w-5 text-violet-600" />
            </div>
            <h3 className="font-semibold text-foreground">Grow Your Team</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Post jobs and receive applications from qualified candidates
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3 text-center">
        <Button
          onClick={handleContinue}
          size="lg"
          className="rounded-full px-8"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          Free to start. Upgrade anytime for branded pages and advanced tools.
        </p>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ClipboardList, ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { PhotoGalleryManager } from "@/components/dashboard/photo-gallery-manager";
import { VideoEmbedForm } from "@/components/dashboard/video-embed-form";
import { getProfile } from "@/lib/supabase/server";

// PRD 4.5.3: Media section
// Free: locked, Pro/Enterprise: photos + video
export default async function MediaPage() {
  const profile = await getProfile();

  // If onboarding is not complete, show the gate message
  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Photos & Video</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Showcase your practice with photos and video to help families get to know you.
          </p>
        </div>

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
                Complete Onboarding to Access Media
              </h3>

              <p className="mt-3 max-w-md text-sm text-slate-600">
                Finish setting up your practice profile to unlock all dashboard features.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {["Upload photos", "Add video", "Showcase your practice"].map((benefit) => (
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
                  Continue Onboarding
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </BubbleBackground>
        </Card>
      </div>
    );
  }

  // Determine effective plan tier based on subscription status
  const isActiveSubscription =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";
  const effectivePlanTier = (profile.plan_tier !== "free" && isActiveSubscription)
    ? profile.plan_tier
    : "free";

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Media</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
          Showcase your practice with photos and video to help families get to know you.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6">
        <PhotoGalleryManager planTier={effectivePlanTier} />
        <VideoEmbedForm planTier={effectivePlanTier} />
      </div>
    </div>
  );
}

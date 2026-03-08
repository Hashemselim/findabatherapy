import Link from "next/link";
import { ClipboardList, ArrowRight, ImageIcon, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardEmptyState } from "@/components/dashboard/ui";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { PhotoGalleryManager } from "@/components/dashboard/photo-gallery-manager";
import { VideoEmbedForm } from "@/components/dashboard/video-embed-form";
import { LockedButton } from "@/components/ui/preview-banner";
import { getProfile } from "@/lib/supabase/server";

// PRD 4.5.3: Media section
// Free: photos, Pro: photos + video
export default async function MediaPage() {
  const profile = await getProfile();

  // If onboarding is not complete, show the gate message
  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <DashboardPageHeader
          title="Media"
          description="Showcase your practice with photos and video to help families get to know you."
        />

        <DashboardEmptyState
          icon={ClipboardList}
          title="Complete Onboarding to Access Media"
          description="Finish setting up your practice profile to unlock all dashboard features."
          benefits={["Upload photos", "Add video", "Showcase your practice"]}
          action={(
            <Button asChild size="lg">
              <Link href="/dashboard/onboarding" className="gap-2">
                Continue Onboarding
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        />
      </div>
    );
  }

  // Determine effective plan tier based on subscription status
  const isActiveSubscription =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";
  const effectivePlanTier = (profile.plan_tier && profile.plan_tier !== "free" && isActiveSubscription)
    ? profile.plan_tier
    : "free";

  return (
    <div className="space-y-4 sm:space-y-6">
      <DashboardPageHeader
        title="Media"
        description="Showcase your practice with photos and video to help families get to know you."
      >
        <Button asChild variant="outline" size="sm" className="w-full gap-2 sm:w-auto">
          <Link href="/dashboard/media?photos=edit">
            <ImageIcon className="h-4 w-4" />
            Add Photos
          </Link>
        </Button>
        {effectivePlanTier === "free" ? (
          <LockedButton label="Add Video" />
        ) : (
          <Button asChild size="sm" className="w-full gap-2 sm:w-auto">
            <Link href="/dashboard/media?video=edit">
              <Video className="h-4 w-4" />
              Add Video
            </Link>
          </Button>
        )}
      </DashboardPageHeader>

      <div className="grid gap-4 sm:gap-6">
        <PhotoGalleryManager planTier={effectivePlanTier} />
        <VideoEmbedForm planTier={effectivePlanTier} />
      </div>
    </div>
  );
}

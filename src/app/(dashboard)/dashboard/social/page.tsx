import { redirect } from "next/navigation";
import { Share2 } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard, DashboardEmptyState } from "@/components/dashboard/ui";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { PreviewOverlay } from "@/components/ui/preview-overlay";
import { getUser } from "@/lib/supabase/server";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { getSocialBrandData, checkSocialAssetsStatus } from "@/lib/actions/social";
import { SOCIAL_TEMPLATES } from "@/lib/social/templates";
import { getUpcomingTemplates } from "@/lib/social/calendar";
import { SocialPostsClient } from "@/components/dashboard/social/social-posts-client";

export const metadata = {
  title: "Social Posts | Dashboard",
  description: "Branded social media post templates for your ABA practice",
};

export default async function SocialPostsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const planTier = await getCurrentPlanTier();
  const isPreview = planTier === "free";

  if (isPreview) {
    return (
      <div className="space-y-3">
        <PreviewBanner
          message="Social Posts is a Pro feature. Upgrade to access branded social media templates."
          variant="inline"
          triggerFeature="social_posts"
        />
        <DashboardPageHeader
          title="Social Posts"
          description="Branded social media templates for your ABA practice"
        />
        <PreviewOverlay isPreview>
          <DashboardEmptyState
            icon={Share2}
            title="Branded Social Posts"
            description="Get ready-to-use, branded social media posts for holidays, ABA tips, and announcements."
            benefits={[
              "50+ curated post templates",
              "Branded with your logo and colors",
              "Copy image and caption with one click",
              "Upcoming holidays and events calendar",
            ]}
          />
        </PreviewOverlay>
      </div>
    );
  }

  // Pro user — get brand data
  const brandResult = await getSocialBrandData();
  const brand = brandResult.success ? brandResult.data : null;

  // Check if brand setup is complete enough
  if (!brand || (!brand.logoUrl && brand.agencyName === "Your Agency")) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader
          title="Social Posts"
          description="Branded social media templates for your ABA practice"
        />
        <DashboardCard className="p-5 sm:p-6">
          <DashboardEmptyState
            icon={Share2}
            title="Complete Your Brand Setup"
            description="Add your agency name and logo to generate branded social posts. Visit your Brand Style page to get started."
          />
        </DashboardCard>
      </div>
    );
  }

  // Check if assets are pre-generated
  const statusResult = await checkSocialAssetsStatus();
  const assetsReady = statusResult.success && statusResult.data?.ready;
  const brandHash = (statusResult.success && statusResult.data?.brandHash) || "";

  // Get upcoming templates — 90-day window for calendar view
  // Serialize Date objects to ISO strings for client component
  const upcoming = getUpcomingTemplates(90).map((t) => ({
    ...t,
    nextOccurrence: t.nextOccurrence.toISOString(),
  }));

  return (
    <div className="space-y-3">
      <DashboardPageHeader
        title="Social Posts"
        description={`${SOCIAL_TEMPLATES.length} branded templates ready to share`}
      />
      <SocialPostsClient
        templates={SOCIAL_TEMPLATES}
        upcoming={upcoming}
        profileId={brand.profileId}
        assetsReady={assetsReady || false}
        brandHash={brandHash}
      />
    </div>
  );
}

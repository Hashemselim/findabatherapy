import { redirect } from "next/navigation";
import { Share2 } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard, DashboardEmptyState } from "@/components/dashboard/ui";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { getCurrentUser } from "@/lib/platform/auth/server";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import {
  getSocialBrandData,
  checkSocialAssetsStatus,
  getSocialAssetUrls,
} from "@/lib/actions/social";
import { SOCIAL_TEMPLATES } from "@/lib/social/templates";
import { getUpcomingTemplates } from "@/lib/social/calendar";
import { SocialPostsClient } from "@/components/dashboard/social/social-posts-client";

export const metadata = {
  title: "Social Posts | Dashboard",
  description: "Branded social media post templates for your ABA practice",
};

export default async function SocialPostsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const planTier = await getCurrentPlanTier();
  const isPreview = planTier === "free";

  const upcoming = getUpcomingTemplates(365).map((t) => ({
    ...t,
    nextOccurrence: t.nextOccurrence.toISOString(),
  }));

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
        <DashboardCard className="border-amber-200/70 bg-amber-50/40 p-4 text-sm text-muted-foreground">
          Preview your branded post library with demo artwork. Copying captions and images unlocks on Pro.
        </DashboardCard>
        <SocialPostsClient
          templates={SOCIAL_TEMPLATES}
          upcoming={upcoming}
          assetsReady
          previewMode
          previewAgencyName="Acorn ABA Therapy"
        />
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

  // Check if assets are pre-generated (or generation is in progress)
  const statusResult = await checkSocialAssetsStatus();
  const brandHash =
    (statusResult.success && statusResult.data?.brandHash) || "";
  const assetUrlsResult = brandHash
    ? await getSocialAssetUrls(brandHash)
    : { success: true as const, data: {} };
  const assetUrls = assetUrlsResult.success ? assetUrlsResult.data || {} : {};
  const assetsReady =
    (statusResult.success && statusResult.data?.ready) ||
    Object.keys(assetUrls).length > 0;
  const alreadyGenerating =
    statusResult.success && statusResult.data?.generating;

  return (
    <div className="space-y-3">
      <DashboardPageHeader
        title="Social Posts"
        description={`${SOCIAL_TEMPLATES.length} branded templates ready to share`}
      />
      <SocialPostsClient
        templates={SOCIAL_TEMPLATES}
        upcoming={upcoming}
        assetsReady={assetsReady || false}
        alreadyGenerating={alreadyGenerating || false}
        assetUrls={assetUrls}
      />
    </div>
  );
}

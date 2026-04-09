import { unstable_noStore as noStore } from "next/cache";

import { BrandedToolkitGallery } from "@/components/onboarding/branded-toolkit-gallery";
import { getOnboardingData } from "@/lib/actions/onboarding";
import { readOnboardingPreviewDraftFromCookie } from "@/lib/onboarding/preview-session.server";

const DEFAULT_BRAND_COLOR = "#0866FF";
export const dynamic = "force-dynamic";

export default async function OnboardingBrandedPreviewPage() {
  noStore();
  const defaultBrandData = {
    agencyName: "Your agency",
    headline: null as string | null,
    description: null as string | null,
    logoUrl: null as string | null,
    brandColor: DEFAULT_BRAND_COLOR,
    contactEmail: "info@example.com",
    contactPhone: null as string | null,
    website: null as string | null,
    city: null as string | null,
    state: null as string | null,
  };
  const result = await getOnboardingData();
  const cookieDraft = await readOnboardingPreviewDraftFromCookie();
  const onboardingBrandData =
    result.success && result.data
      ? {
          agencyName: result.data.profile?.agencyName || "Your agency",
          headline: result.data.listing?.headline || null,
          description: result.data.listing?.description || null,
          logoUrl: result.data.listing?.logoUrl || null,
          brandColor: result.data.profile?.brandColor || DEFAULT_BRAND_COLOR,
          contactEmail: result.data.profile?.contactEmail || "info@example.com",
          contactPhone: result.data.profile?.contactPhone || null,
          website: result.data.profile?.website || null,
          city: result.data.location?.city || null,
          state: result.data.location?.state || null,
        }
      : defaultBrandData;
  const brandData = {
    agencyName: cookieDraft?.agencyName?.trim() || onboardingBrandData.agencyName,
    headline: cookieDraft?.headline ?? onboardingBrandData.headline,
    description: cookieDraft?.description ?? onboardingBrandData.description,
    logoUrl: cookieDraft?.logoUrl ?? onboardingBrandData.logoUrl,
    brandColor: cookieDraft?.brandColor || onboardingBrandData.brandColor,
    contactEmail: cookieDraft?.contactEmail || onboardingBrandData.contactEmail,
    contactPhone: cookieDraft?.contactPhone ?? onboardingBrandData.contactPhone,
    website: cookieDraft?.website ?? onboardingBrandData.website,
    city: cookieDraft?.city || onboardingBrandData.city,
    state: cookieDraft?.state || onboardingBrandData.state,
  };
  const slug = (result.success ? result.data?.listing?.slug || null : null) || cookieDraft?.slug || null;

  return (
    <BrandedToolkitGallery
      brandData={brandData}
      slug={slug}
      planHref="/dashboard/onboarding/plan"
      continueHref="/dashboard/onboarding/dashboard"
    />
  );
}

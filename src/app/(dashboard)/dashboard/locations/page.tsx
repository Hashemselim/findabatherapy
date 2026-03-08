import Link from "next/link";
import { ClipboardList, ArrowRight, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { type CompanyDefaults } from "@/components/dashboard/locations-manager";
import { LocationsPageContent } from "@/components/dashboard/locations-header-wrapper";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCallout, DashboardEmptyState } from "@/components/dashboard/ui";
import { getProfile } from "@/lib/supabase/server";
import { getLocations } from "@/lib/actions/locations";
import { getListing } from "@/lib/actions/listings";
import { getFeaturedAddonPrices } from "@/lib/stripe/actions";

// PRD 4.5.2: Locations section
// Free: 3 locations, Pro: up to 10
const LOCATION_LIMITS: Record<string, number> = {
  free: 3,
  pro: 10,
};

export default async function LocationsPage() {
  const profile = await getProfile();

  // If onboarding is not complete, show the gate message
  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader
          title="Service Locations"
          description="Manage where families can find your services. Your primary location appears prominently in search results."
        />

        <DashboardEmptyState
          icon={ClipboardList}
          title="Complete Onboarding to Access Locations"
          description="Finish setting up your practice profile to unlock all dashboard features."
          benefits={["Add locations", "Set service areas", "Appear in search"]}
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

  const [locationsResult, featuredPricingResult, listingResult] = await Promise.all([
    getLocations(),
    getFeaturedAddonPrices(),
    getListing(),
  ]);

  const locations = locationsResult.success && locationsResult.data ? locationsResult.data : [];

  // Determine effective plan tier based on subscription status
  const isActiveSubscription =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";
  const effectivePlanTier = (profile.plan_tier && profile.plan_tier !== "free" && isActiveSubscription)
    ? profile.plan_tier
    : "free";

  const locationLimit = LOCATION_LIMITS[effectivePlanTier] || 1;
  const isFreePlan = effectivePlanTier === "free";

  // Get featured pricing from Stripe - fallback to defaults if fetch fails
  const featuredPricing = featuredPricingResult.success && featuredPricingResult.data
    ? featuredPricingResult.data
    : {
        monthly: { price: 99 },
        annual: { price: 59, totalPrice: 708, savings: 480, savingsPercent: 40 },
      };

  // Build company defaults for location contact overrides (phone/email/website)
  const listing = listingResult.success && listingResult.data ? listingResult.data : null;

  const companyDefaults: CompanyDefaults = {
    phone: listing?.profile?.contactPhone || profile.contact_phone || null,
    email: listing?.profile?.contactEmail || profile.contact_email || "",
    website: listing?.profile?.website || profile.website || null,
  };

  // Count featured locations
  const featuredCount = locations.filter(loc => loc.isFeatured).length;

  return (
    <div className="space-y-3">
      {/* Client wrapper handles: header with Add button + limit card + locations manager */}
      <LocationsPageContent
        locations={locations}
        locationLimit={locationLimit}
        effectivePlanTier={effectivePlanTier as "free" | "pro"}
        featuredPricing={featuredPricing}
        companyDefaults={companyDefaults}
      />

      {/* Featured Upsell Card - Show for Pro users who haven't featured all locations */}
      {!isFreePlan && featuredCount < locations.length && locations.length > 0 && (
        <DashboardCallout
          tone="premium"
          icon={Star}
          title="Boost Your Visibility"
          description={`Featured locations appear at the top of search results and get up to 3x more visibility. ${featuredCount} of ${locations.length} locations are currently featured.`}
        />
      )}
    </div>
  );
}

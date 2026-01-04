import Link from "next/link";
import { ClipboardList, ArrowRight, CheckCircle2, MapPin, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { LocationsManager, type CompanyDefaults } from "@/components/dashboard/locations-manager";
import { getProfile } from "@/lib/supabase/server";
import { getLocations } from "@/lib/actions/locations";
import { getListing } from "@/lib/actions/listings";
import { getFeaturedAddonPrices } from "@/lib/stripe/actions";

// PRD 4.5.2: Locations section
// Free: 1 location, Pro: up to 5, Enterprise: unlimited
const LOCATION_LIMITS: Record<string, number> = {
  free: 1,
  pro: 5,
  enterprise: Infinity,
};

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};

export default async function LocationsPage() {
  const profile = await getProfile();

  // If onboarding is not complete, show the gate message
  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Service Locations</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Manage where families can find your services. Your primary location appears prominently in search results.
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
                Complete Onboarding to Access Locations
              </h3>

              <p className="mt-3 max-w-md text-sm text-slate-600">
                Finish setting up your practice profile to unlock all dashboard features.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {["Add locations", "Set service areas", "Appear in search"].map((benefit) => (
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

  const [locationsResult, featuredPricingResult, listingResult] = await Promise.all([
    getLocations(),
    getFeaturedAddonPrices(),
    getListing(),
  ]);

  const locations = locationsResult.success && locationsResult.data ? locationsResult.data : [];
  const locationLimit = LOCATION_LIMITS[profile.plan_tier] || 1;
  const isFreePlan = profile.plan_tier === "free";

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
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Service Locations</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Manage your service locations and coverage areas.
          </p>
        </div>
      </div>

      {/* Location Limit Info Card */}
      <Card className="border-[#5788FF]/30 bg-[#5788FF]/5">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-[#5788FF]" />
            <div>
              <p className="font-medium text-foreground">
                {locationLimit === Infinity
                  ? `${locations.length} location${locations.length !== 1 ? "s" : ""}`
                  : `${locations.length} of ${locationLimit} location${locationLimit !== 1 ? "s" : ""} used`}
              </p>
              <p className="text-sm text-muted-foreground">
                {profile.plan_tier === "enterprise"
                  ? "Enterprise plan includes unlimited locations"
                  : profile.plan_tier === "pro"
                    ? "Pro plan includes up to 5 locations"
                    : "Free plan includes 1 location"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locations Manager */}
      <LocationsManager
        initialLocations={locations}
        locationLimit={locationLimit}
        planTier={profile.plan_tier}
        featuredPricing={featuredPricing}
        companyDefaults={companyDefaults}
      />

      {/* Featured Upsell Card - Show for Pro users who haven't featured all locations */}
      {!isFreePlan && featuredCount < locations.length && locations.length > 0 && (
        <Card className="border-[#FEE720] bg-gradient-to-r from-[#FFF5C2]/50 to-[#FFF5C2]/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-[#5788FF] text-[#5788FF]" />
              <CardTitle className="text-lg">Boost Your Visibility</CardTitle>
            </div>
            <CardDescription>
              Featured locations appear at the top of search results and get up to
              3x more visibility.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                <strong>{featuredCount} of {locations.length}</strong> locations currently featured
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

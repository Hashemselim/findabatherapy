import Link from "next/link";
import { ClipboardList, ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { LocationsManager } from "@/components/dashboard/locations-manager";
import { getProfile } from "@/lib/supabase/server";
import { getLocations } from "@/lib/actions/locations";
import { getFeaturedAddonPrices } from "@/lib/stripe/actions";

// PRD 4.5.2: Locations section
// Free: 1 location, Pro: up to 5, Enterprise: unlimited
const LOCATION_LIMITS: Record<string, number> = {
  free: 1,
  pro: 5,
  enterprise: 100,
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

  const [locationsResult, featuredPricingResult] = await Promise.all([
    getLocations(),
    getFeaturedAddonPrices(),
  ]);

  const locations = locationsResult.success && locationsResult.data ? locationsResult.data : [];
  const locationLimit = LOCATION_LIMITS[profile.plan_tier] || 1;

  // Get featured pricing from Stripe - fallback to defaults if fetch fails
  const featuredPricing = featuredPricingResult.success && featuredPricingResult.data
    ? featuredPricingResult.data
    : {
        monthly: { price: 99 },
        annual: { price: 59, totalPrice: 708, savings: 480, savingsPercent: 40 },
      };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Locations</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
          Manage where families can find your services. Your primary location appears prominently in search results.
        </p>
      </div>

      <LocationsManager
        initialLocations={locations}
        locationLimit={locationLimit}
        planTier={profile.plan_tier}
        featuredPricing={featuredPricing}
      />
    </div>
  );
}

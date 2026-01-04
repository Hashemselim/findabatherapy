import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
} from "lucide-react";

import { BubbleBackground } from "@/components/ui/bubble-background";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  QuickStats,
  OnboardingChecklist,
  AnalyticsPreview,
  UpgradeSection,
  FeaturedUpsell,
} from "@/components/dashboard/overview";
import { DashboardTracker } from "@/components/analytics/dashboard-tracker";
import { getListing } from "@/lib/actions/listings";
import { getAnalyticsSummary } from "@/lib/actions/analytics";
import { getUnreadInquiryCount } from "@/lib/actions/inquiries";
import { getProfile } from "@/lib/supabase/server";

export default async function DashboardOverviewPage() {
  const [profile, listingResult] = await Promise.all([
    getProfile(),
    getListing(),
  ]);

  // If no profile or onboarding not complete, show onboarding prompt
  if (!profile?.onboarding_completed_at || !listingResult.success || !listingResult.data) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <DashboardTracker section="overview" />
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Overview</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:mt-2">
            Complete your onboarding to set up your practice profile and start connecting with families.
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
                Complete Your Onboarding
              </h3>

              <p className="mt-3 max-w-md text-sm text-slate-600">
                Set up your practice profile, add your services, and start appearing in search results.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {["Manage your listing", "Track analytics", "Connect with families"].map((benefit) => (
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

  const listing = listingResult.data;
  const isPublished = listing.status === "published";
  // Paid plan requires both a paid tier AND an active subscription
  const isActiveSubscription =
    listing.profile.subscriptionStatus === "active" ||
    listing.profile.subscriptionStatus === "trialing";
  const isPaidPlan = listing.profile.planTier !== "free" && isActiveSubscription;

  // Fetch additional data in parallel for Pro users
  const [analyticsResult, inquiryResult] = await Promise.all([
    isPaidPlan ? getAnalyticsSummary() : Promise.resolve(null),
    isPaidPlan ? getUnreadInquiryCount() : Promise.resolve(null),
  ]);

  const analytics = analyticsResult?.success ? analyticsResult.data : undefined;
  const inquiryCount = inquiryResult?.success ? inquiryResult.data : undefined;

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardTracker section="overview" />
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Overview</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:mt-2">
            Manage your listing, track performance, and connect with families.
          </p>
        </div>
        {isPublished ? (
          <Button variant="outline" className="w-full rounded-full sm:w-auto" asChild>
            <Link href={`/provider/${listing.slug}`} target="_blank">
              View live listing
              <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button className="w-full rounded-full sm:w-auto" asChild>
            <Link href="/dashboard/company">
              Complete your listing
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        )}
      </div>

      {/* Quick Stats */}
      <QuickStats
        listing={listing}
        isPaidPlan={isPaidPlan}
        inquiryCount={inquiryCount}
      />

      {/* Published Listing Banner */}
      {isPublished && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="flex flex-row items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <div>
              <CardTitle className="text-base text-emerald-900">
                Your listing is live!
              </CardTitle>
              <CardDescription>
                Families can find you at{" "}
                <Link
                  href={`/provider/${listing.slug}`}
                  target="_blank"
                  className="break-all text-[#5788FF] hover:underline"
                >
                  findabatherapy.org/provider/{listing.slug}
                </Link>
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Onboarding Checklist */}
      <OnboardingChecklist listing={listing} isPaidPlan={isPaidPlan} />

      {/* Analytics Preview */}
      <AnalyticsPreview isPaidPlan={isPaidPlan} analytics={analytics} />

      {/* Featured Upsell (Paid users only) */}
      {isPaidPlan && isPublished && (
        <FeaturedUpsell
          hasFeaturedLocations={listing.locations.some((l) => l.isFeatured)}
          locationCount={listing.locations.length}
          featuredPrice={99}
        />
      )}

      {/* Upgrade Section (Free users only) */}
      {!isPaidPlan && isPublished && <UpgradeSection />}
    </div>
  );
}

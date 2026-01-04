import Link from "next/link";
import {
  ClipboardList,
  CreditCard,
  CheckCircle2,
  Clock,
  ExternalLink,
  Star,
  Crown,
  Shield,
  AlertCircle,
  ArrowRight,
  Sparkles,
  MapPin,
  TrendingUp,
} from "lucide-react";

// Helper to render feature with Google star rating styling
function renderFeature(feature: string) {
  if (feature === "Google star rating integration") {
    return (
      <span className="flex items-center gap-1.5">
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span className="font-semibold">⭐ star rating</span>
      </span>
    );
  }
  return feature;
}

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { BillingPortalButton } from "@/components/billing/billing-portal-button";
import { CancelDowngradeButton } from "@/components/billing/cancel-downgrade-button";
import { EnterpriseUpgradeCard } from "@/components/billing/enterprise-upgrade-card";
import { FeaturedManageButton } from "@/components/dashboard/featured-manage-button";
import { getSubscription, getPendingDowngrade, getFeaturedAddonPrices, getFeaturedLocations } from "@/lib/stripe/actions";
import { STRIPE_PLANS } from "@/lib/stripe/config";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function DashboardBillingPage() {
  const user = await getUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();

  // Get profile for plan tier and onboarding status
  // Note: billing_interval is queried separately since it may not exist until migration runs
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier, stripe_customer_id, stripe_subscription_id, onboarding_completed_at")
    .eq("id", user.id)
    .single();

  const [subscriptionResult, pendingDowngradeResult, featuredPricingResult, featuredLocationsResult] = await Promise.all([
    getSubscription(),
    getPendingDowngrade(),
    getFeaturedAddonPrices(),
    getFeaturedLocations(),
  ]);

  const subscription = subscriptionResult.success ? subscriptionResult.data : null;
  const pendingDowngrade = pendingDowngradeResult.success ? pendingDowngradeResult.data : null;
  const featuredLocations = featuredLocationsResult.success && featuredLocationsResult.data
    ? featuredLocationsResult.data.locations
    : [];

  const planTier = profile?.plan_tier || "free";

  // Try to get billing_interval - defaults to "month" if column doesn't exist yet
  let billingInterval: "month" | "year" = "month";
  if (profile) {
    const { data: billingData } = await supabase
      .from("profiles")
      .select("billing_interval")
      .eq("id", user.id)
      .single();
    if (billingData?.billing_interval === "year") {
      billingInterval = "year";
    }
  }
  const isAnnual = billingInterval === "year";
  const isFreePlan = planTier === "free";
  const isPro = planTier === "pro";
  const isEnterprise = planTier === "enterprise";

  // Format the renewal date
  const renewalDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  // Get plan price based on billing interval
  const getPlanPrice = () => {
    if (isFreePlan) return 0;
    const plan = isPro ? STRIPE_PLANS.pro : STRIPE_PLANS.enterprise;
    return isAnnual ? plan.annual.price : plan.monthly.price;
  };
  const planPrice = getPlanPrice();
  const annualSavings = isPro ? STRIPE_PLANS.pro.annual.savings : isEnterprise ? STRIPE_PLANS.enterprise.annual.savings : 0;

  // Get featured pricing from Stripe - fallback to defaults if fetch fails
  const featuredPricing = featuredPricingResult.success && featuredPricingResult.data
    ? featuredPricingResult.data
    : {
        monthly: { price: 99 },
        annual: { price: 59, totalPrice: 708, savings: 480, savingsPercent: 40 },
      };

  // Static features list for featured addon
  const FEATURED_FEATURES = [
    "Pinned to top of state search results",
    "Featured badge on listing card",
    "Amber highlight in search results",
    "Priority placement over non-featured",
  ];

  // If onboarding is not complete, show the gate message
  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Plan & Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Manage your subscription, upgrade your plan, and access billing portal.
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
                Complete Onboarding to Access Plan & Billing
              </h3>

              <p className="mt-3 max-w-md text-sm text-slate-600">
                Finish setting up your practice profile to unlock all dashboard features.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {["View plans", "Upgrade account", "Manage billing"].map((benefit) => (
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

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Plan & Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
          Manage your subscription, upgrade your plan, and access billing portal.
        </p>
      </div>

      {/* Current Plan Summary */}
      <Card className="overflow-hidden border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-100 p-2.5">
                {isEnterprise ? (
                  <Crown className="h-6 w-6 text-slate-600" />
                ) : isPro ? (
                  <Sparkles className="h-6 w-6 text-slate-600" />
                ) : (
                  <Shield className="h-6 w-6 text-slate-500" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900 capitalize">
                    {planTier} Plan
                  </h2>
                  {!isFreePlan && subscription?.status === "active" && (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>
                  )}
                  {subscription?.cancelAtPeriodEnd && (
                    <Badge variant="destructive">Cancelling</Badge>
                  )}
                  {subscription?.status === "past_due" && (
                    <Badge variant="destructive">Past Due</Badge>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  {isFreePlan
                    ? "Basic listing features"
                    : `$${planPrice}/mo${isAnnual ? " (billed annually)" : ""} • ${renewalDate ? `Renews ${renewalDate}` : "Active subscription"}`}
                </p>
                {!isFreePlan && isAnnual && (
                  <Badge className="mt-1 border-green-200 bg-green-50 text-green-700 text-xs">
                    Saving 40% (${annualSavings}/year) with annual billing
                  </Badge>
                )}
              </div>
            </div>
            {!isFreePlan && profile?.stripe_customer_id && (
              <BillingPortalButton variant="outline" size="sm" className="w-full border-slate-200 hover:bg-slate-50 sm:w-auto">
                <ExternalLink className="mr-2 h-4 w-4" />
                Manage Subscription
              </BillingPortalButton>
            )}
          </div>
        </CardHeader>

        {/* Warnings */}
        {subscription?.cancelAtPeriodEnd && (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Subscription Cancelling</p>
                <p className="mt-1 text-sm text-amber-700">
                  Your subscription will end on {renewalDate}. You&apos;ll retain access to premium features until then.
                </p>
              </div>
            </div>
          </div>
        )}

        {subscription?.status === "past_due" && (
          <div className="border-b border-red-200 bg-red-50 px-6 py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Payment Past Due</p>
                <p className="mt-1 text-sm text-red-700">
                  Your last payment failed. Please update your payment method to avoid service interruption.
                </p>
              </div>
            </div>
          </div>
        )}

        {pendingDowngrade && (() => {
          // Check if there's an actual change happening
          const isPlanChanging = pendingDowngrade.pendingPlanTier !== planTier;
          const isBillingIntervalChanging = pendingDowngrade.pendingBillingInterval &&
            pendingDowngrade.pendingBillingInterval !== billingInterval;

          // Don't show banner if nothing is actually changing (just a normal renewal)
          if (!isPlanChanging && !isBillingIntervalChanging) {
            return null;
          }

          return (
            <div className="border-b border-blue-200 bg-blue-50 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">
                      {isPlanChanging ? "Downgrade Scheduled" : "Billing Change Scheduled"}
                    </p>
                    <p className="mt-1 text-sm text-blue-700">
                      {isPlanChanging ? (
                        <>
                          Your plan will change to{" "}
                          <span className="font-medium capitalize">{pendingDowngrade.pendingPlanTier}</span> on{" "}
                          {new Date(pendingDowngrade.effectiveDate).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                          . You&apos;ll keep your current features until then.
                        </>
                      ) : (
                        <>
                          Your billing will change to{" "}
                          <span className="font-medium">{pendingDowngrade.pendingBillingInterval === "year" ? "annual" : "monthly"}</span> on{" "}
                          {new Date(pendingDowngrade.effectiveDate).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                          .
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <CancelDowngradeButton className="shrink-0" />
              </div>
            </div>
          );
        })()}

        <CardContent className="pt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">
            Your plan includes:
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {(isPro ? STRIPE_PLANS.pro.features : isEnterprise ? STRIPE_PLANS.enterprise.features : [
              "Standard search placement",
              "1 location",
              "Basic profile",
              "Insurance list display",
              "SEO-boosting backlink",
            ]).map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                {renderFeature(feature)}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Switch to Annual Billing - for monthly subscribers */}
      {!isFreePlan && !isAnnual && (
        <Card className="overflow-hidden border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-green-100 p-3">
                <Sparkles className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Switch to Annual Billing</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Save <span className="font-semibold text-green-600">40% (${isPro ? STRIPE_PLANS.pro.annual.savings : STRIPE_PLANS.enterprise.annual.savings}/year)</span> by switching to annual billing.
                  Pay ${isPro ? STRIPE_PLANS.pro.annual.price : STRIPE_PLANS.enterprise.annual.price}/mo instead of ${isPro ? STRIPE_PLANS.pro.monthly.price : STRIPE_PLANS.enterprise.monthly.price}/mo.
                </p>
              </div>
            </div>
            <Button asChild className="w-full shrink-0 rounded-full bg-green-600 hover:bg-green-700 sm:w-auto">
              <Link href={`/dashboard/billing/checkout?plan=${planTier}&interval=annual`}>
                Switch to Annual
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Plan Comparison / Upgrade Section */}
      {isFreePlan && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Upgrade Your Plan</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Pro Plan */}
            <Card className="relative overflow-hidden border-slate-200 bg-white shadow-sm">
              <div className="absolute right-0 top-0 rounded-bl-lg bg-primary px-3 py-1">
                <span className="text-xs font-semibold text-primary-foreground">Most Popular</span>
              </div>
              <CardHeader className="pt-8">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2.5">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-900">Pro</CardTitle>
                    <CardDescription className="text-slate-500">For growing practices</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div>
                    <span className="text-3xl font-bold text-slate-900">${STRIPE_PLANS.pro.annual.price}</span>
                    <span className="text-slate-500">/mo</span>
                  </div>
                  <p className="text-sm text-slate-500">billed annually (${STRIPE_PLANS.pro.annual.totalPrice}/yr)</p>
                  <p className="text-sm text-slate-500">or ${STRIPE_PLANS.pro.monthly.price}/mo monthly</p>
                  <Badge className="mt-1 border-green-200 bg-green-50 text-green-700">
                    Save 40% (${STRIPE_PLANS.pro.annual.savings}/year)
                  </Badge>
                </div>
                <ul className="space-y-2">
                  {STRIPE_PLANS.pro.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      <span className="text-slate-600">{renderFeature(feature)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-2">
                  <Button asChild className="w-full rounded-full">
                    <Link href="/dashboard/billing/checkout?plan=pro&interval=annual">
                      Upgrade to Pro (Annual)
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full rounded-full border-slate-200">
                    <Link href="/dashboard/billing/checkout?plan=pro&interval=monthly">
                      Start Monthly
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className="relative overflow-hidden border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-slate-100 p-2.5">
                    <Crown className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-900">Enterprise</CardTitle>
                    <CardDescription className="text-slate-500">For large organizations</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div>
                    <span className="text-3xl font-bold text-slate-900">${STRIPE_PLANS.enterprise.annual.price}</span>
                    <span className="text-slate-500">/mo</span>
                  </div>
                  <p className="text-sm text-slate-500">billed annually (${STRIPE_PLANS.enterprise.annual.totalPrice}/yr)</p>
                  <p className="text-sm text-slate-500">or ${STRIPE_PLANS.enterprise.monthly.price}/mo monthly</p>
                  <Badge className="mt-1 border-green-200 bg-green-50 text-green-700">
                    Save 40% (${STRIPE_PLANS.enterprise.annual.savings}/year)
                  </Badge>
                </div>
                <ul className="space-y-2">
                  {STRIPE_PLANS.enterprise.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      <span className="text-slate-600">{renderFeature(feature)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-2">
                  <Button asChild className="w-full rounded-full">
                    <Link href="/dashboard/billing/checkout?plan=enterprise&interval=annual">
                      Upgrade to Enterprise (Annual)
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full rounded-full border-slate-200">
                    <Link href="/dashboard/billing/checkout?plan=enterprise&interval=monthly">
                      Start Monthly
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Upgrade to Enterprise for Pro users */}
      {isPro && <EnterpriseUpgradeCard isAnnual={isAnnual} />}

      {/* Featured Add-on */}
      {!isFreePlan && (
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-[#FEE720] bg-[#FFF5C2] p-2.5">
                <Star className="h-6 w-6 fill-[#5788FF] text-[#5788FF]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-foreground">Featured Placement</CardTitle>
                  <Badge variant="outline" className="border-slate-200 text-slate-600">
                    Add-on
                  </Badge>
                  {featuredLocations.length > 0 && (
                    <Badge className="border-[#FEE720] bg-[#FFF5C2] text-foreground">
                      {featuredLocations.length} active
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-slate-500">
                  Boost your visibility with premium placement options
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Active Featured Subscriptions */}
            {featuredLocations.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-700">Active Featured Locations</h3>
                <div className="space-y-2">
                  {featuredLocations.map((loc) => (
                    <div
                      key={loc.id}
                      className="flex items-center justify-between rounded-lg border border-[#FEE720] bg-gradient-to-r from-[#FFF5C2]/50 to-white p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg border border-[#FEE720] bg-[#FFF5C2] p-2">
                          <MapPin className="h-4 w-4 text-[#5788FF]" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{loc.locationLabel}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3 text-[#5788FF]" />
                            <span>Featured in {loc.state} searches</span>
                            <span className="text-slate-400">•</span>
                            <span>
                              ${loc.billingInterval === "year" ? featuredPricing.annual.price : featuredPricing.monthly.price}/mo ({loc.billingInterval === "year" ? "annual" : "monthly"})
                            </span>
                            {loc.cancelAtPeriodEnd && (
                              <Badge variant="outline" className="ml-1 px-1.5 py-0 text-[10px] border-orange-300 bg-orange-50 text-orange-700">
                                Ends {loc.currentPeriodEnd ? new Date(loc.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "soon"}
                              </Badge>
                            )}
                            {loc.status === "past_due" && (
                              <Badge variant="outline" className="ml-1 px-1.5 py-0 text-[10px] border-red-300 bg-red-50 text-red-700">
                                Past due
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <FeaturedManageButton
                        locationId={loc.locationId}
                        locationName={loc.locationLabel}
                        status={loc.status}
                        billingInterval={loc.billingInterval}
                        currentPeriodEnd={loc.currentPeriodEnd}
                        cancelAtPeriodEnd={loc.cancelAtPeriodEnd}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing info and CTA */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-2xl font-bold text-slate-900">
                  ${featuredPricing.monthly.price}
                  <span className="text-base font-normal text-slate-500">/month per location</span>
                </p>
                {featuredPricing.annual.savingsPercent > 0 && (
                  <p className="text-sm text-slate-500">
                    or ${featuredPricing.annual.price}/mo billed annually — save {featuredPricing.annual.savingsPercent}% (${featuredPricing.annual.savings}/yr)
                  </p>
                )}
                <ul className="space-y-2">
                  {FEATURED_FEATURES.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      <span className="text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col items-center justify-center rounded-xl border border-[#FEE720] bg-[#FFF5C2]/50 p-6">
                <div className="text-center">
                  <Star className="mx-auto h-8 w-8 fill-[#5788FF] text-[#5788FF]" />
                  <p className="mt-2 font-medium text-foreground">
                    {featuredLocations.length > 0 ? "Feature More Locations" : "Feature Individual Locations"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Go to your Locations page to feature specific locations
                  </p>
                  <Button asChild size="sm" className="mt-4 gap-2 border border-[#FEE720] bg-[#FEE720] text-[#333333] hover:bg-[#FFF5C2]">
                    <Link href="/dashboard/locations">
                      Manage Locations
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Portal Card */}
      {!isFreePlan && profile?.stripe_customer_id && (
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-100 p-2.5">
                <CreditCard className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <CardTitle className="text-slate-900">Billing Portal</CardTitle>
                <CardDescription className="text-slate-500">
                  View invoices, update payment methods, and manage your subscription through Stripe
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-slate-400" />
                <p className="text-sm text-slate-500">
                  Payments are securely processed by Stripe
                </p>
              </div>
              <BillingPortalButton className="w-full sm:w-auto" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Security Note */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
        <Shield className="h-4 w-4" />
        <span>All payments are secured with 256-bit SSL encryption via Stripe</span>
      </div>
    </div>
  );
}

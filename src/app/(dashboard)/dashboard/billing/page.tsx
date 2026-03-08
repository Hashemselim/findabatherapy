import Link from "next/link";
import {
  ClipboardList,
  CreditCard,
  CheckCircle2,
  Clock,
  ExternalLink,
  Star,
  Shield,
  AlertCircle,
  ArrowRight,
  Sparkles,
  MapPin,
  TrendingUp,
  Package,
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

import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BillingPortalButton } from "@/components/billing/billing-portal-button";
import { CancelDowngradeButton } from "@/components/billing/cancel-downgrade-button";
import { FeaturedLocationAction } from "@/components/billing/featured-location-action";
import { AddonCard } from "@/components/billing/addon-card";
import { DashboardCallout, DashboardCard, DashboardEmptyState, DashboardStatusBadge } from "@/components/dashboard/ui";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { getSubscription, getPendingDowngrade, getFeaturedAddonPrices, getFeaturedLocations, getBillingPortalRestriction } from "@/lib/stripe/actions";
import { getActiveAddons } from "@/lib/actions/addons";
import { getWorkspaceSeatSummary } from "@/lib/actions/workspace-users";
import { STRIPE_PLANS } from "@/lib/stripe/config";
import { createClient, getCurrentMembership, getCurrentProfileId, getUser } from "@/lib/supabase/server";

export default async function DashboardBillingPage() {
  const user = await getUser();
  const membership = await getCurrentMembership();
  const profileId = await getCurrentProfileId();

  if (!user || !membership || !profileId) {
    return null;
  }

  const supabase = await createClient();

  // Get profile for plan tier and onboarding status
  // Note: billing_interval is queried separately since it may not exist until migration runs
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier, stripe_customer_id, stripe_subscription_id, subscription_status, onboarding_completed_at")
    .eq("id", profileId)
    .single();

  const [subscriptionResult, pendingDowngradeResult, featuredPricingResult, featuredLocationsResult, addonsResult, seatSummaryResult, billingPortalRestrictionResult] = await Promise.all([
    getSubscription(),
    getPendingDowngrade(),
    getFeaturedAddonPrices(),
    getFeaturedLocations(),
    getActiveAddons(profileId),
    getWorkspaceSeatSummary(profileId),
    getBillingPortalRestriction(profileId),
  ]);

  const subscription = subscriptionResult.success ? subscriptionResult.data : null;
  const pendingDowngrade = pendingDowngradeResult.success ? pendingDowngradeResult.data : null;
  const featuredLocations = featuredLocationsResult.success && featuredLocationsResult.data
    ? featuredLocationsResult.data.locations
    : [];
  const activeAddons = addonsResult.success && addonsResult.data ? addonsResult.data : [];
  const seatSummary = seatSummaryResult.success ? seatSummaryResult.data : null;
  const billingPortalRestriction = billingPortalRestrictionResult.success
    ? billingPortalRestrictionResult.data?.reason || null
    : "Failed to validate billing portal availability";

  const planTier = profile?.plan_tier || "free";

  // Determine if user has an active subscription
  const isActiveSubscription =
    profile?.subscription_status === "active" ||
    profile?.subscription_status === "trialing";

  // Check if user selected a paid plan but never completed payment
  const hasIncompletePayment = planTier !== "free" && !isActiveSubscription && !profile?.stripe_subscription_id;

  // Try to get billing_interval - defaults to "month" if column doesn't exist yet
  let billingInterval: "month" | "year" = "month";
  if (profile) {
    const { data: billingData } = await supabase
      .from("profiles")
      .select("billing_interval")
      .eq("id", profileId)
      .single();
    if (billingData?.billing_interval === "year") {
      billingInterval = "year";
    }
  }
  const isAnnual = billingInterval === "year";

  // For display and feature purposes, use effective plan tier based on subscription status
  const effectivePlanTier = (planTier !== "free" && isActiveSubscription) ? planTier : "free";
  const isFreePlan = effectivePlanTier === "free";
  const isPro = effectivePlanTier === "pro";

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
    const plan = STRIPE_PLANS.pro;
    return isAnnual ? plan.annual.price : plan.monthly.price;
  };
  const planPrice = getPlanPrice();
  const annualSavings = isPro ? STRIPE_PLANS.pro.annual.savings : 0;

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
        <DashboardPageHeader
          title="Plan & Billing"
          description="Manage your subscription, upgrade your plan, and access billing portal."
        />

        <DashboardEmptyState
          icon={ClipboardList}
          title="Complete Onboarding to Access Plan & Billing"
          description="Finish setting up your practice profile to unlock all dashboard features."
          benefits={["View plans", "Upgrade account", "Manage billing"]}
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

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardPageHeader
        title="Plan & Billing"
        description="Manage your subscription, upgrade your plan, and access billing portal."
      >
        {!isFreePlan && membership.role === "owner" && profile?.stripe_customer_id && !billingPortalRestriction ? (
          <BillingPortalButton variant="outline" size="sm" className="w-full border-border/60 hover:bg-muted/60 sm:w-auto">
            <ExternalLink className="mr-2 h-4 w-4" />
            Manage Subscription
          </BillingPortalButton>
        ) : membership.role === "owner" ? (
          <Button asChild size="sm" className="w-full gap-2 sm:w-auto">
            <Link href="/dashboard/onboarding/plan">
              {hasIncompletePayment ? "Complete Upgrade" : "Go Live"}
            </Link>
          </Button>
        )}
      </DashboardPageHeader>

      {membership.role !== "owner" && (
        <DashboardCallout
          tone="default"
          icon={CreditCard}
          title="Billing is managed by the workspace owner"
          description="You can view plan details here, but only the owner can change the subscription, purchase seats, or open the Stripe billing portal."
        />
      )}

      {/* Current Plan Summary */}
      <DashboardCard className="overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/30 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-muted p-2.5">
                {isPro ? (
                  <Sparkles className="h-6 w-6 text-primary" />
                ) : (
                  <Shield className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground capitalize">
                    {effectivePlanTier} Plan
                  </h2>
                  {!isFreePlan && subscription?.status === "active" && (
                    <DashboardStatusBadge tone="success">Active</DashboardStatusBadge>
                  )}
                  {!isFreePlan && subscription?.status === "trialing" && (
                    <DashboardStatusBadge tone="info">Trial</DashboardStatusBadge>
                  )}
                  {subscription?.cancelAtPeriodEnd && (
                    <DashboardStatusBadge tone="warning">Cancelling</DashboardStatusBadge>
                  )}
                  {subscription?.status === "past_due" && (
                    <DashboardStatusBadge tone="danger">Past Due</DashboardStatusBadge>
                  )}
                  {hasIncompletePayment && (
                    <DashboardStatusBadge tone="warning">Payment Required</DashboardStatusBadge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {isFreePlan
                    ? "Preview mode with up to 3 locations and demo-only premium tools"
                    : `$${planPrice}/mo${isAnnual ? " (billed annually)" : ""} • ${renewalDate ? `Renews ${renewalDate}` : "Active subscription"}`}
                </p>
                {!isFreePlan && isAnnual && (
                  <DashboardStatusBadge tone="success" className="mt-1 text-xs">
                    Saving 40% (${annualSavings}/year) with annual billing
                  </DashboardStatusBadge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Warnings */}
        {subscription?.cancelAtPeriodEnd && (
          <DashboardCallout
            tone="warning"
            icon={AlertCircle}
            title="Subscription Cancelling"
            description={`Your subscription will end on ${renewalDate}. You'll retain access to premium features until then.`}
            className="rounded-none border-x-0 border-t-0 shadow-none"
          />
        )}

        {membership.role === "owner" && billingPortalRestriction && (
          <DashboardCallout
            tone="warning"
            icon={AlertCircle}
            title="Billing portal temporarily unavailable"
            description={billingPortalRestriction}
            className="rounded-none border-x-0 border-t-0 shadow-none"
          />
        )}

        {subscription?.status === "past_due" && (
          <DashboardCallout
            tone="danger"
            icon={AlertCircle}
            title="Payment Past Due"
            description="Your last payment failed. Please update your payment method to avoid service interruption."
            className="rounded-none border-x-0 border-t-0 shadow-none"
          />
        )}

        {hasIncompletePayment && (
          <DashboardCallout
            tone="warning"
            icon={AlertCircle}
            title="Payment Not Completed"
            description={`You selected the ${planTier} plan but haven't completed payment yet. Your listing is currently on the Free plan. Complete checkout to unlock premium features.`}
            action={(
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link href={`/dashboard/billing/checkout?plan=${planTier}&interval=${billingInterval}`}>
                  Complete Payment
                </Link>
              </Button>
            )}
            className="rounded-none border-x-0 border-t-0 shadow-none"
          />
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
            <DashboardCallout
              tone="info"
              icon={Clock}
              title={isPlanChanging ? "Downgrade Scheduled" : "Billing Change Scheduled"}
              description={isPlanChanging ? (
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
              action={<CancelDowngradeButton className="w-full sm:w-auto" />}
              className="rounded-none border-x-0 border-t-0 shadow-none"
            />
          );
        })()}

        <CardContent className="pt-6">
          <h3 className="mb-3 text-sm font-medium text-foreground">
            Your plan includes:
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {(isPro ? STRIPE_PLANS.pro.features : [
              "Preview listing and dashboard access",
              "Up to 3 locations",
              "Up to 3 photos",
              "Ages, languages, diagnoses & specialties",
              "Insurance list display",
              "Demo CRM and job workflows",
              "SEO-boosting backlink",
            ]).map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                {renderFeature(feature)}
              </li>
            ))}
          </ul>
        </CardContent>
      </DashboardCard>

      {/* Switch to Annual Billing - for monthly subscribers */}
      {!isFreePlan && !isAnnual && (
        <DashboardCard tone="success" className="overflow-hidden">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-primary/10 p-3">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Switch to Annual Billing</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Save <span className="font-semibold text-foreground">40% (${STRIPE_PLANS.pro.annual.savings}/year)</span> by switching to annual billing.
                  Pay ${STRIPE_PLANS.pro.annual.price}/mo instead of ${STRIPE_PLANS.pro.monthly.price}/mo.
                </p>
              </div>
            </div>
            <Button asChild className="w-full shrink-0 rounded-full sm:w-auto">
              <Link href={`/dashboard/billing/checkout?plan=${planTier}&interval=annual`}>
                Switch to Annual
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </DashboardCard>
      )}

      {/* Plan Comparison / Upgrade Section */}
      {isFreePlan && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Go Live with Pro</h2>
          <div className="grid gap-4">
            {/* Pro Plan */}
            <DashboardCard tone="premium" className="relative overflow-hidden">
              <div className="absolute right-0 top-0 rounded-bl-lg bg-primary px-3 py-1">
                <span className="text-xs font-semibold text-primary-foreground">Most Popular</span>
              </div>
              <CardHeader className="pt-8">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2.5">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-foreground">Pro</CardTitle>
                    <CardDescription className="text-muted-foreground">Branded pages, full CRM & growth tools</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div>
                    <span className="text-3xl font-bold text-foreground">${STRIPE_PLANS.pro.annual.price}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <p className="text-sm text-muted-foreground">billed annually (${STRIPE_PLANS.pro.annual.totalPrice}/yr)</p>
                  <p className="text-sm text-muted-foreground">or ${STRIPE_PLANS.pro.monthly.price}/mo monthly</p>
                  <DashboardStatusBadge tone="success" className="mt-1">
                    Save 40% (${STRIPE_PLANS.pro.annual.savings}/year)
                  </DashboardStatusBadge>
                </div>
                <ul className="space-y-2">
                  {STRIPE_PLANS.pro.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{renderFeature(feature)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-2">
                  <Button asChild className="w-full rounded-full">
                    <Link href="/dashboard/billing/checkout?plan=pro&interval=annual">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Go Live — ${STRIPE_PLANS.pro.annual.price}/mo
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full rounded-full border-border/60">
                    <Link href="/dashboard/billing/checkout?plan=pro&interval=monthly">
                      Start Monthly (${STRIPE_PLANS.pro.monthly.price}/mo)
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </DashboardCard>

          </div>
        </div>
      )}

      {seatSummary && (
        <DashboardCard>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-muted p-2.5">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-foreground">User Seats</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Account users share the same workspace. Employees remain separate.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Total seats</p>
              <p className="text-2xl font-semibold text-foreground">{seatSummary.maxSeats}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Used</p>
              <p className="text-2xl font-semibold text-foreground">{seatSummary.usedSeats}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending invites</p>
              <p className="text-2xl font-semibold text-foreground">{seatSummary.pendingSeats}</p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-2xl font-semibold text-foreground">{seatSummary.availableSeats}</p>
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                <Link href="/dashboard/settings/users">Manage Users</Link>
              </Button>
            </div>
          </CardContent>
        </DashboardCard>
      )}

      {/* Featured Location Add-on */}
      {!isFreePlan && membership.role === "owner" && (
        <DashboardCard tone="premium">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
                <Star className="h-6 w-6 fill-primary text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-foreground">Featured Location Placement</CardTitle>
                  <DashboardStatusBadge tone="default">
                    Add-on
                  </DashboardStatusBadge>
                  {featuredLocations.length > 0 && (
                    <DashboardStatusBadge tone="premium">
                      {featuredLocations.length} active
                    </DashboardStatusBadge>
                  )}
                </div>
                <CardDescription className="text-muted-foreground">
                  Boost individual locations to the top of matching FindABATherapy.org state search results
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Active Featured Subscriptions */}
            {featuredLocations.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Active Featured Locations</h3>
                <div className="space-y-2">
                  {featuredLocations.map((loc) => (
                    <div
                      key={loc.id}
                      className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg border border-primary/20 bg-primary/10 p-2">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{loc.locationLabel}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3 text-primary" />
                            <span>Featured in FindABATherapy.org {loc.state} searches</span>
                            <span className="text-muted-foreground/60">•</span>
                            <span>
                              ${loc.billingInterval === "year" ? featuredPricing.annual.price : featuredPricing.monthly.price}/mo ({loc.billingInterval === "year" ? "annual" : "monthly"})
                            </span>
                            {loc.cancelAtPeriodEnd && (
                              <DashboardStatusBadge tone="warning" className="ml-1 px-1.5 py-0 text-[10px]">
                                Ends {loc.currentPeriodEnd ? new Date(loc.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "soon"}
                              </DashboardStatusBadge>
                            )}
                            {loc.status === "past_due" && (
                              <DashboardStatusBadge tone="danger" className="ml-1 px-1.5 py-0 text-[10px]">
                                Past due
                              </DashboardStatusBadge>
                            )}
                          </div>
                        </div>
                      </div>
                      <FeaturedLocationAction
                        locationId={loc.locationId}
                        locationName={loc.locationLabel}
                        pricing={featuredPricing}
                        returnTo="billing"
                        subscription={{
                          status: loc.status,
                          billingInterval: loc.billingInterval,
                          currentPeriodEnd: loc.currentPeriodEnd,
                          cancelAtPeriodEnd: loc.cancelAtPeriodEnd,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing info and CTA */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-2xl font-bold text-foreground">
                  ${featuredPricing.monthly.price}
                  <span className="text-base font-normal text-muted-foreground">/month per location</span>
                </p>
                {featuredPricing.annual.savingsPercent > 0 && (
                  <p className="text-sm text-muted-foreground">
                    or ${featuredPricing.annual.price}/mo billed annually — save {featuredPricing.annual.savingsPercent}% (${featuredPricing.annual.savings}/yr)
                  </p>
                )}
                <ul className="space-y-2">
                  {FEATURED_FEATURES.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col items-center justify-center rounded-xl border border-primary/20 bg-primary/5 p-6">
                <div className="text-center">
                  <Star className="mx-auto h-8 w-8 fill-primary text-primary" />
                  <p className="mt-2 font-medium text-foreground">
                    {featuredLocations.length > 0 ? "Feature More Locations" : "Feature Individual Locations"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Go to your Locations page to feature specific locations on FindABATherapy.org
                  </p>
                  <Button asChild size="sm" className="mt-4 gap-2">
                    <Link href="/dashboard/locations">
                      Manage Locations
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </DashboardCard>
      )}

      {/* Add-ons */}
      {isPro && membership.role === "owner" && (
        <DashboardCard>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-muted p-2.5">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-foreground">Add-ons</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Add capacity packs, user seats, and premium placement add-ons to your Pro plan
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AddonCard addons={activeAddons} />
          </CardContent>
        </DashboardCard>
      )}

      {/* Billing Portal Card */}
      {!isFreePlan && profile?.stripe_customer_id && (
        <DashboardCard>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-muted p-2.5">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-foreground">Billing Portal</CardTitle>
                <CardDescription className="text-muted-foreground">
                  View invoices, update payment methods, and manage your subscription through Stripe
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Payments are securely processed by Stripe
                </p>
              </div>
              {!billingPortalRestriction ? (
                <BillingPortalButton className="w-full sm:w-auto" />
              ) : (
                <p className="text-sm text-muted-foreground">{billingPortalRestriction}</p>
              )}
            </div>
          </CardContent>
        </DashboardCard>
      )}

      {/* Payment Security Note */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span>All payments are secured with 256-bit SSL encryption via Stripe</span>
      </div>
    </div>
  );
}

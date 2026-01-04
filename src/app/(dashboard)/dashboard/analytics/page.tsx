import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Eye,
  MousePointer,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { AnalyticsClient } from "@/components/dashboard/analytics-client";
import { getProfile } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const profile = await getProfile();

  // If onboarding is not complete, show the gate message
  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Performance Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Track how potential clients discover and interact with your listing.
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
                Complete Onboarding to Access Analytics
              </h3>

              <p className="mt-3 max-w-md text-sm text-slate-600">
                Finish setting up your practice profile to unlock all dashboard features.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {["Track views", "Monitor clicks", "See traffic sources"].map((benefit) => (
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

  // Check if user is on free plan - Analytics is a premium feature
  // Must have paid plan AND active subscription
  const isActiveSubscription =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";
  const isFreePlan = profile.plan_tier === "free" || !isActiveSubscription;

  if (isFreePlan) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Performance Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Track how potential clients discover and interact with your listing.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-slate-50 shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.08),transparent_50%)]" />

          <div className="relative p-6">
            {/* Header with strong value prop */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">Performance Analytics</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      <Sparkles className="h-3 w-3" />
                      Pro
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Understand how families find and interact with your listing
                  </p>
                </div>
              </div>
            </div>

            {/* Feature highlights */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Eye,
                  title: "Page Views",
                  description: "Track how many families view your listing",
                },
                {
                  icon: Search,
                  title: "Search Impressions",
                  description: "See how often you appear in search results",
                },
                {
                  icon: MousePointer,
                  title: "Click-through Rate",
                  description: "Measure engagement with your listing",
                },
                {
                  icon: TrendingUp,
                  title: "Trend Analysis",
                  description: "Compare performance over time periods",
                },
              ].map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title} className="border-slate-200/80 bg-white/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-blue-600" />
                        <CardTitle className="text-sm font-medium text-slate-900">
                          {feature.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-slate-500">{feature.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* CTA */}
            <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-blue-200/60 bg-blue-50/50 p-4 sm:flex-row sm:justify-between">
              <div>
                <p className="font-medium text-slate-900">Unlock detailed analytics with Pro</p>
                <p className="text-sm text-slate-600">
                  Track views, clicks, and traffic sources to optimize your listing
                </p>
              </div>
              <Button asChild className="w-full shrink-0 sm:w-auto">
                <Link href="/dashboard/billing">
                  Upgrade to Pro
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User has Pro/Enterprise with active subscription - show analytics
  return <AnalyticsClient />;
}

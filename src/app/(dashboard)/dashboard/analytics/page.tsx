import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { AnalyticsClient } from "@/components/dashboard/analytics-client";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { PreviewOverlay } from "@/components/ui/preview-overlay";
import { getProfile } from "@/lib/supabase/server";
import { getReferralAnalytics } from "@/lib/actions/referral-analytics";
import { DEMO_REFERRAL_SOURCES } from "@/lib/demo/data";

export default async function AnalyticsPage() {
  const profile = await getProfile();

  // If onboarding is not complete, show the gate message
  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader
          title="Performance Analytics"
          description="Track how potential clients discover and interact with your listing."
        />

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

              <p className="text-xl font-semibold text-slate-900">
                Complete Onboarding to Access Analytics
              </p>

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

  // Check plan tier for preview mode
  const isActiveSubscription =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";
  const isPreview = profile.plan_tier === "free" || !isActiveSubscription;

  // Use demo referral data for free users, real data for pro
  let referralData = DEMO_REFERRAL_SOURCES;
  if (!isPreview) {
    const referralResult = await getReferralAnalytics();
    referralData = referralResult.success && referralResult.data ? referralResult.data : DEMO_REFERRAL_SOURCES;
  }

  return (
    <div className="space-y-3">
      {isPreview && (
        <PreviewBanner
          message="This is a preview with example analytics. Go Live to track real views, clicks, and inquiries."
          variant="inline"
          triggerFeature="analytics"
        />
      )}

      <DashboardPageHeader
        title="Performance Analytics"
        description="Track how potential clients discover and interact with your listing."
      />

      <PreviewOverlay isPreview={isPreview}>
        <AnalyticsClient />
      </PreviewOverlay>

      {/* Referral Source Analytics */}
      {referralData && referralData.totalClients > 0 && (
        <PreviewOverlay isPreview={isPreview}>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Client Sources</h2>
            <p className="text-sm text-muted-foreground">
              Where your clients are coming from
            </p>
          </div>

          {/* FindABATherapy Attribution Callout */}
          {referralData.findabatherapyCount > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {referralData.findabatherapyCount}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    client{referralData.findabatherapyCount !== 1 ? "s" : ""} found you through FindABATherapy
                  </p>
                </div>
                <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary">
                  {referralData.totalClients > 0
                    ? Math.round((referralData.findabatherapyCount / referralData.totalClients) * 100)
                    : 0}% of total
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Referral Source Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Referral Source Breakdown
              </CardTitle>
              <CardDescription>
                {referralData.totalWithSource} of {referralData.totalClients} clients have a known source
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {referralData.breakdown.map((item) => (
                  <div key={item.source} className="flex items-center gap-3">
                    <div className="w-32 shrink-0 truncate text-sm font-medium">
                      {item.label}
                    </div>
                    <div className="flex-1">
                      <div className="h-6 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="flex h-full items-center rounded-full bg-primary/80 px-2 text-xs font-medium text-white transition-all"
                          style={{
                            width: `${Math.max(item.percentage, 4)}%`,
                          }}
                        >
                          {item.percentage > 10 ? `${item.percentage}%` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="w-16 shrink-0 text-right text-sm text-muted-foreground">
                      {item.count} ({item.percentage}%)
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        </PreviewOverlay>
      )}
    </div>
  );
}

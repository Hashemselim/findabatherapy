import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsClient } from "@/components/dashboard/analytics-client";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCallout, DashboardEmptyState, DashboardStatusBadge } from "@/components/dashboard/ui";
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

        <DashboardEmptyState
          icon={ClipboardList}
          title="Complete Onboarding to Access Analytics"
          description="Finish setting up your practice profile to unlock all dashboard features."
          benefits={["Track views", "Monitor clicks", "See traffic sources"]}
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
            <DashboardCallout
              tone="info"
              icon={Sparkles}
              title="FindABATherapy attribution"
              description={(
                <>
                  <span className="text-2xl font-bold text-primary">
                    {referralData.findabatherapyCount}
                  </span>{" "}
                  client{referralData.findabatherapyCount !== 1 ? "s" : ""} found you through FindABATherapy.
                </>
              )}
              action={(
                <DashboardStatusBadge tone="info">
                  {referralData.totalClients > 0
                    ? Math.round((referralData.findabatherapyCount / referralData.totalClients) * 100)
                    : 0}% of total
                </DashboardStatusBadge>
              )}
            />
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

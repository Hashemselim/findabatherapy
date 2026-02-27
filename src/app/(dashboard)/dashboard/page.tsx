import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Eye,
  FileText,
  Bell,
  PlusCircle,
  Users,
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
  BrandSection,
  OnboardingChecklist,
  UpgradeSection,
} from "@/components/dashboard/overview";
import { DashboardTracker } from "@/components/analytics/dashboard-tracker";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { getListing } from "@/lib/actions/listings";
import { getAnalyticsSummary } from "@/lib/actions/analytics";
import { getUnreadInquiryCount } from "@/lib/actions/inquiries";
import { getJobCountAndLimit } from "@/lib/actions/jobs";
import { getNewApplicationCount } from "@/lib/actions/applications";
import { getProfile } from "@/lib/supabase/server";

export default async function DashboardOverviewPage() {
  let profile;
  let listingResult;

  try {
    [profile, listingResult] = await Promise.all([
      getProfile(),
      getListing(),
    ]);
  } catch {
    // If fetch fails, treat as incomplete onboarding
    profile = null;
    listingResult = { success: false, data: null };
  }

  // If no profile or onboarding not complete, show onboarding prompt
  if (!profile?.onboarding_completed_at || !listingResult.success || !listingResult.data) {
    return (
      <div className="space-y-3">
        <DashboardTracker section="overview" />
        <DashboardPageHeader
          title="Overview"
          description="Complete your onboarding to set up your practice profile and start connecting with families."
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
                Complete Your Onboarding
              </p>

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

  // Fetch additional data in parallel
  const [analyticsResult, inquiryResult, jobCountResult, applicationCountResult] = await Promise.all([
    isPaidPlan ? getAnalyticsSummary() : Promise.resolve(null),
    isPaidPlan ? getUnreadInquiryCount() : Promise.resolve(null),
    getJobCountAndLimit(),
    getNewApplicationCount(),
  ]);

  const analytics = analyticsResult?.success ? analyticsResult.data : undefined;
  const inquiryCount = inquiryResult?.success ? inquiryResult.data : 0;
  const jobStats = jobCountResult.success ? jobCountResult.data : { count: 0, limit: 1 };
  const applicationCount = applicationCountResult.success ? applicationCountResult.data : 0;

  return (
    <div className="space-y-3">
      <DashboardTracker section="overview" />
      <DashboardPageHeader
        title="Overview"
        description="Manage your listing, track performance, and connect with families."
      >
        {isPublished ? (
          <Button variant="outline" className="rounded-full" size="sm" asChild>
            <Link href={`/provider/${listing.slug}`} target="_blank">
              View live listing
              <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button size="sm" asChild>
            <Link href="/dashboard/intake-pages/directory">
              Complete your listing
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        )}
      </DashboardPageHeader>

      {/* Find ABA Jobs Section */}
      <BrandSection
        brand="jobs"
        title="Find ABA Jobs"
        description="Post job openings and review applications from qualified candidates."
        stats={[
          {
            label: "new applications",
            value: applicationCount ?? 0,
            href: "/dashboard/team/applicants",
          },
        ]}
        links={[
          {
            label: "View Profile",
            href: `/employers/${listing.slug}`,
            icon: Eye,
            external: true,
          },
          {
            label: "Career Page",
            href: `/careers/${listing.slug}`,
            icon: Briefcase,
            external: true,
          },
          {
            label: "Post a Job",
            href: "/dashboard/team/jobs/new",
            icon: PlusCircle,
          },
          {
            label: "Employees",
            href: "/dashboard/team/applicants",
            icon: Users,
          },
        ]}
      />

      {/* Find ABA Therapy Section */}
      <BrandSection
        brand="therapy"
        title="Find ABA Therapy"
        description="Manage your provider listing and connect with families seeking ABA services."
        stats={[
          {
            label: "new messages",
            value: inquiryCount ?? 0,
            href: "/dashboard/notifications",
          },
          ...(isPaidPlan && analytics?.views !== undefined
            ? [
                {
                  label: "profile views",
                  value: analytics.views,
                  href: "/dashboard/settings/analytics",
                },
              ]
            : []),
        ]}
        links={[
          {
            label: "View Profile",
            href: `/provider/${listing.slug}`,
            icon: Eye,
            external: true,
          },
          {
            label: "Private Intake Form",
            href: `/intake/${listing.slug}`,
            icon: FileText,
            external: true,
          },
          {
            label: "Notifications",
            href: "/dashboard/notifications",
            icon: Bell,
          },
        ]}
      />

      {/* Upgrade Section (Free users only) */}
      {!isPaidPlan && <UpgradeSection />}

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
    </div>
  );
}

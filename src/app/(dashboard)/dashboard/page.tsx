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

import { Button } from "@/components/ui/button";
import {
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
import {
  DashboardCallout,
  DashboardCard,
  DashboardEmptyState,
} from "@/components/dashboard/ui";
import {
  getProviderCareersPath,
  getJobsEmployersPath,
} from "@/lib/utils/public-paths";
import { getListing } from "@/lib/actions/listings";
import { getAnalyticsSummary } from "@/lib/actions/analytics";
import { getUnreadInquiryCount } from "@/lib/actions/inquiries";
import { getNewApplicationCount } from "@/lib/actions/applications";
import { getProfile } from "@/lib/supabase/server";

interface DashboardOverviewPageProps {
  searchParams?: Promise<{ welcome?: string }>;
}

export default async function DashboardOverviewPage({
  searchParams,
}: DashboardOverviewPageProps) {
  const params = searchParams ? await searchParams : undefined;
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

        <DashboardEmptyState
          icon={ClipboardList}
          title="Complete your onboarding"
          description="Set up your practice profile, add your services, and start appearing in search results."
          benefits={["Manage your listing", "Track analytics", "Connect with families"]}
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

  const listing = listingResult.data;
  const isPublished = listing.status === "published";
  // Paid plan requires both a paid tier AND an active subscription
  const isActiveSubscription =
    listing.profile.subscriptionStatus === "active" ||
    listing.profile.subscriptionStatus === "trialing";
  const isPaidPlan = listing.profile.planTier !== "free" && isActiveSubscription;

  // Fetch additional data in parallel
  const [analyticsResult, inquiryResult, applicationCountResult] = await Promise.all([
    isPaidPlan ? getAnalyticsSummary() : Promise.resolve(null),
    isPaidPlan ? getUnreadInquiryCount() : Promise.resolve(null),
    getNewApplicationCount(),
  ]);

  const analytics = analyticsResult?.success ? analyticsResult.data : undefined;
  const inquiryCount = inquiryResult?.success ? inquiryResult.data : 0;
  const applicationCount = applicationCountResult.success ? applicationCountResult.data : 0;
  const showWelcome = params?.welcome === "1";

  return (
    <div className="space-y-3">
      <DashboardTracker section="overview" />
      {showWelcome && (
        <DashboardCallout
          tone="success"
          icon={CheckCircle2}
          title="You're in."
          description="Your onboarding is complete. Your FindABATherapy presence is live, and the rest of your GoodABA dashboard is ready to use or preview based on your plan."
        />
      )}
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
            href: getJobsEmployersPath(`/${listing.slug}`),
            icon: Eye,
            external: true,
          },
          {
            label: "Career Page",
            href: getProviderCareersPath(listing.slug),
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
        <DashboardCard tone="success">
          <CardHeader className="flex flex-row items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base text-foreground">
                Your listing is live!
              </CardTitle>
              <CardDescription>
                Families can find you at{" "}
                <Link
                  href={`/provider/${listing.slug}`}
                  target="_blank"
                  className="break-all text-primary hover:underline"
                >
                  findabatherapy.org/provider/{listing.slug}
                </Link>
              </CardDescription>
            </div>
          </CardHeader>
        </DashboardCard>
      )}

      {/* Onboarding Checklist */}
      <OnboardingChecklist listing={listing} isPaidPlan={isPaidPlan} />
    </div>
  );
}

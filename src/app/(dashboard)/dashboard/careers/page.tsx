import Link from "next/link";
import { ArrowRight, ClipboardList, CheckCircle2, Briefcase } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { CareersPageShareCard } from "@/components/dashboard/jobs/careers-page-share-card";
import { getProfile } from "@/lib/supabase/server";
import { getListingSlug } from "@/lib/actions/listings";
import { getJobsByProvider } from "@/lib/queries/jobs";

export default async function CareersPageDashboard() {
  const [profile, listingSlug] = await Promise.all([
    getProfile(),
    getListingSlug(),
  ]);

  // If onboarding is not complete, show the gate message
  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader title="Careers Page" description="Share a branded careers page with job seekers." />

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
                Complete Onboarding First
              </p>

              <p className="mt-3 max-w-md text-sm text-slate-600">
                Finish setting up your practice profile to access your branded careers page.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {["Shareable link", "Custom branding", "All jobs in one place"].map((benefit) => (
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

  // If no listing slug, something went wrong
  if (!listingSlug) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader title="Careers Page" description="Share a branded careers page with job seekers." />

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Briefcase className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Unable to load careers page</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Please complete your company profile setup to access your branded careers page.
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard/company">
                Go to Company Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const jobs = await getJobsByProvider(listingSlug);

  return (
    <div className="space-y-3">
      <DashboardPageHeader title="Careers Page" description="Share a branded careers page that showcases all your open positions." />

      <Card className="border-border/60 bg-muted/20">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Branding is now managed in one place for all branded pages.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/branding">Manage Branding</Link>
          </Button>
        </CardContent>
      </Card>

      <CareersPageShareCard
        listingSlug={listingSlug}
        companyName={profile.agency_name}
        jobCount={jobs.length}
      />
    </div>
  );
}

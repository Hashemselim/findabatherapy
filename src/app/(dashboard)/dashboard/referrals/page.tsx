import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Mail, RefreshCw, Users } from "lucide-react";

import { getUser } from "@/lib/supabase/server";
import { getReferralOverview } from "@/lib/actions/referrals";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

export default async function ReferralsOverviewPage() {
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");

  const overviewResult = await getReferralOverview();
  if (!overviewResult.success || !overviewResult.data) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader title="Referrals" description="Referral CRM is unavailable right now." />
      </div>
    );
  }

  const overview = overviewResult.data;

  return (
    <div className="space-y-3">
      <DashboardPageHeader
        title="Referrals"
        description="Pull nearby referral sources, send outreach, and track the relationship over time."
      >
        <Button asChild size="sm">
          <Link href="/dashboard/referrals/sources">
            Open Sources
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/referrals/settings">
            Settings
          </Link>
        </Button>
      </DashboardPageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Sources" value={overview.totalSources} />
        <StatCard label="Ready To Contact" value={overview.readyToContact} />
        <StatCard label="Active Referrers" value={overview.activeReferrers} />
        <StatCard label="Due Tasks" value={overview.dueTasks} />
        <StatCard label="Verified Emails" value={overview.verifiedEmails} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Top Priority Sources</CardTitle>
            <CardDescription>Best next offices to contact based on distance, channel quality, and confidence.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.topSources.length === 0 ? (
              <p className="text-sm text-muted-foreground">No referral sources yet. Run your first import from the sources page.</p>
            ) : (
              overview.topSources.map((source) => (
                <div key={source.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{source.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {source.category.replace(/_/g, " ")}
                      {source.city || source.state ? ` • ${[source.city, source.state].filter(Boolean).join(", ")}` : ""}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/referrals/sources/${source.id}`}>
                      Open
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Touchpoints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview.recentTouchpoints.length === 0 ? (
                <p className="text-sm text-muted-foreground">No touchpoints recorded yet.</p>
              ) : (
                overview.recentTouchpoints.map((touchpoint) => (
                  <div key={touchpoint.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center gap-2">
                      {touchpoint.touchpoint_type === "email" ? <Mail className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                      <p className="font-medium">{touchpoint.touchpoint_type.replace(/_/g, " ")}</p>
                    </div>
                    <p className="mt-1 text-muted-foreground">{touchpoint.outcome.replace(/_/g, " ")}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Import Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview.importJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No import jobs yet.</p>
              ) : (
                overview.importJobs.map((job) => (
                  <div key={job.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      <p className="font-medium">{job.status}</p>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {job.discovered_count} discovered • {job.enriched_count} enriched
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

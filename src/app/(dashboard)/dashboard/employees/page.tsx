import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, Users, Award, Calendar, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProfile } from "@/lib/supabase/server";
import { getApplications } from "@/lib/actions/applications";
import { getJobPostings } from "@/lib/actions/jobs";
import { ApplicationsInbox } from "@/components/dashboard/jobs";
import { brandColors } from "@/config/brands";

export default async function EmployeesPage() {
  const profile = await getProfile();

  // If onboarding is not complete, show the gate message
  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Employees</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Manage job applicants and team members.
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
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/25">
                <ClipboardList className="h-8 w-8 text-white" />
              </div>

              <h3 className="text-xl font-semibold text-slate-900">
                Complete Onboarding to Access Employees
              </h3>

              <p className="mt-3 max-w-md text-sm text-slate-600">
                Finish setting up your practice profile to unlock all dashboard features.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {["View applicants", "Track hiring", "Manage team"].map((benefit) => (
                  <span
                    key={benefit}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
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

  // Fetch applications and jobs in parallel
  const [applicationsResult, jobsResult] = await Promise.all([
    getApplications(),
    getJobPostings(),
  ]);

  const applications = applicationsResult.success ? applicationsResult.data?.applications || [] : [];
  const newCount = applicationsResult.success ? applicationsResult.data?.newCount || 0 : 0;
  const jobs = jobsResult.success ? jobsResult.data || [] : [];

  // Team features (coming soon)
  const teamFeatures = [
    {
      icon: Users,
      title: "Employee Profiles",
      description: "Store contact info, certifications, and employment history",
    },
    {
      icon: Award,
      title: "Certification Tracking",
      description: "Track BCBA, RBT certifications and renewal dates",
    },
    {
      icon: Calendar,
      title: "Scheduling",
      description: "Manage employee schedules and availability",
    },
    {
      icon: Clock,
      title: "Time Tracking",
      description: "Track hours worked and billable time",
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 sm:gap-6">
      {/* Page Header */}
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Employees</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Manage job applicants and team members.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full rounded-full sm:w-auto">
          <Link href="/dashboard/jobs">
            View Job Postings
          </Link>
        </Button>
      </div>

      {/* Tabs for Applicants and Team */}
      <Tabs defaultValue="applicants" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="applicants" className="gap-2">
            Applicants
            {newCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-xs font-semibold text-white">
                {newCount > 99 ? "99+" : newCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="applicants" className="flex min-h-0 flex-1 flex-col mt-4">
          <Suspense
            fallback={
              <div className="flex min-h-0 flex-1 gap-4">
                <Card className="w-[350px] shrink-0 animate-pulse lg:block hidden">
                  <CardContent className="space-y-3 p-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-2/3 rounded bg-muted" />
                          <div className="h-3 w-1/2 rounded bg-muted" />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="flex-1 animate-pulse">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full bg-muted" />
                      <div className="space-y-2">
                        <div className="h-5 w-40 rounded bg-muted" />
                        <div className="h-4 w-32 rounded bg-muted" />
                      </div>
                    </div>
                    <div className="h-20 rounded bg-muted" />
                  </CardContent>
                </Card>
              </div>
            }
          >
            <ApplicationsInbox
              initialApplications={applications}
              initialNewCount={newCount}
              jobs={jobs.map((j) => ({ id: j.id, title: j.title }))}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card className="overflow-hidden border-purple-200/60">
            <BubbleBackground
              interactive={false}
              size="default"
              className="bg-gradient-to-br from-white via-purple-50/50 to-slate-50"
              colors={{
                first: "255,255,255",
                second: "233,213,255",
                third: "139,92,246",
                fourth: "245,238,255",
                fifth: "196,181,253",
                sixth: "250,245,255",
              }}
            >
              <CardContent className="flex flex-col items-center px-6 py-12 text-center">
                <div
                  className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
                  style={{
                    backgroundColor: brandColors.crm,
                    boxShadow: `0 10px 25px -5px ${brandColors.crm}40`,
                  }}
                >
                  <Users className="h-8 w-8 text-white" />
                </div>

                <h3 className="text-xl font-semibold text-slate-900">
                  Team Management Coming Soon
                </h3>

                <p className="mt-3 max-w-md text-sm text-slate-600">
                  Manage your team, track employee certifications, and streamline HR
                  processes. Convert job applicants hired through Find ABA Jobs
                  directly into team members.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {teamFeatures.map((feature) => (
                    <span
                      key={feature.title}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                    >
                      <feature.icon
                        className="h-3.5 w-3.5"
                        style={{ color: brandColors.crm }}
                      />
                      {feature.title}
                    </span>
                  ))}
                </div>

                <Button
                  asChild
                  size="lg"
                  className="mt-8"
                  style={{ backgroundColor: brandColors.crm }}
                >
                  <Link href="/dashboard/feedback" className="gap-2">
                    Request Early Access
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </BubbleBackground>
          </Card>

          {/* Feature Preview Cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {teamFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-border/60">
                  <CardHeader className="flex flex-row items-center gap-3 pb-2">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${brandColors.crm}15` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: brandColors.crm }} />
                    </div>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

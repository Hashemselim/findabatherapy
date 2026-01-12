import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Heart,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import { BubbleBackground } from "@/components/ui/bubble-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brandColors } from "@/config/brands";

export default function LeadsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Leads
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:mt-2">
          Track and manage your sales pipeline.
        </p>
      </div>

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
              <Target className="h-8 w-8 text-white" />
            </div>

            <h3 className="text-xl font-semibold text-slate-900">
              Lead Management Coming Soon
            </h3>

            <p className="mt-3 max-w-md text-sm text-slate-600">
              Unified lead management for both Find ABA Therapy inquiries and
              Find ABA Jobs applications. Track prospects through your sales
              pipeline.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {[
                "Pipeline stages",
                "Lead scoring",
                "Activity tracking",
                "Conversion analytics",
              ].map((feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                >
                  <Sparkles
                    className="h-3.5 w-3.5"
                    style={{ color: brandColors.crm }}
                  />
                  {feature}
                </span>
              ))}
            </div>

            <Button
              asChild
              size="lg"
              className="mt-8 gap-2"
              style={{ backgroundColor: brandColors.crm }}
            >
              <Link href="/dashboard/feedback">
                Request Early Access
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </BubbleBackground>
      </Card>

      {/* Lead Sources Preview */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${brandColors.therapy}15` }}
            >
              <Heart className="h-5 w-5" style={{ color: brandColors.therapy }} />
            </div>
            <CardTitle className="text-base">Family Inquiries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Families who reach out through your Find ABA Therapy listing will
              automatically become leads you can track and nurture.
            </p>
            <Button
              asChild
              variant="link"
              className="mt-2 h-auto p-0"
              style={{ color: brandColors.therapy }}
            >
              <Link href="/dashboard/inbox" className="gap-1">
                View Inbox
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${brandColors.jobs}15` }}
            >
              <Briefcase className="h-5 w-5" style={{ color: brandColors.jobs }} />
            </div>
            <CardTitle className="text-base">Job Applicants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Candidates who apply to your jobs on Find ABA Jobs will be tracked
              as potential hires in your recruitment pipeline.
            </p>
            <Button
              asChild
              variant="link"
              className="mt-2 h-auto p-0"
              style={{ color: brandColors.jobs }}
            >
              <Link href="/dashboard/jobs/applications" className="gap-1">
                View Applications
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Preview */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Pipeline Coming Soon</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Visualize your leads moving through stages from initial contact to
            converted client or hired employee.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

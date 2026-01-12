import Link from "next/link";
import {
  ArrowRight,
  Award,
  Calendar,
  Clock,
  Sparkles,
  UserCircle,
  Users,
} from "lucide-react";

import { BubbleBackground } from "@/components/ui/bubble-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brandColors } from "@/config/brands";

export default function TeamPage() {
  const features = [
    {
      icon: UserCircle,
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
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Team Overview
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:mt-2">
          Manage your team members and organizational structure.
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
              <Users className="h-8 w-8 text-white" />
            </div>

            <h3 className="text-xl font-semibold text-slate-900">
              Team Management Coming Soon
            </h3>

            <p className="mt-3 max-w-md text-sm text-slate-600">
              Behavior Work CRM will help you manage your team, track employee
              certifications, and streamline HR processes. Convert job
              applicants hired through Find ABA Jobs directly into team members.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {features.map((feature) => (
                <span
                  key={feature.title}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                >
                  <Sparkles
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
      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((feature) => {
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
    </div>
  );
}

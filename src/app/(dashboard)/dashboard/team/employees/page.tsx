import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Sparkles,
  UserCircle,
  UserPlus,
} from "lucide-react";

import { BubbleBackground } from "@/components/ui/bubble-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { brandColors } from "@/config/brands";

export default function EmployeesPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Employees
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:mt-2">
          Manage your team members and their information.
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
              <UserCircle className="h-8 w-8 text-white" />
            </div>

            <h3 className="text-xl font-semibold text-slate-900">
              Employee Directory Coming Soon
            </h3>

            <p className="mt-3 max-w-md text-sm text-slate-600">
              Keep track of your team members, their certifications, and
              employment details. When you hire candidates from Find ABA Jobs,
              they&apos;ll automatically appear here.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {[
                "Employee profiles",
                "Certification tracking",
                "Contact information",
                "Employment history",
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

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild variant="outline" className="gap-2 rounded-full">
                <Link href="/dashboard/jobs/applications">
                  <UserPlus className="h-4 w-4" />
                  View Applications
                </Link>
              </Button>
              <Button
                asChild
                className="gap-2 rounded-full"
                style={{ backgroundColor: brandColors.jobs }}
              >
                <Link href="/dashboard/jobs/new">
                  <Briefcase className="h-4 w-4" />
                  Post a Job
                </Link>
              </Button>
            </div>
          </CardContent>
        </BubbleBackground>
      </Card>

      {/* Empty State Preview */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <UserCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No employees yet</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            When employee management launches, you&apos;ll be able to add team
            members here or convert hired applicants from Find ABA Jobs.
          </p>
          <Button
            asChild
            className="mt-6 rounded-full"
            style={{ backgroundColor: brandColors.crm }}
          >
            <Link href="/dashboard/feedback">
              Request Early Access
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

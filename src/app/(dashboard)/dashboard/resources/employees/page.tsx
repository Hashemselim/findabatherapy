import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Sparkles,
} from "lucide-react";

import { BubbleBackground } from "@/components/ui/bubble-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brandColors } from "@/config/brands";

export default function EmployeeResourcesPage() {
  const features = [
    {
      icon: BookOpen,
      title: "Training Materials",
      description: "Upload training documents and certification guides",
    },
    {
      icon: FileText,
      title: "Policy Documents",
      description: "Store and share company policies and procedures",
    },
    {
      icon: ClipboardCheck,
      title: "Onboarding Checklists",
      description: "Create checklists for new hire onboarding",
    },
    {
      icon: FolderOpen,
      title: "Document Library",
      description: "Organize all employee resources in one place",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Employee Resources
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:mt-2">
          Documents and materials for staff.
        </p>
      </div>

      <Card className="overflow-hidden border-emerald-200/60">
        <BubbleBackground
          interactive={false}
          size="default"
          className="bg-gradient-to-br from-white via-emerald-50/50 to-slate-50"
          colors={{
            first: "255,255,255",
            second: "213,255,233",
            third: "16,185,129",
            fourth: "238,255,245",
            fifth: "181,253,196",
            sixth: "245,255,250",
          }}
        >
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <div
              className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
              style={{
                backgroundColor: brandColors.jobs,
                boxShadow: `0 10px 25px -5px ${brandColors.jobs}40`,
              }}
            >
              <FolderOpen className="h-8 w-8 text-white" />
            </div>

            <p className="text-xl font-semibold text-slate-900">
              Employee Resources Coming Soon
            </p>

            <p className="mt-3 max-w-md text-sm text-slate-600">
              Share training materials, company policies, and onboarding
              documents with your team. Keep all employee resources organized
              and easily accessible.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {features.map((feature) => (
                <span
                  key={feature.title}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                >
                  <Sparkles
                    className="h-3.5 w-3.5"
                    style={{ color: brandColors.jobs }}
                  />
                  {feature.title}
                </span>
              ))}
            </div>

            <Button
              asChild
              size="lg"
              className="mt-8"
              style={{ backgroundColor: brandColors.jobs }}
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
                  style={{ backgroundColor: `${brandColors.jobs}15` }}
                >
                  <Icon className="h-5 w-5" style={{ color: brandColors.jobs }} />
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

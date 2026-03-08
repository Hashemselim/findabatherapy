import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  FileText,
  FolderOpen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardFeatureCard, DashboardCard } from "@/components/dashboard/ui";

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
      <DashboardPageHeader
        title="Employee Resources"
        description="Documents and materials for staff."
      />

      <DashboardFeatureCard
        title="Employee Resources Coming Soon"
        description="Share training materials, company policies, and onboarding documents with your team in one organized workspace."
        icon={FolderOpen}
        tone="success"
        badgeLabel="Coming Soon"
        highlights={features.map((feature) => ({
          title: feature.title,
          description: feature.description,
          icon: feature.icon,
          tone: "default" as const,
        }))}
        footer="Need this sooner? Tell us how your team would use it."
        action={(
          <Button asChild size="lg">
            <Link href="/dashboard/feedback" className="gap-2">
              Request Early Access
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <DashboardCard key={feature.title}>
              <div className="flex items-start gap-3 px-6 pb-2 pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
                </div>
              </div>
              <div className="px-6 pb-6">
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </DashboardCard>
          );
        })}
      </div>
    </div>
  );
}

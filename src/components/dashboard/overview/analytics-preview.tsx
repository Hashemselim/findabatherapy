import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Eye,
  MessageSquare,
  MousePointerClick,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardFeatureCard, DashboardStatCard, getDashboardToneClasses } from "@/components/dashboard/ui";
import type { AnalyticsSummary } from "@/lib/actions/analytics";
import { STRIPE_PLANS } from "@/lib/stripe/config";

interface AnalyticsPreviewProps {
  isPaidPlan: boolean;
  analytics?: AnalyticsSummary;
}

export function AnalyticsPreview({ isPaidPlan, analytics }: AnalyticsPreviewProps) {
  if (!isPaidPlan) {
    return <LockedAnalyticsCard />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Performance</h2>
        <Button variant="ghost" size="sm" asChild className="text-primary">
          <Link href="/dashboard/analytics">
            View Details
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Profile Views */}
        <MetricCard
          label="Profile Views"
          value={analytics?.views ?? 0}
          trend={analytics?.viewsTrend}
          icon={<Eye className="h-4 w-4" />}
        />

        {/* Search Impressions - show only confirmed user impressions */}
        <MetricCard
          label="Search Impressions"
          value={analytics?.userImpressions || 0}
          icon={<BarChart3 className="h-4 w-4" />}
          subtitle="Confirmed browser visits"
        />

        {/* Click-through Rate */}
        <MetricCard
          label="Click Rate"
          value={`${analytics?.clickThroughRate?.toFixed(1) ?? 0}%`}
          icon={<MousePointerClick className="h-4 w-4" />}
        />

        {/* Inquiries */}
        <MetricCard
          label="Inquiries"
          value={analytics?.inquiries ?? 0}
          trend={analytics?.inquiriesTrend}
          icon={<MessageSquare className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number | string;
  trend?: number;
  icon: React.ReactNode;
  subtitle?: string;
}

function MetricCard({ label, value, trend, icon, subtitle }: MetricCardProps) {
  const showTrend = trend !== undefined && trend !== 0;
  const isPositive = trend !== undefined && trend > 0;
  const trendTone = getDashboardToneClasses(isPositive ? "success" : "danger");
  const trendNode = showTrend ? (
    <span className={`flex items-center text-xs font-medium ${trendTone.emphasis}`}>
      {isPositive ? (
        <TrendingUp className="mr-0.5 h-3 w-3" />
      ) : (
        <TrendingDown className="mr-0.5 h-3 w-3" />
      )}
      {Math.abs(trend).toFixed(1)}%
    </span>
  ) : undefined;

  return (
    <DashboardStatCard
      label={label}
      value={value}
      icon={icon}
      description={subtitle || "Last 30 days"}
      trend={trendNode}
    />
  );
}

function LockedAnalyticsCard() {
  return (
    <DashboardFeatureCard
      title="Performance Analytics"
      description="Track how families find and interact with your listing."
      icon={BarChart3}
      badgeLabel="Pro"
      highlights={[
        { title: "Profile Views", description: "See who visits", icon: Eye, tone: "info" },
        { title: "Impressions", description: "Search visibility", icon: BarChart3, tone: "info" },
        { title: "Click Rate", description: "Engagement rate", icon: MousePointerClick, tone: "default" },
        { title: "Inquiries", description: "Family contacts", icon: MessageSquare, tone: "success" },
      ]}
      footer={(
        <>
          Starting at{" "}
          <span className="font-semibold text-foreground">${STRIPE_PLANS.pro.annual.price}/mo</span>
          {" "}(billed annually)
        </>
      )}
      action={(
        <Button asChild size="sm" className="w-full shrink-0 sm:w-auto">
          <Link href="/dashboard/billing">Upgrade Now</Link>
        </Button>
      )}
    />
  );
}

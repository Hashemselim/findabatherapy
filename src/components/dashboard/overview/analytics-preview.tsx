import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Eye,
  MessageSquare,
  MousePointerClick,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
        <Button variant="ghost" size="sm" asChild className="text-[#5788FF]">
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

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-foreground">{value}</span>
          {showTrend && (
            <span
              className={`flex items-center text-xs font-medium ${
                isPositive ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="mr-0.5 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-0.5 h-3 w-3" />
              )}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{subtitle || "Last 30 days"}</p>
      </CardContent>
    </Card>
  );
}

function LockedAnalyticsCard() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 shadow-sm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.06),transparent_50%)]" />

      <div className="relative p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">Performance Analytics</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                <Sparkles className="h-3 w-3" />
                Pro
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Track how families find and interact with your listing.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-slate-100 bg-white p-4 sm:grid-cols-4">
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium text-slate-700">Profile Views</p>
            <p className="text-xs text-slate-500">See who visits</p>
          </div>
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium text-slate-700">Impressions</p>
            <p className="text-xs text-slate-500">Search visibility</p>
          </div>
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium text-slate-700">Click Rate</p>
            <p className="text-xs text-slate-500">Engagement rate</p>
          </div>
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium text-slate-700">Inquiries</p>
            <p className="text-xs text-slate-500">Family contacts</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Starting at{" "}
            <span className="font-semibold text-slate-900">
              ${STRIPE_PLANS.pro.annual.price}/mo
            </span>
            <span className="text-slate-400"> (billed annually)</span>
          </p>
          <Button asChild size="sm" className="w-full shrink-0 rounded-full sm:w-auto">
            <Link href="/dashboard/billing">Upgrade Now</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

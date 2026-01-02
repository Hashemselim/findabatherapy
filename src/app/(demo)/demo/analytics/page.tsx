"use client";

import { useState } from "react";
import {
  Eye,
  MessageSquare,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsTimeFilter } from "@/components/dashboard/analytics-time-filter";
import { AnalyticsMetricCard } from "@/components/dashboard/analytics-metric-card";
import { ClickThroughRateCard } from "@/components/dashboard/click-through-rate-card";
import { TrafficSources } from "@/components/dashboard/traffic-sources";
import { LocationAnalyticsSection } from "@/components/dashboard/location-analytics-section";
import { DemoCTABanner } from "@/components/demo/demo-cta-banner";
import { useDemoContext } from "@/contexts/demo-context";
import { DEMO_ANALYTICS } from "@/lib/demo/data";
import type { TimePeriod, LocationAnalytics } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

export default function DemoAnalyticsPage() {
  const { showDemoToast } = useDemoContext();
  const [period, setPeriod] = useState<TimePeriod>("month");

  const analytics = DEMO_ANALYTICS;

  // Handle period change with toast
  const handlePeriodChange = (newPeriod: TimePeriod) => {
    setPeriod(newPeriod);
    showDemoToast("Date filtering is simulated in demo mode");
  };

  // Calculate trends
  const calculateTrend = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Cast location data to LocationAnalytics type
  const locationData: LocationAnalytics[] = analytics.byLocation;

  // All locations selected by default
  const selectedLocationIds = locationData.map((l) => l.locationId);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Performance Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Track how potential clients discover and interact with your listing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <AnalyticsTimeFilter value={period} onChange={handlePeriodChange} />
        </div>
      </div>

      {/* Overview Cards */}
      <div data-tour="analytics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Page Views"
          value={analytics.current.views}
          previousValue={analytics.previous.views}
          icon={Eye}
        />
        <MetricCard
          title="Search Impressions"
          value={analytics.current.searchImpressions}
          previousValue={analytics.previous.searchImpressions}
          icon={Search}
        />
        <MetricCard
          title="Click-through Rate"
          value={analytics.current.clickThroughRate}
          previousValue={analytics.previous.clickThroughRate}
          icon={Search}
          format="percent"
        />
        <MetricCard
          title="Inquiries"
          value={analytics.current.inquiries}
          previousValue={analytics.previous.inquiries}
          icon={MessageSquare}
        />
      </div>

      {/* Metric Charts - Full Width */}
      <div className="space-y-6">
        <AnalyticsMetricCard
          title="Page Views"
          total={analytics.current.views}
          trend={calculateTrend(analytics.current.views, analytics.previous.views)}
          data={analytics.timeSeries.views}
        />
        <AnalyticsMetricCard
          title="Search Impressions"
          total={analytics.current.searchImpressions}
          trend={calculateTrend(
            analytics.current.searchImpressions,
            analytics.previous.searchImpressions
          )}
          data={analytics.timeSeries.impressions}
        />
        <AnalyticsMetricCard
          title="Search Clicks"
          total={analytics.current.searchClicks}
          trend={calculateTrend(
            analytics.current.searchClicks,
            analytics.previous.searchClicks
          )}
          data={analytics.timeSeries.clicks}
        />
      </div>

      {/* Click-through Rate with Benchmark */}
      <ClickThroughRateCard
        currentCTR={analytics.current.clickThroughRate}
        previousCTR={analytics.previous.clickThroughRate}
      />

      {/* Traffic Sources */}
      <TrafficSources sources={analytics.topSources} />

      {/* Location Analytics */}
      <LocationAnalyticsSection
        locations={locationData}
        selectedLocationIds={selectedLocationIds}
      />

      <DemoCTABanner />
    </div>
  );
}

// Simple metric card for the overview section
interface MetricCardProps {
  title: string;
  value: number;
  previousValue: number;
  icon: React.ElementType;
  format?: "number" | "percent";
}

function MetricCard({
  title,
  value,
  previousValue,
  icon: Icon,
  format = "number",
}: MetricCardProps) {
  const change = previousValue
    ? ((value - previousValue) / previousValue) * 100
    : 0;
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-[#5788FF]" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {format === "percent" ? `${value.toFixed(1)}%` : value.toLocaleString()}
        </div>
        {!isNeutral && (
          <p
            className={cn(
              "mt-1 flex items-center gap-1 text-xs",
              isPositive ? "text-emerald-600" : "text-red-600"
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(change).toFixed(1)}% from previous period
          </p>
        )}
      </CardContent>
    </Card>
  );
}

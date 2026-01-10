"use client";

import { useEffect, useState, useTransition } from "react";
import { Eye, MessageSquare, MousePointer, Search, TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsTimeFilter } from "@/components/dashboard/analytics-time-filter";
import { AnalyticsLocationFilter, type LocationOption } from "@/components/dashboard/analytics-location-filter";
import { AnalyticsMetricCard } from "@/components/dashboard/analytics-metric-card";
import { ClickThroughRateCard } from "@/components/dashboard/click-through-rate-card";
import { TrafficSources, TrafficSourcesSkeleton } from "@/components/dashboard/traffic-sources";
import { LocationAnalyticsSection } from "@/components/dashboard/location-analytics-section";
import { getListingAnalytics, getLocationAnalytics } from "@/lib/actions/analytics";
import type { TimePeriod, DashboardMetrics, LocationAnalytics, ListingMetrics } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

export function AnalyticsClient() {
  const [period, setPeriod] = useState<TimePeriod>("month");
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [locationData, setLocationData] = useState<LocationAnalytics[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Track if we've initialized location selection
  const [isInitialized, setIsInitialized] = useState(false);

  // Load location data on mount and when period changes
  useEffect(() => {
    startTransition(async () => {
      try {
        const locationResult = await getLocationAnalytics(period);
        if (locationResult?.success) {
          setLocationData(locationResult.data);
          // Initialize selection to all locations on first load
          if (!isInitialized && locationResult.data.length > 0) {
            setSelectedLocationIds(locationResult.data.map((l) => l.locationId));
            setIsInitialized(true);
          }
        }
      } catch {
        // Silently handle - location data is optional enhancement
      }
    });
  }, [period, isInitialized]);

  // Load metrics when period or location selection changes
  useEffect(() => {
    if (!isInitialized) return; // Wait for location initialization

    startTransition(async () => {
      setError(null);

      try {
        // Pass selected locationIds to filter the metrics
        const metricsResult = await getListingAnalytics(
          period,
          selectedLocationIds.length > 0 ? selectedLocationIds : undefined
        );

        if (!metricsResult) {
          setError("Failed to load analytics data");
          return;
        }

        if (!metricsResult.success) {
          setError(metricsResult.error);
          return;
        }

        setMetrics(metricsResult.data);
      } catch {
        setError("Failed to load analytics data");
      }
    });
  }, [period, selectedLocationIds, isInitialized]);

  // Build location options for filter
  const locationOptions: LocationOption[] = locationData.map((loc) => ({
    id: loc.locationId,
    label: loc.label,
    city: loc.city,
    state: loc.state,
  }));

  if (error) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <PageHeader
          period={period}
          onPeriodChange={setPeriod}
          locationOptions={[]}
          selectedLocationIds={[]}
          onLocationChange={() => {}}
        />
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        period={period}
        onPeriodChange={setPeriod}
        locationOptions={locationOptions}
        selectedLocationIds={selectedLocationIds}
        onLocationChange={setSelectedLocationIds}
      />

      {isPending || !metrics ? (
        <AnalyticsSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Overview Cards */}
          <OverviewCards current={metrics.current} previous={metrics.previous} />

          {/* Metric Charts - Full Width */}
          <div className="space-y-6">
            <AnalyticsMetricCard
              title="Page Views"
              total={metrics.current.views}
              trend={calculateTrend(metrics.current.views, metrics.previous.views)}
              data={metrics.timeSeries.views}
            />
            <AnalyticsMetricCard
              title="Search Impressions"
              total={metrics.current.searchImpressions}
              trend={calculateTrend(metrics.current.searchImpressions, metrics.previous.searchImpressions)}
              data={metrics.timeSeries.impressions}
            />
            <AnalyticsMetricCard
              title="Search Clicks"
              total={metrics.current.searchClicks}
              trend={calculateTrend(metrics.current.searchClicks, metrics.previous.searchClicks)}
              data={metrics.timeSeries.clicks}
            />
          </div>

          {/* Click-through Rate with Benchmark */}
          <ClickThroughRateCard
            currentCTR={metrics.current.clickThroughRate}
            previousCTR={metrics.previous.clickThroughRate}
          />

          {/* Traffic Sources */}
          <TrafficSources sources={metrics.topSources} />

          {/* Location Analytics */}
          {locationData.length > 0 && (
            <LocationAnalyticsSection
              locations={locationData}
              selectedLocationIds={selectedLocationIds}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface PageHeaderProps {
  period: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  locationOptions: LocationOption[];
  selectedLocationIds: string[];
  onLocationChange: (ids: string[]) => void;
}

function PageHeader({
  period,
  onPeriodChange,
  locationOptions,
  selectedLocationIds,
  onLocationChange,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Performance Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
          Track how potential clients discover and interact with your listing.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <AnalyticsTimeFilter value={period} onChange={onPeriodChange} />
        {locationOptions.length > 1 && (
          <AnalyticsLocationFilter
            locations={locationOptions}
            selectedIds={selectedLocationIds}
            onChange={onLocationChange}
          />
        )}
      </div>
    </div>
  );
}

interface OverviewCardsProps {
  current: ListingMetrics;
  previous: ListingMetrics;
}

function OverviewCards({ current, previous }: OverviewCardsProps) {
  // Calculate impressions excluding bots
  const botImpressions = current.botImpressions || 0;
  const prevBotImpressions = previous.botImpressions || 0;
  const impressionsExcludingBots = (current.searchImpressions || 0) - botImpressions;
  const prevImpressionsExcludingBots = (previous.searchImpressions || 0) - prevBotImpressions;

  const metrics = [
    {
      title: "Page Views",
      value: current.views,
      previousValue: previous.views,
      icon: Eye,
      format: "number" as const,
      subtitle: undefined as string | undefined,
    },
    {
      title: "Search Impressions",
      value: impressionsExcludingBots,
      previousValue: prevImpressionsExcludingBots,
      icon: Search,
      format: "number" as const,
      subtitle: botImpressions > 0
        ? `${botImpressions.toLocaleString()} bot visits excluded`
        : undefined,
    },
    {
      title: "Click-through Rate",
      value: current.clickThroughRate,
      previousValue: previous.clickThroughRate,
      icon: MousePointer,
      format: "percent" as const,
      subtitle: undefined as string | undefined,
    },
    {
      title: "Inquiries",
      value: current.inquiries,
      previousValue: previous.inquiries,
      icon: MessageSquare,
      format: "number" as const,
      subtitle: undefined as string | undefined,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const change = metric.previousValue
          ? ((metric.value - metric.previousValue) / metric.previousValue) * 100
          : 0;
        const isPositive = change > 0;
        const isNeutral = change === 0;

        return (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metric.format === "percent"
                  ? `${metric.value.toFixed(1)}%`
                  : metric.value.toLocaleString()}
              </div>
              {metric.subtitle && (
                <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
              )}
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
      })}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Overview skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-4 w-4 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 rounded bg-muted" />
              <div className="mt-2 h-3 w-32 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts skeleton - Full Width */}
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="mt-2 h-8 w-16 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-32 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Traffic sources skeleton */}
      <TrafficSourcesSkeleton />

      {/* Location skeleton */}
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 w-40 rounded bg-muted" />
          <div className="mt-2 h-4 w-60 rounded bg-muted" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded bg-muted" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function calculateTrend(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

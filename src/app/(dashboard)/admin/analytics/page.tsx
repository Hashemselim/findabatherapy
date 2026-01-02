"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Users,
  UserPlus,
  Eye,
  Search,
  MessageSquare,
  MousePointerClick,
  TrendingUp,
  BarChart3,
  Target,
  AlertTriangle,
  CreditCard,
  Loader2,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDateFilter, getDateRangeFromPreset, type DatePreset, type DateRange } from "@/components/admin/admin-date-filter";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { AdminBarChart } from "@/components/admin/admin-bar-chart";
import { AdminLineChart } from "@/components/admin/admin-line-chart";
import { AdminConversionFunnel } from "@/components/admin/admin-conversion-funnel";
import { AdminExportButton } from "@/components/admin/admin-export-button";
import { AdminCustomerFunnel } from "@/components/admin/admin-customer-funnel";
import { AdminCustomerList } from "@/components/admin/admin-customer-list";
import { STATE_NAMES } from "@/lib/data/cities";

// Skeleton components for loading states
function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ height = "h-[300px]" }: { height?: string }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className={`w-full ${height}`} />
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
import {
  getCustomerMetrics,
  getOnboardingMetrics,
  getCustomersByState,
  getSearchAnalytics,
  getAnalyticsTimeSeries,
  getConversionMetrics,
  getCustomerConversionFunnel,
  type CustomerMetrics,
  type OnboardingMetrics,
  type CustomersByState,
  type SearchAnalytics,
  type AnalyticsTimeSeries,
  type ConversionMetrics,
  type CustomerConversionFunnel,
  type DateRange as AdminDateRange,
} from "@/lib/actions/admin";

export default function AdminAnalyticsPage() {
  const [datePreset, setDatePreset] = useState<DatePreset>("30d");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [isPending, startTransition] = useTransition();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Data states
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics | null>(null);
  const [onboardingMetrics, setOnboardingMetrics] = useState<OnboardingMetrics | null>(null);
  const [customersByState, setCustomersByState] = useState<CustomersByState[]>([]);
  const [searchAnalytics, setSearchAnalytics] = useState<SearchAnalytics | null>(null);
  const [timeSeries, setTimeSeries] = useState<AnalyticsTimeSeries | null>(null);
  const [conversionMetrics, setConversionMetrics] = useState<ConversionMetrics | null>(null);
  const [customerFunnel, setCustomerFunnel] = useState<CustomerConversionFunnel | null>(null);

  const dateRange = getDateRangeFromPreset(datePreset, customDateRange);

  // Convert to admin date range format
  const adminDateRange: AdminDateRange | undefined = dateRange
    ? { start: dateRange.start, end: dateRange.end }
    : undefined;

  const handleDateChange = (preset: DatePreset, customRange?: DateRange) => {
    setDatePreset(preset);
    setCustomDateRange(customRange);
  };

  // Load data on mount and when date range changes
  useEffect(() => {
    startTransition(async () => {
      const [
        customerResult,
        onboardingResult,
        statesResult,
        searchResult,
        timeSeriesResult,
        conversionResult,
        customerFunnelResult,
      ] = await Promise.all([
        getCustomerMetrics(),
        getOnboardingMetrics(),
        getCustomersByState(),
        getSearchAnalytics(adminDateRange),
        getAnalyticsTimeSeries(adminDateRange),
        getConversionMetrics(adminDateRange),
        getCustomerConversionFunnel(),
      ]);

      if (customerResult.success && customerResult.data) {
        setCustomerMetrics(customerResult.data);
      }
      if (onboardingResult.success && onboardingResult.data) {
        setOnboardingMetrics(onboardingResult.data);
      }
      if (statesResult.success && statesResult.data) {
        setCustomersByState(statesResult.data);
      }
      if (searchResult.success && searchResult.data) {
        setSearchAnalytics(searchResult.data);
      }
      if (timeSeriesResult.success && timeSeriesResult.data) {
        setTimeSeries(timeSeriesResult.data);
      }
      if (conversionResult.success && conversionResult.data) {
        setConversionMetrics(conversionResult.data);
      }
      if (customerFunnelResult.success && customerFunnelResult.data) {
        setCustomerFunnel(customerFunnelResult.data);
      }

      // Mark initial load as complete
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    });
  }, [datePreset, customDateRange, isInitialLoad]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor platform performance, customer growth, and visitor engagement
          </p>
        </div>
        <AdminExportButton dateRange={adminDateRange} />
      </div>

      {/* Date Filter with Loading Indicator */}
      <div className="flex items-center gap-4">
        <AdminDateFilter
          value={datePreset}
          customRange={customDateRange}
          onChange={handleDateChange}
        />
        {isPending && !isInitialLoad && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Updating data...</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="customers" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customer Analytics
          </TabsTrigger>
          <TabsTrigger value="visitors" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Visitor Analytics
          </TabsTrigger>
        </TabsList>

        {/* ==================== CUSTOMER ANALYTICS TAB ==================== */}
        <TabsContent value="customers" className="space-y-8">
          {/* Overview Cards */}
          <div className={`space-y-4 transition-opacity duration-200 ${isPending && !isInitialLoad ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Customer Overview</h2>
            </div>

            {isInitialLoad ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <AdminMetricCard
                  title="Total Customers"
                  value={customerMetrics?.totalCustomers || 0}
                  icon={<Users className="h-4 w-4 text-blue-600" />}
                />
                {customerMetrics?.byTier.map((tier) => (
                  <AdminMetricCard
                    key={tier.tier}
                    title={`${tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1)} Tier`}
                    value={tier.count}
                    subtitle={
                      customerMetrics.totalCustomers > 0
                        ? `${((tier.count / customerMetrics.totalCustomers) * 100).toFixed(0)}% of total`
                        : undefined
                    }
                    icon={
                      tier.tier === "free" ? (
                        <Users className="h-4 w-4 text-gray-500" />
                      ) : tier.tier === "pro" ? (
                        <CreditCard className="h-4 w-4 text-blue-600" />
                      ) : (
                        <CreditCard className="h-4 w-4 text-purple-600" />
                      )
                    }
                    valueClassName={
                      tier.tier === "enterprise"
                        ? "text-purple-600"
                        : tier.tier === "pro"
                          ? "text-blue-600"
                          : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Signups & Onboarding */}
          <div className={`space-y-4 transition-opacity duration-200 ${isPending && !isInitialLoad ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Growth & Onboarding</h2>
            </div>

            {isInitialLoad ? (
              <div className="grid gap-4 md:grid-cols-2">
                <ChartSkeleton height="h-[120px]" />
                <ChartSkeleton height="h-[120px]" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">New Signups</CardTitle>
                    <CardDescription>Customer registrations over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">{customerMetrics?.todaySignups || 0}</div>
                        <div className="text-xs text-muted-foreground">Today</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{customerMetrics?.weekSignups || 0}</div>
                        <div className="text-xs text-muted-foreground">This Week</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{customerMetrics?.monthSignups || 0}</div>
                        <div className="text-xs text-muted-foreground">This Month</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Onboarding Status</CardTitle>
                    <CardDescription>Customer activation metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {onboardingMetrics?.completedOnboarding || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Completed</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-amber-600">
                          {onboardingMetrics?.pendingOnboarding || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Pending</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {onboardingMetrics?.completionRate?.toFixed(0) || 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">Completion Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Customer Conversion Funnel */}
          <div className={`space-y-4 transition-opacity duration-200 ${isPending && !isInitialLoad ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Customer Journey & Conversion</h2>
            </div>

            {isInitialLoad ? (
              <div className="grid gap-4 md:grid-cols-2">
                <ChartSkeleton height="h-[280px]" />
                <div className="space-y-4">
                  <ChartSkeleton height="h-[100px]" />
                  <ChartSkeleton height="h-[100px]" />
                </div>
              </div>
            ) : (
              customerFunnel && <AdminCustomerFunnel data={customerFunnel} />
            )}
          </div>

          {/* Customers by State */}
          <div className={`space-y-4 transition-opacity duration-200 ${isPending && !isInitialLoad ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Geographic Distribution</h2>
            </div>

            {isInitialLoad ? (
              <TableSkeleton rows={8} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Customers by State</CardTitle>
                  <CardDescription>Customer distribution and listing activity per state</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[300px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>State</TableHead>
                          <TableHead className="text-right">Customers</TableHead>
                          <TableHead className="text-right">Listings</TableHead>
                          <TableHead className="text-right">Featured</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customersByState.slice(0, 15).map((item) => (
                          <TableRow key={item.state}>
                            <TableCell className="font-medium">
                              {STATE_NAMES[item.state] || item.state}
                            </TableCell>
                            <TableCell className="text-right">{item.customers}</TableCell>
                            <TableCell className="text-right">{item.listings}</TableCell>
                            <TableCell className="text-right text-amber-600">
                              {item.featuredLocations}
                            </TableCell>
                          </TableRow>
                        ))}
                        {customersByState.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="py-4 text-center text-muted-foreground">
                              No customer data yet
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* All Customers List */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">All Customers</h2>
            </div>

            <AdminCustomerList />
          </div>
        </TabsContent>

        {/* ==================== VISITOR ANALYTICS TAB ==================== */}
        <TabsContent value="visitors" className="space-y-8">
          {/* Traffic Overview */}
          <div className={`space-y-4 transition-opacity duration-200 ${isPending && !isInitialLoad ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Traffic Overview</h2>
            </div>

            {isInitialLoad ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <AdminMetricCard
                  title="Page Views"
                  value={conversionMetrics?.views || 0}
                  subtitle="Provider page views"
                  icon={<Eye className="h-4 w-4 text-blue-600" />}
                />
                <AdminMetricCard
                  title="Searches"
                  value={conversionMetrics?.searches || 0}
                  subtitle="Search queries performed"
                  icon={<Search className="h-4 w-4 text-purple-600" />}
                />
                <AdminMetricCard
                  title="Inquiries"
                  value={conversionMetrics?.inquiries || 0}
                  subtitle="Contact form submissions"
                  icon={<MessageSquare className="h-4 w-4 text-green-600" />}
                />
                <AdminMetricCard
                  title="Click-through Rate"
                  value={`${conversionMetrics?.searchToClickRate?.toFixed(1) || 0}%`}
                  subtitle="Search to click conversion"
                  icon={<MousePointerClick className="h-4 w-4 text-orange-600" />}
                />
              </div>
            )}
          </div>

          {/* Activity Over Time */}
          <div className={`space-y-4 transition-opacity duration-200 ${isPending && !isInitialLoad ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Activity Over Time</h2>
            </div>

            {isInitialLoad ? (
              <ChartSkeleton height="h-[350px]" />
            ) : timeSeries ? (
              <AdminLineChart
                title="Daily Activity Trends"
                description="Track views, searches, inquiries, and signups over time"
                series={[
                  { key: "views", label: "Page Views", data: timeSeries.views, color: "#3b82f6" },
                  { key: "searches", label: "Searches", data: timeSeries.searches, color: "#8b5cf6" },
                  { key: "inquiries", label: "Inquiries", data: timeSeries.inquiries, color: "#22c55e" },
                  { key: "signups", label: "Signups", data: timeSeries.signups, color: "#f59e0b" },
                ]}
              />
            ) : null}
          </div>

          {/* Visitor Conversion Funnel */}
          <div className={`space-y-4 transition-opacity duration-200 ${isPending && !isInitialLoad ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Visitor Conversion Funnel</h2>
            </div>

            {isInitialLoad ? (
              <ChartSkeleton height="h-[200px]" />
            ) : conversionMetrics ? (
              <AdminConversionFunnel
                title="Search to Inquiry Journey"
                description="How visitors progress from search to contacting a provider"
                steps={[
                  { label: "Searches", value: conversionMetrics.searches, color: "bg-purple-500" },
                  { label: "Impressions", value: conversionMetrics.impressions, color: "bg-blue-500" },
                  { label: "Clicks", value: conversionMetrics.clicks, color: "bg-cyan-500" },
                  { label: "Page Views", value: conversionMetrics.views, color: "bg-green-500" },
                  { label: "Inquiries", value: conversionMetrics.inquiries, color: "bg-emerald-500" },
                ]}
              />
            ) : null}
          </div>

          {/* Search Insights */}
          <div className={`space-y-4 transition-opacity duration-200 ${isPending && !isInitialLoad ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Search Insights</h2>
            </div>

            {isInitialLoad ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <ChartSkeleton height="h-[250px]" />
                  <ChartSkeleton height="h-[250px]" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <ChartSkeleton height="h-[200px]" />
                  <TableSkeleton rows={6} />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminBarChart
                    title="Searches by State"
                    description="Most searched geographic locations"
                    data={
                      searchAnalytics?.byState.map((item) => ({
                        label: STATE_NAMES[item.state] || item.state,
                        value: item.count,
                        color: "bg-blue-500",
                      })) || []
                    }
                    maxItems={10}
                  />

                  <AdminBarChart
                    title="Searches by Insurance"
                    description="Most searched insurance providers"
                    data={
                      searchAnalytics?.byInsurance.map((item) => ({
                        label: item.insurance,
                        value: item.count,
                        color: "bg-purple-500",
                      })) || []
                    }
                    maxItems={10}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <AdminBarChart
                    title="Searches by Service Mode"
                    description="In-home, center-based, telehealth preferences"
                    data={
                      searchAnalytics?.byServiceMode.map((item) => ({
                        label: item.mode,
                        value: item.count,
                        color: "bg-cyan-500",
                      })) || []
                    }
                  />

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Top Search Queries</CardTitle>
                      <CardDescription>Most frequently searched terms</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {searchAnalytics?.topQueries.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">No search data yet</p>
                      ) : (
                        <div className="space-y-2">
                          {searchAnalytics?.topQueries.slice(0, 10).map((item, index) => (
                            <div key={item.query} className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <span className="text-muted-foreground">{index + 1}.</span>
                                <span className="truncate font-medium">&quot;{item.query}&quot;</span>
                              </span>
                              <span className="text-muted-foreground">{item.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>

          {/* Zero Result Searches */}
          <div className={`space-y-4 transition-opacity duration-200 ${isPending && !isInitialLoad ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h2 className="text-xl font-semibold">Content Gaps</h2>
            </div>

            {isInitialLoad ? (
              <TableSkeleton rows={6} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Zero Result Searches</CardTitle>
                  <CardDescription>
                    Searches that returned no results - opportunities for coverage expansion
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {searchAnalytics?.zeroResultSearches.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No zero-result searches found - great coverage!
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Search Query</TableHead>
                          <TableHead>State Filter</TableHead>
                          <TableHead className="text-right">Occurrences</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchAnalytics?.zeroResultSearches.slice(0, 10).map((item, index) => (
                          <TableRow key={`${item.query}-${item.state}-${index}`}>
                            <TableCell className="font-medium">{item.query}</TableCell>
                            <TableCell>
                              {item.state ? STATE_NAMES[item.state.toUpperCase()] || item.state : "-"}
                            </TableCell>
                            <TableCell className="text-right">{item.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

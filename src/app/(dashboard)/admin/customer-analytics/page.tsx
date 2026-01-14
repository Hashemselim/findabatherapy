"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Users,
  UserPlus,
  TrendingUp,
  BarChart3,
  Target,
  CreditCard,
  Loader2,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  getCustomerConversionFunnel,
  type CustomerMetrics,
  type OnboardingMetrics,
  type CustomersByState,
  type CustomerConversionFunnel,
  type DateRange as AdminDateRange,
} from "@/lib/actions/admin";

export default function CustomerAnalyticsPage() {
  const [datePreset, setDatePreset] = useState<DatePreset>("30d");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [isPending, startTransition] = useTransition();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Data states
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics | null>(null);
  const [onboardingMetrics, setOnboardingMetrics] = useState<OnboardingMetrics | null>(null);
  const [customersByState, setCustomersByState] = useState<CustomersByState[]>([]);
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
        customerFunnelResult,
      ] = await Promise.all([
        getCustomerMetrics(),
        getOnboardingMetrics(),
        getCustomersByState(),
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
          <h1 className="text-3xl font-bold">Customer Analytics</h1>
          <p className="text-muted-foreground">
            Monitor customer growth, onboarding, and geographic distribution
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
    </div>
  );
}

import Link from "next/link";
import {
  Database,
  FileX,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Search,
  MessageSquare,
  MousePointerClick,
  MapPin,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAdminStats, getListingsPerState, getApplicationAnalytics } from "@/lib/actions/admin";
import { SortableStateTable } from "@/components/admin/sortable-state-table";

export default async function AdminDashboardPage() {
  const [statsResult, stateListingsResult, analyticsResult] = await Promise.all([
    getAdminStats(),
    getListingsPerState(),
    getApplicationAnalytics(),
  ]);

  if (!statsResult.success || !statsResult.data) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600">Error loading stats: {statsResult.error}</p>
      </div>
    );
  }

  const stats = statsResult.data;
  const stateListings = stateListingsResult.success ? stateListingsResult.data || [] : [];
  const analytics = analyticsResult.success ? analyticsResult.data : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Application analytics and directory management
        </p>
      </div>

      {/* Application Analytics Section */}
      {analytics && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Application Analytics</h2>
          </div>

          {/* Analytics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Page Views</CardTitle>
                <Eye className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalViews.toLocaleString()}</div>
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  <p>Today: {analytics.todayViews.toLocaleString()}</p>
                  <p>This week: {analytics.weekViews.toLocaleString()}</p>
                  <p>This month: {analytics.monthViews.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Searches</CardTitle>
                <Search className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalSearches.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Confirmed browser visits only
                </p>
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  <p>Today: {analytics.todaySearches.toLocaleString()}</p>
                  <p>This week: {analytics.weekSearches.toLocaleString()}</p>
                  <p>This month: {analytics.monthSearches.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Inquiries</CardTitle>
                <MessageSquare className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalInquiries.toLocaleString()}</div>
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  <p>Today: {analytics.todayInquiries.toLocaleString()}</p>
                  <p>This week: {analytics.weekInquiries.toLocaleString()}</p>
                  <p>This month: {analytics.monthInquiries.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Contact Clicks</CardTitle>
                <MousePointerClick className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalContactClicks.toLocaleString()}</div>
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  <p>Today: {analytics.todayContactClicks.toLocaleString()}</p>
                  <p>This week: {analytics.weekContactClicks.toLocaleString()}</p>
                  <p>This month: {analytics.monthContactClicks.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Directory Stats Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Directory Overview</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Directory Listings</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGooglePlacesListings}</div>
              <p className="text-xs text-muted-foreground">
                Pre-populated from Google
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeGooglePlacesListings}</div>
              <p className="text-xs text-muted-foreground">
                Visible in search results
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Removed Listings</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.removedGooglePlacesListings}</div>
              <p className="text-xs text-muted-foreground">
                Hidden after claim approval
              </p>
            </CardContent>
          </Card>

          <Card className={stats.pendingRemovalRequests > 0 ? "border-amber-300 bg-amber-50/50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <AlertCircle className={`h-4 w-4 ${stats.pendingRemovalRequests > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingRemovalRequests}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting review
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Listings by State Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Listings by State</CardTitle>
              <CardDescription>
                Breakdown of real (claimed) vs scraped (Google Places) listings per state. Click column headers to sort.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SortableStateTable data={stateListings} />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button asChild>
            <Link href="/admin/removal-requests">
              <FileX className="mr-2 h-4 w-4" />
              Review Removal Requests
              {stats.pendingRemovalRequests > 0 && (
                <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
                  {stats.pendingRemovalRequests}
                </span>
              )}
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Removal Request Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Removal Request History</CardTitle>
          <CardDescription>Overview of all removal requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.totalRemovalRequests}</div>
              <div className="text-sm text-muted-foreground">Total Requests</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {stats.removedGooglePlacesListings}
              </div>
              <div className="text-sm text-muted-foreground">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-600">
                {stats.pendingRemovalRequests}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {stats.totalRemovalRequests - stats.removedGooglePlacesListings - stats.pendingRemovalRequests}
              </div>
              <div className="text-sm text-muted-foreground">Denied</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

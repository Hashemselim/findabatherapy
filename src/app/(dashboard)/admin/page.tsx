import Link from "next/link";
import { Database, FileX, CheckCircle, XCircle, AlertCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAdminStats } from "@/lib/actions/admin";

export default async function AdminDashboardPage() {
  const result = await getAdminStats();

  if (!result.success || !result.data) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600">Error loading stats: {result.error}</p>
      </div>
    );
  }

  const stats = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage pre-populated listings and removal requests
        </p>
      </div>

      {/* Stats Grid */}
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

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Request History</CardTitle>
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

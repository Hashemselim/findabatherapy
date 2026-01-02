import Link from "next/link";
import { CheckCircle2, Eye, MapPin, MessageSquare, Sparkles, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DemoCTABanner } from "@/components/demo/demo-cta-banner";
import {
  DEMO_LISTING,
  DEMO_ANALYTICS,
  DEMO_INQUIRIES,
  DEMO_QUICK_STATS,
} from "@/lib/demo/data";

export default function DemoOverviewPage() {
  const listing = DEMO_LISTING;
  const unreadCount = DEMO_INQUIRIES.filter((i) => i.status === "unread").length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Overview
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:mt-2">
            Manage your listing, track performance, and connect with families.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full rounded-full sm:w-auto"
          asChild
        >
          <Link href="/demo-preview" target="_blank">
            Preview Listing
            <Eye className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div data-tour="quick-stats" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Listing Status */}
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm text-muted-foreground">Listing Status</p>
            <Eye className="h-4 w-4 text-emerald-500" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">
              Published
            </div>
            <p className="text-xs text-muted-foreground">Visible to families</p>
          </CardContent>
        </Card>

        {/* Plan Tier */}
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm text-muted-foreground">Current Plan</p>
            <Sparkles className="h-4 w-4 text-[#5788FF]" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold capitalize text-foreground">
              Pro
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-[#5788FF]">All features unlocked</span>
            </p>
          </CardContent>
        </Card>

        {/* Locations */}
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm text-muted-foreground">Service Locations</p>
            <MapPin className="h-4 w-4 text-[#5788FF]" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">
              {listing.locations.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {listing.primaryLocation?.city}, {listing.primaryLocation?.state}
            </p>
          </CardContent>
        </Card>

        {/* Inquiries */}
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm text-muted-foreground">New Inquiries</p>
            <MessageSquare className="h-4 w-4 text-[#5788FF]" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">
              {unreadCount}
            </div>
            <p className="text-xs text-muted-foreground">
              <Link href="/demo/inbox" className="text-[#5788FF] hover:underline">
                View inbox
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Published Listing Banner */}
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="flex flex-row items-center gap-3 py-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <div>
            <CardTitle className="text-base text-emerald-900">
              Your listing is live!
            </CardTitle>
            <CardDescription>
              Families can find you at{" "}
              <Link
                href="/demo-preview"
                target="_blank"
                className="text-[#5788FF] hover:underline"
              >
                findabatherapy.com/provider/{listing.slug}
              </Link>
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {/* Analytics Preview */}
      <Card data-tour="analytics" className="border-border/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Analytics (Last 30 days)</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/demo/analytics">
                View Details
                <TrendingUp className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Page Views</p>
              <p className="text-2xl font-semibold">
                {DEMO_ANALYTICS.current.views.toLocaleString()}
              </p>
              <p className="text-xs text-emerald-600">
                +{DEMO_QUICK_STATS.viewsChange}% from last period
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Search Impressions</p>
              <p className="text-2xl font-semibold">
                {DEMO_ANALYTICS.current.searchImpressions.toLocaleString()}
              </p>
              <p className="text-xs text-emerald-600">+22% from last period</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Click-through Rate</p>
              <p className="text-2xl font-semibold">
                {DEMO_ANALYTICS.current.clickThroughRate}%
              </p>
              <p className="text-xs text-emerald-600">+0.2% from last period</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inquiries</p>
              <p className="text-2xl font-semibold">
                {DEMO_ANALYTICS.current.inquiries}
              </p>
              <p className="text-xs text-emerald-600">
                +{DEMO_QUICK_STATS.inquiriesChange}% from last period
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Featured Upsell */}
      <Card
        data-tour="featured-badge"
        className="border-amber-500/30 bg-gradient-to-r from-amber-50 to-yellow-50"
      >
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Featured Location Active</CardTitle>
          </div>
          <CardDescription>
            Your Los Angeles location is featured and appears at the top of
            search results for that area.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Featured listings get up to <strong>3x more visibility</strong> in
              search results
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/demo/locations">Manage Featured Locations</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Demo CTA */}
      <DemoCTABanner />
    </div>
  );
}

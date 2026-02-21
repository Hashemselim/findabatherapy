import Link from "next/link";
import { Eye, EyeOff, MapPin, MessageSquare, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ListingWithRelations } from "@/lib/actions/listings";

interface QuickStatsProps {
  listing: ListingWithRelations;
  isPaidPlan: boolean;
  inquiryCount?: number;
}

export function QuickStats({ listing, isPaidPlan, inquiryCount }: QuickStatsProps) {
  const isPublished = listing.status === "published";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Listing Status */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <p className="text-sm text-muted-foreground">Listing Status</p>
          {isPublished ? (
            <Eye className="h-4 w-4 text-emerald-500" aria-hidden />
          ) : (
            <EyeOff className="h-4 w-4 text-amber-500" aria-hidden />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold text-foreground">
            {isPublished ? "Published" : "Draft"}
          </div>
          <p className="text-xs text-muted-foreground">
            {isPublished ? "Visible to families" : "Complete setup to publish"}
          </p>
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
            {isPaidPlan ? listing.profile.planTier : "Free"}
          </div>
          <p className="text-xs text-muted-foreground">
            <Link
              href="/dashboard/billing"
              className="text-[#5788FF] hover:underline"
            >
              {isPaidPlan ? "Manage subscription" : "Upgrade for more"}
            </Link>
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
            {listing.primaryLocation
              ? `${listing.primaryLocation.city}, ${listing.primaryLocation.state}`
              : "Add a location"}
          </p>
        </CardContent>
      </Card>

      {/* Inquiries - Pro only */}
      {isPaidPlan && (
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm text-muted-foreground">New Inquiries</p>
            <MessageSquare className="h-4 w-4 text-[#5788FF]" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">
              {inquiryCount ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              <Link
                href="/dashboard/notifications"
                className="text-[#5788FF] hover:underline"
              >
                View notifications
              </Link>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

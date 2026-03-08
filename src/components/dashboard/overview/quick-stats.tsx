import Link from "next/link";
import { Eye, EyeOff, MapPin, MessageSquare, Sparkles } from "lucide-react";

import { DashboardStatCard } from "@/components/dashboard/ui";
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
      <DashboardStatCard
        label="Listing Status"
        value={isPublished ? "Published" : "Draft"}
        tone={isPublished ? "success" : "warning"}
        icon={isPublished ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
        description={isPublished ? "Visible to families" : "Complete setup to publish"}
      />

      <DashboardStatCard
        label="Current Plan"
        value={<span className="capitalize">{isPaidPlan ? listing.profile.planTier : "Free"}</span>}
        tone="info"
        icon={<Sparkles className="h-4 w-4" aria-hidden />}
        description={(
          <Link href="/dashboard/billing" className="text-primary hover:underline">
            {isPaidPlan ? "Manage subscription" : "Upgrade for more"}
          </Link>
        )}
      />

      <DashboardStatCard
        label="Service Locations"
        value={listing.locations.length}
        tone="info"
        icon={<MapPin className="h-4 w-4" aria-hidden />}
        description={
          listing.primaryLocation
            ? `${listing.primaryLocation.city}, ${listing.primaryLocation.state}`
            : "Add a location"
        }
      />

      {isPaidPlan && (
        <DashboardStatCard
          label="New Inquiries"
          value={inquiryCount ?? 0}
          tone="info"
          icon={<MessageSquare className="h-4 w-4" aria-hidden />}
          description={(
            <Link href="/dashboard/notifications" className="text-primary hover:underline">
              View notifications
            </Link>
          )}
        />
      )}
    </div>
  );
}

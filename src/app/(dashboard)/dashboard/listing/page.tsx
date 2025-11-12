import { Lock } from "lucide-react";

import { ListingOnboarding } from "@/components/dashboard/listing-onboarding";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardListingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Listing details</h1>
        <p className="mt-2 text-sm text-slate-300">
          Update company information, service offerings, and rich media. Locked fields highlight Premium features and
          prompt upgrades.
        </p>
      </div>

      <ListingOnboarding />

      <Card className="border-white/10 bg-white/5">
        <CardHeader className="flex flex-row items-center gap-3">
          <Lock className="h-5 w-5 text-primary" aria-hidden />
          <div>
            <CardTitle className="text-white">Upgrade to unlock media enhancements</CardTitle>
            <CardDescription className="text-slate-300">
              Premium listings can add galleries, videos, and advanced styling for higher conversion rates.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-slate-300">
          Head to the billing tab to activate Premium or Featured plans. Upgrades apply instantly to your live listing.
        </CardContent>
      </Card>
    </div>
  );
}

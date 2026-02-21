import Link from "next/link";
import { ExternalLink, Copy, Eye, ArrowRight, Lock } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getListingSlug } from "@/lib/actions/listings";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { CopyUrlButton } from "./copy-url-button";

export default async function BrandedPageManagement() {
  const [slug, planTier] = await Promise.all([
    getListingSlug(),
    getCurrentPlanTier(),
  ]);

  const isPremium = planTier === "pro" || planTier === "enterprise";
  const brandedPageUrl = slug ? `https://www.findabatherapy.org/p/${slug}` : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Branded Agency Page</h1>
        <p className="mt-1 text-muted-foreground">
          Your professional, shareable page for referral partners, doctors, and families.
        </p>
      </div>

      {!slug ? (
        <Card className="border-border/60">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Complete your profile and publish your listing to activate your branded page.
            </p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/dashboard/settings/profile">
                Go to Company Profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Page URL and Actions */}
          <Card className="border-border/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Your Page URL
                    {isPremium ? (
                      <Badge variant="outline" className="gap-1 border-emerald-500/50 bg-emerald-50 text-emerald-700">
                        Live
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 border-amber-500/50 bg-amber-50 text-amber-700">
                        <Lock className="h-3 w-3" />
                        Basic
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Share this link with referral sources, doctors, schools, and families.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* URL Display */}
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                <code className="flex-1 truncate text-sm font-medium">
                  {brandedPageUrl}
                </code>
                <CopyUrlButton url={brandedPageUrl!} />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link href={`/p/${slug}`} target="_blank">
                    <Eye className="mr-2 h-4 w-4" />
                    Preview Page
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <a href={`/p/${slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in New Tab
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* How it works */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your branded page is automatically generated from your profile information.
                To change what appears on the page, update your profile details.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/dashboard/settings/profile"
                  className="rounded-lg border border-border/60 p-4 transition-colors hover:bg-muted/50"
                >
                  <p className="font-medium text-foreground">Edit Company Profile</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Update your agency name, description, logo, and more.
                  </p>
                </Link>
                <Link
                  href="/dashboard/settings/locations"
                  className="rounded-lg border border-border/60 p-4 transition-colors hover:bg-muted/50"
                >
                  <p className="font-medium text-foreground">Manage Locations</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add or edit your service locations.
                  </p>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Upgrade prompt for free users */}
          {!isPremium && (
            <Card className="border-[#5788FF]/20 bg-[#5788FF]/[0.03]">
              <CardContent className="py-6">
                <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      Unlock Pro Features on Your Branded Page
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      With Pro, your branded page includes &quot;Contact Us&quot; and &quot;Start Intake&quot;
                      buttons that connect directly to your intake forms — turning referral
                      links into new clients.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/dashboard/settings/billing">
                      Upgrade to Pro
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

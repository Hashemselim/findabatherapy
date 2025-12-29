import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getListing, type ListingWithRelations } from "@/lib/actions/listings";

interface BillingSuccessPageProps {
  searchParams: Promise<{ return_to?: string; session_id?: string; upgraded?: string; downgraded?: string }>;
}

async function getListingData(): Promise<ListingWithRelations | null> {
  try {
    const listingResult = await getListing();
    return listingResult.success ? listingResult.data ?? null : null;
  } catch {
    // If we can't fetch the listing (e.g., auth issue after redirect), continue without it
    return null;
  }
}

export default async function BillingSuccessPage({ searchParams }: BillingSuccessPageProps) {
  const params = await searchParams;

  // If user came from onboarding, redirect back to first step (Practice Details) with payment success
  if (params.return_to === "onboarding") {
    redirect("/dashboard/onboarding/details?payment=success");
  }

  const listing = await getListingData();
  const isUpgrade = params.upgraded === "true";
  const isDowngrade = params.downgraded === "true";

  // Determine title and description based on action type
  let title = "Payment Successful!";
  let description = "Thank you for subscribing. Your listing is now live and visible to families.";

  if (isUpgrade) {
    title = "Plan Upgraded!";
    description = "Your plan has been upgraded. New features are now available.";
  } else if (isDowngrade) {
    title = "Plan Changed";
    description = "Your plan has been changed. You'll keep your current features until the end of your billing period.";
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
            <h3 className="font-medium text-emerald-900 dark:text-emerald-100">What happens next?</h3>
            <ul className="mt-2 space-y-2 text-sm text-emerald-800 dark:text-emerald-200">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                Your listing is now published and searchable
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                Premium features are now unlocked
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                Families can contact you directly through your listing
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="flex-1">
              <Link href="/dashboard">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {listing && (
              <Button variant="outline" asChild className="flex-1">
                <Link href={`/provider/${listing.slug}`} target="_blank">
                  View Live Listing
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            A confirmation email has been sent to your registered email address.
            You can manage your subscription anytime from the billing page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

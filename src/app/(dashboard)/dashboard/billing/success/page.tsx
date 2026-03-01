import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { CheckCircle2, ArrowRight, ExternalLink, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckoutTracker } from "@/components/analytics/checkout-tracker";
import { getListing, type ListingWithRelations } from "@/lib/actions/listings";
import { verifyAndSyncCheckoutSession } from "@/lib/stripe/actions";
import { ADDON_INFO, type AddonType } from "@/lib/plans/addon-config";

interface BillingSuccessPageProps {
  searchParams: Promise<{ return_to?: string; session_id?: string; upgraded?: string; downgraded?: string; addon?: string; quantity?: string }>;
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

  // If we have a session_id, verify and sync the subscription status FIRST
  // This handles the race condition where webhook hasn't processed yet
  // Must happen before any redirects to ensure subscription is synced
  if (params.session_id) {
    await verifyAndSyncCheckoutSession(params.session_id);
  }

  // Flush cached demo data so dashboard shows real data after upgrade
  revalidatePath("/dashboard");

  // If user came from onboarding, redirect to the Go Live step
  if (params.return_to === "onboarding") {
    redirect("/dashboard/onboarding/review?payment=success");
  }

  const listing = await getListingData();
  const isUpgrade = params.upgraded === "true";
  const isDowngrade = params.downgraded === "true";
  const isAddon = !!params.addon;
  const addonType = params.addon as AddonType | undefined;
  const addonQuantity = parseInt(params.quantity || "1", 10);
  const addonInfo = addonType && addonType in ADDON_INFO ? ADDON_INFO[addonType] : null;

  // Determine title and description based on action type
  let title = "You're Live!";
  let description = "Your practice is now live on FindABATherapy. Families can discover and contact you directly.";

  if (isAddon && addonInfo) {
    const totalUnits = addonQuantity * addonInfo.unitsPerPack;
    title = `${addonInfo.label} Added!`;
    description = `+${totalUnits} ${addonInfo.unitLabel}${totalUnits !== 1 ? "s" : ""} added to your plan at $${addonQuantity * addonInfo.pricePerPack}/mo.`;
  } else if (isUpgrade) {
    title = "Plan Upgraded!";
    description = "Your plan has been upgraded. New features are now available.";
  } else if (isDowngrade) {
    title = "Plan Changed";
    description = "Your plan has been changed. You'll keep your current features until the end of your billing period.";
  }

  // Determine checkout type for tracking
  const checkoutType = isAddon ? "addon" : isUpgrade ? "upgrade" : isDowngrade ? "downgrade" : "new";

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      {/* PostHog checkout tracking */}
      <CheckoutTracker type={checkoutType} />

      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            {isDowngrade ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            ) : (
              <Sparkles className="h-8 w-8 text-emerald-500" />
            )}
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
            <h3 className="font-medium text-emerald-900 dark:text-emerald-100">
              {isDowngrade ? "What happens next?" : "Next steps"}
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-emerald-800 dark:text-emerald-200">
              {isAddon ? (
                <>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    Your add-on is now active
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    Updated limits are available immediately
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    Manage add-ons anytime from the billing page
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    Your listing is now published and searchable
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    All Pro features are unlocked — branded pages, CRM, communications
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    Families can contact you directly through your listing
                  </li>
                </>
              )}
            </ul>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="flex-1">
              <Link href={isAddon ? "/dashboard/billing" : "/dashboard"}>
                {isAddon ? "Back to Billing" : "Go to Dashboard"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {!isAddon && listing && (
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

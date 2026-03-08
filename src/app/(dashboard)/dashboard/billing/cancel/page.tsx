import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, HelpCircle } from "lucide-react";

import { DashboardCard } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resetPlanToFree } from "@/lib/actions/billing";

interface BillingCancelPageProps {
  searchParams: Promise<{ return_to?: string; featured_location?: string; location_name?: string }>;
}

export default async function BillingCancelPage({ searchParams }: BillingCancelPageProps) {
  const params = await searchParams;
  const isFeaturedLocation = params.featured_location === "true";

  // Reset plan to free since payment wasn't completed
  // This is safe to call even if they have an active subscription (no-op)
  if (!isFeaturedLocation) {
    await resetPlanToFree();
  }

  // If user came from onboarding, redirect back to the final decision step
  if (params.return_to === "onboarding") {
    redirect("/dashboard/onboarding/plan?payment=cancelled");
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <DashboardCard tone="warning" className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <AlertCircle className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {isFeaturedLocation ? "Featured Checkout Cancelled" : "Payment Not Completed"}
          </CardTitle>
          <CardDescription className="text-base">
            {isFeaturedLocation
              ? `No changes were made to ${params.location_name || "this location"}. You can feature it anytime from your dashboard.`
              : "We weren&apos;t able to complete your payment. You can try again or continue with a Free listing for now."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <h3 className="font-medium text-foreground">
              {isFeaturedLocation ? "Your location is unchanged" : "Your listing is ready"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {isFeaturedLocation
                ? "You can return to locations or billing whenever you're ready to add featured placement."
                : "All your profile information has been saved. You can upgrade to a paid plan anytime from your dashboard."}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild>
              <Link href={isFeaturedLocation ? (params.return_to === "locations" ? "/dashboard/locations" : "/dashboard/billing") : "/dashboard/billing"}>
                {isFeaturedLocation
                  ? (params.return_to === "locations" ? "Back to Locations" : "Back to Billing")
                  : "Try Again"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                {isFeaturedLocation ? "Go to Dashboard" : "Continue with Free Listing"}
              </Link>
            </Button>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Need help?</p>
              <p className="text-muted-foreground">
                If you experienced any issues during checkout, please{" "}
                <a href="mailto:support@findabatherapy.org" className="text-primary hover:underline">
                  contact our support team
                </a>
                .
              </p>
            </div>
          </div>
        </CardContent>
      </DashboardCard>
    </div>
  );
}

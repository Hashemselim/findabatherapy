import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ListingWithRelations } from "@/lib/actions/listings";

interface OnboardingChecklistProps {
  listing: ListingWithRelations;
  isPaidPlan: boolean;
}

export function OnboardingChecklist({ listing, isPaidPlan }: OnboardingChecklistProps) {
  const isPublished = listing.status === "published";

  // Calculate completion status
  const hasDetails = !!(listing.headline && listing.description);
  const hasLocation = !!listing.primaryLocation;
  const hasServices = listing.serviceModes.length > 0;
  const hasMedia = isPaidPlan && !!listing.logoUrl;

  const completionSteps = [
    {
      label: "Add your services and insurances",
      completed: hasServices,
      href: "/dashboard/listing",
    },
    {
      label: "Confirm your location and contact info",
      completed: hasLocation && hasDetails,
      href: "/dashboard/locations",
    },
    {
      label: isPaidPlan ? "Add photos or video" : "Upgrade for photos & video",
      completed: hasMedia,
      href: isPaidPlan ? "/dashboard/media" : "/dashboard/billing",
    },
    {
      label: "View your public listing",
      completed: isPublished,
      href: isPublished ? `/provider/${listing.slug}` : "/dashboard/listing",
    },
  ];

  const completedCount = completionSteps.filter((s) => s.completed).length;
  const completionPercent = Math.round((completedCount / completionSteps.length) * 100);

  // Don't show if fully complete and published
  if (isPublished && completionPercent === 100) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg">
              {isPublished ? "Enhance your listing" : "Complete your listing setup"}
            </CardTitle>
            <CardDescription>
              {isPublished
                ? "Complete these steps to improve your visibility"
                : `${completionPercent}% complete - finish the remaining steps to publish`}
            </CardDescription>
          </div>
          <div className="text-2xl font-bold text-[#5788FF] sm:text-3xl">{completionPercent}%</div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress bar */}
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-primary/20">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        {/* Checklist items */}
        <div className="grid gap-2 sm:grid-cols-2">
          {completionSteps.map((step) => (
            <Link
              key={step.label}
              href={step.href}
              className={`flex items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                step.completed
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border/60 bg-background"
              }`}
            >
              {step.completed ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
              ) : (
                <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              )}
              <span
                className={`text-sm ${
                  step.completed ? "text-emerald-700" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Continue button for unpublished listings */}
        {!isPublished && (
          <div className="mt-4 flex justify-end">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/dashboard/listing">
                Continue Setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

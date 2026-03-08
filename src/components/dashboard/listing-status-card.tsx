"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Globe, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DashboardCallout } from "@/components/dashboard/ui";
import { publishListing, unpublishListing } from "@/lib/actions/listings";

interface ListingStatusCardProps {
  status: "draft" | "published" | "suspended";
  slug: string;
  publishedAt: string | null;
  planTier: string;
}

export function ListingStatusCard({
  status,
  slug,
  publishedAt,
  planTier,
}: ListingStatusCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isPublished = status === "published";
  const isSuspended = status === "suspended";
  const isPaidPlan = planTier !== "free";

  const handlePublish = () => {
    setError(null);

    startTransition(async () => {
      // For paid plans that haven't paid yet, redirect to checkout
      // This will be implemented in Phase 4
      // For now, just publish

      const result = await publishListing();

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  };

  const handleUnpublish = () => {
    setError(null);

    startTransition(async () => {
      const result = await unpublishListing();

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  };

  if (isSuspended) {
    return (
      <DashboardCallout
        tone="danger"
        icon={AlertCircle}
        title="Listing Suspended"
        description="Your listing has been suspended and is not visible to families. Please contact support for assistance."
      />
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {isPublished ? (
              <div className="hidden rounded-lg bg-primary/10 p-2 sm:block">
                <Globe className="h-5 w-5 text-primary" />
              </div>
            ) : (
              <div className="hidden rounded-lg bg-muted p-2 sm:block">
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <CardTitle>
                {isPublished ? "Listing Published" : "Listing Draft"}
              </CardTitle>
              <CardDescription>
                {isPublished ? (
                  <>
                    Your listing is live at{" "}
                    <a
                      href={`/provider/${slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-primary hover:underline"
                    >
                      /provider/{slug}
                    </a>
                    {publishedAt && (
                      <span className="text-muted-foreground">
                        {" "}
                        · Published{" "}
                        {new Date(publishedAt).toLocaleDateString()}
                      </span>
                    )}
                  </>
                ) : (
                  "Your listing is not visible to families. Publish to appear in search results."
                )}
              </CardDescription>
            </div>
          </div>

          {isPublished ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isPending} className="w-full shrink-0 sm:w-auto">
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <EyeOff className="mr-2 h-4 w-4" />
                  )}
                  Unpublish
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unpublish Listing</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your listing will no longer be visible to families. You can
                    republish at any time. Are you sure you want to continue?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                  <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleUnpublish} className="w-full sm:w-auto">
                    Unpublish
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button onClick={handlePublish} disabled={isPending} className="w-full shrink-0 sm:w-auto">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {isPaidPlan ? "Publish & Checkout" : "Publish Listing"}
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      {error && (
        <CardContent className="pt-0">
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Building2, CheckCircle, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RemovalRequestModal } from "@/components/provider/removal-request-modal";
import { getClaimEligibility } from "@/lib/actions/google-places";

interface ClaimListingCardProps {
  googlePlacesListingId: string;
  providerName: string;
}

type ClaimStatus =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "no_listing" }
  | { status: "has_listing"; existingRequest?: { id: string; status: string }; listingSlug?: string };

export function ClaimListingCard({ googlePlacesListingId, providerName }: ClaimListingCardProps) {
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>({ status: "loading" });
  const [showModal, setShowModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getClaimEligibility(googlePlacesListingId);
      setClaimStatus(result);
    });
  }, [googlePlacesListingId]);

  // Loading state
  if (claimStatus.status === "loading" || isPending) {
    return (
      <Card className="border-2 border-dashed border-muted-foreground/20">
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Signed out - encourage signup
  if (claimStatus.status === "signed_out") {
    return (
      <Card className="border-2 border-dashed border-muted-foreground/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            Is this your practice?
          </CardTitle>
          <CardDescription>
            Create your free listing to manage your profile, add photos, and connect with families.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full rounded-full">
            <Link href="/auth/sign-up">
              Sign up & Get Listed
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Signed in but no listing - guide to onboarding
  if (claimStatus.status === "no_listing") {
    return (
      <Card className="border-2 border-dashed border-muted-foreground/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            Is this your practice?
          </CardTitle>
          <CardDescription>
            Complete your listing setup first, then you can request removal of this directory entry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full rounded-full">
            <Link href="/dashboard/onboarding">
              Create Your Listing
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Has listing - check for existing request
  if (claimStatus.existingRequest) {
    const requestStatus = claimStatus.existingRequest.status;

    if (requestStatus === "pending") {
      return (
        <Card className="border-2 border-dashed border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-amber-600" />
              Removal Request Pending
            </CardTitle>
            <CardDescription>
              Your request to remove this listing is being reviewed. We&apos;ll notify you once it&apos;s processed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full rounded-full">
              <Link href={`/provider/${claimStatus.listingSlug}`}>
                View Your Listing
              </Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (requestStatus === "approved") {
      return (
        <Card className="border-2 border-dashed border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Request Approved
            </CardTitle>
            <CardDescription>
              This listing has been marked for removal. It will be hidden shortly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full rounded-full">
              <Link href={`/provider/${claimStatus.listingSlug}`}>
                View Your Listing
              </Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (requestStatus === "denied") {
      return (
        <Card className="border-2 border-dashed border-red-200 bg-red-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Previous Request Denied
            </CardTitle>
            <CardDescription>
              Your previous removal request was not approved. You can submit a new request if needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowModal(true)} variant="outline" className="w-full rounded-full">
              Submit New Request
            </Button>
            <RemovalRequestModal
              open={showModal}
              onOpenChange={setShowModal}
              googlePlacesListingId={googlePlacesListingId}
              providerName={providerName}
            />
          </CardContent>
        </Card>
      );
    }
  }

  // Has listing, no existing request - can request removal
  return (
    <Card className="border-2 border-dashed border-muted-foreground/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          Is this your practice?
        </CardTitle>
        <CardDescription>
          You already have a listing on FindABATherapy. Request removal of this directory entry to avoid duplicate listings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={() => setShowModal(true)} variant="outline" className="w-full rounded-full">
          Request Removal
        </Button>
        <Button asChild variant="ghost" className="w-full rounded-full text-muted-foreground">
          <Link href={`/provider/${claimStatus.listingSlug}`}>
            View Your Listing
          </Link>
        </Button>
        <RemovalRequestModal
          open={showModal}
          onOpenChange={setShowModal}
          googlePlacesListingId={googlePlacesListingId}
          providerName={providerName}
        />
      </CardContent>
    </Card>
  );
}

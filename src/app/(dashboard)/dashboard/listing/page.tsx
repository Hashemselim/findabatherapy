import Link from "next/link";
import { Lock, ExternalLink, Eye, EyeOff, AlertCircle, ClipboardList, ArrowRight, CheckCircle2 } from "lucide-react";

import { getListing } from "@/lib/actions/listings";
import { getLocations, getLocationLimit } from "@/lib/actions/locations";
import { getProfile } from "@/lib/supabase/server";
import { getFeaturedAddonPrices } from "@/lib/stripe/actions";
import { ListingForm } from "@/components/dashboard/listing-form";
import { LocationsManager } from "@/components/dashboard/locations-manager";
import { ListingStatusCard } from "@/components/dashboard/listing-status-card";
import { PhotoGalleryManager } from "@/components/dashboard/photo-gallery-manager";
import { VideoEmbedForm } from "@/components/dashboard/video-embed-form";
import { ServicesAttributesCard } from "@/components/dashboard/services-attributes-card";
import { ContactFormCard } from "@/components/dashboard/contact-form-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function DashboardListingPage() {
  const profile = await getProfile();

  // If onboarding is not complete, show the gate message
  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Listing Details</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Update your company information, service offerings, and locations.
          </p>
        </div>

        <Card className="overflow-hidden border-slate-200">
          <BubbleBackground
            interactive={false}
            size="default"
            className="bg-gradient-to-br from-white via-yellow-50/50 to-blue-50/50"
            colors={{
              first: "255,255,255",
              second: "255,236,170",
              third: "135,176,255",
              fourth: "255,248,210",
              fifth: "190,210,255",
              sixth: "240,248,255",
            }}
          >
            <CardContent className="flex flex-col items-center py-12 px-6 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5788FF] shadow-lg shadow-[#5788FF]/25">
                <ClipboardList className="h-8 w-8 text-white" />
              </div>

              <h3 className="text-xl font-semibold text-slate-900">
                Complete Onboarding to Access Listing Details
              </h3>

              <p className="mt-3 max-w-md text-sm text-slate-600">
                Finish setting up your practice profile to unlock all dashboard features.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {["Edit company info", "Manage services", "Update locations"].map((benefit) => (
                  <span
                    key={benefit}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#5788FF]" />
                    {benefit}
                  </span>
                ))}
              </div>

              <Button asChild size="lg" className="mt-8">
                <Link href="/dashboard/onboarding" className="gap-2">
                  Continue Onboarding
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </BubbleBackground>
        </Card>
      </div>
    );
  }

  const [listingResult, locationsResult, limitResult, featuredPricingResult] = await Promise.all([
    getListing(),
    getLocations(),
    getLocationLimit(),
    getFeaturedAddonPrices(),
  ]);

  // If no listing exists after onboarding, show error
  if (!listingResult.success || !listingResult.data) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">Unable to load listing. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  const listing = listingResult.data;
  const locations = locationsResult.success ? locationsResult.data || [] : [];
  const locationLimit = limitResult.success ? limitResult.data!.limit : 1;

  // Get featured pricing from Stripe - fallback to defaults if fetch fails
  const featuredPricing = featuredPricingResult.success && featuredPricingResult.data
    ? featuredPricingResult.data
    : {
        monthly: { price: 99 },
        annual: { price: 59, totalPrice: 708, savings: 480, savingsPercent: 40 },
      };

  const isPublished = listing.status === "published";
  const isPaidPlan = listing.profile.planTier !== "free";

  return (
    <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Listing Details</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
              Update your company information, service offerings, and locations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={isPublished ? "default" : "secondary"}
              className="px-3 py-1"
            >
              {isPublished ? (
                <>
                  <Eye className="mr-1 h-3 w-3" />
                  Published
                </>
              ) : (
                <>
                  <EyeOff className="mr-1 h-3 w-3" />
                  Draft
                </>
              )}
            </Badge>
            {isPublished && (
              <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
                <Link href={`/provider/${listing.slug}`} target="_blank">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Live
                </Link>
              </Button>
            )}
          </div>
        </div>
        {/* Mobile View Live Button */}
        {isPublished && (
          <Button variant="outline" size="sm" className="w-full sm:hidden" asChild>
            <Link href={`/provider/${listing.slug}`} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Live Listing
            </Link>
          </Button>
        )}

        {/* Status and Actions Card */}
        <ListingStatusCard
          status={listing.status}
          slug={listing.slug}
          publishedAt={listing.publishedAt}
          planTier={listing.profile.planTier}
        />

        {/* Company Details Form */}
        <ListingForm
          initialData={{
            agencyName: listing.profile.agencyName,
            headline: listing.headline,
            description: listing.description,
            summary: listing.summary,
            serviceModes: listing.serviceModes,
            isAcceptingClients: listing.isAcceptingClients,
            logoUrl: listing.logoUrl,
          }}
        />

        {/* Locations Manager */}
        <LocationsManager
          initialLocations={locations}
          locationLimit={locationLimit}
          planTier={listing.profile.planTier}
          featuredPricing={featuredPricing}
        />

        {/* Services & Specialties */}
        <ServicesAttributesCard planTier={listing.profile.planTier} />

        {/* Contact Form */}
        <ContactFormCard
          planTier={listing.profile.planTier}
          contactFormEnabled={listing.attributes.contact_form_enabled !== false}
        />

        {/* Media Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-foreground">Media</h2>

          {/* Photo Gallery */}
          <PhotoGalleryManager planTier={listing.profile.planTier} />

          {/* Video Embed */}
          <VideoEmbedForm planTier={listing.profile.planTier} />
        </div>

        {/* Premium Features Teaser */}
        {!isPaidPlan && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="flex flex-row items-center gap-3">
              <Lock className="h-5 w-5 text-primary" aria-hidden />
              <div>
                <CardTitle>Upgrade to unlock more features</CardTitle>
                <CardDescription>
                  Pro and Enterprise plans include photo galleries, video embeds, multiple locations, and priority placement in search results.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/billing">View Upgrade Options</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Validation Warnings */}
        {listing.status === "draft" && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="flex flex-row items-center gap-3">
              <AlertCircle className="h-5 w-5 text-[#5788FF]" aria-hidden />
              <div>
                <CardTitle className="text-amber-900">Listing not yet published</CardTitle>
                <CardDescription>
                  Your listing is currently in draft mode and not visible to families. Publish your listing to appear in search results.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        )}
    </div>
  );
}

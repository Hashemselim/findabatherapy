import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Phone, Globe, Star, ExternalLink } from "lucide-react";

import { ClaimListingCard } from "@/components/provider/claim-listing-card";
import { GoogleRatingCard } from "@/components/provider/google-rating-card";
import { ProviderLogo } from "@/components/provider/provider-logo";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { getGooglePlacesListing } from "@/lib/actions/google-places";
import { getStateSlug } from "@/lib/data/cities";

type PrePopulatedProviderPageParams = {
  slug: string;
};

type PrePopulatedProviderPageProps = {
  params: Promise<PrePopulatedProviderPageParams>;
};

// Revalidate every hour (pre-populated data doesn't change often)
export const revalidate = 3600;

export async function generateMetadata({ params }: PrePopulatedProviderPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getGooglePlacesListing(slug);

  if (!result.success || !result.data) {
    return {};
  }

  const listing = result.data;
  const locationStr = `${listing.city}, ${listing.state}`;

  const title = `${listing.name} | ABA Therapy in ${locationStr}`;
  const description = listing.google_rating
    ? `${listing.name} provides ABA therapy services in ${locationStr}. Rated ${listing.google_rating}/5 on Google.`
    : `${listing.name} provides ABA therapy services in ${locationStr}. View contact information and details.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/provider/p/${listing.slug}`,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: listing.name,
      description,
    },
  };
}

export default async function PrePopulatedProviderPage({ params }: PrePopulatedProviderPageProps) {
  const { slug } = await params;
  const result = await getGooglePlacesListing(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const listing = result.data;

  // Build breadcrumb items
  const breadcrumbItems = [];
  const stateSlug = getStateSlug(listing.state);
  if (stateSlug) {
    breadcrumbItems.push({ label: listing.state, href: `/${stateSlug}` });
  }
  breadcrumbItems.push({
    label: listing.name,
    href: `/provider/p/${listing.slug}`,
  });

  // Build display address
  const addressParts = [];
  if (listing.street) addressParts.push(listing.street);
  addressParts.push(`${listing.city}, ${listing.state}`);
  if (listing.postal_code) addressParts.push(listing.postal_code);
  const displayAddress = addressParts.join(", ");

  // Google Maps URL
  const googleMapsUrl = listing.google_place_id
    ? `https://www.google.com/maps/place/?q=place_id:${listing.google_place_id}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.formatted_address || displayAddress)}`;

  return (
    <div className="pb-16">
      {/* Hero Section */}
      <section className="px-0 pt-0">
        <BubbleBackground
          interactive
          transition={{ stiffness: 100, damping: 50, mass: 0.5 }}
          className="w-full bg-gradient-to-br from-white via-gray-50/50 to-blue-50/50 py-6 sm:py-8"
          colors={{
            first: "255,255,255",
            second: "240,240,240",
            third: "200,220,255",
            fourth: "245,245,245",
            fifth: "220,230,255",
            sixth: "250,250,255",
          }}
        >
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
            {/* Breadcrumbs */}
            <Breadcrumbs items={breadcrumbItems} className="mb-3" />

            <div className="rounded-3xl border border-border bg-white p-4 shadow-lg sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <ProviderLogo
                  name={listing.name}
                  size="lg"
                  className="shrink-0"
                />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                      Directory Listing
                    </Badge>
                    {listing.google_rating && (
                      <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {listing.google_rating}
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-4xl font-semibold leading-tight">{listing.name}</h1>
                  <p className="flex items-center gap-2 text-lg text-muted-foreground">
                    <MapPin className="h-5 w-5" />
                    {listing.city}, {listing.state}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </BubbleBackground>
      </section>

      <div className="mx-auto mt-10 max-w-5xl space-y-6 px-4 sm:px-6">
        {/* Contact Info Card */}
        <Card className="border border-border/80">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-start gap-x-8 gap-y-4 text-sm text-muted-foreground">
              {/* Address */}
              <div className="min-w-0 max-w-full">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Address</p>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-2 text-base font-medium text-foreground hover:text-primary"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{displayAddress}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                </a>
              </div>

              {/* Phone */}
              {listing.phone && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</p>
                  <a
                    href={`tel:${listing.phone.replace(/\D/g, "")}`}
                    className="mt-1 flex items-center gap-2 text-base font-medium text-foreground"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span>{listing.phone}</span>
                  </a>
                </div>
              )}

              {/* Website */}
              {listing.website && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Website</p>
                  <a
                    href={listing.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-2 text-base font-medium text-foreground"
                  >
                    <Globe className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span>Visit Website</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </a>
                </div>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row">
              {listing.website && (
                <Button asChild className="flex-1 rounded-full text-base">
                  <a href={listing.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="mr-2 h-4 w-4" />
                    Visit Website
                  </a>
                </Button>
              )}
              {listing.phone && (
                <Button asChild variant="outline" className="flex-1 rounded-full text-base">
                  <a href={`tel:${listing.phone.replace(/\D/g, "")}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    Call Now
                  </a>
                </Button>
              )}
              <Button asChild variant="outline" className="flex-1 rounded-full text-base">
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                  <MapPin className="mr-2 h-4 w-4" />
                  Get Directions
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Google Rating Card */}
        {listing.google_rating && (
          <GoogleRatingCard
            rating={listing.google_rating}
            reviewCount={listing.google_rating_count}
            googleMapsUrl={googleMapsUrl}
          />
        )}

        {/* Info Notice */}
        <Card className="border border-dashed border-muted-foreground/30 bg-muted/30">
          <CardContent className="py-4">
            <p className="text-center text-sm text-muted-foreground">
              This listing contains publicly available information sourced from Google.
              For the most up-to-date details, please contact the provider directly or visit their website.
            </p>
          </CardContent>
        </Card>

        {/* Claim Listing Card */}
        <ClaimListingCard
          googlePlacesListingId={listing.id}
          providerName={listing.name}
        />
      </div>
    </div>
  );
}

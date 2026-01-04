import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Star, Info, Shield } from "lucide-react";

import { ClaimListingCard } from "@/components/provider/claim-listing-card";
import { ContactInfoCard } from "@/components/provider/contact-info-card";
import { GoogleRatingCard } from "@/components/provider/google-rating-card";
import { LocationSection } from "@/components/provider/location-section";
import { ProviderLogo } from "@/components/provider/provider-logo";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Badge } from "@/components/ui/badge";
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

  // Google Maps URL for rating card
  const googleMapsUrl = listing.google_place_id
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.name)}&query_place_id=${listing.google_place_id}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.formatted_address || `${listing.city}, ${listing.state}`)}`;

  return (
    <div className="pb-16">
      {/* Hero Section */}
      <section className="px-0 pt-0">
        <BubbleBackground
          interactive
          transition={{ stiffness: 100, damping: 50, mass: 0.5 }}
          className="w-full bg-gradient-to-br from-white via-yellow-50/50 to-blue-50/50 py-6 sm:py-8"
          colors={{
            first: "255,255,255",
            second: "255,236,170",
            third: "135,176,255",
            fourth: "255,248,210",
            fifth: "190,210,255",
            sixth: "240,248,255",
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
                    <Badge variant="outline" className="gap-1 border-slate-300 bg-slate-50 text-slate-600 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] hover:bg-slate-100 active:scale-[0.98]">
                      <Info className="h-3 w-3" />
                      Directory Listing
                    </Badge>
                    {listing.google_rating && (
                      <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] hover:shadow-[0_2px_8px_rgba(245,158,11,0.2)] active:scale-[0.98]">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {listing.google_rating}
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-4xl font-semibold leading-tight">{listing.name}</h1>
                  <p className="text-lg text-muted-foreground">
                    {listing.city}, {listing.state}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </BubbleBackground>
      </section>

      <div className="mx-auto mt-10 max-w-5xl space-y-6 px-4 sm:px-6">
        {/* 1. Contact Info Card */}
        <ContactInfoCard
          providerName={listing.name}
          phone={listing.phone}
          website={listing.website}
        />

        {/* 2. Location Section */}
        <LocationSection
          city={listing.city}
          state={listing.state}
          street={listing.street}
          postalCode={listing.postal_code}
          latitude={listing.latitude}
          longitude={listing.longitude}
        />

        {/* 3. Google Rating Card */}
        {listing.google_rating && (
          <GoogleRatingCard
            rating={listing.google_rating}
            reviewCount={listing.google_rating_count}
            googleMapsUrl={googleMapsUrl}
          />
        )}

        {/* 4. Insurance Card - Friendly notice */}
        <Card className="border border-border/80 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10">
                <Shield className="h-4 w-4 text-violet-500" />
              </div>
              Insurance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 rounded-xl border border-violet-200/60 bg-violet-50/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100">
                <Info className="h-5 w-5 text-violet-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-violet-900">Insurance information not available</p>
                <p className="text-sm text-violet-700/80">
                  This is a directory listing with limited details. Please contact {listing.name} directly to ask about accepted insurance plans and payment options.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. Info Notice */}
        <Card className="border border-dashed border-slate-300 bg-slate-50/50 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-slate-400 hover:bg-slate-50">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200/70">
              <Info className="h-4 w-4 text-slate-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              This listing contains publicly available information sourced from Google.
              For the most up-to-date details, please contact the provider directly or visit their website.
            </p>
          </CardContent>
        </Card>

        {/* 6. Claim Listing Card */}
        <ClaimListingCard
          googlePlacesListingId={listing.id}
          providerName={listing.name}
        />
      </div>
    </div>
  );
}

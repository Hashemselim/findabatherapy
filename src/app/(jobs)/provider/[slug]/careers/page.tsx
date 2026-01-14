import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Briefcase, ExternalLink, BadgeCheck, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { JobCard } from "@/components/jobs/job-card";
import { JsonLd } from "@/components/seo/json-ld";
import { getJobsByProvider } from "@/lib/queries/jobs";
import { createAdminClient } from "@/lib/supabase/server";
import { generateJobsSiteOrganizationSchema } from "@/lib/seo/job-schemas";
import type { PlanTier } from "@/lib/plans/features";

interface CareersPageProps {
  params: Promise<{ slug: string }>;
}

interface ProviderProfile {
  id: string;
  slug: string;
  agencyName: string;
  logoUrl: string | null;
  headline: string | null;
  description: string | null;
  website: string | null;
  planTier: PlanTier;
  isVerified: boolean;
  primaryLocation: {
    city: string;
    state: string;
  } | null;
}

async function getProviderBySlug(slug: string): Promise<ProviderProfile | null> {
  const supabase = await createAdminClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      id,
      slug,
      agency_name,
      website,
      plan_tier,
      subscription_status
    `)
    .eq("slug", slug)
    .single();

  if (error || !profile) {
    return null;
  }

  // Get listing details for logo and description
  const { data: listing } = await supabase
    .from("listings")
    .select(`
      logo_url,
      headline,
      description
    `)
    .eq("profile_id", profile.id)
    .single();

  // Get primary location
  const { data: locations } = await supabase
    .from("locations")
    .select("city, state")
    .eq("profile_id", profile.id)
    .eq("is_primary", true)
    .limit(1);

  const primaryLocation = locations && locations.length > 0 ? locations[0] : null;

  // Determine effective plan tier
  const isActiveSubscription =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";
  const effectiveTier = (isActiveSubscription ? profile.plan_tier : "free") as PlanTier;

  return {
    id: profile.id,
    slug: profile.slug,
    agencyName: profile.agency_name,
    logoUrl: listing?.logo_url || null,
    headline: listing?.headline || null,
    description: listing?.description || null,
    website: profile.website,
    planTier: effectiveTier,
    isVerified: effectiveTier !== "free",
    primaryLocation,
  };
}

export async function generateMetadata({ params }: CareersPageProps): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getProviderBySlug(slug);

  if (!provider) {
    return {
      title: "Provider Not Found | Find ABA Jobs",
    };
  }

  const title = `Careers at ${provider.agencyName} | Find ABA Jobs`;
  const description = provider.headline
    ? `Explore career opportunities at ${provider.agencyName}. ${provider.headline}`
    : `Browse open BCBA, RBT, and behavior analyst positions at ${provider.agencyName}. Join a leading ABA therapy provider.`;

  // Build OG image URL with jobs brand and company details
  const ogParams = new URLSearchParams({
    brand: "jobs",
    type: "careers",
    title: `Careers at ${provider.agencyName}`,
    subtitle: provider.primaryLocation
      ? `${provider.primaryLocation.city}, ${provider.primaryLocation.state}`
      : "View open positions",
  });
  if (provider.logoUrl) {
    ogParams.set("logo", provider.logoUrl);
  }
  const ogImageUrl = `https://www.findabajobs.org/api/og?${ogParams.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `/provider/${slug}/careers`,
    },
  };
}

export default async function CareersPage({ params }: CareersPageProps) {
  const { slug } = await params;
  const [provider, jobs] = await Promise.all([
    getProviderBySlug(slug),
    getJobsByProvider(slug),
  ]);

  if (!provider) {
    notFound();
  }

  const initials = provider.agencyName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Generate JSON-LD for the organization
  const orgSchema = generateJobsSiteOrganizationSchema();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50/30 to-slate-50">
      <JsonLd data={orgSchema} />

      {/* Hero Section */}
      <section className="border-b bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
              {provider.logoUrl ? (
                <AvatarImage src={provider.logoUrl} alt={provider.agencyName} />
              ) : null}
              <AvatarFallback className="bg-emerald-100 text-xl font-bold text-emerald-700">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
                  {provider.agencyName}
                </h1>
                {provider.isVerified && (
                  <Badge variant="outline" className="gap-1 border-emerald-500/50 bg-emerald-50 text-emerald-700">
                    <BadgeCheck className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>

              {provider.headline && (
                <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                  {provider.headline}
                </p>
              )}

              {provider.primaryLocation && (
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {provider.primaryLocation.city}, {provider.primaryLocation.state}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {provider.website && (
                <Button asChild variant="outline" className="rounded-full">
                  <a
                    href={provider.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Visit Website
                  </a>
                </Button>
              )}
              <Button asChild className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
                <Link href={`/provider/${provider.slug}`}>
                  View Full Profile
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Jobs Section */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Briefcase className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Open Positions
                <span className="ml-2 text-lg font-normal text-muted-foreground">
                  ({jobs.length})
                </span>
              </h2>
            </div>
          </div>

          {jobs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Briefcase className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No open positions</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  {provider.agencyName} doesn&apos;t have any open positions at the moment.
                  Check back later or browse other opportunities.
                </p>
                <Button asChild className="mt-6 rounded-full" variant="outline">
                  <Link href="/jobs/search">
                    Browse All Jobs
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      {provider.description && (
        <section className="border-t bg-white py-12">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <Card>
              <CardHeader>
                <CardTitle>About {provider.agencyName}</CardTitle>
                <CardDescription>
                  Learn more about our organization and mission
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {provider.description}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="border-t bg-emerald-50 py-12">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-foreground">
            Looking for more opportunities?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Browse thousands of BCBA, RBT, and behavior analyst positions from top ABA providers.
          </p>
          <Button asChild className="mt-6 rounded-full bg-emerald-600 text-white hover:bg-emerald-700" size="lg">
            <Link href="/jobs/search">
              Search All Jobs
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

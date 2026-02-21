import Link from "next/link";
import { Lock, ExternalLink, Eye, EyeOff, AlertCircle, ClipboardList, ArrowRight, CheckCircle2, MapPin, ImageIcon, Video, Shield, Building2, Home, Monitor, GraduationCap } from "lucide-react";

import { getListing } from "@/lib/actions/listings";
import { getLocations } from "@/lib/actions/locations";
import { getProfile } from "@/lib/supabase/server";
import { ListingForm } from "@/components/dashboard/listing-form";
import { ListingStatusCard } from "@/components/dashboard/listing-status-card";
import { CompanyContactCard } from "@/components/dashboard/company-contact-card";
import { ServicesAttributesCard } from "@/components/dashboard/services-attributes-card";
import { ContactFormCard } from "@/components/dashboard/contact-form-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Service type icons and labels
const SERVICE_TYPE_CONFIG: Record<string, { icon: typeof Home; label: string }> = {
  in_home: { icon: Home, label: "In-Home" },
  in_center: { icon: Building2, label: "Center-Based" },
  telehealth: { icon: Monitor, label: "Telehealth" },
  school_based: { icon: GraduationCap, label: "School-Based" },
};

export default async function DashboardListingPage() {
  const profile = await getProfile();

  // If onboarding is not complete, show the gate message
  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Company Details</h1>
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
                Complete Onboarding to Access Company Details
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

  const [listingResult, locationsResult] = await Promise.all([
    getListing(),
    getLocations(),
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

  const isPublished = listing.status === "published";
  // Paid plan requires both a paid tier AND an active subscription
  const isActiveSubscription =
    listing.profile.subscriptionStatus === "active" ||
    listing.profile.subscriptionStatus === "trialing";
  const isPaidPlan = listing.profile.planTier !== "free" && isActiveSubscription;

  // Count media items
  const photoCount = listing.photoUrls?.length || 0;
  const hasVideo = !!listing.attributes?.videoUrl;

  // Aggregate location data for summary
  const acceptingCount = locations.filter(l => l.isAcceptingClients).length;
  const allInsurances = [...new Set(locations.flatMap(l => l.insurances || []))];
  const allServiceTypes = [...new Set(locations.flatMap(l => l.serviceTypes || []))];

  return (
    <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Company Details</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
              Update your company information and manage your service locations.
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
              <>
                <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
                  <a href={`/provider/${listing.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Therapy Profile
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
                  <a href={`/employers/${listing.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Jobs Profile
                  </a>
                </Button>
              </>
            )}
          </div>
        </div>
        {/* Mobile Profile Links */}
        {isPublished && (
          <div className="flex gap-2 sm:hidden">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <a href={`/provider/${listing.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Therapy Profile
              </a>
            </Button>
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <a href={`/employers/${listing.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Jobs Profile
              </a>
            </Button>
          </div>
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
            slug: listing.slug,
            headline: listing.headline,
            description: listing.description,
            summary: listing.summary,
            logoUrl: listing.logoUrl,
          }}
        />

        {/* Company Contact Info */}
        <CompanyContactCard
          initialData={{
            contactEmail: listing.profile.contactEmail,
            contactPhone: listing.profile.contactPhone,
            website: listing.profile.website,
          }}
        />

        {/* Enhanced Locations Summary Card */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#5788FF]/10">
                  <MapPin className="h-5 w-5 text-[#5788FF]" />
                </div>
                <div>
                  <CardTitle className="text-base">Service Locations</CardTitle>
                  <CardDescription>
                    {locations.length === 0
                      ? "No locations added yet"
                      : locations.length === 1
                        ? "1 location"
                        : `${locations.length} locations`}
                    {locations.length > 0 && acceptingCount > 0 && (
                      <span className="text-emerald-600"> · {acceptingCount} accepting clients</span>
                    )}
                  </CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/locations">
                  Manage
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          {locations.length > 0 && (
            <CardContent className="pt-0 space-y-4">
              {/* Location list */}
              <div className="divide-y divide-border/60 rounded-lg border border-border/60">
                {locations.slice(0, 3).map((location) => (
                  <div key={location.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {location.label || `${location.city}, ${location.state}`}
                        </span>
                        {location.isPrimary && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Primary</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {location.city}, {location.state}
                        {location.serviceRadiusMiles && ` · ${location.serviceRadiusMiles} mi radius`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Service type icons */}
                      <div className="flex -space-x-1">
                        {(location.serviceTypes || []).slice(0, 3).map((type) => {
                          const config = SERVICE_TYPE_CONFIG[type];
                          if (!config) return null;
                          const Icon = config.icon;
                          return (
                            <div
                              key={type}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-muted border-2 border-background"
                              title={config.label}
                            >
                              <Icon className="h-3 w-3 text-muted-foreground" />
                            </div>
                          );
                        })}
                      </div>
                      {/* Accepting status */}
                      <Badge
                        variant={location.isAcceptingClients ? "default" : "secondary"}
                        className={`text-[10px] px-1.5 py-0 ${location.isAcceptingClients ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : ""}`}
                      >
                        {location.isAcceptingClients ? "Accepting" : "Full"}
                      </Badge>
                    </div>
                  </div>
                ))}
                {locations.length > 3 && (
                  <div className="px-3 py-2 text-center">
                    <Link
                      href="/dashboard/locations"
                      className="text-xs text-primary hover:underline"
                    >
                      View all {locations.length} locations →
                    </Link>
                  </div>
                )}
              </div>

              {/* Aggregated service info */}
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Service Types */}
                {allServiceTypes.length > 0 && (
                  <div className="rounded-lg bg-muted/30 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Service Types</p>
                    <div className="flex flex-wrap gap-1">
                      {allServiceTypes.map((type) => {
                        const config = SERVICE_TYPE_CONFIG[type];
                        return (
                          <Badge key={type} variant="outline" className="text-xs font-normal">
                            {config?.label || type}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Insurance */}
                {allInsurances.length > 0 && (
                  <div className="rounded-lg bg-muted/30 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                      <Shield className="inline h-3 w-3 mr-1" />
                      Insurance Accepted
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {allInsurances.slice(0, 4).map((insurance) => (
                        <Badge key={insurance} variant="outline" className="text-xs font-normal">
                          {insurance}
                        </Badge>
                      ))}
                      {allInsurances.length > 4 && (
                        <Badge variant="outline" className="text-xs font-normal bg-muted">
                          +{allInsurances.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          )}
          {locations.length === 0 && (
            <CardContent className="pt-0">
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center">
                <MapPin className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Add your first service location to appear in search results.
                </p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/dashboard/locations">
                    Add Location
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Services & Specialties */}
        <ServicesAttributesCard planTier={listing.profile.planTier} />

        {/* Contact Form */}
        <ContactFormCard
          planTier={listing.profile.planTier}
          contactFormEnabled={listing.attributes.contact_form_enabled !== false}
        />

        {/* Media Summary Card */}
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <ImageIcon className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Photos & Video</CardTitle>
                  <CardDescription>
                    {!isPaidPlan
                      ? "Upgrade to add photos and video"
                      : photoCount === 0 && !hasVideo
                        ? "No media added yet"
                        : `${photoCount} photo${photoCount !== 1 ? "s" : ""}${hasVideo ? " • 1 video" : ""}`}
                  </CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/media">
                  {isPaidPlan ? "Manage" : "View"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          {isPaidPlan && (photoCount > 0 || hasVideo) && (
            <CardContent className="pt-0">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {photoCount > 0 && (
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4" />
                    {photoCount} photo{photoCount !== 1 ? "s" : ""}
                  </span>
                )}
                {hasVideo && (
                  <span className="flex items-center gap-1.5">
                    <Video className="h-4 w-4" />
                    Video embedded
                  </span>
                )}
              </div>
            </CardContent>
          )}
        </Card>

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

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  ChevronRight,
  Mail,
  MapPin,
  BadgeCheck,
  Phone,
  Globe,
  Building2,
  Home,
  Star,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { DemoBanner } from "@/components/demo/demo-banner";
import { ProviderLogo } from "@/components/provider/provider-logo";
import { DemoProvider } from "@/contexts/demo-context";
import { DEMO_LISTING, DEMO_PHOTOS } from "@/lib/demo/data";
import { getVideoEmbedUrl } from "@/lib/storage/config";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

// Service mode labels for display
const LOCATION_SERVICE_MODE_LABELS: Record<string, string> = {
  center_based: "Center-Based",
  in_home: "In-Home",
  both: "Center & In-Home",
};

const serviceModeLabels: Record<string, string> = {
  in_home: "In-Home Services",
  center_based: "Center-Based",
  telehealth: "Telehealth",
  both: "Center & In-Home",
};

function DemoPreviewContent() {
  const listing = DEMO_LISTING;
  const locations = listing.locations;
  const photoUrls = DEMO_PHOTOS;

  const insurances = (listing.attributes.insurances as string[]) || [];
  const languages = (listing.attributes.languages as string[]) || [];
  const clinicalSpecialties = (listing.attributes.clinical_specialties as string[]) || [];
  const agesServed = listing.attributes.ages_served as { min?: number; max?: number } | undefined;
  const videoEmbedUrl = listing.videoUrl ? getVideoEmbedUrl(listing.videoUrl) : null;

  const primaryLocation = locations.find((l) => l.isPrimary) || locations[0];

  // Contact form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    childAge: "",
    message: "",
  });

  const handleContactClick = () => {
    toast.info("This is a demo - contact actions are disabled", {
      description: "Sign up to enable contact features on your listing.",
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Demo message sent!", {
      description: "In a real listing, this would send an inquiry to the provider's inbox.",
    });
    setFormData({ name: "", email: "", phone: "", childAge: "", message: "" });
  };

  // Google rating card component
  const GoogleRatingCard = () => {
    if (!primaryLocation?.googleRating || !primaryLocation?.googlePlaceId) return null;

    const rating = primaryLocation.googleRating;
    const reviewCount = primaryLocation.googleRatingCount;
    const googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${primaryLocation.googlePlaceId}`;

    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <Card className="border border-border/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google Rating
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-foreground">{rating.toFixed(1)}</div>
            <div className="space-y-1">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: fullStars }).map((_, i) => (
                  <Star key={`full-${i}`} className="h-5 w-5 fill-amber-400 text-amber-400" />
                ))}
                {hasHalfStar && (
                  <div className="relative h-5 w-5">
                    <Star className="absolute h-5 w-5 text-amber-400" />
                    <div className="absolute overflow-hidden" style={{ width: "50%" }}>
                      <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    </div>
                  </div>
                )}
                {Array.from({ length: emptyStars }).map((_, i) => (
                  <Star key={`empty-${i}`} className="h-5 w-5 text-gray-300" />
                ))}
              </div>
              {reviewCount !== null && reviewCount !== undefined && (
                <p className="text-sm text-muted-foreground">
                  Based on {reviewCount.toLocaleString()} {reviewCount === 1 ? "review" : "reviews"}
                </p>
              )}
            </div>
          </div>
          <Button asChild variant="outline" className="w-full">
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
              View on Google Maps
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />

      {/* Back to Dashboard Link */}
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        <Link
          href="/demo"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

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
            <nav className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">{listing.profile.agencyName}</span>
            </nav>

            <div className="rounded-3xl border border-border bg-white p-4 shadow-lg sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                {/* Provider Logo */}
                <ProviderLogo
                  name={listing.profile.agencyName}
                  logoUrl={listing.logoUrl ?? undefined}
                  size="lg"
                  className="shrink-0"
                />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1 border-[#5788FF] text-[#5788FF]">
                      <BadgeCheck className="h-3 w-3" />
                      Verified
                    </Badge>
                    {listing.isAcceptingClients && (
                      <Badge variant="outline" className="border-[#FEE720] bg-[#FFF5C2] text-[#333333]">
                        Accepting New Clients
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-4xl font-semibold leading-tight">{listing.profile.agencyName}</h1>
                  {listing.headline && (
                    <p className="text-lg text-muted-foreground">{listing.headline}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </BubbleBackground>
      </section>

      <div className="mx-auto mt-10 max-w-5xl space-y-6 px-4 pb-16 sm:px-6">
        {/* Contact Info Card */}
        <Card className="border border-border/80">
          <CardHeader>
            <CardTitle>Contact {listing.profile.agencyName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-start gap-x-8 gap-y-4 text-sm text-muted-foreground">
              <div className="min-w-0 max-w-full">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleContactClick();
                  }}
                  className="mt-1 flex items-center gap-2 text-base font-medium text-foreground"
                >
                  <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="truncate">{listing.profile.contactEmail}</span>
                </a>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</p>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleContactClick();
                  }}
                  className="mt-1 flex items-center gap-2 text-base font-medium text-foreground"
                >
                  <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{listing.profile.contactPhone}</span>
                </a>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Website</p>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleContactClick();
                  }}
                  className="mt-1 flex items-center gap-2 text-base font-medium text-foreground"
                >
                  <Globe className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>Visit Website</span>
                </a>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="flex-1 rounded-full text-base"
                onClick={handleContactClick}
              >
                <Globe className="mr-2 h-4 w-4" />
                Visit Website
              </Button>
              <Button asChild className="flex-1 rounded-full text-base">
                <a href="#contact-form">
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Now
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Locations Card */}
        <Card className="border border-border/80">
          <CardHeader>
            <CardTitle>Locations</CardTitle>
            <CardDescription>
              {locations.length} service {locations.length === 1 ? "location" : "locations"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primary Location */}
            {primaryLocation && (
              <div>
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                  Primary Location
                </h4>
                <div className="rounded-xl border border-primary bg-primary/5 p-4 ring-2 ring-primary/20">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">
                          {primaryLocation.label || `${primaryLocation.city}, ${primaryLocation.state}`}
                        </span>
                        <Badge variant="secondary" className="text-xs">Primary</Badge>
                        {primaryLocation.isFeatured && (
                          <Badge className="bg-amber-500 text-white text-xs">Featured</Badge>
                        )}
                        {primaryLocation.serviceMode && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            {primaryLocation.serviceMode === "center_based" && <Building2 className="h-3 w-3" />}
                            {primaryLocation.serviceMode === "in_home" && <Home className="h-3 w-3" />}
                            {primaryLocation.serviceMode === "both" && <CheckCircle className="h-3 w-3" />}
                            {LOCATION_SERVICE_MODE_LABELS[primaryLocation.serviceMode] || primaryLocation.serviceMode}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {primaryLocation.street}, {primaryLocation.city}, {primaryLocation.state} {primaryLocation.postalCode}
                      </p>
                      {primaryLocation.googleRating && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="font-medium">{primaryLocation.googleRating}</span>
                          <span className="text-muted-foreground">
                            ({primaryLocation.googleRatingCount} reviews)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Other Locations */}
            {locations.filter((l) => !l.isPrimary).length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                  Other Locations ({locations.filter((l) => !l.isPrimary).length})
                </h4>
                <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-muted/30">
                  {locations.filter((l) => !l.isPrimary).map((location) => (
                    <li
                      key={location.id}
                      className="flex items-center gap-3 p-3"
                    >
                      <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="flex-1 text-sm font-medium">
                        {location.label || `${location.city}, ${location.state}`}
                      </span>
                      {location.isFeatured && (
                        <Badge className="bg-amber-500 text-white text-xs">Featured</Badge>
                      )}
                      {location.serviceMode && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          {location.serviceMode === "center_based" && <Building2 className="h-3 w-3" />}
                          {location.serviceMode === "in_home" && <Home className="h-3 w-3" />}
                          {location.serviceMode === "both" && <CheckCircle className="h-3 w-3" />}
                          {LOCATION_SERVICE_MODE_LABELS[location.serviceMode] || location.serviceMode}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Google Rating Card */}
        <GoogleRatingCard />

        {/* Services Card */}
        <Card className="border border-border/80">
          <CardHeader>
            <CardTitle>Services</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {listing.serviceModes.map((mode) => (
                <li
                  key={mode}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-2"
                >
                  <CheckCircle className="h-4 w-4 text-primary" aria-hidden />
                  {serviceModeLabels[mode] || mode}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Insurances Card */}
        {insurances.length > 0 && (
          <Card className="border border-border/80">
            <CardHeader>
              <CardTitle>Insurance Accepted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {insurances.map((insurance) => (
                  <Badge key={insurance} variant="outline" className="rounded-full px-4 py-2 text-sm">
                    {insurance}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* About Card */}
        <Card className="border border-border/80">
          <CardHeader>
            <CardTitle>About {listing.profile.agencyName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p className="whitespace-pre-wrap">{listing.description}</p>

            {/* Additional Details */}
            <div className="grid gap-4 pt-4 md:grid-cols-2">
              {agesServed && (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ages Served</p>
                  <p className="mt-1 font-medium text-foreground">
                    {agesServed.min ?? 0} - {agesServed.max ?? 18} years
                  </p>
                </div>
              )}

              {languages.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Languages</p>
                  <p className="mt-1 font-medium text-foreground">{languages.join(", ")}</p>
                </div>
              )}

              {clinicalSpecialties.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Specialties</p>
                  <p className="mt-1 font-medium text-foreground">{clinicalSpecialties.join(", ")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Photos & Video Card */}
        {(photoUrls.length > 0 || videoEmbedUrl) && (
          <Card className="border border-border/80">
            <CardHeader>
              <CardTitle>Photos & Video</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Video Embed */}
              {videoEmbedUrl && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Video</p>
                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl border bg-black">
                    <iframe
                      src={videoEmbedUrl}
                      className="absolute inset-0 h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Photo Gallery */}
              {photoUrls.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Gallery</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {photoUrls.map((photo, index) => (
                      <div
                        key={photo.id}
                        className="relative aspect-video overflow-hidden rounded-2xl bg-muted/40"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={`${listing.profile.agencyName} photo ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contact Form Card - Working form for Pro plan */}
        <Card id="contact-form" className="scroll-mt-6 border border-border/80">
          <CardHeader>
            <CardTitle>Send a Message</CardTitle>
            <CardDescription>
              Contact {listing.profile.agencyName} directly through this secure form.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name *</Label>
                  <Input
                    id="name"
                    placeholder="Jane Smith"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="childAge">Child&apos;s Age (optional)</Label>
                  <Input
                    id="childAge"
                    placeholder="e.g., 4"
                    value={formData.childAge}
                    onChange={(e) => setFormData({ ...formData, childAge: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us about your child and what services you're looking for..."
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full rounded-full">
                <Mail className="mr-2 h-4 w-4" />
                Send Message
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Your message will be sent directly to {listing.profile.agencyName}&apos;s inbox.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DemoPreviewPage() {
  return (
    <DemoProvider>
      <DemoPreviewContent />
      <Toaster position="bottom-right" />
    </DemoProvider>
  );
}

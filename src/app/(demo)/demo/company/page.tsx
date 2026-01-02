"use client";

import Link from "next/link";
import Image from "next/image";
import { Eye, Building2, MapPin, Stethoscope, Shield, Languages, Users, Brain } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DemoCTABanner } from "@/components/demo/demo-cta-banner";
import { useDemoContext } from "@/contexts/demo-context";
import { DEMO_LISTING } from "@/lib/demo/data";

export default function DemoListingPage() {
  const { showDemoToast } = useDemoContext();
  const listing = DEMO_LISTING;

  const handleEdit = () => {
    showDemoToast("Editing is disabled in demo mode");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Company Details
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Update your company information, service offerings, and locations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="px-3 py-1">
            <Eye className="mr-1 h-3 w-3" />
            Published
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            asChild
          >
            <Link href="/demo-preview" target="_blank">
              <Eye className="mr-2 h-4 w-4" />
              Preview Listing
            </Link>
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="flex flex-row items-center gap-3 py-4">
          <Eye className="h-5 w-5 text-emerald-500" />
          <div>
            <CardTitle className="text-base text-emerald-900">
              Your listing is published
            </CardTitle>
            <CardDescription>
              Families can find you in search results
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {/* Company Details */}
      <Card data-tour="listing-card" className="border-border/60">
        <CardHeader className="space-y-3">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 shrink-0 text-[#5788FF] mt-0.5" />
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <CardTitle>Company Details</CardTitle>
                <CardDescription className="mt-1">
                  Your business name, headline, and description
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleEdit}>
                Edit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo and Company Name */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border/60 bg-muted/30">
              {listing.logoUrl ? (
                <Image
                  src={listing.logoUrl}
                  alt="Company logo"
                  width={64}
                  height={64}
                  className="h-full w-full rounded-lg object-contain"
                />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">{listing.profile.agencyName}</p>
              <p className="text-sm text-muted-foreground">
                {listing.isAcceptingClients ? (
                  <span className="text-emerald-600">Accepting new clients</span>
                ) : (
                  <span className="text-amber-600">Not accepting new clients</span>
                )}
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Headline
            </p>
            <p className="text-foreground">{listing.headline}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Description
            </p>
            <p className="whitespace-pre-wrap text-foreground">
              {listing.description}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Service Modes
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              {listing.serviceModes.map((mode) => (
                <Badge key={mode} variant="secondary">
                  {mode === "center_based"
                    ? "Center-based"
                    : mode === "in_home"
                      ? "In-home"
                      : "Telehealth"}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Accepting New Clients
            </p>
            <Badge
              variant={listing.isAcceptingClients ? "default" : "secondary"}
            >
              {listing.isAcceptingClients ? "Yes" : "No"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Locations Summary */}
      <Card data-tour="locations" className="border-border/60">
        <CardHeader className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 shrink-0 text-[#5788FF] mt-0.5" />
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <CardTitle>Service Locations</CardTitle>
                <CardDescription className="mt-1">
                  {listing.locations.length} of 5 locations configured
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/demo/locations">Manage</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {listing.locations.map((location) => (
              <div
                key={location.id}
                className="rounded-lg border border-border/60 p-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {location.label || `${location.city}, ${location.state}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {location.city}, {location.state}
                    </p>
                  </div>
                  {(location.isPrimary || location.isFeatured) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {location.isPrimary && (
                        <Badge variant="secondary">Primary</Badge>
                      )}
                      {location.isFeatured && (
                        <Badge
                          data-tour="featured-badge"
                          className="bg-amber-500 text-white"
                        >
                          Featured
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Services & Specialties */}
      <Card className="border-border/60">
        <CardHeader className="space-y-3">
          <div className="flex items-start gap-3">
            <Stethoscope className="h-5 w-5 shrink-0 text-[#5788FF] mt-0.5" />
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <CardTitle>Services & Specialties</CardTitle>
                <CardDescription className="mt-1">
                  Clinical expertise and service areas
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleEdit}>
                Edit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                Insurances Accepted
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(listing.attributes.insurances as string[])?.map((insurance) => (
                <Badge key={insurance} variant="outline">
                  {insurance}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                Languages
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(listing.attributes.languages as string[])?.map((lang) => (
                <Badge key={lang} variant="outline">
                  {lang}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                Ages Served
              </p>
            </div>
            <Badge variant="outline">
              {(listing.attributes.ages_served as { min: number; max: number })
                ?.min || 0}{" "}
              -{" "}
              {(listing.attributes.ages_served as { min: number; max: number })
                ?.max || 21}{" "}
              years
            </Badge>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                Clinical Specialties
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(listing.attributes.clinical_specialties as string[])?.map(
                (specialty) => (
                  <Badge key={specialty} variant="outline">
                    {specialty}
                  </Badge>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media Preview */}
      <Card className="border-border/60">
        <CardHeader className="space-y-3">
          <div className="space-y-2">
            <div>
              <CardTitle>Media</CardTitle>
              <CardDescription className="mt-1">Photos and video for your listing</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/demo/media">Manage Media</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {listing.photoUrls?.slice(0, 5).map((url, i) => (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-lg bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Gallery image ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {listing.photoUrls?.length || 0} photos uploaded • Video embed
            configured
          </p>
        </CardContent>
      </Card>

      <DemoCTABanner />
    </div>
  );
}

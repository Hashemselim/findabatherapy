"use client";

import { MapPin, Star, Plus, Sparkles } from "lucide-react";

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

export default function DemoLocationsPage() {
  const { showDemoToast } = useDemoContext();
  const locations = DEMO_LISTING.locations;

  const handleAction = () => {
    showDemoToast("Location management is disabled in demo mode");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Service Locations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Manage your service locations and coverage areas.
          </p>
        </div>
        <Button onClick={handleAction}>
          <Plus className="mr-2 h-4 w-4" />
          Add Location
        </Button>
      </div>

      {/* Location Limit Info */}
      <Card className="border-[#5788FF]/30 bg-[#5788FF]/5">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-[#5788FF]" />
            <div>
              <p className="font-medium text-foreground">
                {locations.length} of 5 locations used
              </p>
              <p className="text-sm text-muted-foreground">
                Pro plan includes up to 5 service locations
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locations Grid */}
      <div data-tour="locations" className="space-y-4">
        {locations.map((location) => (
          <Card key={location.id} className="border-border/60">
            <CardHeader className="space-y-3">
              {/* Header: Icon + Content */}
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  location.isFeatured ? "bg-amber-100" : "bg-[#5788FF]/10"
                }`}>
                  <MapPin className={`h-5 w-5 ${location.isFeatured ? "text-amber-600" : "text-[#5788FF]"}`} />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  {/* Title and Address */}
                  <div>
                    <CardTitle className="text-base">
                      {location.label || `${location.city}, ${location.state}`}
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      {location.street
                        ? `${location.street}, ${location.city}, ${location.state} ${location.postalCode}`
                        : `${location.city}, ${location.state}`}
                    </CardDescription>
                  </div>
                  {/* Badges and Edit button row */}
                  <div className="flex flex-wrap items-center gap-2">
                    {location.isPrimary && (
                      <Badge variant="secondary">Primary</Badge>
                    )}
                    {location.isFeatured && (
                      <Badge
                        data-tour="featured-badge"
                        className="bg-amber-500 text-white"
                      >
                        <Sparkles className="mr-1 h-3 w-3" />
                        Featured
                      </Badge>
                    )}
                    <Button variant="outline" size="sm" onClick={handleAction} className="ml-auto">
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Service Mode
                </p>
                <p className="text-foreground">
                  {location.serviceMode === "center_based"
                    ? "Center-based"
                    : location.serviceMode === "in_home"
                      ? "In-home only"
                      : "Center + In-home"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Service Radius
                </p>
                <p className="text-foreground">
                  {location.serviceRadiusMiles} miles
                </p>
              </div>
              {location.googleRating && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Google Rating
                  </p>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-foreground">
                      {location.googleRating}
                    </span>
                    <span className="text-muted-foreground">
                      ({location.googleRatingCount} reviews)
                    </span>
                  </div>
                </div>
              )}
              <div className="sm:col-span-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Insurances Accepted
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {location.insurances?.map((insurance) => (
                    <Badge key={insurance} variant="outline" className="text-xs">
                      {insurance}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Featured Upsell */}
      <Card className="border-amber-500/30 bg-gradient-to-r from-amber-50 to-yellow-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Boost Your Visibility</CardTitle>
          </div>
          <CardDescription>
            Featured locations appear at the top of search results and get up to
            3x more visibility.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              <strong>1 of 5</strong> locations currently featured (Los Angeles)
            </div>
            <Button variant="outline" size="sm" onClick={handleAction}>
              Feature Another Location
            </Button>
          </div>
        </CardContent>
      </Card>

      <DemoCTABanner />
    </div>
  );
}

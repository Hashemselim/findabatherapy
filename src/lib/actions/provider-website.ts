"use server";

import { queryConvex } from "@/lib/platform/convex/server";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface WebsiteSettings {
  template: string;
  show_gallery: boolean;
  show_reviews: boolean;
  show_careers: boolean;
  show_resources: boolean;
  hero_cta_text: string;
  sections_order: string[];
}

export interface ProviderWebsiteLocation {
  id: string;
  label: string | null;
  street: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  isPrimary: boolean;
  isFeatured: boolean;
  serviceMode?: "center_based" | "in_home" | "both";
  insurances?: string[];
  serviceRadiusMiles?: number;
  latitude?: number | null;
  longitude?: number | null;
  googlePlaceId?: string | null;
  googleRating?: number | null;
  googleRatingCount?: number | null;
  showGoogleReviews?: boolean;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactWebsite?: string | null;
  useCompanyContact?: boolean;
}

export interface ProviderWebsiteData {
  id: string;
  slug: string;
  headline: string | null;
  description: string | null;
  summary: string | null;
  serviceModes: string[];
  isAcceptingClients: boolean;
  logoUrl: string | null;
  videoUrl: string | null;
  websitePublished: boolean;
  websiteSettings: WebsiteSettings;
  profile: {
    agencyName: string;
    contactEmail: string;
    contactPhone: string | null;
    website: string | null;
    planTier: string;
    subscriptionStatus: string | null;
    intakeFormSettings: {
      background_color: string;
      show_powered_by: boolean;
    };
  };
  locations: ProviderWebsiteLocation[];
  attributes: Record<string, unknown>;
  photoUrls: string[];
  jobCount: number;
  customDomain: {
    domain: string;
    status: string;
  } | null;
}

const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  template: "modern",
  show_gallery: true,
  show_reviews: true,
  show_careers: true,
  show_resources: true,
  hero_cta_text: "Get Started",
  sections_order: [
    "hero",
    "about",
    "services",
    "insurance",
    "locations",
    "gallery",
    "reviews",
  ],
};

/**
 * Get all data needed to render the provider website
 *
 * Extends the existing getListingBySlug pattern with additional
 * parallel queries for job count and custom domain info.
 */
export async function getProviderWebsiteData(
  slug: string
): Promise<ActionResult<ProviderWebsiteData>> {
  try {
    const listing = await queryConvex<Record<string, unknown> | null>(
      "listings:getPublicListingBySlug",
      { slug }
    );

    if (!listing) {
      return { success: false, error: "Provider not found" };
    }

    const profile = listing.profile as Record<string, unknown> | undefined;
    const locations = (listing.locations as Record<string, unknown>[] | undefined) || [];
    const intakeSettings = (profile?.intakeFormSettings as Record<string, unknown>) || {};
    const websiteSettings =
      (listing.websiteSettings as Partial<WebsiteSettings> | undefined) ??
      DEFAULT_WEBSITE_SETTINGS;
    const jobCount = (
      await queryConvex<Array<{ id: string }>>("jobs:getPublicJobsByProvider", {
        providerSlug: slug,
      })
    ).length;
    const customDomain = listing.customDomain as
      | { domain?: string; status?: string }
      | null
      | undefined;

    return {
      success: true,
      data: {
        id: listing.id as string,
        slug: listing.slug as string,
        headline: (listing.headline as string) ?? null,
        description: (listing.description as string) ?? null,
        summary: (listing.summary as string) ?? null,
        serviceModes: (listing.serviceModes as string[]) || [],
        isAcceptingClients: (listing.isAcceptingClients as boolean) ?? false,
        logoUrl: (listing.logoUrl as string) ?? null,
        videoUrl: (listing.videoUrl as string) ?? null,
        websitePublished: (listing.websitePublished as boolean) ?? true,
        websiteSettings: {
          ...DEFAULT_WEBSITE_SETTINGS,
          ...websiteSettings,
          sections_order:
            websiteSettings.sections_order && websiteSettings.sections_order.length > 0
              ? websiteSettings.sections_order
              : DEFAULT_WEBSITE_SETTINGS.sections_order,
        },
        profile: {
          agencyName: (profile?.agencyName as string) ?? "",
          contactEmail: (profile?.contactEmail as string) ?? "",
          contactPhone: (profile?.contactPhone as string) ?? null,
          website: (profile?.website as string) ?? null,
          planTier: (profile?.planTier as string) ?? "free",
          subscriptionStatus: (profile?.subscriptionStatus as string) ?? null,
          intakeFormSettings: {
            background_color: (intakeSettings.background_color as string) || "#0866FF",
            show_powered_by: (intakeSettings.show_powered_by as boolean) ?? true,
          },
        },
        locations: locations.map((l) => ({
          id: l.id as string,
          label: (l.label as string) ?? null,
          street: (l.street as string) ?? null,
          city: (l.city as string) ?? "",
          state: (l.state as string) ?? "",
          postalCode: (l.postalCode as string) ?? null,
          isPrimary: (l.isPrimary as boolean) ?? false,
          isFeatured: (l.isFeatured as boolean) ?? false,
          serviceMode: l.serviceMode as "center_based" | "in_home" | "both" | undefined,
          insurances: (l.insurances as string[]) || [],
          serviceRadiusMiles: (l.serviceRadiusMiles as number) || 25,
          latitude: (l.latitude as number) ?? null,
          longitude: (l.longitude as number) ?? null,
          googlePlaceId: (l.googlePlaceId as string) ?? null,
          googleRating: (l.googleRating as number) ?? null,
          googleRatingCount: (l.googleRatingCount as number) ?? null,
          showGoogleReviews: (l.showGoogleReviews as boolean) || false,
          contactPhone: (l.contactPhone as string) ?? null,
          contactEmail: (l.contactEmail as string) ?? null,
          contactWebsite: (l.contactWebsite as string) ?? null,
          useCompanyContact: (l.useCompanyContact as boolean) ?? true,
        })),
        attributes: (listing.attributes as Record<string, unknown>) || {},
        photoUrls: (listing.photoUrls as string[]) || [],
        jobCount,
        customDomain:
          customDomain?.domain && customDomain?.status
            ? {
                domain: customDomain.domain,
                status: customDomain.status,
              }
            : null,
      },
    };
  } catch (err) {
    console.error("Convex getProviderWebsiteData error:", err);
    return { success: false, error: "Failed to load provider data" };
  }
}

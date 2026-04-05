"use server";

import { createClient } from "@/lib/supabase/server";
import { isPublicProfileVisible } from "@/lib/public-visibility";
import { STORAGE_BUCKETS } from "@/lib/storage/config";
import { isConvexDataEnabled } from "@/lib/platform/config";
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
  if (isConvexDataEnabled()) {
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

  const supabase = await createClient();

  // Fetch listing with profile (required first to get listing.id)
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select(
      `
      id,
      slug,
      headline,
      description,
      summary,
      service_modes,
      is_accepting_clients,
      logo_url,
      video_url,
      profiles!inner (
        id,
        agency_name,
        contact_email,
        contact_phone,
        website,
        plan_tier,
        subscription_status,
        intake_form_settings,
        is_seeded
      )
    `
    )
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (listingError) {
    if (listingError.code === "PGRST116") {
      return { success: false, error: "Provider not found" };
    }
    return { success: false, error: listingError.message };
  }

  const profile = listing.profiles as unknown as {
    id: string;
    agency_name: string;
    contact_email: string;
    contact_phone: string | null;
    website: string | null;
    plan_tier: string;
    subscription_status: string | null;
    is_seeded: boolean;
    intake_form_settings: {
      background_color?: string;
      show_powered_by?: boolean;
    } | null;
  };

  if (!isPublicProfileVisible(profile)) {
    return { success: false, error: "Provider not found" };
  }

  // Parallel fetch: locations, attributes, photos, job count, custom domain
  const [
    locationsResult,
    attrsResult,
    photosResult,
    jobCountResult,
    domainResult,
  ] = await Promise.all([
    supabase
      .from("locations")
      .select(
        "id, label, street, city, state, postal_code, latitude, longitude, service_radius_miles, is_primary, is_featured, service_mode, insurances, google_place_id, google_rating, google_rating_count, show_google_reviews, contact_phone, contact_email, contact_website, use_company_contact"
      )
      .eq("listing_id", listing.id)
      .order("is_primary", { ascending: false }),
    supabase
      .from("listing_attribute_values")
      .select("attribute_key, value_json, value_text, value_number, value_boolean")
      .eq("listing_id", listing.id),
    supabase
      .from("media_assets")
      .select("id, storage_path, sort_order")
      .eq("listing_id", listing.id)
      .eq("media_type", "photo")
      .order("sort_order", { ascending: true }),
    supabase
      .from("job_postings")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id)
      .eq("status", "published"),
    Promise.resolve({ data: null }),
  ]);

  // Build photo URLs
  const photoUrls =
    photosResult.data?.map((photo) => {
      const { data } = supabase.storage
        .from(STORAGE_BUCKETS.photos)
        .getPublicUrl(photo.storage_path);
      return data.publicUrl;
    }) || [];

  // Build attributes map
  const attributes: Record<string, unknown> = {};
  if (attrsResult.data) {
    attrsResult.data.forEach((attr) => {
      attributes[attr.attribute_key] =
        attr.value_json ??
        attr.value_text ??
        attr.value_number ??
        attr.value_boolean;
    });
  }

  const intakeSettings = profile.intake_form_settings || null;
  const rawSettings: Partial<WebsiteSettings> | null = null;
  const websiteSettings: WebsiteSettings = {
    ...DEFAULT_WEBSITE_SETTINGS,
    ...(rawSettings ?? {}),
  };

  return {
    success: true,
    data: {
      id: listing.id,
      slug: listing.slug,
      headline: listing.headline,
      description: listing.description,
      summary: listing.summary,
      serviceModes: listing.service_modes || [],
      isAcceptingClients: listing.is_accepting_clients,
      logoUrl: listing.logo_url ?? null,
      videoUrl: listing.video_url ?? null,
      websitePublished: true,
      websiteSettings,
      profile: {
        agencyName: profile.agency_name,
        contactEmail: profile.contact_email,
        contactPhone: profile.contact_phone,
        website: profile.website,
        planTier: profile.plan_tier,
        subscriptionStatus: profile.subscription_status,
        intakeFormSettings: {
          background_color: intakeSettings?.background_color || "#0866FF",
          show_powered_by: intakeSettings?.show_powered_by ?? true,
        },
      },
      locations:
        locationsResult.data?.map((l) => ({
          id: l.id,
          label: l.label,
          street: l.street,
          city: l.city,
          state: l.state,
          postalCode: l.postal_code,
          isPrimary: l.is_primary,
          isFeatured: l.is_featured || false,
          serviceMode: l.service_mode as
            | "center_based"
            | "in_home"
            | "both"
            | undefined,
          insurances: l.insurances || [],
          serviceRadiusMiles: l.service_radius_miles || 25,
          latitude: l.latitude,
          longitude: l.longitude,
          googlePlaceId: l.google_place_id,
          googleRating: l.google_rating,
          googleRatingCount: l.google_rating_count,
          showGoogleReviews: l.show_google_reviews || false,
          contactPhone: l.contact_phone,
          contactEmail: l.contact_email,
          contactWebsite: l.contact_website,
          useCompanyContact: l.use_company_contact ?? true,
        })) || [],
      attributes,
      photoUrls,
      jobCount: jobCountResult.count || 0,
      customDomain: domainResult.data
        ? {
            domain: (domainResult.data as { domain: string; status: string }).domain,
            status: (domainResult.data as { domain: string; status: string }).status,
          }
        : null,
    },
  };
}

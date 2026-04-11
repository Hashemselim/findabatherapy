"use server";

import { revalidatePath } from "next/cache";

import {
  mutateConvex,
  queryConvex,
  queryConvexUnauthenticated,
} from "@/lib/platform/convex/server";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export interface ListingData {
  id: string;
  slug: string;
  headline: string | null;
  description: string | null;
  summary: string | null;
  serviceModes: string[];
  status: "draft" | "published" | "suspended";
  isAcceptingClients: boolean;
  logoUrl: string | null;
  videoUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListingWithRelations extends ListingData {
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
  primaryLocation: {
    id: string;
    street: string | null;
    city: string;
    state: string;
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
    serviceRadiusMiles: number;
  } | null;
  locations: Array<{
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
  }>;
  attributes: Record<string, unknown>;
  photoUrls?: string[];
}

function revalidateListingSurfaces() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
}

export async function getListingSlug(): Promise<string | null> {
  try {
    return await queryConvex<string | null>("listings:getCurrentListingSlug", {});
  } catch {
    return null;
  }
}

export async function getListing(): Promise<ActionResult<ListingWithRelations>> {
  try {
    const result = await queryConvex<ListingWithRelations | null>("listings:getDashboardListing", {});
    if (!result) {
      return { success: false, error: "No listing found" };
    }
    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load listing",
    };
  }
}

export async function updateListing(data: {
  headline?: string;
  description?: string;
  summary?: string;
  serviceModes?: string[];
  isAcceptingClients?: boolean;
}): Promise<ActionResult> {
  try {
    await mutateConvex("listings:updateDashboardListing", data);
    revalidateListingSurfaces();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update listing",
    };
  }
}

export async function updateAgencyName(
  agencyName: string,
): Promise<ActionResult<{ newSlug: string }>> {
  try {
    const result = await mutateConvex<{ newSlug: string }>("listings:updateAgencyName", {
      agencyName,
    });
    revalidateListingSurfaces();
    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update agency name",
    };
  }
}

export async function updateListingStatus(
  status: "draft" | "published" | "suspended",
): Promise<ActionResult> {
  try {
    await mutateConvex("listings:updateListingStatus", { status });
    revalidateListingSurfaces();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update listing status",
    };
  }
}

export async function publishListing(): Promise<ActionResult> {
  return updateListingStatus("published");
}

export async function unpublishListing(): Promise<ActionResult> {
  return updateListingStatus("draft");
}

export async function getListingAttributes(): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const result = await queryConvex<Record<string, unknown>>("listings:getListingAttributes", {});
    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load listing attributes",
    };
  }
}

export async function updateListingAttributes(data: {
  insurances?: string[];
  servicesOffered?: string[];
  agesServedMin?: number;
  agesServedMax?: number;
  languages?: string[];
  diagnoses?: string[];
  clinicalSpecialties?: string[];
  isAcceptingClients?: boolean;
}): Promise<ActionResult> {
  try {
    await mutateConvex("listings:updateListingAttributes", data);
    revalidateListingSurfaces();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update listing attributes",
    };
  }
}

export async function updateCompanyContact(data: {
  contactEmail: string;
  contactPhone?: string;
  website?: string;
}): Promise<ActionResult> {
  try {
    await mutateConvex("listings:updateCompanyContact", {
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      website: data.website,
    });
    revalidateListingSurfaces();
    revalidatePath("/dashboard/locations");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update company contact",
    };
  }
}

export async function updateContactFormEnabled(enabled: boolean): Promise<ActionResult> {
  try {
    await mutateConvex("listings:updateContactFormEnabled", { enabled });
    revalidateListingSurfaces();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update contact form setting",
    };
  }
}

export async function updateClientIntakeEnabled(enabled: boolean): Promise<ActionResult> {
  try {
    await mutateConvex("listings:updateClientIntakeEnabled", { enabled });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/forms");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update client intake setting",
    };
  }
}

export async function getClientIntakeEnabled(): Promise<ActionResult<boolean>> {
  try {
    const result = await queryConvex<boolean>("listings:getClientIntakeEnabled", {});
    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load client intake setting",
    };
  }
}

export async function getCareersPageSettings(): Promise<ActionResult<{
  brandColor: string;
  headline: string | null;
  ctaText: string;
  hideBadge: boolean;
}>> {
  try {
    const result = await queryConvex<{
      brandColor: string;
      headline: string | null;
      ctaText: string;
      hideBadge: boolean;
    }>("listings:getCareersPageSettings", {});
    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load careers page settings",
    };
  }
}

export async function updateCareersPageSettings(data: {
  brandColor?: string;
  headline?: string;
  ctaText?: string;
}): Promise<ActionResult> {
  try {
    await mutateConvex("listings:updateCareersPageSettings", data);
    revalidatePath("/dashboard/careers");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update careers page settings",
    };
  }
}

export async function updateCareersHideBadge(hideBadge: boolean): Promise<ActionResult> {
  try {
    await mutateConvex("listings:updateCareersHideBadge", { hideBadge });
    revalidatePath("/dashboard/careers");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update careers badge setting",
    };
  }
}

export async function getListingBySlug(
  slug: string,
): Promise<ActionResult<ListingWithRelations>> {
  try {
    const result = await queryConvexUnauthenticated<ListingWithRelations | null>(
      "listings:getPublicListingBySlug",
      { slug },
    );
    if (!result) {
      const previewResult = await getListing();
      if (previewResult.success && previewResult.data?.slug === slug) {
        return { success: true, data: previewResult.data };
      }
      return { success: false, error: "Listing not found" };
    }
    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load listing",
    };
  }
}

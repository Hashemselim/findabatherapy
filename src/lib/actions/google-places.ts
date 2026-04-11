"use server";

import { queryConvex, mutateConvex } from "@/lib/platform/convex/server";

// Types for Google Places listing data
export interface GooglePlacesListing {
  id: string;
  google_place_id: string;
  name: string;
  slug: string;
  street: string | null;
  city: string;
  state: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  formatted_address: string | null;
  phone: string | null;
  website: string | null;
  google_rating: number | null;
  google_rating_count: number | null;
  status: "active" | "removed" | "claimed";
  created_at: string;
  updated_at: string;
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get a pre-populated listing by slug
 */
export async function getGooglePlacesListing(
  slug: string
): Promise<ActionResult<GooglePlacesListing>> {
  const result = await queryConvex<GooglePlacesListing | null>("listings:getGooglePlacesListing", { slug });
  if (!result) {
    return { success: false, error: "Listing not found" };
  }
  return { success: true, data: result };
}

/**
 * Get a pre-populated listing by ID
 */
export async function getGooglePlacesListingById(
  id: string
): Promise<ActionResult<GooglePlacesListing>> {
  const result = await queryConvex<GooglePlacesListing | null>("listings:getGooglePlacesListingById", { id });
  if (!result) {
    return { success: false, error: "Listing not found" };
  }
  return { success: true, data: result };
}

/**
 * Check user's claim eligibility for a listing
 */
export async function getClaimEligibility(googlePlacesListingId: string): Promise<{
  status: "signed_out" | "no_listing" | "has_listing";
  existingRequest?: { id: string; status: string };
  listingSlug?: string;
}> {
  return queryConvex<{
    status: "signed_out" | "no_listing" | "has_listing";
    existingRequest?: { id: string; status: string };
    listingSlug?: string;
  }>("listings:getClaimEligibility", { googlePlacesListingId });
}

/**
 * Submit a removal request
 */
export async function submitRemovalRequest(
  googlePlacesListingId: string,
  reason?: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = await mutateConvex<{ id: string }>("listings:submitRemovalRequest", {
      googlePlacesListingId,
      reason: reason ?? null,
    });
    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to submit request",
    };
  }
}

/**
 * Search Google Places listings by state/city
 */
export async function searchGooglePlacesListings(filters: {
  state?: string;
  city?: string;
  limit?: number;
  offset?: number;
}): Promise<ActionResult<{ listings: GooglePlacesListing[]; total: number }>> {
  const result = await queryConvex<{ listings: GooglePlacesListing[]; total: number }>(
    "listings:searchGooglePlacesListings",
    {
      state: filters.state,
      city: filters.city,
      limit: filters.limit,
      offset: filters.offset,
    },
  );
  return {
    success: true,
    data: result,
  };
}

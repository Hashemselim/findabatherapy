"use server";

import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("google_places_listings")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { success: false, error: "Listing not found" };
    }
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Get a pre-populated listing by ID
 */
export async function getGooglePlacesListingById(
  id: string
): Promise<ActionResult<GooglePlacesListing>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("google_places_listings")
    .select("*")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { success: false, error: "Listing not found" };
    }
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Check user's claim eligibility for a listing
 */
export async function getClaimEligibility(googlePlacesListingId: string): Promise<{
  status: "signed_out" | "no_listing" | "has_listing";
  existingRequest?: { id: string; status: string };
  listingSlug?: string;
}> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { status: "signed_out" };
  }

  // Check if user has a listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id, slug")
    .eq("profile_id", user.id)
    .eq("status", "published")
    .single();

  if (!listing) {
    return { status: "no_listing" };
  }

  // Check for existing request
  const { data: existingRequest } = await supabase
    .from("removal_requests")
    .select("id, status")
    .eq("google_places_listing_id", googlePlacesListingId)
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return {
    status: "has_listing",
    existingRequest: existingRequest || undefined,
    listingSlug: listing.slug,
  };
}

/**
 * Submit a removal request
 */
export async function submitRemovalRequest(
  googlePlacesListingId: string,
  reason?: string
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get user's listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .eq("status", "published")
    .single();

  if (!listing) {
    return { success: false, error: "You must have a published listing to request removal" };
  }

  // Check for existing pending request
  const { data: existingRequest } = await supabase
    .from("removal_requests")
    .select("id")
    .eq("google_places_listing_id", googlePlacesListingId)
    .eq("profile_id", user.id)
    .eq("status", "pending")
    .single();

  if (existingRequest) {
    return { success: false, error: "You already have a pending request for this listing" };
  }

  // Create request
  const { data, error } = await supabase
    .from("removal_requests")
    .insert({
      google_places_listing_id: googlePlacesListingId,
      profile_id: user.id,
      listing_id: listing.id,
      reason: reason || null,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: { id: data.id } };
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
  const supabase = await createClient();

  let query = supabase
    .from("google_places_listings")
    .select("*", { count: "exact" })
    .eq("status", "active")
    .order("google_rating", { ascending: false, nullsFirst: false });

  if (filters.state) {
    query = query.eq("state", filters.state);
  }

  if (filters.city) {
    query = query.ilike("city", `%${filters.city}%`);
  }

  const limit = filters.limit || 20;
  const offset = filters.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      listings: data || [],
      total: count || 0,
    },
  };
}

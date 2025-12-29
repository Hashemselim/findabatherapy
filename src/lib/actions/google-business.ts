"use server";

import { revalidatePath } from "next/cache";

import { createClient, getUser } from "@/lib/supabase/server";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

/**
 * Link a Google Business place to a location.
 * Updates the location with the Google Place ID and rating data.
 */
export async function linkGoogleBusiness(
  locationId: string,
  placeId: string,
  rating: number | null,
  ratingCount: number | null
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Verify ownership of the location
  const { data: location } = await supabase
    .from("locations")
    .select("id, listing_id, listings!inner(profile_id)")
    .eq("id", locationId)
    .single();

  if (!location) {
    return { success: false, error: "Location not found" };
  }

  const listing = location.listings as unknown as { profile_id: string };
  if (listing.profile_id !== user.id) {
    return { success: false, error: "Not authorized" };
  }

  // Update location with Google Business data
  const { error } = await supabase
    .from("locations")
    .update({
      google_place_id: placeId,
      google_rating: rating,
      google_rating_count: ratingCount,
    })
    .eq("id", locationId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listing");
  revalidatePath("/dashboard/locations");
  return { success: true };
}

/**
 * Unlink a Google Business place from a location.
 * Removes the Google Place ID and rating data.
 */
export async function unlinkGoogleBusiness(locationId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Verify ownership of the location
  const { data: location } = await supabase
    .from("locations")
    .select("id, listing_id, listings!inner(profile_id)")
    .eq("id", locationId)
    .single();

  if (!location) {
    return { success: false, error: "Location not found" };
  }

  const listing = location.listings as unknown as { profile_id: string };
  if (listing.profile_id !== user.id) {
    return { success: false, error: "Not authorized" };
  }

  // Clear Google Business data
  const { error } = await supabase
    .from("locations")
    .update({
      google_place_id: null,
      google_rating: null,
      google_rating_count: null,
    })
    .eq("id", locationId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listing");
  revalidatePath("/dashboard/locations");
  return { success: true };
}

/**
 * Refresh Google rating data for a linked location.
 * Fetches the latest rating from Google Places API.
 */
export async function refreshGoogleRating(locationId: string): Promise<ActionResult<{ rating: number | null; ratingCount: number | null }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Verify ownership and get Google Place ID
  const { data: location } = await supabase
    .from("locations")
    .select("id, google_place_id, listings!inner(profile_id)")
    .eq("id", locationId)
    .single();

  if (!location) {
    return { success: false, error: "Location not found" };
  }

  const listing = location.listings as unknown as { profile_id: string };
  if (listing.profile_id !== user.id) {
    return { success: false, error: "Not authorized" };
  }

  if (!location.google_place_id) {
    return { success: false, error: "Location is not linked to a Google Business" };
  }

  // Fetch latest data from Google Places API
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Google Maps API not configured" };
  }

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${location.google_place_id}`,
      {
        method: "GET",
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "rating,userRatingCount",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Places API error:", errorText);
      return { success: false, error: "Failed to fetch Google rating" };
    }

    const data = await response.json();
    const rating = data.rating ?? null;
    const ratingCount = data.userRatingCount ?? null;

    // Update the location with fresh data
    const { error } = await supabase
      .from("locations")
      .update({
        google_rating: rating,
        google_rating_count: ratingCount,
      })
      .eq("id", locationId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/listing");
    return { success: true, data: { rating, ratingCount } };
  } catch (err) {
    console.error("Error refreshing Google rating:", err);
    return { success: false, error: "Failed to refresh rating" };
  }
}

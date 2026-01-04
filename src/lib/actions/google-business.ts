"use server";

import { revalidatePath } from "next/cache";

import { createClient, createAdminClient, getUser } from "@/lib/supabase/server";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// Types for Google Reviews
export interface GoogleReview {
  id: string;
  locationId: string;
  googleReviewId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  rating: number;
  text: string | null;
  relativeTimeDescription: string | null;
  publishedAt: string | null;
  isSelected: boolean;
  fetchedAt: string;
}

interface GooglePlacesReview {
  name: string; // This is the review's resource name, used as ID
  relativePublishTimeDescription?: string;
  rating?: number;
  text?: { text: string };
  authorAttribution?: {
    displayName?: string;
    photoUri?: string;
  };
  publishTime?: string;
}

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
  revalidatePath("/dashboard/company");
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
  revalidatePath("/dashboard/company");
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
    revalidatePath("/dashboard/company");
    return { success: true, data: { rating, ratingCount } };
  } catch (err) {
    console.error("Error refreshing Google rating:", err);
    return { success: false, error: "Failed to refresh rating" };
  }
}

/**
 * Fetch and cache Google reviews for a location.
 * Google Places API returns up to 5 "most relevant" reviews.
 */
export async function fetchGoogleReviews(
  locationId: string
): Promise<ActionResult<{ reviews: GoogleReview[] }>> {
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

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Google Maps API not configured" };
  }

  try {
    // Fetch reviews from Google Places API
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${location.google_place_id}`,
      {
        method: "GET",
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "reviews",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Places API error:", errorText);
      return { success: false, error: "Failed to fetch Google reviews" };
    }

    const data = await response.json();
    const googleReviews: GooglePlacesReview[] = data.reviews || [];

    if (googleReviews.length === 0) {
      return { success: true, data: { reviews: [] } };
    }

    // Use admin client to bypass RLS for insert
    const adminClient = await createAdminClient();

    // Get existing reviews to preserve selection state
    const { data: existingReviews } = await adminClient
      .from("google_reviews")
      .select("google_review_id, is_selected")
      .eq("location_id", locationId);

    const existingSelections = new Map(
      (existingReviews || []).map((r) => [r.google_review_id, r.is_selected])
    );

    // Delete old reviews for this location
    await adminClient
      .from("google_reviews")
      .delete()
      .eq("location_id", locationId);

    // Insert new reviews
    const reviewsToInsert = googleReviews.map((review) => {
      const googleReviewId = review.name; // Google uses the resource name as ID
      return {
        location_id: locationId,
        google_review_id: googleReviewId,
        author_name: review.authorAttribution?.displayName || "Anonymous",
        author_photo_url: review.authorAttribution?.photoUri || null,
        rating: review.rating || 5,
        text: review.text?.text || null,
        relative_time_description: review.relativePublishTimeDescription || null,
        published_at: review.publishTime || null,
        is_selected: existingSelections.get(googleReviewId) || false,
        fetched_at: new Date().toISOString(),
      };
    });

    const { error: insertError } = await adminClient
      .from("google_reviews")
      .insert(reviewsToInsert);

    if (insertError) {
      console.error("Error inserting reviews:", insertError);
      return { success: false, error: "Failed to cache reviews" };
    }

    // Fetch the inserted reviews to return
    const { data: savedReviews, error: fetchError } = await adminClient
      .from("google_reviews")
      .select("*")
      .eq("location_id", locationId)
      .order("rating", { ascending: false });

    if (fetchError) {
      return { success: false, error: "Failed to retrieve saved reviews" };
    }

    const reviews: GoogleReview[] = (savedReviews || []).map((r) => ({
      id: r.id,
      locationId: r.location_id,
      googleReviewId: r.google_review_id,
      authorName: r.author_name,
      authorPhotoUrl: r.author_photo_url,
      rating: r.rating,
      text: r.text,
      relativeTimeDescription: r.relative_time_description,
      publishedAt: r.published_at,
      isSelected: r.is_selected,
      fetchedAt: r.fetched_at,
    }));

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/locations");
    return { success: true, data: { reviews } };
  } catch (err) {
    console.error("Error fetching Google reviews:", err);
    return { success: false, error: "Failed to fetch reviews" };
  }
}

/**
 * Get cached Google reviews for a location.
 */
export async function getGoogleReviews(
  locationId: string
): Promise<ActionResult<{ reviews: GoogleReview[] }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Verify ownership
  const { data: location } = await supabase
    .from("locations")
    .select("id, listings!inner(profile_id)")
    .eq("id", locationId)
    .single();

  if (!location) {
    return { success: false, error: "Location not found" };
  }

  const listing = location.listings as unknown as { profile_id: string };
  if (listing.profile_id !== user.id) {
    return { success: false, error: "Not authorized" };
  }

  const { data: reviews, error } = await supabase
    .from("google_reviews")
    .select("*")
    .eq("location_id", locationId)
    .order("rating", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  const formattedReviews: GoogleReview[] = (reviews || []).map((r) => ({
    id: r.id,
    locationId: r.location_id,
    googleReviewId: r.google_review_id,
    authorName: r.author_name,
    authorPhotoUrl: r.author_photo_url,
    rating: r.rating,
    text: r.text,
    relativeTimeDescription: r.relative_time_description,
    publishedAt: r.published_at,
    isSelected: r.is_selected,
    fetchedAt: r.fetched_at,
  }));

  return { success: true, data: { reviews: formattedReviews } };
}

/**
 * Update which reviews are selected for display.
 * Maximum of 4 reviews can be selected.
 */
export async function updateSelectedReviews(
  locationId: string,
  selectedReviewIds: string[]
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  if (selectedReviewIds.length > 4) {
    return { success: false, error: "Maximum of 4 reviews can be selected" };
  }

  const supabase = await createClient();

  // Verify ownership
  const { data: location } = await supabase
    .from("locations")
    .select("id, listings!inner(profile_id, slug)")
    .eq("id", locationId)
    .single();

  if (!location) {
    return { success: false, error: "Location not found" };
  }

  const listing = location.listings as unknown as { profile_id: string; slug: string };
  if (listing.profile_id !== user.id) {
    return { success: false, error: "Not authorized" };
  }

  // Use admin client to update reviews
  const adminClient = await createAdminClient();

  // First, deselect all reviews for this location
  const { error: deselectError } = await adminClient
    .from("google_reviews")
    .update({ is_selected: false })
    .eq("location_id", locationId);

  if (deselectError) {
    return { success: false, error: "Failed to update reviews" };
  }

  // Then select the specified reviews
  if (selectedReviewIds.length > 0) {
    const { error: selectError } = await adminClient
      .from("google_reviews")
      .update({ is_selected: true })
      .eq("location_id", locationId)
      .in("id", selectedReviewIds);

    if (selectError) {
      return { success: false, error: "Failed to update reviews" };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/locations");
  revalidatePath(`/provider/${listing.slug}`);
  return { success: true };
}

/**
 * Toggle whether to show Google reviews on the provider detail page.
 */
export async function toggleShowGoogleReviews(
  locationId: string,
  showReviews: boolean
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Verify ownership
  const { data: location } = await supabase
    .from("locations")
    .select("id, listings!inner(profile_id, slug)")
    .eq("id", locationId)
    .single();

  if (!location) {
    return { success: false, error: "Location not found" };
  }

  const listing = location.listings as unknown as { profile_id: string; slug: string };
  if (listing.profile_id !== user.id) {
    return { success: false, error: "Not authorized" };
  }

  const { error } = await supabase
    .from("locations")
    .update({ show_google_reviews: showReviews })
    .eq("id", locationId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/locations");
  revalidatePath(`/provider/${listing.slug}`);
  return { success: true };
}

/**
 * Get selected Google reviews for a location (public).
 * Only returns reviews that are selected and the location has show_google_reviews enabled.
 */
export async function getSelectedGoogleReviews(
  locationId: string
): Promise<GoogleReview[]> {
  try {
    const supabase = await createClient();

    // First check if the location has show_google_reviews enabled
    const { data: location, error: locationError } = await supabase
      .from("locations")
      .select("show_google_reviews")
      .eq("id", locationId)
      .single();

    // If column doesn't exist or location not found, return empty
    if (locationError || !location?.show_google_reviews) {
      return [];
    }

    // Fetch selected reviews using admin client to bypass RLS
    const adminClient = await createAdminClient();

    const { data: reviews, error: reviewsError } = await adminClient
      .from("google_reviews")
      .select("*")
      .eq("location_id", locationId)
      .eq("is_selected", true)
      .order("rating", { ascending: false })
      .limit(4);

    // If table doesn't exist or error, return empty
    if (reviewsError || !reviews) {
      return [];
    }

    return reviews.map((r) => ({
      id: r.id,
      locationId: r.location_id,
      googleReviewId: r.google_review_id,
      authorName: r.author_name,
      authorPhotoUrl: r.author_photo_url,
      rating: r.rating,
      text: r.text,
      relativeTimeDescription: r.relative_time_description,
      publishedAt: r.published_at,
      isSelected: r.is_selected,
      fetchedAt: r.fetched_at,
    }));
  } catch {
    // Migration not run yet - return empty
    return [];
  }
}

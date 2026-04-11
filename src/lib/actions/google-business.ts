"use server";

import { revalidatePath } from "next/cache";

import { queryConvex, mutateConvex } from "@/lib/platform/convex/server";
import { getCurrentWorkspace } from "@/lib/platform/workspace/server";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

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
  name: string;
  relativePublishTimeDescription?: string;
  rating?: number;
  text?: { text: string };
  authorAttribution?: {
    displayName?: string;
    photoUri?: string;
  };
  publishTime?: string;
}

interface ConvexLocation {
  id: string;
  googlePlaceId?: string | null;
}

async function getDashboardLocation(locationId: string): Promise<ConvexLocation | null> {
  const locations = await queryConvex<ConvexLocation[]>("locations:getDashboardLocations");
  return locations.find((location) => location.id === locationId) ?? null;
}

async function revalidateGoogleBusinessPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/locations");

  const workspace = await getCurrentWorkspace();
  const slug = workspace?.workspace.slug;
  if (slug) {
    revalidatePath(`/provider/${slug}`);
  }
}

async function fetchPlaceData<T extends "rating,userRatingCount" | "reviews">(
  googlePlaceId: string,
  fieldMask: T,
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch(`https://places.googleapis.com/v1/places/${googlePlaceId}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Google Places API error:", errorText);
    return null;
  }

  return response.json();
}

export async function linkGoogleBusiness(
  locationId: string,
  placeId: string,
  rating: number | null,
  ratingCount: number | null,
): Promise<ActionResult> {
  try {
    await mutateConvex("locations:updateLocation", {
      locationId,
      googlePlaceId: placeId,
      googleRating: rating,
      googleRatingCount: ratingCount,
    });
    await revalidateGoogleBusinessPaths();
    return { success: true };
  } catch (err) {
    console.error("Convex linkGoogleBusiness error:", err);
    return { success: false, error: "Failed to link Google Business" };
  }
}

export async function unlinkGoogleBusiness(locationId: string): Promise<ActionResult> {
  try {
    await mutateConvex("locations:updateLocation", {
      locationId,
      googlePlaceId: null,
      googleRating: null,
      googleRatingCount: null,
      showGoogleReviews: false,
    });
    await revalidateGoogleBusinessPaths();
    return { success: true };
  } catch (err) {
    console.error("Convex unlinkGoogleBusiness error:", err);
    return { success: false, error: "Failed to unlink Google Business" };
  }
}

export async function refreshGoogleRating(
  locationId: string,
): Promise<ActionResult<{ rating: number | null; ratingCount: number | null }>> {
  try {
    const location = await getDashboardLocation(locationId);
    if (!location?.googlePlaceId) {
      return { success: false, error: "Location is not linked to a Google Business" };
    }

    const data = await fetchPlaceData(location.googlePlaceId, "rating,userRatingCount");
    if (!data) {
      return { success: false, error: "Failed to fetch Google rating" };
    }

    const rating = typeof data.rating === "number" ? data.rating : null;
    const ratingCount = typeof data.userRatingCount === "number" ? data.userRatingCount : null;

    await mutateConvex("locations:updateLocation", {
      locationId,
      googleRating: rating,
      googleRatingCount: ratingCount,
    });

    await revalidateGoogleBusinessPaths();
    return { success: true, data: { rating, ratingCount } };
  } catch (err) {
    console.error("Convex refreshGoogleRating error:", err);
    return { success: false, error: "Failed to refresh rating" };
  }
}

export async function fetchGoogleReviews(
  locationId: string,
): Promise<ActionResult<{ reviews: GoogleReview[] }>> {
  try {
    const location = await getDashboardLocation(locationId);
    if (!location?.googlePlaceId) {
      return { success: false, error: "Location is not linked to a Google Business" };
    }

    const data = await fetchPlaceData(location.googlePlaceId, "reviews");
    if (!data) {
      return { success: false, error: "Failed to fetch Google reviews" };
    }

    const googleReviews = Array.isArray(data.reviews) ? (data.reviews as GooglePlacesReview[]) : [];
    if (googleReviews.length === 0) {
      return { success: true, data: { reviews: [] } };
    }

    await mutateConvex("locations:upsertGoogleReviews", {
      locationId,
      reviews: googleReviews.map((review) => ({
        googleReviewId: review.name,
        authorName: review.authorAttribution?.displayName || "Anonymous",
        authorPhotoUrl: review.authorAttribution?.photoUri || null,
        rating: review.rating || 5,
        text: review.text?.text || null,
        relativeTimeDescription: review.relativePublishTimeDescription || null,
        publishedAt: review.publishTime || null,
      })),
    });

    const result = await queryConvex<{ reviews: GoogleReview[] }>("locations:getGoogleReviews", {
      locationId,
    });
    await revalidateGoogleBusinessPaths();
    return { success: true, data: result };
  } catch (err) {
    console.error("Convex fetchGoogleReviews error:", err);
    return { success: false, error: "Failed to fetch Google reviews" };
  }
}

export async function getGoogleReviews(
  locationId: string,
): Promise<ActionResult<{ reviews: GoogleReview[] }>> {
  try {
    const result = await queryConvex<{ reviews: GoogleReview[] }>("locations:getGoogleReviews", {
      locationId,
    });
    return { success: true, data: result };
  } catch (err) {
    console.error("Convex getGoogleReviews error:", err);
    return { success: false, error: "Failed to load Google reviews" };
  }
}

export async function updateSelectedReviews(
  locationId: string,
  selectedReviewIds: string[],
): Promise<ActionResult> {
  try {
    await mutateConvex("locations:updateSelectedGoogleReviews", {
      locationId,
      selectedReviewIds,
    });
    await revalidateGoogleBusinessPaths();
    return { success: true };
  } catch (err) {
    console.error("Convex updateSelectedReviews error:", err);
    return { success: false, error: "Failed to update selected reviews" };
  }
}

export async function toggleShowGoogleReviews(
  locationId: string,
  showReviews: boolean,
): Promise<ActionResult> {
  try {
    await mutateConvex("locations:updateLocation", {
      locationId,
      showGoogleReviews: showReviews,
    });
    await revalidateGoogleBusinessPaths();
    return { success: true };
  } catch (err) {
    console.error("Convex toggleShowGoogleReviews error:", err);
    return { success: false, error: "Failed to update Google reviews visibility" };
  }
}

export async function getSelectedGoogleReviews(locationId: string): Promise<GoogleReview[]> {
  try {
    return await queryConvex<GoogleReview[]>("locations:getSelectedGoogleReviewsPublic", {
      locationId,
    });
  } catch (err) {
    console.error("Convex getSelectedGoogleReviews error:", err);
    return [];
  }
}

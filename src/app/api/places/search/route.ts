import { NextRequest, NextResponse } from "next/server";

import { getUser } from "@/lib/supabase/server";

const TEXT_SEARCH_API_URL = "https://places.googleapis.com/v1/places:searchText";

interface GooglePlaceResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
}

interface TextSearchResponse {
  places?: GooglePlaceResult[];
}

export interface PlacesSearchResult {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  ratingCount: number | null;
}

/**
 * POST /api/places/search
 * Search for businesses on Google Places to link to a location.
 * Requires authentication.
 *
 * Body:
 * - query: string - Business name to search for
 * - city: string - City to search in
 * - state: string - State to search in
 *
 * Returns:
 * - results: PlacesSearchResult[]
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Maps API key not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { query, city, state } = body;

    // Validate input
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Query is required (minimum 2 characters)" },
        { status: 400 }
      );
    }

    if (!city || typeof city !== "string") {
      return NextResponse.json(
        { error: "City is required" },
        { status: 400 }
      );
    }

    if (!state || typeof state !== "string") {
      return NextResponse.json(
        { error: "State is required" },
        { status: 400 }
      );
    }

    // Build the search query including location context
    const searchQuery = `${query.trim()} ${city} ${state}`;

    // Call Google Places Text Search API
    const response = await fetch(TEXT_SEARCH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        // Request only the fields we need to minimize cost
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        maxResultCount: 10, // Limit results
        languageCode: "en",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Places Text Search API error:", errorText);
      return NextResponse.json(
        { error: "Failed to search Google Places" },
        { status: response.status }
      );
    }

    const data: TextSearchResponse = await response.json();

    // Transform to our format
    const results: PlacesSearchResult[] = (data.places || []).map((place) => ({
      placeId: place.id,
      name: place.displayName?.text || "Unknown Business",
      address: place.formattedAddress || "",
      rating: place.rating ?? null,
      ratingCount: place.userRatingCount ?? null,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Places search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

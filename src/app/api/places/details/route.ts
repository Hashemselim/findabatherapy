import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Maps API key not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { placeId, sessionToken } = body;

    if (!placeId || typeof placeId !== "string") {
      return NextResponse.json(
        { error: "Place ID is required" },
        { status: 400 }
      );
    }

    // Call Places API (New) - Get Place Details
    const url = `https://places.googleapis.com/v1/places/${placeId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        // Request only the fields we need
        "X-Goog-FieldMask": "id,formattedAddress,location,addressComponents",
        // Session token for billing optimization (ends the session)
        ...(sessionToken && { "X-Goog-SessionToken": sessionToken }),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Places details API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch place details" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract address components
    let streetNumber: string | undefined;
    let route: string | undefined;
    let city: string | undefined;
    let state: string | undefined;
    let postalCode: string | undefined;

    if (data.addressComponents) {
      for (const component of data.addressComponents) {
        const types = component.types || [];
        if (types.includes("street_number")) {
          streetNumber = component.longText;
        }
        if (types.includes("route")) {
          route = component.longText;
        }
        if (types.includes("locality")) {
          city = component.longText;
        }
        if (types.includes("administrative_area_level_1")) {
          state = component.shortText;
        }
        if (types.includes("postal_code")) {
          postalCode = component.longText;
        }
      }
    }

    // Build street address from components (handle missing parts)
    const streetAddress = [streetNumber, route].filter(Boolean).join(" ") || undefined;

    return NextResponse.json({
      placeId: data.id,
      formattedAddress: data.formattedAddress || "",
      streetAddress,
      city,
      state,
      postalCode,
      latitude: data.location?.latitude || 0,
      longitude: data.location?.longitude || 0,
    });
  } catch (error) {
    console.error("Places details error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

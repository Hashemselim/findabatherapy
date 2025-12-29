import { NextRequest, NextResponse } from "next/server";

import { geocodeAddress } from "@/lib/geo/geocode";
import { getGeoConfig } from "@/lib/geo/config";

export async function POST(request: NextRequest) {
  try {
    // Check if geocoding is configured
    const config = getGeoConfig();
    if (!config) {
      return NextResponse.json(
        { error: "Geocoding service not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { address } = body;

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    const result = await geocodeAddress(address);

    if (!result) {
      return NextResponse.json(
        { error: "Could not geocode address" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      latitude: result.latitude,
      longitude: result.longitude,
      formattedAddress: result.formattedAddress,
      city: result.city,
      state: result.state,
      postalCode: result.postalCode,
    });
  } catch (error) {
    console.error("Geocoding API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

const PLACES_API_URL = "https://places.googleapis.com/v1/places:autocomplete";

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
    const { input, sessionToken } = body;

    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "Input is required" },
        { status: 400 }
      );
    }

    // Call Places API (New)
    const response = await fetch(PLACES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        // Request specific fields to minimize cost
        "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
      },
      body: JSON.stringify({
        input,
        // Restrict to US
        includedRegionCodes: ["us"],
        // Session token for billing optimization
        ...(sessionToken && { sessionToken }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Places API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch place suggestions" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform response to a simpler format
    const suggestions = (data.suggestions || [])
      .filter((s: { placePrediction?: unknown }) => s.placePrediction)
      .map((s: {
        placePrediction: {
          placeId: string;
          text?: { text: string };
          structuredFormat?: {
            mainText?: { text: string };
            secondaryText?: { text: string };
          };
        };
      }) => ({
        placeId: s.placePrediction.placeId,
        description: s.placePrediction.text?.text || "",
        mainText: s.placePrediction.structuredFormat?.mainText?.text || "",
        secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text || "",
      }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Places autocomplete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

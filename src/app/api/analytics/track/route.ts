import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  trackListingView,
  trackListingClick,
  trackSearchClick,
} from "@/lib/analytics/track";
import { EVENT_TYPES } from "@/lib/analytics/events";

const trackEventSchema = z.object({
  eventType: z.enum([
    EVENT_TYPES.LISTING_VIEW,
    EVENT_TYPES.LISTING_CONTACT_CLICK,
    EVENT_TYPES.LISTING_PHONE_CLICK,
    EVENT_TYPES.LISTING_EMAIL_CLICK,
    EVENT_TYPES.LISTING_WEBSITE_CLICK,
    EVENT_TYPES.SEARCH_CLICK,
  ]),
  listingId: z.string().uuid(),
  listingSlug: z.string().optional(),
  locationId: z.string().uuid().optional(),
  source: z.enum(["search", "direct", "state_page", "homepage"]).optional(),
  clickType: z.enum(["contact", "phone", "email", "website"]).optional(),
  position: z.number().optional(),
  searchQuery: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = trackEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { eventType, listingId, listingSlug, locationId, source, clickType, position, searchQuery } =
      parsed.data;

    let result: { success: boolean };

    switch (eventType) {
      case EVENT_TYPES.LISTING_VIEW:
        result = await trackListingView(listingId, listingSlug || "", source, locationId);
        break;

      case EVENT_TYPES.LISTING_CONTACT_CLICK:
      case EVENT_TYPES.LISTING_PHONE_CLICK:
      case EVENT_TYPES.LISTING_EMAIL_CLICK:
      case EVENT_TYPES.LISTING_WEBSITE_CLICK:
        result = await trackListingClick(listingId, clickType || "contact");
        break;

      case EVENT_TYPES.SEARCH_CLICK:
        result = await trackSearchClick(listingId, position || 0, searchQuery, locationId);
        break;

      default:
        return NextResponse.json({ error: "Unknown event type" }, { status: 400 });
    }

    if (result.success) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Failed to track event" }, { status: 500 });
  } catch (error) {
    console.error("Analytics tracking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { guardSocialPosts } from "@/lib/plans/guards";
import { getTemplateById } from "@/lib/social/templates";
import { renderSocialImage } from "@/lib/social/render";
import type { BrandData } from "@/lib/social/types";
import { isConvexDataEnabled } from "@/lib/platform/config";
import { getCurrentProfileId } from "@/lib/platform/workspace/server";
import { queryConvex } from "@/lib/platform/convex/server";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;

  // Auth check
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await guardSocialPosts();
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  // Get template
  const template = getTemplateById(templateId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Get brand data
  let brand: BrandData;

  if (isConvexDataEnabled()) {
    const listingData = await queryConvex("listings:getByProfileId", {
      profileId,
    }) as { agencyName?: string; logoUrl?: string; brandColor?: string } | null;
    brand = {
      agencyName: listingData?.agencyName || "Your Agency",
      logoUrl: listingData?.logoUrl || null,
      brandColor: listingData?.brandColor || "#5788FF",
      profileId,
    };
  } else {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: listing } = await supabase
      .from("listings")
      .select("logo_url, profiles!inner(agency_name, intake_form_settings)")
      .eq("profile_id", profileId)
      .single();

    const profile = listing?.profiles as unknown as {
      agency_name: string | null;
      intake_form_settings: { background_color?: string } | null;
    };

    brand = {
      agencyName: profile?.agency_name || "Your Agency",
      logoUrl: listing?.logo_url || null,
      brandColor: profile?.intake_form_settings?.background_color || "#5788FF",
      profileId,
    };
  }

  // Render and return the image
  return renderSocialImage(template, brand);
}

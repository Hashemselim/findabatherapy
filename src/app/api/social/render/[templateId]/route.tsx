import { NextRequest, NextResponse } from "next/server";
import { createClient, getCurrentProfileId } from "@/lib/supabase/server";
import { getTemplateById } from "@/lib/social/templates";
import { renderSocialImage } from "@/lib/social/render";
import type { BrandData } from "@/lib/social/types";

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

  // Get template
  const template = getTemplateById(templateId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Get brand data from Supabase
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

  const brand: BrandData = {
    agencyName: profile?.agency_name || "Your Agency",
    logoUrl: listing?.logo_url || null,
    brandColor: profile?.intake_form_settings?.background_color || "#5788FF",
    profileId,
  };

  // Render and return the image
  return renderSocialImage(template, brand);
}

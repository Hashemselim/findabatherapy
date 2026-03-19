"use server";

import {
  createClient,
  createAdminClient,
  getCurrentProfileId,
} from "@/lib/supabase/server";
import { SOCIAL_TEMPLATES } from "@/lib/social/templates";
import { type BrandData } from "@/lib/social/types";
import { STORAGE_BUCKETS } from "@/lib/storage/config";
import crypto from "crypto";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const BUCKET = STORAGE_BUCKETS.socialPosts;

/** Hash brand inputs to detect when regeneration is needed */
function hashBrand(brand: BrandData): string {
  const input = `${brand.agencyName}|${brand.logoUrl || ""}|${brand.brandColor}`;
  return crypto.createHash("md5").update(input).digest("hex").slice(0, 12);
}

/** Get brand data for the current user */
export async function getSocialBrandData(): Promise<ActionResult<BrandData>> {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("logo_url, profiles!inner(agency_name, intake_form_settings)")
    .eq("profile_id", profileId)
    .single();

  const profile = listing?.profiles as unknown as {
    agency_name: string | null;
    intake_form_settings: { background_color?: string } | null;
  } | null;

  return {
    success: true,
    data: {
      agencyName: profile?.agency_name || "Your Agency",
      logoUrl: listing?.logo_url || null,
      brandColor:
        profile?.intake_form_settings?.background_color || "#5788FF",
      profileId,
    },
  };
}

/** Check if pre-generated assets exist and are current */
export async function checkSocialAssetsStatus(): Promise<
  ActionResult<{ ready: boolean; brandHash: string; assetCount: number }>
> {
  const brandResult = await getSocialBrandData();
  if (!brandResult.success) {
    return { success: false, error: brandResult.error };
  }

  const brand = brandResult.data;
  const currentHash = hashBrand(brand);
  const supabase = await createClient();

  // Check for manifest file that tracks generation state
  const { data: manifestData } = await supabase.storage
    .from(BUCKET)
    .download(`${brand.profileId}/manifest.json`);

  if (manifestData) {
    try {
      const manifest = JSON.parse(await manifestData.text()) as {
        brandHash?: string;
        count?: number;
      };
      if (manifest.brandHash === currentHash) {
        return {
          success: true,
          data: {
            ready: true,
            brandHash: currentHash,
            assetCount: manifest.count || 0,
          },
        };
      }
    } catch {
      // Manifest corrupt, needs regeneration
    }
  }

  return {
    success: true,
    data: { ready: false, brandHash: currentHash, assetCount: 0 },
  };
}

/** Generate all social post images and upload to storage */
export async function generateSocialAssets(): Promise<
  ActionResult<{ count: number }>
> {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const brandResult = await getSocialBrandData();
  if (!brandResult.success) {
    return { success: false, error: brandResult.error };
  }

  const brand = brandResult.data;
  const currentHash = hashBrand(brand);

  try {
    // Use admin client (service role) for storage writes to bypass RLS
    const adminClient = await createAdminClient();

    const { renderSocialImage } = await import("@/lib/social/render");
    let generatedCount = 0;

    for (const template of SOCIAL_TEMPLATES) {
      try {
        const imageResponse = renderSocialImage(template, brand);
        const imageBuffer = await imageResponse.arrayBuffer();

        const path = `${profileId}/${template.id}.png`;
        await adminClient.storage.from(BUCKET).upload(path, imageBuffer, {
          contentType: "image/png",
          upsert: true,
        });

        generatedCount++;
      } catch (err) {
        console.error(`Failed to generate social post ${template.id}:`, err);
      }
    }

    // Write manifest to track generation state
    const manifest = JSON.stringify({
      brandHash: currentHash,
      count: generatedCount,
      generatedAt: new Date().toISOString(),
    });

    await adminClient.storage
      .from(BUCKET)
      .upload(`${profileId}/manifest.json`, manifest, {
        contentType: "application/json",
        upsert: true,
      });

    return { success: true, data: { count: generatedCount } };
  } catch (error) {
    console.error("Failed to generate social assets:", error);
    return { success: false, error: "Failed to generate assets" };
  }
}

/** Get the public URL for a pre-generated social post image */
export async function getSocialImageUrl(
  profileId: string,
  templateId: string
): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${profileId}/${templateId}.png`;
}

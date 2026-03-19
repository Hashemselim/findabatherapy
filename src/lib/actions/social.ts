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

/**
 * Content version — bump this to force regeneration of all images
 * when templates or layouts change (without brand data changing).
 */
const CONTENT_VERSION = "v3";

/** Hash brand inputs + content version to detect when regeneration is needed */
function hashBrand(brand: BrandData): string {
  const input = `${CONTENT_VERSION}|${brand.agencyName}|${brand.logoUrl || ""}|${brand.brandColor}`;
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

  // Check for manifest file inside the hash-versioned folder
  const { data: manifestData } = await supabase.storage
    .from(BUCKET)
    .download(`${brand.profileId}/${currentHash}/manifest.json`);

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

/** Delete old versioned folders for a profile */
async function cleanupOldVersions(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  profileId: string,
  currentHash: string
) {
  try {
    // List all folders under the profile
    const { data: folders } = await adminClient.storage
      .from(BUCKET)
      .list(profileId, { limit: 100 });

    if (!folders) return;

    // Find old hash folders (directories that aren't the current hash)
    for (const folder of folders) {
      if (folder.name !== currentHash && folder.id === null) {
        // It's a folder (id is null for folders) — list and delete its contents
        const { data: files } = await adminClient.storage
          .from(BUCKET)
          .list(`${profileId}/${folder.name}`, { limit: 200 });

        if (files && files.length > 0) {
          const paths = files.map(
            (f) => `${profileId}/${folder.name}/${f.name}`
          );
          await adminClient.storage.from(BUCKET).remove(paths);
        }
      }
    }

    // Also clean up any old flat files (from previous path scheme)
    const oldFiles = folders.filter(
      (f) => f.name.endsWith(".png") || f.name === "manifest.json"
    );
    if (oldFiles.length > 0) {
      const oldPaths = oldFiles.map((f) => `${profileId}/${f.name}`);
      await adminClient.storage.from(BUCKET).remove(oldPaths);
    }
  } catch {
    // Cleanup is best-effort, don't fail generation
  }
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
    const adminClient = await createAdminClient();

    // Clean up old versioned folders first
    await cleanupOldVersions(adminClient, profileId, currentHash);

    const { renderSocialImage } = await import("@/lib/social/render");
    let generatedCount = 0;

    for (const template of SOCIAL_TEMPLATES) {
      try {
        const imageResponse = renderSocialImage(template, brand);
        const imageBuffer = await imageResponse.arrayBuffer();

        // Store in hash-versioned folder: {profileId}/{hash}/{templateId}.png
        const path = `${profileId}/${currentHash}/${template.id}.png`;
        await adminClient.storage.from(BUCKET).upload(path, imageBuffer, {
          contentType: "image/png",
          upsert: true,
        });

        generatedCount++;
      } catch (err) {
        console.error(`Failed to generate social post ${template.id}:`, err);
      }
    }

    // Write manifest inside the hash folder
    const manifest = JSON.stringify({
      brandHash: currentHash,
      count: generatedCount,
      generatedAt: new Date().toISOString(),
    });

    await adminClient.storage
      .from(BUCKET)
      .upload(`${profileId}/${currentHash}/manifest.json`, manifest, {
        contentType: "application/json",
        upsert: true,
      });

    return { success: true, data: { count: generatedCount } };
  } catch (error) {
    console.error("Failed to generate social assets:", error);
    return { success: false, error: "Failed to generate assets" };
  }
}

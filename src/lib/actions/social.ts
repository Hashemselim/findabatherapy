"use server";

import {
  createClient,
  createAdminClient,
  getCurrentProfileId,
} from "@/lib/supabase/server";
import { guardSocialPosts } from "@/lib/plans/guards";
import { SOCIAL_TEMPLATES } from "@/lib/social/templates";
import { type BrandData } from "@/lib/social/types";
import { STORAGE_BUCKETS } from "@/lib/storage/config";
import crypto from "crypto";
import { isConvexDataEnabled } from "@/lib/platform/config";
import { queryConvex } from "@/lib/platform/convex/server";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const BUCKET = STORAGE_BUCKETS.socialPosts;

/**
 * Content version — bump this to force regeneration of all images
 * when templates or layouts change (without brand data changing).
 */
const CONTENT_VERSION = "v7";

/** Hash brand inputs + content version to detect when regeneration is needed */
function hashBrand(brand: BrandData): string {
  const input = `${CONTENT_VERSION}|${brand.agencyName}|${brand.logoUrl || ""}|${brand.brandColor}`;
  return crypto.createHash("md5").update(input).digest("hex").slice(0, 12);
}

/** Get brand data for the current user */
export async function getSocialBrandData(): Promise<ActionResult<BrandData>> {
  const access = await guardSocialPosts();
  if (!access.allowed) {
    return { success: false, error: access.reason };
  }

  if (isConvexDataEnabled()) {
    const listing = await queryConvex<{
      profile: {
        agencyName: string;
        intakeFormSettings: { background_color: string };
      };
      logoUrl: string | null;
    } | null>("listings:getDashboardListing");

    return {
      success: true,
      data: {
        agencyName: listing?.profile.agencyName || "Your Agency",
        logoUrl: listing?.logoUrl || null,
        brandColor:
          listing?.profile.intakeFormSettings.background_color || "#5788FF",
        profileId: "convex",
      },
    };
  }

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
  ActionResult<{
    ready: boolean;
    generating: boolean;
    brandHash: string;
    assetCount: number;
  }>
> {
  if (isConvexDataEnabled()) {
    return {
      success: true,
      data: { ready: false, generating: false, brandHash: "", assetCount: 0 },
    };
  }

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
            generating: false,
            brandHash: currentHash,
            assetCount: manifest.count || 0,
          },
        };
      }
    } catch {
      // Manifest corrupt, needs regeneration
    }
  }

  // Check if generation is already in progress (lock file exists)
  const { data: lockData } = await supabase.storage
    .from(BUCKET)
    .download(`${brand.profileId}/${currentHash}/generating.lock`);

  if (lockData) {
    try {
      const lock = JSON.parse(await lockData.text()) as {
        startedAt?: string;
      };
      // Lock is valid if started less than 5 minutes ago
      if (lock.startedAt) {
        const elapsed = Date.now() - new Date(lock.startedAt).getTime();
        if (elapsed < 5 * 60 * 1000) {
          return {
            success: true,
            data: {
              ready: false,
              generating: true,
              brandHash: currentHash,
              assetCount: 0,
            },
          };
        }
      }
    } catch {
      // Lock corrupt, allow regeneration
    }
  }

  return {
    success: true,
    data: {
      ready: false,
      generating: false,
      brandHash: currentHash,
      assetCount: 0,
    },
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
  if (isConvexDataEnabled()) {
    return {
      success: false,
      error: "Social asset generation not yet available in Convex mode",
    };
  }

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

    // Write lock file to prevent duplicate generation runs
    const lockData = JSON.stringify({ startedAt: new Date().toISOString() });
    await adminClient.storage
      .from(BUCKET)
      .upload(`${profileId}/${currentHash}/generating.lock`, lockData, {
        contentType: "application/json",
        upsert: true,
      });

    // Clean up old versioned folders first
    await cleanupOldVersions(adminClient, profileId, currentHash);

    const { renderSocialImage } = await import("@/lib/social/render");

    // Pre-fetch logo as base64 data URL so Satori doesn't fetch it 50 times
    let logoDataUrl: string | null = null;
    if (brand.logoUrl) {
      try {
        const logoRes = await fetch(brand.logoUrl);
        const logoBuffer = await logoRes.arrayBuffer();
        const base64 = Buffer.from(logoBuffer).toString("base64");
        const contentType = logoRes.headers.get("content-type") || "image/png";
        logoDataUrl = `data:${contentType};base64,${base64}`;
      } catch {
        // Fall back to URL — Satori will fetch each time
      }
    }

    const brandWithCachedLogo: BrandData = {
      ...brand,
      logoUrl: logoDataUrl || brand.logoUrl,
    };

    // Process in parallel batches — images appear progressively as each uploads
    const BATCH_SIZE = 10;
    let generatedCount = 0;
    const totalStart = Date.now();

    for (let i = 0; i < SOCIAL_TEMPLATES.length; i += BATCH_SIZE) {
      const batch = SOCIAL_TEMPLATES.slice(i, i + BATCH_SIZE);
      const batchStart = Date.now();

      const results = await Promise.allSettled(
        batch.map(async (template) => {
          const imageResponse = renderSocialImage(template, brandWithCachedLogo);
          const imageBuffer = await imageResponse.arrayBuffer();

          const path = `${profileId}/${currentHash}/${template.id}.png`;
          await adminClient.storage.from(BUCKET).upload(path, imageBuffer, {
            contentType: "image/png",
            upsert: true,
          });
        })
      );

      generatedCount += results.filter((r) => r.status === "fulfilled").length;
      console.log(
        `[social] Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(SOCIAL_TEMPLATES.length / BATCH_SIZE)}: ${results.filter((r) => r.status === "fulfilled").length}/${batch.length} ok in ${Date.now() - batchStart}ms`
      );

      // Log failures
      results.forEach((r, idx) => {
        if (r.status === "rejected") {
          console.error(
            `Failed to generate social post ${batch[idx].id}:`,
            r.reason
          );
        }
      });
    }

    console.log(
      `[social] Total: ${generatedCount}/${SOCIAL_TEMPLATES.length} images in ${Date.now() - totalStart}ms`
    );

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

    // Remove lock file — generation complete
    await adminClient.storage
      .from(BUCKET)
      .remove([`${profileId}/${currentHash}/generating.lock`]);

    return { success: true, data: { count: generatedCount } };
  } catch (error) {
    console.error("Failed to generate social assets:", error);
    return { success: false, error: "Failed to generate assets" };
  }
}

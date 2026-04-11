"use server";

import crypto from "crypto";

import { mutateConvex, queryConvex, uploadFileToConvexStorage } from "@/lib/platform/convex/server";
import { guardSocialPosts } from "@/lib/plans/guards";
import { SOCIAL_TEMPLATES } from "@/lib/social/templates";
import { type BrandData } from "@/lib/social/types";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

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
      brandColor: listing?.profile.intakeFormSettings.background_color || "#5788FF",
      profileId: "convex",
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
  const brandResult = await getSocialBrandData();
  if (!brandResult.success) {
    return { success: false, error: brandResult.error };
  }

  const currentHash = hashBrand(brandResult.data);
  const status = await queryConvex<{
    ready: boolean;
    generating: boolean;
    brandHash: string;
    assetCount: number;
  }>("files:getSocialAssetsStatus", { brandHash: currentHash });

  return { success: true, data: status };
}

export async function getSocialAssetUrls(
  brandHash: string
): Promise<ActionResult<Record<string, string>>> {
  if (!brandHash) {
    return { success: true, data: {} };
  }

  const access = await guardSocialPosts();
  if (!access.allowed) {
    return { success: false, error: access.reason };
  }

  const urls = await queryConvex<Record<string, string>>(
    "files:getSocialAssetUrls",
    { brandHash }
  );

  return { success: true, data: urls };
}

/** Generate all social post images and upload to storage */
export async function generateSocialAssets(): Promise<
  ActionResult<{ count: number; brandHash: string }>
> {
  const brandResult = await getSocialBrandData();
  if (!brandResult.success) {
    return { success: false, error: brandResult.error };
  }

  const brand = brandResult.data;
  const currentHash = hashBrand(brand);

  try {
    await mutateConvex("files:cleanupOldSocialAssets", { currentBrandHash: currentHash });

    const { renderSocialImage } = await import("@/lib/social/render");

    let logoDataUrl: string | null = null;
    if (brand.logoUrl) {
      try {
        const logoRes = await fetch(brand.logoUrl);
        const logoBuffer = await logoRes.arrayBuffer();
        const base64 = Buffer.from(logoBuffer).toString("base64");
        const contentType = logoRes.headers.get("content-type") || "image/png";
        logoDataUrl = `data:${contentType};base64,${base64}`;
      } catch {
        // Fall back to the original URL if prefetching the logo fails.
      }
    }

    const brandWithCachedLogo: BrandData = {
      ...brand,
      logoUrl: logoDataUrl || brand.logoUrl,
    };

    const BATCH_SIZE = 10;
    let generatedCount = 0;

    for (let i = 0; i < SOCIAL_TEMPLATES.length; i += BATCH_SIZE) {
      const batch = SOCIAL_TEMPLATES.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (template) => {
          const imageResponse = renderSocialImage(template, brandWithCachedLogo);
          const imageBuffer = await imageResponse.arrayBuffer();
          const blob = new Blob([imageBuffer], { type: "image/png" });
          const storageId = await uploadFileToConvexStorage(blob);
          await mutateConvex("files:saveSocialAsset", {
            storageId,
            templateId: template.id,
            brandHash: currentHash,
            mimeType: "image/png",
            byteSize: imageBuffer.byteLength,
          });
        })
      );
      generatedCount += results.filter((result) => result.status === "fulfilled").length;
    }

    await mutateConvex("files:saveSocialManifest", {
      brandHash: currentHash,
      count: generatedCount,
    });

    return { success: true, data: { count: generatedCount, brandHash: currentHash } };
  } catch (error) {
    console.error("Failed to generate social assets:", error);
    return { success: false, error: "Failed to generate assets" };
  }
}

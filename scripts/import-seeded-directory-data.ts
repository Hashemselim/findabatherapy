import { readFile } from "node:fs/promises";
import path from "node:path";

import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { config } from "dotenv";

import type {
  SeedDirectoryExportPayload,
  SeedDirectoryMediaAsset,
} from "./seed-directory-types";

config({ path: ".env.local", override: true });

const DEFAULT_INPUT_PATH = path.resolve(
  process.cwd(),
  "tmp/seeded-directory-export.json",
);

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getInputPath() {
  const inputIndex = process.argv.indexOf("--input");
  if (inputIndex >= 0 && process.argv[inputIndex + 1]) {
    return path.resolve(process.cwd(), process.argv[inputIndex + 1]);
  }
  return DEFAULT_INPUT_PATH;
}

function isMediaUploadDisabled() {
  return process.argv.includes("--skip-media-upload");
}

function requireResetConfirmation() {
  if (!process.argv.includes("--confirm-reset")) {
    throw new Error(
      "Refusing to import without --confirm-reset because this wipes existing Convex app data",
    );
  }
}

async function readSeedArtifact(inputPath: string) {
  const rawPayload = await readFile(inputPath, "utf8");
  const parsed = JSON.parse(rawPayload) as SeedDirectoryExportPayload;

  if (!parsed || !Array.isArray(parsed.profiles) || !Array.isArray(parsed.listings)) {
    throw new Error(`Invalid seed export artifact: ${inputPath}`);
  }

  return parsed;
}

async function uploadMediaAsset(
  convex: ConvexHttpClient,
  seedSecret: string,
  asset: SeedDirectoryMediaAsset,
) {
  if (!asset.publicUrl) {
    return asset;
  }

  const response = await fetch(asset.publicUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download media asset ${asset.id} from ${asset.publicUrl}: ${response.status}`,
    );
  }

  const bytes = await response.arrayBuffer();
  const uploadUrl = await convex.mutation(
    makeFunctionReference<
      "mutation",
      { secret: string },
      string
    >("seed:generateSeedUploadUrl"),
    { secret: seedSecret },
  );

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": response.headers.get("content-type") ?? asset.mimeType,
    },
    body: bytes,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Failed to upload media asset ${asset.id} into Convex: ${uploadResponse.status}`,
    );
  }

  const uploadResult = (await uploadResponse.json()) as { storageId?: string };
  if (!uploadResult.storageId) {
    throw new Error(`Convex did not return storageId for media asset ${asset.id}`);
  }

  return {
    ...asset,
    storageId: uploadResult.storageId,
    byteSize: bytes.byteLength,
    mimeType: response.headers.get("content-type") ?? asset.mimeType,
  };
}

async function importSeededDirectoryData() {
  requireResetConfirmation();

  const convexUrl = requireEnv("NEXT_PUBLIC_CONVEX_URL");
  const seedSecret = requireEnv("CONVEX_SEED_IMPORT_SECRET");
  const inputPath = getInputPath();
  const artifact = await readSeedArtifact(inputPath);
  const convex = new ConvexHttpClient(convexUrl);

  const mediaUploadDisabled = isMediaUploadDisabled();
  const mediaAssets: SeedDirectoryMediaAsset[] = [];

  for (let index = 0; index < artifact.mediaAssets.length; index += 1) {
    const asset = artifact.mediaAssets[index];
    if (mediaUploadDisabled) {
      mediaAssets.push(asset);
      continue;
    }

    const uploadedAsset = await uploadMediaAsset(convex, seedSecret, asset);
    mediaAssets.push(uploadedAsset);

    if ((index + 1) % 10 === 0 || index + 1 === artifact.mediaAssets.length) {
      console.log(
        `Uploaded ${index + 1}/${artifact.mediaAssets.length} media assets to Convex storage`,
      );
    }
  }

  const result = await convex.mutation(
    makeFunctionReference<
      "mutation",
      {
        secret: string;
        payload: Omit<SeedDirectoryExportPayload, "exportedAt" | "source">;
      },
      {
        success: boolean;
        deletedCounts: Record<string, number>;
        importedCounts: Record<string, number>;
      }
    >("seed:replaceDirectorySeedData"),
    {
      secret: seedSecret,
      payload: {
        profiles: artifact.profiles,
        listings: artifact.listings,
        locations: artifact.locations,
        listingAttributes: artifact.listingAttributes,
        googleReviews: artifact.googleReviews,
        googlePlacesListings: artifact.googlePlacesListings,
        customDomains: artifact.customDomains,
        mediaAssets,
      },
    },
  );

  console.log(
    [
      "Convex seed import complete",
      `success=${result.success}`,
      `deleted=${JSON.stringify(result.deletedCounts)}`,
      `imported=${JSON.stringify(result.importedCounts)}`,
    ].join(" "),
  );
}

importSeededDirectoryData().catch((error) => {
  console.error(error);
  process.exit(1);
});

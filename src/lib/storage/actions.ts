"use server";

import { revalidatePath } from "next/cache";

import {
  mutateConvex,
  queryConvex,
  uploadFileToConvexStorage,
} from "@/lib/platform/convex/server";
import {
  isValidFileSize,
  isValidImageType,
} from "./config";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

function revalidateListingMediaSurfaces(listingSlug: string | null) {
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/branding");
  revalidatePath("/dashboard/onboarding/details");

  if (!listingSlug) {
    return;
  }

  revalidatePath(`/p/${listingSlug}`);
  revalidatePath(`/provider/${listingSlug}`);
  revalidatePath(`/provider/${listingSlug}/website`);
  revalidatePath(`/site/${listingSlug}`);
}

function revalidateLogoSurfaces(params: {
  listingSlug: string | null;
  agreementPacketSlugs?: string[];
}) {
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/jobs");
  revalidatePath("/jobs/employers");
  revalidatePath("/employers");
  revalidatePath("/dashboard/forms/agreements");
  revalidateListingMediaSurfaces(params.listingSlug);

  if (!params.listingSlug) {
    return;
  }

  const slug = params.listingSlug;
  revalidatePath(`/provider/${slug}/contact`);
  revalidatePath(`/provider/${slug}/intake`);
  revalidatePath(`/provider/${slug}/documents`);
  revalidatePath(`/provider/${slug}/resources`);
  revalidatePath(`/provider/${slug}/careers`);
  revalidatePath(`/provider/${slug}/website/contact`);
  revalidatePath(`/provider/${slug}/website/intake`);
  revalidatePath(`/provider/${slug}/website/documents`);
  revalidatePath(`/provider/${slug}/website/resources`);
  revalidatePath(`/provider/${slug}/website/careers`);
  revalidatePath(`/contact/${slug}`);
  revalidatePath(`/intake/${slug}/client`);
  revalidatePath(`/intake/${slug}/documents`);
  revalidatePath(`/resources/${slug}`);
  revalidatePath(`/careers/${slug}`);

  for (const packetSlug of params.agreementPacketSlugs || []) {
    revalidatePath(`/agreements/${slug}/${packetSlug}`);
  }
}

async function getAgreementPacketSlugs() {
  return queryConvex<Array<{ slug: string }>>("agreements:getAgreementPackets", {
    status: "published",
  }).catch(() => []);
}

export async function uploadLogo(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  if (!isValidImageType(file.type)) {
    return {
      success: false,
      error: "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.",
    };
  }

  if (!isValidFileSize(file.size, "logo")) {
    return { success: false, error: "File too large. Maximum size is 2MB." };
  }

  try {
    const storageId = await uploadFileToConvexStorage(file);
    const [result, agreementPackets] = await Promise.all([
      mutateConvex<{ url: string; listingSlug: string | null }>("files:saveListingLogo", {
        storageId,
        filename: file.name,
        mimeType: file.type,
        byteSize: file.size,
      }),
      getAgreementPacketSlugs(),
    ]);

    revalidateLogoSurfaces({
      listingSlug: result.listingSlug,
      agreementPacketSlugs: agreementPackets.map((packet) => packet.slug),
    });

    return { success: true, data: { url: result.url } };
  } catch (error) {
    console.error("Logo upload error:", error);
    return { success: false, error: "Failed to upload logo" };
  }
}

export async function deleteLogo(): Promise<ActionResult> {
  try {
    const [result, agreementPackets] = await Promise.all([
      mutateConvex<{ listingSlug: string | null }>("files:deleteListingLogo", {}),
      getAgreementPacketSlugs(),
    ]);

    revalidateLogoSurfaces({
      listingSlug: result.listingSlug,
      agreementPacketSlugs: agreementPackets.map((packet) => packet.slug),
    });

    return { success: true };
  } catch (error) {
    console.error("Delete logo error:", error);
    return { success: false, error: "Failed to delete logo" };
  }
}

export async function getPhotos(): Promise<
  ActionResult<{ photos: Array<{ id: string; url: string; order: number }> }>
> {
  try {
    const result = await queryConvex<{
      photos: Array<{ id: string; url: string; order: number }>;
    }>("files:getListingPhotos");
    return { success: true, data: { photos: result.photos } };
  } catch (error) {
    console.error("Get photos error:", error);
    return { success: false, error: "Failed to fetch photos" };
  }
}

export async function uploadPhoto(
  formData: FormData,
): Promise<ActionResult<{ id: string; url: string }>> {
  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  if (!isValidImageType(file.type)) {
    return {
      success: false,
      error: "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.",
    };
  }

  if (!isValidFileSize(file.size, "photo")) {
    return { success: false, error: "File too large. Maximum size is 5MB." };
  }

  try {
    const storageId = await uploadFileToConvexStorage(file);
    const result = await mutateConvex<{ id: string; url: string; listingSlug: string | null }>(
      "files:saveListingPhoto",
      {
        storageId,
        filename: file.name,
        mimeType: file.type,
        byteSize: file.size,
      },
    );

    revalidateListingMediaSurfaces(result.listingSlug);
    return { success: true, data: { id: result.id, url: result.url } };
  } catch (error) {
    console.error("Photo upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload photo",
    };
  }
}

export async function deletePhoto(photoId: string): Promise<ActionResult> {
  try {
    const result = await mutateConvex<{ listingSlug: string | null }>("files:deleteListingPhoto", {
      photoId,
    });
    revalidateListingMediaSurfaces(result.listingSlug);
    return { success: true };
  } catch (error) {
    console.error("Delete photo error:", error);
    return { success: false, error: "Failed to delete photo" };
  }
}

export async function reorderPhotos(photoIds: string[]): Promise<ActionResult> {
  try {
    const result = await mutateConvex<{ success: true; listingSlug: string | null }>(
      "files:reorderListingPhotos",
      { photoIds },
    );
    revalidateListingMediaSurfaces(result.listingSlug);
    return { success: true };
  } catch (error) {
    console.error("Reorder photos error:", error);
    return { success: false, error: "Failed to reorder photos" };
  }
}

export async function updateVideoUrl(videoUrl: string | null): Promise<ActionResult> {
  try {
    const result = await mutateConvex<{ success: true; listingSlug: string | null }>(
      "files:updateListingVideoUrl",
      { videoUrl },
    );
    revalidateListingMediaSurfaces(result.listingSlug);
    return { success: true };
  } catch (error) {
    console.error("Update video URL error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update video URL",
    };
  }
}

export async function getVideoUrl(): Promise<ActionResult<{ url: string | null }>> {
  try {
    const videoUrl = await queryConvex<string | null>("files:getListingVideoUrl");
    return { success: true, data: { url: videoUrl ?? null } };
  } catch (error) {
    console.error("Get video URL error:", error);
    return { success: false, error: "Failed to load video URL" };
  }
}

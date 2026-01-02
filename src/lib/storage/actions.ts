"use server";

import { revalidatePath } from "next/cache";

import { createClient, getUser } from "@/lib/supabase/server";
import {
  STORAGE_BUCKETS,
  PHOTO_LIMITS,
  isValidImageType,
  isValidFileSize,
  generateStoragePath,
} from "./config";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

/**
 * Upload a logo for a listing
 */
export async function uploadLogo(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  // Validate file type
  if (!isValidImageType(file.type)) {
    return { success: false, error: "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image." };
  }

  // Validate file size
  if (!isValidFileSize(file.size, "logo")) {
    return { success: false, error: "File too large. Maximum size is 2MB." };
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id, logo_url")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found" };
  }

  // Delete old logo if exists
  if (listing.logo_url) {
    const oldPath = listing.logo_url.split(`${STORAGE_BUCKETS.logos}/`)[1];
    if (oldPath) {
      await supabase.storage.from(STORAGE_BUCKETS.logos).remove([oldPath]);
    }
  }

  // Generate new path and upload
  const path = generateStoragePath(listing.id, file.name, "logo");
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.logos)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error("Logo upload error:", uploadError);
    return { success: false, error: "Failed to upload logo" };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKETS.logos)
    .getPublicUrl(path);

  // Update listing with logo URL
  const { error: updateError } = await supabase
    .from("listings")
    .update({
      logo_url: urlData.publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listing.id);

  if (updateError) {
    console.error("Logo URL update error:", updateError);
    return { success: false, error: "Failed to save logo" };
  }

  revalidatePath("/dashboard/company");
  return { success: true, data: { url: urlData.publicUrl } };
}

/**
 * Delete the logo for a listing
 */
export async function deleteLogo(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id, logo_url")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found" };
  }

  if (!listing.logo_url) {
    return { success: true }; // Nothing to delete
  }

  // Delete from storage
  const path = listing.logo_url.split(`${STORAGE_BUCKETS.logos}/`)[1];
  if (path) {
    await supabase.storage.from(STORAGE_BUCKETS.logos).remove([path]);
  }

  // Clear logo URL in listing
  const { error } = await supabase
    .from("listings")
    .update({
      logo_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listing.id);

  if (error) {
    return { success: false, error: "Failed to delete logo" };
  }

  revalidatePath("/dashboard/company");
  return { success: true };
}

/**
 * Get photo gallery for a listing
 */
export async function getPhotos(): Promise<
  ActionResult<{ photos: Array<{ id: string; url: string; order: number }> }>
> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found" };
  }

  // Get photos from media_assets
  const { data: photos, error } = await supabase
    .from("media_assets")
    .select("id, storage_path, sort_order")
    .eq("listing_id", listing.id)
    .eq("media_type", "photo")
    .order("sort_order", { ascending: true });

  if (error) {
    return { success: false, error: "Failed to fetch photos" };
  }

  // Get public URLs
  const photosWithUrls = photos.map((photo) => {
    const { data } = supabase.storage
      .from(STORAGE_BUCKETS.photos)
      .getPublicUrl(photo.storage_path);

    return {
      id: photo.id,
      url: data.publicUrl,
      order: photo.sort_order,
    };
  });

  return { success: true, data: { photos: photosWithUrls } };
}

/**
 * Upload a photo to the gallery
 */
export async function uploadPhoto(
  formData: FormData
): Promise<ActionResult<{ id: string; url: string }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  // Validate file type
  if (!isValidImageType(file.type)) {
    return { success: false, error: "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image." };
  }

  // Validate file size
  if (!isValidFileSize(file.size, "photo")) {
    return { success: false, error: "File too large. Maximum size is 5MB." };
  }

  const supabase = await createClient();

  // Get listing and profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", user.id)
    .single();

  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing || !profile) {
    return { success: false, error: "Listing or profile not found" };
  }

  // Check plan limit
  const photoLimit = PHOTO_LIMITS[profile.plan_tier as keyof typeof PHOTO_LIMITS] || 0;
  if (photoLimit === 0) {
    return { success: false, error: "Photo gallery is a premium feature. Please upgrade your plan." };
  }

  // Count existing photos
  const { count } = await supabase
    .from("media_assets")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listing.id)
    .eq("media_type", "photo");

  if ((count || 0) >= photoLimit) {
    return { success: false, error: `Maximum ${photoLimit} photos allowed. Please delete an existing photo first.` };
  }

  // Generate path and upload
  const path = generateStoragePath(listing.id, file.name, "photo");
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.photos)
    .upload(path, arrayBuffer, {
      contentType: file.type,
    });

  if (uploadError) {
    console.error("Photo upload error:", uploadError);
    return { success: false, error: "Failed to upload photo" };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKETS.photos)
    .getPublicUrl(path);

  // Create media_asset record
  const { data: asset, error: insertError } = await supabase
    .from("media_assets")
    .insert({
      listing_id: listing.id,
      media_type: "photo",
      storage_path: path,
      sort_order: (count || 0),
    })
    .select("id")
    .single();

  if (insertError || !asset) {
    // Clean up uploaded file
    await supabase.storage.from(STORAGE_BUCKETS.photos).remove([path]);
    return { success: false, error: "Failed to save photo" };
  }

  revalidatePath("/dashboard/company");
  return { success: true, data: { id: asset.id, url: urlData.publicUrl } };
}

/**
 * Delete a photo from the gallery
 */
export async function deletePhoto(photoId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found" };
  }

  // Get photo
  const { data: photo } = await supabase
    .from("media_assets")
    .select("id, storage_path")
    .eq("id", photoId)
    .eq("listing_id", listing.id)
    .single();

  if (!photo) {
    return { success: false, error: "Photo not found" };
  }

  // Delete from storage
  await supabase.storage.from(STORAGE_BUCKETS.photos).remove([photo.storage_path]);

  // Delete record
  const { error } = await supabase
    .from("media_assets")
    .delete()
    .eq("id", photoId);

  if (error) {
    return { success: false, error: "Failed to delete photo" };
  }

  revalidatePath("/dashboard/company");
  return { success: true };
}

/**
 * Reorder photos in the gallery
 */
export async function reorderPhotos(
  photoIds: string[]
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found" };
  }

  // Update order for each photo
  const updates = photoIds.map((id, index) =>
    supabase
      .from("media_assets")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("listing_id", listing.id)
  );

  await Promise.all(updates);

  revalidatePath("/dashboard/company");
  return { success: true };
}

/**
 * Update video URL for a listing
 */
export async function updateVideoUrl(
  videoUrl: string | null
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get profile plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  // Check if premium feature
  if (profile.plan_tier === "free" && videoUrl) {
    return { success: false, error: "Video embed is a premium feature. Please upgrade your plan." };
  }

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found" };
  }

  // Update listing
  const { error } = await supabase
    .from("listings")
    .update({
      video_url: videoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listing.id);

  if (error) {
    return { success: false, error: "Failed to update video URL" };
  }

  revalidatePath("/dashboard/company");
  return { success: true };
}

/**
 * Get current video URL for a listing
 */
export async function getVideoUrl(): Promise<ActionResult<{ url: string | null }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("video_url")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found" };
  }

  return { success: true, data: { url: listing.video_url } };
}

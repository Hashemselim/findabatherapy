/**
 * Supabase Storage configuration
 *
 * Buckets:
 * - listing-logos: Logo images for provider listings
 * - listing-photos: Photo gallery images for provider listings
 */

export const STORAGE_BUCKETS = {
  logos: "listing-logos",
  photos: "listing-photos",
} as const;

export type BucketName = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/**
 * File size limits (in bytes)
 */
export const FILE_SIZE_LIMITS = {
  logo: 2 * 1024 * 1024, // 2MB
  photo: 5 * 1024 * 1024, // 5MB
} as const;

/**
 * Allowed MIME types
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/**
 * Photo gallery limits by plan
 */
export const PHOTO_LIMITS = {
  free: 0,
  pro: 10,
  enterprise: 10,
} as const;

/**
 * Image dimensions
 */
export const IMAGE_DIMENSIONS = {
  logo: {
    maxWidth: 400,
    maxHeight: 400,
  },
  photo: {
    maxWidth: 1920,
    maxHeight: 1080,
  },
  thumbnail: {
    maxWidth: 300,
    maxHeight: 200,
  },
} as const;

/**
 * Supported video platforms
 */
export const VIDEO_PLATFORMS = {
  youtube: {
    name: "YouTube",
    regex: /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    embedUrl: (id: string) => `https://www.youtube.com/embed/${id}`,
  },
  vimeo: {
    name: "Vimeo",
    regex: /(?:vimeo\.com\/)(\d+)/,
    embedUrl: (id: string) => `https://player.vimeo.com/video/${id}`,
  },
} as const;

/**
 * Extract video ID from URL
 */
export function extractVideoId(url: string): { platform: "youtube" | "vimeo"; id: string } | null {
  for (const [platform, config] of Object.entries(VIDEO_PLATFORMS)) {
    const match = url.match(config.regex);
    if (match && match[1]) {
      return { platform: platform as "youtube" | "vimeo", id: match[1] };
    }
  }
  return null;
}

/**
 * Get embed URL for a video
 */
export function getVideoEmbedUrl(url: string): string | null {
  const video = extractVideoId(url);
  if (!video) return null;
  return VIDEO_PLATFORMS[video.platform].embedUrl(video.id);
}

/**
 * Validate file type
 */
export function isValidImageType(mimeType: string): mimeType is AllowedImageType {
  return ALLOWED_IMAGE_TYPES.includes(mimeType as AllowedImageType);
}

/**
 * Validate file size
 */
export function isValidFileSize(size: number, type: "logo" | "photo"): boolean {
  return size <= FILE_SIZE_LIMITS[type];
}

/**
 * Generate storage path for a file
 */
export function generateStoragePath(
  listingId: string,
  filename: string,
  type: "logo" | "photo"
): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  const uniqueId = crypto.randomUUID();

  if (type === "logo") {
    return `${listingId}/logo.${ext}`;
  }

  return `${listingId}/${uniqueId}.${ext}`;
}

/**
 * Get public URL for a storage file
 */
export function getPublicUrl(
  supabaseUrl: string,
  bucket: BucketName,
  path: string
): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

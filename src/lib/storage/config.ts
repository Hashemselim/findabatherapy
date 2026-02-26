/**
 * Supabase Storage configuration
 *
 * Buckets:
 * - listing-logos: Logo images for provider listings
 * - listing-photos: Photo gallery images for provider listings
 * - client-documents: Client document uploads (private bucket)
 */

export const STORAGE_BUCKETS = {
  logos: "listing-logos",
  photos: "listing-photos",
  documents: "client-documents",
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

// =============================================================================
// CLIENT DOCUMENT UPLOAD CONFIG
// =============================================================================

export const DOCUMENT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Document count limits per client
 */
export const DOCUMENT_LIMITS = {
  maxPerClient: 50,
} as const;

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedDocumentType = (typeof ALLOWED_DOCUMENT_TYPES)[number];

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

/**
 * Validate document MIME type
 */
export function isValidDocumentType(mimeType: string): mimeType is AllowedDocumentType {
  return ALLOWED_DOCUMENT_TYPES.includes(mimeType as AllowedDocumentType);
}

/**
 * Validate document file size
 */
export function isValidDocumentSize(size: number): boolean {
  return size <= DOCUMENT_MAX_SIZE;
}

/**
 * Generate storage path for a client document
 * Format: {profileId}/{clientId}/{uuid}.{ext}
 */
export function generateDocumentPath(
  profileId: string,
  clientId: string,
  filename: string
): string {
  const parts = filename.split(".");
  // Only use the extension if filename has one (more than 1 part)
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : "pdf";
  const uniqueId = crypto.randomUUID();
  return `${profileId}/${clientId}/${uniqueId}.${ext}`;
}

/**
 * Magic byte signatures for allowed document types.
 * Verifies that file content matches the claimed MIME type.
 */
const MAGIC_BYTES: Record<string, number[][]> = {
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]], // .PNG
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP container)
  // DOC files start with OLE compound doc header
  "application/msword": [[0xd0, 0xcf, 0x11, 0xe0]],
  // DOCX files are ZIP archives
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [[0x50, 0x4b, 0x03, 0x04]],
};

/**
 * Verify that the file's actual content matches its claimed MIME type
 * by checking magic bytes (file signature).
 */
export function verifyDocumentMagicBytes(
  buffer: ArrayBuffer,
  mimeType: string
): boolean {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) {
    // No known signature for this type — skip verification
    return true;
  }

  const header = new Uint8Array(buffer.slice(0, 8));
  return signatures.some((sig) =>
    sig.every((byte, i) => header[i] === byte)
  );
}

/**
 * Get a human-readable file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Get icon name for a document based on MIME type
 */
export function getDocumentIconName(mimeType: string | null): "pdf" | "image" | "doc" | "file" {
  if (!mimeType) return "file";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) return "doc";
  return "file";
}

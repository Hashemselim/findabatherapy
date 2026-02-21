import Image from "next/image";

import { getVideoEmbedUrl } from "@/lib/storage/config";

interface AgencyPageGalleryProps {
  photoUrls: string[];
  videoUrl: string | null;
  agencyName: string;
  primaryCity?: string;
  primaryState?: string;
}

export function AgencyPageGallery({
  photoUrls,
  videoUrl,
  agencyName,
  primaryCity,
  primaryState,
}: AgencyPageGalleryProps) {
  const videoEmbedUrl = videoUrl ? getVideoEmbedUrl(videoUrl) : null;
  const hasContent = photoUrls.length > 0 || videoEmbedUrl;

  if (!hasContent) return null;

  return (
    <section>
      <h2 className="mb-6 text-xl font-semibold text-foreground sm:text-2xl">
        See Our Space
      </h2>

      <div className="space-y-6">
        {/* Video Embed */}
        {videoEmbedUrl && (
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border bg-black shadow-sm">
            <iframe
              src={videoEmbedUrl}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        )}

        {/* Photo Gallery */}
        {photoUrls.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photoUrls.map((url, index) => (
              <div
                key={url}
                className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted/40 shadow-sm transition-all duration-300 hover:shadow-md"
              >
                <Image
                  src={url}
                  alt={`${agencyName} ABA therapy${primaryCity ? ` in ${primaryCity}, ${primaryState}` : ""} - photo ${index + 1}`}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

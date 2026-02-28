"use client";

import { useState } from "react";
import Image from "next/image";
import { Camera, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useWebsite } from "../../layout/website-provider";
import { SectionDivider } from "./section-divider";

export function ModernGallery() {
  const { provider, brandColor } = useWebsite();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (
    !provider.websiteSettings.show_gallery ||
    provider.photoUrls.length === 0
  )
    return null;

  const photos = provider.photoUrls;

  function openLightbox(index: number) {
    setLightboxIndex(index);
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    setLightboxIndex(null);
    document.body.style.overflow = "";
  }

  function navigateLightbox(direction: "prev" | "next") {
    if (lightboxIndex === null) return;
    if (direction === "prev") {
      setLightboxIndex(
        lightboxIndex === 0 ? photos.length - 1 : lightboxIndex - 1
      );
    } else {
      setLightboxIndex(
        lightboxIndex === photos.length - 1 ? 0 : lightboxIndex + 1
      );
    }
  }

  return (
    <>
      <section className="relative pb-20 pt-16 sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="mb-12 text-center sm:mb-16">
            <span
              className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
              style={{
                backgroundColor: `${brandColor}15`,
                color: brandColor,
              }}
            >
              <Camera className="h-3.5 w-3.5" />
              Gallery
            </span>
            <h2 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">
              See Our Space
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-500">
              Take a look at our facility and the environment where children
              learn and grow.
            </p>
          </div>

          {/* Photo Grid */}
          <div
            className={`grid gap-3 sm:gap-4 ${
              photos.length === 1
                ? "max-w-2xl mx-auto"
                : photos.length === 2
                  ? "max-w-3xl mx-auto grid-cols-2"
                  : photos.length <= 4
                    ? "grid-cols-2 lg:grid-cols-2"
                    : "grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {photos.map((url, index) => (
              <button
                key={url}
                onClick={() => openLightbox(index)}
                className={`group relative overflow-hidden rounded-2xl bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  photos.length === 3 && index === 0
                    ? "col-span-2 aspect-[2/1] lg:col-span-2"
                    : photos.length >= 5 && index === 0
                      ? "col-span-2 aspect-[2/1] lg:col-span-2"
                      : "aspect-square"
                }`}
                style={
                  { "--tw-ring-color": brandColor } as React.CSSProperties
                }
              >
                <Image
                  src={url}
                  alt={`${provider.profile.agencyName} photo ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 400px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="rounded-full bg-white/90 p-2.5 shadow-lg">
                    <Camera className="h-5 w-5 text-gray-700" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Curved bottom divider — dashed brand line, fills into gray reviews section */}
        <SectionDivider
          variant="wave"
          lineStyle="dashed"
          fillColor="#f9fafb"
        />
      </section>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation */}
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox("prev");
                }}
                className="absolute left-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox("next");
                }}
                className="absolute right-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="relative h-[80vh] w-[90vw] max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[lightboxIndex]}
              alt={`${provider.profile.agencyName} photo ${lightboxIndex + 1}`}
              fill
              sizes="90vw"
              className="rounded-lg object-contain"
              priority
            />
          </div>

          {/* Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/80">
            {lightboxIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
}

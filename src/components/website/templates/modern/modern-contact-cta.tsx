"use client";

import Link from "next/link";
import { ArrowRight, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getContrastingTextColor } from "@/lib/utils/brand-color";
import { getProviderWebsitePath } from "@/lib/utils/public-paths";
import { useWebsite } from "../../layout/website-provider";

export function ModernContactCta() {
  const { provider, brandColor } = useWebsite();

  const ctaText =
    provider.websiteSettings.hero_cta_text || "Get Started";
  const contrastColor = getContrastingTextColor(brandColor);
  const phone = provider.profile.contactPhone;
  const email = provider.profile.contactEmail;

  return (
    <section className="relative -mt-4 overflow-hidden pt-24 pb-20 sm:pt-28 sm:pb-24 lg:pt-32 lg:pb-28">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${brandColor} 0%, ${brandColor} 15%, ${brandColor}ee 70%, ${brandColor}dd 100%)`,
        }}
      />

      {/* Decorative elements */}
      <div
        className="absolute top-0 right-0 h-72 w-72 -translate-y-1/3 translate-x-1/3 rounded-full opacity-10"
        style={{ backgroundColor: contrastColor }}
      />
      <div
        className="absolute bottom-0 left-0 h-56 w-56 translate-y-1/3 -translate-x-1/3 rounded-full opacity-10"
        style={{ backgroundColor: contrastColor }}
      />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2
          className="text-3xl font-bold sm:text-4xl"
          style={{ color: contrastColor }}
        >
          Ready to Take the Next Step?
        </h2>
        <p
          className="mx-auto mt-4 max-w-2xl text-lg opacity-90"
          style={{ color: contrastColor }}
        >
          We&apos;re here to support your family every step of the way. Reach
          out today to learn how our ABA therapy services can help your child
          thrive.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="rounded-full px-8 text-base font-semibold shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
            style={{
              backgroundColor: contrastColor,
              color: brandColor,
            }}
          >
            <Link href={getProviderWebsitePath(provider.slug, "/contact")}>
              {ctaText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          {phone && (
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full border-2 px-8 text-base font-semibold backdrop-blur-xs transition-all hover:scale-[1.02]"
              style={{
                borderColor: `${contrastColor}40`,
                color: contrastColor,
                backgroundColor: `${contrastColor}10`,
              }}
            >
              <a href={`tel:${phone}`}>
                <Phone className="mr-2 h-4 w-4" />
                Call Us Today
              </a>
            </Button>
          )}
        </div>

        {/* Contact details */}
        <div
          className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm opacity-80"
          style={{ color: contrastColor }}
        >
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-1.5 transition-opacity hover:opacity-100"
            >
              <Phone className="h-3.5 w-3.5" />
              {phone}
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-1.5 transition-opacity hover:opacity-100"
            >
              <Mail className="h-3.5 w-3.5" />
              {email}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

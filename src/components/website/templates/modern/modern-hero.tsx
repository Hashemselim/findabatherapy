"use client";

import Link from "next/link";
import { ChevronRight, CheckCircle2, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useWebsite } from "../../layout/website-provider";

function getLighterShade(hexColor: string, opacity: number) {
  return `${hexColor}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

export function ModernHero() {
  const { provider, brandColor, isPremium } = useWebsite();
  const basePath = `/site/${provider.slug}`;
  const ctaText = provider.websiteSettings.hero_cta_text || "Get Started";

  const primaryLocation =
    provider.locations.find((l) => l.isPrimary) || provider.locations[0];

  const initials = provider.profile.agencyName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section className="relative -mt-16 overflow-hidden sm:-mt-18">
      {/* Background with brand gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(160deg, ${brandColor} 0%, ${brandColor}dd 40%, ${brandColor}aa 70%, ${brandColor}88 100%)`,
        }}
      />

      {/* Decorative circles — playful, child-friendly feel */}
      <div
        className="absolute -top-32 -right-32 h-96 w-96 rounded-full opacity-10"
        style={{ backgroundColor: "white" }}
      />
      <div
        className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full opacity-8"
        style={{ backgroundColor: "white" }}
      />
      <div
        className="absolute top-1/2 right-1/4 h-48 w-48 -translate-y-1/2 rounded-full opacity-5"
        style={{ backgroundColor: "white" }}
      />

      {/* Subtle dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pt-28 pb-20 sm:px-6 sm:pt-36 sm:pb-28 lg:px-8 lg:pt-40 lg:pb-32">
        <div className="mx-auto max-w-3xl text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Avatar className="h-20 w-20 border-4 border-white/30 shadow-2xl ring-4 ring-white/10 sm:h-24 sm:w-24">
              {provider.logoUrl ? (
                <AvatarImage
                  src={provider.logoUrl}
                  alt={provider.profile.agencyName}
                />
              ) : null}
              <AvatarFallback
                className="text-xl font-bold text-white sm:text-2xl"
                style={{
                  backgroundColor: getLighterShade(brandColor, 0.3),
                }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Agency Name */}
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {provider.profile.agencyName}
          </h1>

          {/* Headline */}
          <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg lg:text-xl">
            {provider.headline ||
              "Compassionate ABA Therapy Services for Your Family"}
          </p>

          {/* Badges */}
          <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
            {isPremium && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
                <CheckCircle2 className="h-4 w-4" />
                Verified Provider
              </span>
            )}
            {provider.isAcceptingClients && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
                Accepting New Clients
              </span>
            )}
            {primaryLocation && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
                {primaryLocation.city}, {primaryLocation.state}
                {provider.locations.length > 1 &&
                  ` + ${provider.locations.length - 1} more`}
              </span>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="w-full gap-2 rounded-full bg-white px-8 py-6 text-base font-semibold shadow-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl sm:w-auto"
              style={{ color: brandColor }}
            >
              <Link href={`${basePath}/contact`}>
                {ctaText}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            {provider.profile.contactPhone && (
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full gap-2 rounded-full border-2 border-white/30 bg-transparent px-8 py-6 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-white/50 hover:bg-white/10 sm:w-auto"
              >
                <a href={`tel:${provider.profile.contactPhone}`}>
                  Call Us Today
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 w-full">
        <svg
          viewBox="0 0 1440 80"
          fill="none"
          className="h-10 w-full sm:h-16"
          preserveAspectRatio="none"
        >
          <path
            d="M0 40C240 70 480 80 720 60C960 40 1200 20 1440 40V80H0V40Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
}

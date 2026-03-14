import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe } from "lucide-react";

import { BrandedLogo } from "@/components/branded/branded-logo";
import { Button } from "@/components/ui/button";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { getAgreementPacketPublicPageData } from "@/lib/actions/agreements";
import { getContrastingTextColor } from "@/lib/utils/brand-color";

import { AgreementSigningForm } from "./agreement-signing-form";

type AgreementPageProps = {
  params: Promise<{ slug: string; packetSlug: string }>;
  searchParams: Promise<{ token?: string }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: AgreementPageProps): Promise<Metadata> {
  const { slug, packetSlug } = await params;
  const result = await getAgreementPacketPublicPageData(slug, packetSlug);

  if (!result.success || !result.data) {
    return {
      title: "Agreement Form",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${result.data.packet.title} | ${result.data.profile.agencyName}`,
    description: result.data.packet.description || `Review and sign the ${result.data.packet.title} form.`,
    robots: { index: false, follow: false },
  };
}

function getLighterShade(hexColor: string, opacity = 0.1) {
  return `${hexColor}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

export default async function AgreementPacketPage({
  params,
  searchParams,
}: AgreementPageProps) {
  const { slug, packetSlug } = await params;
  const { token } = await searchParams;
  const result = await getAgreementPacketPublicPageData(slug, packetSlug, token);

  if (!result.success || !result.data) {
    notFound();
  }

  const { listing, profile, packet, link } = result.data;
  const isPreview =
    profile.planTier === "free" ||
    (profile.subscriptionStatus !== "active" && profile.subscriptionStatus !== "trialing");
  const { background_color, show_powered_by } = profile.intakeFormSettings;
  const contrastColor = getContrastingTextColor(background_color);

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${background_color} 0%, ${background_color}dd 50%, ${background_color}bb 100%)`,
      }}
    >
      {isPreview && (
        <PreviewBanner
          variant="public"
          message="This agreement page is in preview mode - upgrade to collect signed submissions."
          triggerFeature="client_intake"
        />
      )}

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
          <div
            className="px-6 py-8 text-center sm:px-8 sm:py-12"
            style={{ backgroundColor: getLighterShade(background_color, 0.08) }}
          >
            <div className="mx-auto mb-6">
              <BrandedLogo
                logoUrl={listing.logoUrl}
                agencyName={profile.agencyName}
                brandColor={background_color}
                variant="hero"
              />
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                {profile.agencyName}
              </h1>
              <div
                className="mx-auto h-0.5 w-12 rounded-full"
                style={{ backgroundColor: getLighterShade(background_color, 0.3) }}
              />
              <h2 className="text-lg font-medium text-foreground">{packet.title}</h2>
              <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
                {packet.description || "Please review each document, confirm that you agree, and complete the signature section below."}
              </p>
              {profile.website && (
                <div className="pt-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    style={{ borderColor: background_color, color: "#111827" }}
                  >
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="gap-2">
                      <Globe className="h-4 w-4" />
                      Visit Website
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <AgreementSigningForm
              packet={packet}
              link={link}
              providerName={profile.agencyName}
              brandColor={background_color}
              disabled={isPreview}
            />
          </div>

          <div
            className="px-6 py-4 sm:px-8"
            style={{ backgroundColor: getLighterShade(background_color, 0.05) }}
          >
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
              <div className="flex items-center gap-2">
                <BrandedLogo
                  logoUrl={listing.logoUrl}
                  agencyName={profile.agencyName}
                  brandColor={background_color}
                  variant="footer"
                  className="mx-0"
                />
                <span className="text-sm font-medium text-foreground">
                  {profile.agencyName}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} {profile.agencyName}. All rights reserved.
              </p>
            </div>
          </div>
        </div>

        {show_powered_by ? (
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              style={{ color: background_color }}
            >
              Powered by Find ABA Therapy
            </Link>
          </div>
        ) : (
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-xs font-medium backdrop-blur-xs transition-colors hover:bg-white/30"
              style={{ color: contrastColor }}
            >
              Powered by Find ABA Therapy
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Globe } from "lucide-react";

import { BrandedLogo } from "@/components/branded/branded-logo";
import { Button } from "@/components/ui/button";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { getClientResourcesPageData } from "@/lib/actions/intake";
import { getContrastingTextColor } from "@/lib/utils/brand-color";

type LayoutParams = {
  slug: string;
};

type ResourcesLayoutProps = {
  children: import("react").ReactNode;
  params: Promise<LayoutParams>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: ResourcesLayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getClientResourcesPageData(slug);

  if (!result.success || !result.data) {
    return {
      title: { absolute: "Parent Resources" },
      robots: { index: false, follow: false },
    };
  }

  const { profile } = result.data;

  return {
    title: { absolute: `Parent Resources | ${profile.agencyName}` },
    description: `Parent education resources from ${profile.agencyName}, including FAQ, glossary, and guides.`,
    robots: { index: false, follow: false },
  };
}

function getLighterShade(hexColor: string, opacity: number = 0.1) {
  return `${hexColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
}

export default async function ResourcesLayout({ children, params }: ResourcesLayoutProps) {
  const { slug } = await params;
  const result = await getClientResourcesPageData(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const { listing, profile } = result.data;
  const isPreview =
    profile.planTier === "free" ||
    (profile.subscriptionStatus !== "active" &&
      profile.subscriptionStatus !== "trialing");
  const { background_color, show_powered_by } = profile.intakeFormSettings;
  const contrastColor = getContrastingTextColor(background_color);
  const brandTextColor = contrastColor === "#000000" ? "#1f2937" : "#FFFFFF";

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
          message="This parent resources page is in preview mode. Activate your account to go live."
          triggerFeature="client_resources"
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
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{profile.agencyName}</h1>

              <div
                className="mx-auto h-0.5 w-12 rounded-full"
                style={{ backgroundColor: getLighterShade(background_color, 0.3) }}
              />

              <h2 className="text-lg font-medium text-foreground">Parent Resources</h2>
              <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
                Helpful, easy-to-browse resources for families.
              </p>

              {profile.website && (
                <div className="pt-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    style={{
                      borderColor: background_color,
                      color: "#111827",
                    }}
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

          <div className="px-4 py-6 sm:px-8 sm:py-10">{children}</div>

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
                <span className="text-sm font-medium text-foreground">{profile.agencyName}</span>
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
              href="https://www.goodaba.com"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              style={{ color: brandTextColor }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              Powered by GoodABA
            </Link>
          </div>
        ) : (
          <div className="mt-6 text-center">
            <Link
              href="https://www.goodaba.com"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-xs font-medium backdrop-blur-xs transition-colors hover:bg-white/30"
              style={{ color: contrastColor }}
            >
              Powered by GoodABA
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

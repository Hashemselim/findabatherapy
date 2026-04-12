import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Globe } from "lucide-react";

import { BrandedLogo } from "@/components/branded/branded-logo";
import { Button } from "@/components/ui/button";
import { PreviewBanner } from "@/components/ui/preview-banner";
import {
  getClientIntakePageData,
  getIntakeTokenData,
  getPublicAgencyLocations,
  type PrefillData,
} from "@/lib/actions/intake";
import { mergeWithDefaults } from "@/lib/intake/field-registry";
import { buildIntakeAccessPath, getIntakeAccessToken } from "@/lib/public-access";
import { getContrastingTextColor } from "@/lib/utils/brand-color";

import { ClientIntakeForm } from "./client-intake-form";

type ClientIntakePageParams = {
  slug: string;
};

type ClientIntakePageProps = {
  params: Promise<ClientIntakePageParams>;
  searchParams: Promise<{ ref?: string; token?: string; portalTaskId?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ClientIntakePageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getClientIntakePageData(slug);

  if (!result.success || !result.data) {
    return {
      title: { absolute: "Client Intake Form" },
      robots: { index: false, follow: false },
    };
  }

  const { profile } = result.data;

  return {
    title: { absolute: `Client Intake | ${profile.agencyName}` },
    description: `Submit a client intake form for ${profile.agencyName}. Fill out the form and we'll be in touch shortly.`,
    robots: { index: false, follow: false }, // Private form, not for search
  };
}

// Helper to create a lighter shade of the brand color
function getLighterShade(hexColor: string, opacity: number = 0.1) {
  return `${hexColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
}

export default async function ClientIntakePage({ params, searchParams }: ClientIntakePageProps) {
  const { slug } = await params;
  const { ref, token, portalTaskId } = await searchParams;

  if (token) {
    const accessPath = new URL(buildIntakeAccessPath(slug), "http://localhost");
    accessPath.searchParams.set("token", token);
    if (ref) {
      accessPath.searchParams.set("ref", ref);
    }
    if (portalTaskId) {
      accessPath.searchParams.set("portalTaskId", portalTaskId);
    }
    redirect(`${accessPath.pathname}${accessPath.search}`);
  }

  const result = await getClientIntakePageData(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const { listing, profile } = result.data;
  const isPreview = profile.planTier === "free";
  const { background_color, show_powered_by } = profile.intakeFormSettings;
  const contrastColor = getContrastingTextColor(background_color);

  // Load dynamic field configuration and agency locations in parallel
  const [agencyLocations] = await Promise.all([
    getPublicAgencyLocations({ listingId: listing.id, slug: listing.slug }),
  ]);
  const fieldsConfig = mergeWithDefaults(profile.intakeFormSettings.fields);

  // If a pre-fill token is provided, load existing client data
  let prefillData: PrefillData | undefined;
  const accessToken = await getIntakeAccessToken(slug);
  if (accessToken) {
    const tokenResult = await getIntakeTokenData(accessToken);
    if (tokenResult.success && tokenResult.data) {
      prefillData = tokenResult.data;
    } else if (!tokenResult.success && tokenResult.error === "This intake link has already been used") {
      const submittedUrl = new URL(`/intake/${slug}/client/submitted`, "http://localhost");
      if (portalTaskId) {
        submittedUrl.searchParams.set("portal", "1");
      }
      redirect(`${submittedUrl.pathname}${submittedUrl.search}`);
    }
  }

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
          message="This intake form is a preview — upgrade to receive submissions."
          triggerFeature="client_intake"
        />
      )}
      {/* Main Content Container */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* White Card Container */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
          {/* Header Section with tinted background */}
          <div
            className="px-6 py-8 text-center sm:px-8 sm:py-12"
            style={{ backgroundColor: getLighterShade(background_color, 0.08) }}
          >
            {/* Logo */}
            <div className="mx-auto mb-6">
              <BrandedLogo
                logoUrl={listing.logoUrl}
                agencyName={profile.agencyName}
                brandColor={background_color}
                variant="hero"
              />
            </div>

            {/* Company Name & Form Title */}
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                {profile.agencyName}
              </h1>

              {/* Divider */}
              <div
                className="mx-auto h-0.5 w-12 rounded-full"
                style={{ backgroundColor: getLighterShade(background_color, 0.3) }}
              />

              <h2 className="text-lg font-medium text-foreground">Client Intake Form</h2>
              <p className="mx-auto max-w-lg text-base text-muted-foreground sm:text-lg">
                Please fill out this form with your information. We&apos;ll review it and be in touch shortly.
              </p>

              {/* Website Link */}
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
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gap-2"
                    >
                      <Globe className="h-4 w-4" />
                      Visit Website
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Form Section */}
          <div className={`px-6 py-8 sm:px-8 sm:py-10 ${isPreview ? "pointer-events-none select-none opacity-60" : ""}`}>
            <ClientIntakeForm
              listingId={listing.id}
              profileId={listing.profileId}
              providerName={profile.agencyName}
              brandColor={background_color}
              fieldsConfig={fieldsConfig}
              agencyLocations={agencyLocations}
              initialReferralSource={ref === "findabatherapy" ? "findabatherapy" : undefined}
              prefillData={prefillData}
              intakeSlug={slug}
              portalTaskId={portalTaskId}
            />
          </div>

          {/* Footer */}
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

        {/* Powered by badge */}
        {show_powered_by ? (
          <div className="mt-6 text-center">
            <Link
              href="https://www.goodaba.com"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              style={{ color: background_color }}
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

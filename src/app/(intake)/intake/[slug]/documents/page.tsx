import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Globe, ShieldCheck } from "lucide-react";

import { BrandedLogo } from "@/components/branded/branded-logo";
import { PublicDocumentUploadForm } from "@/components/intake/public-document-upload-form";
import { Button } from "@/components/ui/button";
import { PreviewBanner } from "@/components/ui/preview-banner";
import {
  getClientDocumentUploadTokenData,
  type ClientDocumentUploadAccessData,
} from "@/lib/actions/clients";
import { getClientIntakePageData } from "@/lib/actions/intake";
import { buildDocumentAccessPath, getDocumentAccessToken } from "@/lib/public-access";
import { getContrastingTextColor } from "@/lib/utils/brand-color";

type DocumentUploadPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
};

export const revalidate = 300;

function getLighterShade(hexColor: string, opacity: number = 0.1) {
  return `${hexColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
}

export async function generateMetadata({
  params,
}: DocumentUploadPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getClientIntakePageData(slug);

  if (!result.success || !result.data) {
    return {
      title: "Secure Document Upload",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `Secure Document Upload | ${result.data.profile.agencyName}`,
    description: `Upload supporting ABA intake documents for ${result.data.profile.agencyName}.`,
    robots: { index: false, follow: false },
  };
}

export default async function ClientDocumentUploadPage({
  params,
  searchParams,
}: DocumentUploadPageProps) {
  const { slug } = await params;
  const { token } = await searchParams;
  if (token) {
    const accessPath = new URL(buildDocumentAccessPath(slug), "http://localhost");
    accessPath.searchParams.set("token", token);
    redirect(`${accessPath.pathname}${accessPath.search}`);
  }
  const accessToken = await getDocumentAccessToken(slug);
  const pageResult = await getClientIntakePageData(slug);
  if (!pageResult.success || !pageResult.data) {
    notFound();
  }

  const { listing, profile } = pageResult.data;
  const { background_color, show_powered_by } = profile.intakeFormSettings;
  const contrastColor = getContrastingTextColor(background_color);
  const isPreview =
    profile.planTier === "free" ||
    (profile.subscriptionStatus !== "active" &&
      profile.subscriptionStatus !== "trialing");

  let clientName = "Sample Family";
  let existingDocuments: ClientDocumentUploadAccessData["uploadedDocuments"] = [];

  if (accessToken) {
    const tokenResult = await getClientDocumentUploadTokenData(accessToken);

    if (
      !tokenResult.success ||
      !tokenResult.data ||
      tokenResult.data.profileId !== listing.profileId
    ) {
      notFound();
    }

    clientName = tokenResult.data.clientName;
    existingDocuments = tokenResult.data.uploadedDocuments;
  } else if (!isPreview) {
    notFound();
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
          message="This agreement page is in preview mode. Activate your account to collect uploaded documents."
          triggerFeature="client_intake"
        />
      )}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
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
                Secure Document Upload
              </h1>

              <div
                className="mx-auto h-0.5 w-12 rounded-full"
                style={{ backgroundColor: getLighterShade(background_color, 0.3) }}
              />

              <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
                Upload supporting documents for{" "}
                <span className="font-semibold text-foreground">{clientName}</span>.
                Diagnosis reports, referrals, and medical history are all appropriate here.
              </p>

              <div
                className="mx-auto flex max-w-xl items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm"
                style={{
                  borderColor: `${background_color}25`,
                  backgroundColor: `${background_color}06`,
                }}
              >
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: background_color }} />
                <p className="text-muted-foreground">
                  This page is specific to your family&apos;s intake and sends documents directly to{" "}
                  <span className="font-medium text-foreground">{profile.agencyName}</span>.
                </p>
              </div>

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

          <div className={isPreview ? "pointer-events-none select-none opacity-60" : ""}>
            <div className="px-6 py-8 sm:px-8 sm:py-10">
              <PublicDocumentUploadForm
                accessSlug={slug}
                clientName={clientName}
                providerName={profile.agencyName}
                brandColor={background_color}
                existingDocuments={existingDocuments}
              />
            </div>
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

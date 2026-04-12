import type { Metadata } from "next";
import { format } from "date-fns";
import { notFound } from "next/navigation";

import { BrandedCompletionPage } from "@/components/branded/branded-completion-page";
import {
  getAuthenticatedPortalTargets,
} from "@/lib/actions/client-portal";
import { getClientIntakePageData } from "@/lib/actions/intake";
import { getPortalAccessToken } from "@/lib/public-access";

type ClientIntakeSubmittedPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    submittedAt?: string;
    portal?: string;
    uploadUrl?: string;
  }>;
};

export const dynamic = "force-dynamic";

async function resolvePortalAction(slug: string, shouldOfferPortal: boolean) {
  if (!shouldOfferPortal) {
    return null;
  }

  const portalToken = await getPortalAccessToken(slug);
  if (portalToken) {
    return { href: `/portal/${slug}`, label: "Back to My Portal" };
  }

  const targets = await getAuthenticatedPortalTargets(slug);
  if (targets.success && targets.data && targets.data.entries.length > 0) {
    return { href: `/portal/${slug}`, label: "Back to My Portal" };
  }

  return { href: `/portal/${slug}/sign-in`, label: "Sign in to My Portal" };
}

export async function generateMetadata({
  params,
}: ClientIntakeSubmittedPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getClientIntakePageData(slug);

  if (!result.success || !result.data) {
    return {
      title: { absolute: "Intake Submitted" },
      robots: { index: false, follow: false },
    };
  }

  return {
    title: {
      absolute: `Intake Submitted | ${result.data.profile.agencyName}`,
    },
    description: `Submission received for ${result.data.profile.agencyName}.`,
    robots: { index: false, follow: false },
  };
}

export default async function ClientIntakeSubmittedPage({
  params,
  searchParams,
}: ClientIntakeSubmittedPageProps) {
  const { slug } = await params;
  const { submittedAt, portal, uploadUrl } = await searchParams;
  const result = await getClientIntakePageData(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const { listing, profile } = result.data;
  const portalAction = await resolvePortalAction(slug, portal === "1");
  const formattedSubmittedAt = submittedAt
    ? format(new Date(submittedAt), "MMMM d, yyyy 'at' h:mm a")
    : format(new Date(), "MMMM d, yyyy 'at' h:mm a");

  return (
    <BrandedCompletionPage
      agencyName={profile.agencyName}
      brandColor={profile.intakeFormSettings.background_color}
      logoUrl={listing.logoUrl}
      showPoweredBy={profile.intakeFormSettings.show_powered_by}
      title={portal === "1" ? "Form submitted" : "Intake submitted"}
      description={
        portal === "1"
          ? "Your information was submitted successfully."
          : "Your intake information was received successfully."
      }
      summaryItems={[
        { label: "Submitted", value: formattedSubmittedAt },
        { label: "Agency", value: profile.agencyName },
        { label: "Status", value: "Submitted" },
      ]}
      primaryAction={
        uploadUrl
          ? {
              href: uploadUrl,
              label: "Upload Documents",
              external: true,
            }
          : portalAction
      }
      secondaryAction={
        uploadUrl
          ? portalAction ??
            (profile.website
              ? {
                  href: profile.website,
                  label: "Visit Website",
                  external: true,
                  variant: "outline" as const,
                }
              : null)
          : profile.website
            ? {
                href: profile.website,
                label: "Visit Website",
                external: true,
                variant: "outline" as const,
              }
            : null
      }
    />
  );
}

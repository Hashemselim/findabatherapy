import type { Metadata } from "next";
import { cookies } from "next/headers";
import { format } from "date-fns";
import { notFound, redirect } from "next/navigation";

import { BrandedCompletionPage } from "@/components/branded/branded-completion-page";
import { PublicFormSubmissionReview } from "@/components/forms/public-form-submission-review";
import { getPublicFormPageData } from "@/lib/actions/forms";
import {
  getAuthenticatedPortalTargets,
} from "@/lib/actions/client-portal";
import { getPortalAccessToken } from "@/lib/public-access";

type PublicFormSubmittedPageProps = {
  params: Promise<{ slug: string; formSlug: string }>;
  searchParams: Promise<{ portal?: string }>;
};

export const dynamic = "force-dynamic";

async function resolvePortalAction(
  slug: string,
  shouldOfferPortal: boolean,
  forcePortalReturn = false,
) {
  if (!shouldOfferPortal) {
    return null;
  }

  if (forcePortalReturn) {
    return { href: `/portal/${slug}`, label: "Back to My Portal" };
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
}: PublicFormSubmittedPageProps): Promise<Metadata> {
  const { slug, formSlug } = await params;
  const result = await getPublicFormPageData(slug, formSlug);

  if (!result.success || !result.data) {
    return {
      title: { absolute: "Form Submitted" },
      robots: { index: false, follow: false },
    };
  }

  return {
    title: {
      absolute: `Form Submitted | ${result.data.workspace.agencyName}`,
    },
    description: `Submission received for ${result.data.template.title}.`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicFormSubmittedPage({
  params,
  searchParams,
}: PublicFormSubmittedPageProps) {
  const { slug, formSlug } = await params;
  const { portal } = await searchParams;
  const cookieStore = await cookies();
  const portalReturnSlug = cookieStore.get("portal_return_slug")?.value;
  const result = await getPublicFormPageData(slug, formSlug);

  if (!result.success || !result.data) {
    notFound();
  }

  if (!result.data.existingSubmission) {
    redirect(`/forms/${slug}/${formSlug}`);
  }

  const portalAction = await resolvePortalAction(
    slug,
    portal === "1" ||
      (result.data.portal.enabled && result.data.portal.guardianAccessConfigured),
    portal === "1" || portalReturnSlug === slug,
  );

  return (
    <BrandedCompletionPage
      agencyName={result.data.workspace.agencyName}
      brandColor={
        typeof result.data.workspace.branding.background_color === "string" &&
        result.data.workspace.branding.background_color.trim().length > 0
          ? result.data.workspace.branding.background_color
          : "#2563eb"
      }
      logoUrl={result.data.listing.logoUrl}
      showPoweredBy={
        typeof result.data.workspace.branding.show_powered_by === "boolean"
          ? result.data.workspace.branding.show_powered_by
          : true
      }
      title="Form submitted"
      description="Your answers were received and saved successfully."
      summaryItems={[
        { label: "Form", value: result.data.template.title },
        {
          label: "Submitted",
          value: format(
            new Date(result.data.existingSubmission.submittedAt),
            "MMMM d, yyyy 'at' h:mm a",
          ),
        },
        ...(result.data.link.clientName
          ? [{ label: "Client", value: result.data.link.clientName }]
          : []),
        {
          label: "Status",
          value: "Submitted",
        },
      ]}
      primaryAction={portalAction}
      secondaryAction={
        result.data.workspace.website
          ? {
              href: result.data.workspace.website,
              label: "Visit Website",
              variant: "outline",
              external: true,
            }
          : null
      }
    >
      <PublicFormSubmissionReview
        providerSlug={result.data.providerSlug}
        formSlug={result.data.template.slug}
        questions={result.data.version.questions}
        answers={result.data.existingSubmission.answers}
      />
    </BrandedCompletionPage>
  );
}

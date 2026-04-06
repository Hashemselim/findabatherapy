import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import {
  getClientIntakePageData,
  getPublicAgencyLocations,
  getIntakeTokenData,
  type PrefillData,
} from "@/lib/actions/intake";
import { ClientIntakeForm } from "@/app/(intake)/intake/[slug]/client/client-intake-form";
import { mergeWithDefaults } from "@/lib/intake/field-registry";
import { buildIntakeAccessPath, getIntakeAccessToken } from "@/lib/public-access";

type IntakePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string; token?: string }>;
};

export const revalidate = 300;

export async function generateMetadata({
  params,
}: IntakePageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getClientIntakePageData(slug);

  if (!result.success || !result.data) {
    return { title: "Client Intake" };
  }

  return {
    title: `Client Intake | ${result.data.profile.agencyName}`,
    description: `Submit a client intake form for ${result.data.profile.agencyName}.`,
    robots: { index: false, follow: false },
  };
}

export default async function WebsiteIntakePage({
  params,
  searchParams,
}: IntakePageProps) {
  const { slug } = await params;
  const { ref, token } = await searchParams;
  if (token) {
    const accessPath = new URL(buildIntakeAccessPath(slug), "http://localhost");
    accessPath.searchParams.set("token", token);
    if (ref) {
      accessPath.searchParams.set("ref", ref);
    }
    redirect(`${accessPath.pathname}${accessPath.search}`);
  }
  const result = await getClientIntakePageData(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const { listing, profile } = result.data;
  const { background_color } = profile.intakeFormSettings;

  const [agencyLocations] = await Promise.all([
    getPublicAgencyLocations({ listingId: listing.id, slug: listing.slug }),
  ]);
  const fieldsConfig = mergeWithDefaults(profile.intakeFormSettings.fields);

  let prefillData: PrefillData | undefined;
  const accessToken = await getIntakeAccessToken(slug);
  if (accessToken) {
    const tokenResult = await getIntakeTokenData(accessToken);
    if (tokenResult.success && tokenResult.data) {
      prefillData = tokenResult.data;
    }
  }

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Client Intake Form
          </h1>
          <p className="mt-3 text-gray-500">
            Please fill out this form with your information. We&apos;ll review
            it and be in touch shortly.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs sm:p-8">
          <ClientIntakeForm
            listingId={listing.id}
            profileId={listing.profileId}
            providerName={profile.agencyName}
            brandColor={background_color}
            fieldsConfig={fieldsConfig}
            agencyLocations={agencyLocations}
            initialReferralSource={
              ref === "findabatherapy" ? "findabatherapy" : undefined
            }
            prefillData={prefillData}
            intakeSlug={slug}
          />
        </div>
      </div>
    </section>
  );
}

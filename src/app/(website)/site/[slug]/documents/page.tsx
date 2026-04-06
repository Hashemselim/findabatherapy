import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { PublicDocumentUploadForm } from "@/components/intake/public-document-upload-form";
import { getClientDocumentUploadTokenData } from "@/lib/actions/clients";
import { getClientIntakePageData } from "@/lib/actions/intake";
import { buildDocumentAccessPath, getDocumentAccessToken } from "@/lib/public-access";

type WebsiteDocumentUploadPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
};

export const revalidate = 300;

export async function generateMetadata({
  params,
}: WebsiteDocumentUploadPageProps): Promise<Metadata> {
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

export default async function WebsiteDocumentUploadPage({
  params,
  searchParams,
}: WebsiteDocumentUploadPageProps) {
  const { slug } = await params;
  const { token } = await searchParams;
  if (token) {
    const accessPath = new URL(buildDocumentAccessPath(slug), "http://localhost");
    accessPath.searchParams.set("token", token);
    redirect(`${accessPath.pathname}${accessPath.search}`);
  }
  const accessToken = await getDocumentAccessToken(slug);

  if (!accessToken) {
    notFound();
  }

  const [pageResult, tokenResult] = await Promise.all([
    getClientIntakePageData(slug),
    getClientDocumentUploadTokenData(accessToken),
  ]);

  if (
    !pageResult.success ||
    !pageResult.data ||
    !tokenResult.success ||
    !tokenResult.data ||
    tokenResult.data.profileId !== pageResult.data.listing.profileId
  ) {
    notFound();
  }

  const { profile } = pageResult.data;
  const brandColor = profile.intakeFormSettings?.background_color || "#3D6B4F";

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${brandColor}15` }}
          >
            <ShieldCheck
              className="h-7 w-7"
              style={{ color: brandColor }}
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Secure Document Upload
          </h1>
          <p className="mt-3 text-gray-500">
            Upload supporting documents for {tokenResult.data.clientName}. Diagnosis reports,
            referrals, and medical history can all be shared here.
          </p>
        </div>

        <div
          className="rounded-2xl border bg-white p-6 shadow-xs sm:p-8"
          style={{ borderColor: `${brandColor}20` }}
        >
          <PublicDocumentUploadForm
            accessSlug={slug}
            clientName={tokenResult.data.clientName}
            providerName={profile.agencyName}
            brandColor={brandColor}
            existingDocuments={tokenResult.data.uploadedDocuments}
          />
        </div>
      </div>
    </section>
  );
}

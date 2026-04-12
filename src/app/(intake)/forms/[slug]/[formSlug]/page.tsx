import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PublicCustomFormPage } from "@/components/forms/public-custom-form-page";
import { getPublicFormPageData } from "@/lib/actions/forms";
import { buildFormAccessPath } from "@/lib/public-access";

type PublicFormPageProps = {
  params: Promise<{ slug: string; formSlug: string }>;
  searchParams: Promise<{ token?: string; portal?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PublicFormPageProps): Promise<Metadata> {
  const { slug, formSlug } = await params;
  const result = await getPublicFormPageData(slug, formSlug);

  if (!result.success || !result.data) {
    return {
      title: { absolute: "Custom Form" },
      robots: { index: false, follow: false },
    };
  }

  return {
    title: {
      absolute: `${result.data.template.title} | ${result.data.workspace.agencyName}`,
    },
    description:
      result.data.template.description ??
      `Complete a form for ${result.data.workspace.agencyName}.`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicFormPage({
  params,
  searchParams,
}: PublicFormPageProps) {
  const { slug, formSlug } = await params;
  const { token, portal } = await searchParams;

  if (token) {
    const accessPath = new URL(buildFormAccessPath(slug, formSlug), "http://localhost");
    accessPath.searchParams.set("token", token);
    if (portal === "1") {
      accessPath.searchParams.set("portal", "1");
    }
    redirect(`${accessPath.pathname}${accessPath.search}`);
  }

  const result = await getPublicFormPageData(slug, formSlug);
  if (!result.success || !result.data) {
    notFound();
  }

  if (result.data.existingSubmission) {
    const submittedUrl = new URL(`/forms/${slug}/${formSlug}/submitted`, "http://localhost");
    if (portal === "1") {
      submittedUrl.searchParams.set("portal", "1");
    }
    redirect(`${submittedUrl.pathname}${submittedUrl.search}`);
  }

  return <PublicCustomFormPage data={result.data} />;
}

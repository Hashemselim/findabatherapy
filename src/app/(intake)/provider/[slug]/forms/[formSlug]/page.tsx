import { redirect } from "next/navigation";

import {
  generateMetadata,
  dynamic,
} from "@/app/(intake)/forms/[slug]/[formSlug]/page";
import { buildFormAccessPath } from "@/lib/public-access";

type ProviderAliasFormPageProps = {
  params: Promise<{ slug: string; formSlug: string }>;
  searchParams: Promise<{ token?: string }>;
};

export { generateMetadata, dynamic };

export default async function ProviderAliasFormPage({
  params,
  searchParams,
}: ProviderAliasFormPageProps) {
  const { slug, formSlug } = await params;
  const { token } = await searchParams;

  if (token) {
    const accessPath = new URL(buildFormAccessPath(slug, formSlug), "http://localhost");
    accessPath.searchParams.set("token", token);
    redirect(`${accessPath.pathname}${accessPath.search}`);
  }

  redirect(`/forms/${slug}/${formSlug}`);
}

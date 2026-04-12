import { notFound } from "next/navigation";

import { FormBuilder } from "@/components/dashboard/forms/form-builder";
import { getFormBuilderData } from "@/lib/actions/forms";
import { getListingSlug } from "@/lib/actions/listings";

type FormBuilderPageProps = {
  params: Promise<{ templateId: string }>;
};

export default async function FormBuilderPage({ params }: FormBuilderPageProps) {
  const { templateId } = await params;
  const [listingSlug, result] = await Promise.all([
    getListingSlug(),
    getFormBuilderData(templateId),
  ]);

  if (!result.success || !result.data) {
    notFound();
  }

  return <FormBuilder data={result.data} listingSlug={listingSlug} />;
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getProviderWebsiteData } from "@/lib/actions/provider-website";
import { GlossarySearch } from "@/components/content/glossary-search";
import { GLOSSARY_TERMS } from "@/lib/content/glossary";

type GlossaryPageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export async function generateMetadata({
  params,
}: GlossaryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProviderWebsiteData(slug);

  if (!result.success) {
    return { title: "ABA Glossary" };
  }

  return {
    title: "ABA Glossary",
    description: `Browse and search key ABA therapy terms in plain language. A resource from ${result.data.profile.agencyName}.`,
  };
}

export default async function WebsiteGlossaryPage({
  params,
}: GlossaryPageProps) {
  const { slug } = await params;
  const result = await getProviderWebsiteData(slug);

  if (!result.success) {
    notFound();
  }

  const brandColor = result.data.profile.intakeFormSettings.background_color;

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link
          href={`/site/${slug}/resources`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: brandColor }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Resources
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            ABA Glossary
          </h1>
          <p className="mt-3 text-gray-500">
            Browse and search key ABA terms in plain language.
          </p>
        </div>

        <div
          className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8"
          style={{ borderColor: `${brandColor}20` }}
        >
          <GlossarySearch terms={GLOSSARY_TERMS} />
        </div>
      </div>
    </section>
  );
}

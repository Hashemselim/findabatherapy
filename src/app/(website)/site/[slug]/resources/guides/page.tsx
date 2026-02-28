import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

import { getProviderWebsiteData } from "@/lib/actions/provider-website";
import { Badge } from "@/components/ui/badge";
import { getFeaturedArticles } from "@/lib/content/articles";

type GuidesPageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export async function generateMetadata({
  params,
}: GuidesPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProviderWebsiteData(slug);

  if (!result.success) {
    return { title: "Guides" };
  }

  return {
    title: "Featured Guides",
    description: `Step-by-step guides for families from ${result.data.profile.agencyName}. Learn about ABA therapy.`,
  };
}

export default async function WebsiteGuidesPage({ params }: GuidesPageProps) {
  const { slug } = await params;
  const result = await getProviderWebsiteData(slug);

  if (!result.success) {
    notFound();
  }

  const brandColor = result.data.profile.intakeFormSettings.background_color;
  const guides = getFeaturedArticles();

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
            Featured Guides
          </h1>
          <p className="mt-3 text-gray-500">
            Select a guide to read. Each guide helps families navigate ABA
            therapy.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/site/${slug}/resources/guides/${guide.slug}`}
              className="group"
            >
              <div className="h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-gray-200 hover:shadow-md">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Badge
                    className="border-0"
                    style={{
                      backgroundColor: `${brandColor}15`,
                      color: brandColor,
                    }}
                  >
                    Guide
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3.5 w-3.5" />
                    {guide.readTime} min
                  </span>
                </div>
                <h2 className="text-base font-semibold leading-tight text-gray-900">
                  {guide.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                  {guide.description}
                </p>
                <span
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium transition-colors"
                  style={{ color: brandColor }}
                >
                  Read guide
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

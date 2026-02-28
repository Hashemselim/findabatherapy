import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getProviderWebsiteData } from "@/lib/actions/provider-website";
import { getArticle, ARTICLE_CATEGORIES } from "@/lib/content/articles";

type GuideDetailPageProps = {
  params: Promise<{ slug: string; guideSlug: string }>;
};

export const revalidate = 300;

export async function generateMetadata({
  params,
}: GuideDetailPageProps): Promise<Metadata> {
  const { slug, guideSlug } = await params;
  const [result, article] = await Promise.all([
    getProviderWebsiteData(slug),
    Promise.resolve(getArticle(guideSlug)),
  ]);

  if (!result.success || !article) {
    return { title: "Guide Not Found" };
  }

  return {
    title: article.title,
    description: article.description,
  };
}

export default async function WebsiteGuideDetailPage({
  params,
}: GuideDetailPageProps) {
  const { slug, guideSlug } = await params;
  const [result, article] = await Promise.all([
    getProviderWebsiteData(slug),
    Promise.resolve(getArticle(guideSlug)),
  ]);

  if (!result.success || !article) {
    notFound();
  }

  const brandColor = result.data.profile.intakeFormSettings.background_color;
  const category = ARTICLE_CATEGORIES[article.category];

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link
            href={`/site/${slug}/resources/guides`}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Guides
          </Link>
          <Link
            href={`/site/${slug}/resources`}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            All Resources
          </Link>
        </div>

        {/* Article Header */}
        <header
          className="mb-8 space-y-3 rounded-2xl border border-gray-100 p-6 sm:p-8"
          style={{
            background: `linear-gradient(135deg, ${brandColor}06, ${brandColor}02)`,
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className="border-0"
              style={{
                backgroundColor: `${brandColor}15`,
                color: brandColor,
              }}
            >
              {category.label}
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              {article.readTime} min read
            </span>
          </div>

          <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
            {article.title}
          </h1>
          <p className="text-gray-500">{article.description}</p>
        </header>

        {/* Article Content */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div
            className="prose prose-slate max-w-none prose-headings:font-semibold prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-a:text-gray-900 prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, ArrowLeft, ArrowRight, Calendar, BookOpen, Lightbulb, Scale, Workflow, HelpCircle, User, BadgeCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import {
  generateArticleSchema,
  generateFAQSchema,
  generateHowToSchema,
  generateBreadcrumbSchema,
  generateMedicalWebPageSchema,
} from "@/lib/seo/schemas";
import {
  getArticle,
  getAllArticleSlugs,
  getRelatedArticles,
  ARTICLE_CATEGORIES,
  DEFAULT_AUTHOR,
  DEFAULT_REVIEWER,
} from "@/lib/content/articles";

const BASE_URL = "https://www.findabatherapy.com";

// Revalidate every day
export const revalidate = 86400;

type ArticlePageParams = {
  slug: string;
};

type ArticlePageProps = {
  params: Promise<ArticlePageParams>;
};

// Generate static paths for all articles
export async function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) {
    return {};
  }

  const title = article.title;
  const description = article.description;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Find ABA Therapy`,
      description,
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      url: `${BASE_URL}/learn/${slug}`,
      images: [
        {
          url: `${BASE_URL}/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(ARTICLE_CATEGORIES[article.category].label)}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Find ABA Therapy`,
      description,
      images: [
        `${BASE_URL}/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(ARTICLE_CATEGORIES[article.category].label)}`,
      ],
    },
    alternates: {
      canonical: `/learn/${slug}`,
    },
  };
}

const categoryIcons = {
  guide: BookOpen,
  education: Lightbulb,
  comparison: Scale,
  process: Workflow,
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = getRelatedArticles(slug);
  const categoryInfo = ARTICLE_CATEGORIES[article.category];
  const Icon = categoryIcons[article.category];

  // Get author info (use default if not specified)
  const author = article.author || DEFAULT_AUTHOR;
  const reviewer = article.reviewedBy || DEFAULT_REVIEWER;
  const lastReviewed = article.lastReviewed || article.updatedAt || article.publishedAt;

  // Generate schemas
  const schemas: Record<string, unknown>[] = [];

  // Breadcrumb schema
  schemas.push(
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Learn", url: "/learn" },
      { name: article.title, url: `/learn/${slug}` },
    ])
  );

  // Article schema with author for E-E-A-T
  schemas.push(
    generateArticleSchema({
      title: article.title,
      description: article.description,
      slug: article.slug,
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt,
      author: `${author.name}, ${author.credentials}`,
      category: categoryInfo.label,
    })
  );

  // MedicalWebPage schema for YMYL healthcare content
  schemas.push(
    generateMedicalWebPageSchema({
      title: article.title,
      description: article.description,
      url: `${BASE_URL}/learn/${slug}`,
      lastReviewed,
    })
  );

  // FAQ schema if article has FAQs
  if (article.faqs && article.faqs.length > 0) {
    schemas.push(generateFAQSchema(article.faqs));
  }

  // HowTo schema if article has steps
  if (article.steps && article.steps.length > 0) {
    schemas.push(
      generateHowToSchema({
        name: article.title,
        description: article.description,
        steps: article.steps,
      })
    );
  }

  return (
    <article className="pb-16">
      <JsonLd data={schemas} />

      {/* Header */}
      <div className="bg-gradient-to-br from-white via-purple-50/30 to-blue-50/30 py-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span>/</span>
            <Link href="/learn" className="hover:text-foreground">
              Learn
            </Link>
            <span>/</span>
            <span className="text-foreground line-clamp-1">{article.title}</span>
          </nav>

          {/* Back link */}
          <Link
            href="/learn"
            className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all guides
          </Link>

          {/* Article header */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className={categoryInfo.color}>
                <Icon className="mr-1 h-3 w-3" />
                {categoryInfo.label}
              </Badge>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {article.readTime} min read
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {article.title}
            </h1>

            <p className="text-lg text-muted-foreground">
              {article.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Published {formatDate(article.publishedAt)}
              </span>
              {article.updatedAt && article.updatedAt !== article.publishedAt && (
                <span className="text-muted-foreground">
                  · Updated {formatDate(article.updatedAt)}
                </span>
              )}
            </div>

            {/* E-E-A-T Author/Reviewer Info */}
            <div className="mt-6 flex flex-col gap-3 rounded-lg border border-border/60 bg-white/50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {author.name}, {author.credentials}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {author.title}{author.organization ? ` at ${author.organization}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BadgeCheck className="h-4 w-4 text-green-600" />
                <span>Medically reviewed {formatDate(lastReviewed)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div
          className="prose prose-slate max-w-none prose-headings:font-semibold prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* FAQs Section */}
        {article.faqs && article.faqs.length > 0 && (
          <section className="mt-12 border-t border-border pt-12">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
            </div>
            <p className="mt-2 text-muted-foreground">
              Common questions about this topic.
            </p>

            <div className="mt-6 space-y-4">
              {article.faqs.map((faq, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">
                      {faq.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="mt-12 border-t border-border pt-12">
            <h2 className="text-xl font-semibold">Related Articles</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Continue learning with these related guides.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {relatedArticles.map((related) => {
                const RelatedIcon = categoryIcons[related.category];
                const relatedCategoryInfo = ARTICLE_CATEGORIES[related.category];

                return (
                  <Link key={related.slug} href={`/learn/${related.slug}`}>
                    <Card className="group h-full border border-border/70 transition-all hover:border-primary">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={`${relatedCategoryInfo.color} text-xs`}>
                            <RelatedIcon className="mr-1 h-3 w-3" />
                            {relatedCategoryInfo.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {related.readTime} min read
                          </span>
                        </div>
                        <h3 className="mt-2 font-medium group-hover:text-primary line-clamp-2">
                          {related.title}
                        </h3>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="mt-12 rounded-xl border border-border bg-gradient-to-br from-purple-50 to-blue-50 p-8 text-center">
          <h2 className="text-xl font-semibold">Ready to find an ABA provider?</h2>
          <p className="mt-2 text-muted-foreground">
            Search our directory of verified ABA therapy providers across all 50 states.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/search">
                Search Providers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/learn">
                Browse More Guides
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </article>
  );
}

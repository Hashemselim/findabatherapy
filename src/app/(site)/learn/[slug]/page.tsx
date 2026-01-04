import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, ArrowLeft, ArrowRight, Calendar, BookOpen, Lightbulb, Scale, Workflow, HelpCircle, User, BadgeCheck, Sparkles, CheckCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BubbleBackground } from "@/components/ui/bubble-background";
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
      <BubbleBackground
        interactive
        transition={{ stiffness: 100, damping: 50, mass: 0.5 }}
        className="w-full bg-gradient-to-br from-white via-yellow-50/50 to-blue-50/50 py-8 sm:py-12"
        colors={{
          first: "255,255,255",
          second: "255,236,170",
          third: "135,176,255",
          fourth: "255,248,210",
          fifth: "190,210,255",
          sixth: "240,248,255",
        }}
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="transition-colors duration-300 hover:text-foreground">
              Home
            </Link>
            <span>/</span>
            <Link href="/learn" className="transition-colors duration-300 hover:text-foreground">
              Learn
            </Link>
            <span>/</span>
            <span className="text-foreground line-clamp-1">{article.title}</span>
          </nav>

          {/* Back link */}
          <Link
            href="/learn"
            className="group mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-all duration-300 ease-premium hover:gap-2 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover:-translate-x-0.5" />
            Back to all guides
          </Link>

          {/* Article header */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className={`${categoryInfo.color} transition-all duration-300 ease-premium hover:scale-[1.02]`}>
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {categoryInfo.label}
              </Badge>
              <span className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {article.readTime} min read
              </span>
            </div>

            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {article.title}
            </h1>

            <p className="text-lg text-muted-foreground">
              {article.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
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
            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-border/60 bg-white/80 p-5 shadow-sm transition-all duration-300 ease-premium hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#5788FF]/10 transition-all duration-300 ease-premium">
                  <User className="h-5 w-5 text-[#5788FF]" />
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
              <Badge
                variant="outline"
                className="w-fit gap-1.5 border-[#5788FF]/50 bg-[#5788FF]/10 px-3 py-1.5 text-[#5788FF]"
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                Reviewed {formatDate(lastReviewed)}
              </Badge>
            </div>
          </div>
        </div>
      </BubbleBackground>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div
          className="prose prose-slate max-w-none prose-headings:font-semibold prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* FAQs Section */}
        {article.faqs && article.faqs.length > 0 && (
          <section className="mt-14 border-t border-border/60 pt-12">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10">
                <HelpCircle className="h-6 w-6 text-[#5788FF]" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Got questions?
                </p>
                <h2 className="mt-1 text-2xl font-semibold">Frequently Asked Questions</h2>
                <p className="mt-2 text-muted-foreground">
                  Common questions about this topic.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {article.faqs.map((faq, index) => (
                <Card key={index} className="group border border-border/60 bg-white transition-all duration-300 ease-premium hover:-translate-y-[1px] hover:border-[#5788FF]/30 hover:shadow-[0_4px_20px_rgba(87,136,255,0.08)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium transition-colors duration-300 group-hover:text-[#5788FF]">
                      {faq.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">Have more questions?</span>
              <Link
                href="/faq"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5788FF] transition-all duration-300 hover:gap-2"
              >
                Visit our FAQ
                <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link
                href="/learn/glossary"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5788FF] transition-all duration-300 hover:gap-2"
              >
                ABA Glossary
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        )}

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="mt-14 border-t border-border/60 pt-12">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10">
                <BookOpen className="h-6 w-6 text-[#5788FF]" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Keep learning
                </p>
                <h2 className="mt-1 text-2xl font-semibold">Related Articles</h2>
                <p className="mt-2 text-muted-foreground">
                  Continue learning with these related guides.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {relatedArticles.map((related) => {
                const RelatedIcon = categoryIcons[related.category];
                const relatedCategoryInfo = ARTICLE_CATEGORIES[related.category];

                return (
                  <Link key={related.slug} href={`/learn/${related.slug}`} className="group">
                    <Card className="h-full border border-border/60 bg-white transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-[#5788FF]/30 hover:shadow-[0_8px_30px_rgba(87,136,255,0.1)]">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className={`${relatedCategoryInfo.color} transition-all duration-300 ease-premium group-hover:scale-[1.02]`}>
                            <RelatedIcon className="mr-1.5 h-3.5 w-3.5 transition-transform duration-300 ease-bounce-sm group-hover:scale-[1.1]" />
                            {relatedCategoryInfo.label}
                          </Badge>
                          <span className="flex items-center gap-1 rounded-full bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground transition-all duration-300 group-hover:bg-[#5788FF]/10 group-hover:text-[#5788FF]">
                            <Clock className="h-3 w-3" />
                            {related.readTime} min
                          </span>
                        </div>
                        <h3 className="mt-3 font-semibold leading-snug transition-colors duration-300 group-hover:text-[#5788FF] line-clamp-2">
                          {related.title}
                        </h3>
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#5788FF] transition-all duration-300 ease-premium group-hover:gap-1.5">
                          Read article
                          <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover:translate-x-0.5" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="group relative mt-14 overflow-hidden rounded-3xl border border-[#5788FF]/20 bg-gradient-to-br from-[#5788FF]/[0.03] via-white to-[#5788FF]/[0.06] p-8 transition-all duration-500 ease-premium hover:border-[#5788FF]/30 hover:shadow-[0_8px_30px_rgba(87,136,255,0.12)]">
          {/* Decorative elements */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[#5788FF]/5 transition-transform duration-700 ease-premium group-hover:scale-150" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-[#FEE720]/20 transition-transform duration-700 ease-premium group-hover:scale-150" />

          <div className="relative flex flex-col items-center gap-6 text-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10 transition-all duration-300 ease-premium group-hover:scale-[1.05] group-hover:bg-[#5788FF]/15">
              <Sparkles className="h-7 w-7 text-[#5788FF] transition-transform duration-300 ease-bounce-sm group-hover:scale-110" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Ready to find an ABA provider?</h2>
              <p className="text-muted-foreground">
                Search our directory of verified ABA therapy providers across all 50 states.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                asChild
                className="group/btn rounded-full border border-[#FEE720] bg-[#FEE720] px-8 py-5 text-base font-semibold text-[#333333] shadow-[0_4px_14px_rgba(254,231,32,0.3)] transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:bg-[#FFF5C2] hover:shadow-[0_8px_20px_rgba(254,231,32,0.35)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(254,231,32,0.2)]"
              >
                <Link href="/search">
                  Search Providers
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-border/60 px-6 py-5 text-base font-medium transition-all duration-300 ease-premium hover:-translate-y-[1px] hover:border-[#5788FF]/30 hover:bg-[#5788FF]/5 hover:shadow-[0_4px_12px_rgba(87,136,255,0.1)]"
              >
                <Link href="/learn">
                  Browse More Guides
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}

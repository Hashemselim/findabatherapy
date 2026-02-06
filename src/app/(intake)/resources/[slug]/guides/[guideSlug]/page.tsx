import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getArticle, ARTICLE_CATEGORIES } from "@/lib/content/articles";

type GuideDetailPageProps = {
  params: Promise<{ slug: string; guideSlug: string }>;
};

export default async function GuideDetailPage({ params }: GuideDetailPageProps) {
  const { slug, guideSlug } = await params;
  const article = getArticle(guideSlug);

  if (!article) {
    notFound();
  }

  const category = ARTICLE_CATEGORIES[article.category];

  return (
    <article className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href={`/resources/${slug}/guides`}
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Guides
        </Link>

        <Link
          href={`/resources/${slug}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Parent Resources
        </Link>
      </div>

      <header className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className={category.color}>
            {category.label}
          </Badge>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {article.readTime} min read
          </span>
        </div>

        <h3 className="text-2xl font-semibold leading-tight text-foreground">{article.title}</h3>
        <p className="text-sm text-muted-foreground">{article.description}</p>
      </header>

      <div
        className="prose prose-slate max-w-none prose-headings:font-semibold prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-a:text-foreground prose-a:no-underline hover:prose-a:underline"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />
    </article>
  );
}

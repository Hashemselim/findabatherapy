import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const articles = [
  {
    title: "How to choose the right ABA provider",
    summary: "Questions to ask, red flags to watch for, and how to compare service models.",
    tag: "Guides",
  },
  {
    title: "Understanding in-home vs. center-based ABA",
    summary: "A quick comparison of staffing, scheduling, and insurance requirements.",
    tag: "Care options",
  },
  {
    title: "What to expect during intake and assessment",
    summary: "Timeline, paperwork, and who joins each visit during onboarding.",
    tag: "Family tips",
  },
];

export default function LearnPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <header className="space-y-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Learn</p>
        <h1 className="text-4xl font-semibold">Guides for navigating ABA therapy</h1>
        <p className="text-lg text-muted-foreground">
          Expert-backed articles to help families choose the right agency, understand insurance, and prepare for services.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-3">
        {articles.map((article) => (
          <Card key={article.title} className="border border-border/70">
            <CardHeader>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{article.tag}</p>
              <CardTitle className="text-xl">{article.title}</CardTitle>
              <CardDescription>{article.summary}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="#" className="text-sm text-primary hover:underline">
                Read article →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

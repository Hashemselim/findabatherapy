import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFeaturedArticles } from "@/lib/content/articles";

type ResourcesGuidesPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ResourcesGuidesPage({ params }: ResourcesGuidesPageProps) {
  const { slug } = await params;
  const guides = getFeaturedArticles();

  return (
    <div className="space-y-5">
      <Link
        href={`/resources/${slug}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Parent Resources
      </Link>

      <div>
        <h3 className="text-xl font-semibold text-foreground">Featured Guides</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a guide to read. Each guide has its own page with navigation.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {guides.map((guide) => (
          <Link key={guide.slug} href={`/resources/${slug}/guides/${guide.slug}`} className="group">
            <Card className="h-full border-border/60 transition-all hover:border-primary/30 hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">Guide</Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {guide.readTime} min
                  </span>
                </div>
                <CardTitle className="text-base leading-tight">{guide.title}</CardTitle>
                <CardDescription className="line-clamp-2 text-sm">{guide.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Read guide
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

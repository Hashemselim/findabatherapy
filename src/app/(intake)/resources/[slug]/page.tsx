import Link from "next/link";
import { ArrowRight, BookOpen, FileQuestion, GraduationCap } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ResourcesHubPageProps = {
  params: Promise<{ slug: string }>;
};

const cards = [
  {
    key: "faq",
    title: "Frequently Asked Questions",
    description: "Quick answers to common parent questions.",
    icon: FileQuestion,
    href: (slug: string) => `/resources/${slug}/faq`,
  },
  {
    key: "glossary",
    title: "ABA Glossary",
    description: "Simple definitions of common ABA terms.",
    icon: BookOpen,
    href: (slug: string) => `/resources/${slug}/glossary`,
  },
  {
    key: "guides",
    title: "Featured Guides",
    description: "Step-by-step guides for families.",
    icon: GraduationCap,
    href: (slug: string) => `/resources/${slug}/guides`,
  },
] as const;

export default async function ResourcesHubPage({ params }: ResourcesHubPageProps) {
  const { slug } = await params;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-semibold text-foreground">Start Here</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose one section to explore.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.key} href={card.href(slug)} className="group">
              <Card className="h-full border-border/60 transition-all hover:border-primary/30 hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base leading-tight">{card.title}</CardTitle>
                  <CardDescription className="text-sm">{card.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                    Open
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

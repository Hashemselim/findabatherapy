import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { GlossarySearch } from "@/components/content/glossary-search";
import { GLOSSARY_TERMS } from "@/lib/content/glossary";

type ResourcesGlossaryPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ResourcesGlossaryPage({ params }: ResourcesGlossaryPageProps) {
  const { slug } = await params;

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
        <h3 className="text-xl font-semibold text-foreground">ABA Glossary</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse and search key ABA terms in plain language.
        </p>
      </div>

      <GlossarySearch terms={GLOSSARY_TERMS} />
    </div>
  );
}

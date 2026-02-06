import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { FAQSearch } from "@/components/content/faq-search";
import { FAQ_CATEGORIES } from "@/lib/content/faq";

type ResourcesFaqPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ResourcesFaqPage({ params }: ResourcesFaqPageProps) {
  const { slug } = await params;

  return (
    <div className="space-y-5">
      <Link
        href={`/resources/${slug}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Parent Resources
      </Link>

      <div>
        <h3 className="text-xl font-semibold text-foreground">Frequently Asked Questions</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Search common questions parents ask about ABA therapy.
        </p>
      </div>

      <FAQSearch categories={FAQ_CATEGORIES} />
    </div>
  );
}

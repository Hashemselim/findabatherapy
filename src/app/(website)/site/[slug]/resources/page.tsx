import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FileQuestion,
  BookOpen,
  GraduationCap,
  ArrowRight,
  Heart,
} from "lucide-react";

import { getProviderWebsiteData } from "@/lib/actions/provider-website";

type ResourcesPageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export async function generateMetadata({
  params,
}: ResourcesPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProviderWebsiteData(slug);

  if (!result.success) {
    return { title: "Parent Resources" };
  }

  return {
    title: "Parent Resources",
    description: `Helpful resources for parents and families from ${result.data.profile.agencyName}. FAQ, glossary, and guides about ABA therapy.`,
  };
}

const resourceCards = [
  {
    key: "faq",
    title: "Frequently Asked Questions",
    description:
      "Quick answers to common questions parents have about ABA therapy, insurance, and getting started.",
    icon: FileQuestion,
    href: (slug: string) => `/site/${slug}/resources/faq`,
  },
  {
    key: "glossary",
    title: "ABA Glossary",
    description:
      "Simple, plain-language definitions of common ABA therapy terms and concepts.",
    icon: BookOpen,
    href: (slug: string) => `/site/${slug}/resources/glossary`,
  },
  {
    key: "guides",
    title: "Featured Guides",
    description:
      "Step-by-step guides to help families navigate ABA therapy, from getting started to daily tips.",
    icon: GraduationCap,
    href: (slug: string) => `/site/${slug}/resources/guides`,
  },
] as const;

export default async function WebsiteResourcesPage({
  params,
}: ResourcesPageProps) {
  const { slug } = await params;
  const result = await getProviderWebsiteData(slug);

  if (!result.success) {
    notFound();
  }

  const brandColor = result.data.profile.intakeFormSettings.background_color;

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <span
            className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
            style={{
              backgroundColor: `${brandColor}15`,
              color: brandColor,
            }}
          >
            <Heart className="h-3.5 w-3.5" />
            Parent Resources
          </span>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">
            Resources for Families
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-gray-500">
            Everything you need to know about ABA therapy, from common terms to
            step-by-step guides. We&apos;re here to help.
          </p>
        </div>

        {/* Resource Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {resourceCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.key}
                href={card.href(slug)}
                className="group"
              >
                <div className="h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:border-gray-200 hover:shadow-md">
                  <div
                    className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: `${brandColor}15`,
                      color: brandColor,
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {card.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    {card.description}
                  </p>
                  <span
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium transition-colors"
                    style={{ color: brandColor }}
                  >
                    Explore
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

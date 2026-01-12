import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  Building2,
  Briefcase,
  CheckCircle,
} from "lucide-react";

import { BubbleBackground } from "@/components/ui/bubble-background";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmployerCard } from "@/components/jobs/employer-card";
import { EmployerSearch } from "@/components/jobs/employer-search";
import { JsonLd } from "@/components/seo/json-ld";
import { getAllEmployers, getTotalEmployerCount } from "@/lib/queries/jobs";

const BASE_URL = "https://www.findabajobs.org";

export const metadata: Metadata = {
  title: "ABA Therapy Employers - Browse Companies Hiring | Find ABA Jobs",
  description:
    "Browse ABA therapy employers and providers hiring BCBA, RBT, and behavior analyst professionals. Find companies with open positions and learn about their culture, locations, and benefits.",
  alternates: {
    canonical: "/employers",
  },
  openGraph: {
    title: "ABA Therapy Employers - Browse Companies Hiring",
    description:
      "Browse ABA therapy employers and providers hiring BCBA, RBT, and behavior analyst professionals. Find your next employer today.",
    url: `${BASE_URL}/employers`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ABA Therapy Employers - Browse Companies Hiring",
    description:
      "Browse ABA therapy employers and providers hiring BCBA, RBT, and behavior analyst professionals.",
  },
};

interface EmployersPageProps {
  searchParams: Promise<{ q?: string; hiring?: string }>;
}

export default async function EmployersPage({ searchParams }: EmployersPageProps) {
  const { q: searchQuery, hiring } = await searchParams;
  const hiringOnly = hiring === "true";

  const [allEmployers, totalEmployerCount] = await Promise.all([
    getAllEmployers({ hiringOnly }),
    getTotalEmployerCount(),
  ]);

  // Filter employers by search query
  const employers = searchQuery
    ? allEmployers.filter((emp) =>
        emp.agencyName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allEmployers;

  const totalOpenJobs = employers.reduce(
    (sum, emp) => sum + emp.openJobCount,
    0
  );

  const organizationListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "ABA Therapy Employers",
    description:
      "A list of ABA therapy employers and providers hiring behavior analysts, BCBAs, and RBTs.",
    numberOfItems: employers.length,
    itemListElement: employers.slice(0, 20).map((employer, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Organization",
        name: employer.agencyName,
        url: `${BASE_URL}/employers/${employer.slug}`,
        ...(employer.logoUrl && { logo: employer.logoUrl }),
      },
    })),
  };

  return (
    <>
      <JsonLd data={organizationListSchema} />
      <div className="space-y-16 pb-16">
        {/* Hero Section */}
        <section className="px-0 pt-0">
          <BubbleBackground
            interactive
            transition={{ stiffness: 100, damping: 50, mass: 0.5 }}
            className="w-full bg-gradient-to-br from-white via-emerald-50/50 to-teal-50/50 py-8 sm:py-16"
            colors={{
              first: "255,255,255",
              second: "167,243,208",
              third: "94,234,212",
              fourth: "204,251,241",
              fifth: "153,246,228",
              sixth: "240,253,250",
            }}
          >
            <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 sm:gap-8 sm:px-6">
              <div className="space-y-3 text-center sm:space-y-5">
                {/* Stats badge */}
                <div className="hidden justify-center sm:flex">
                  <Badge
                    variant="outline"
                    className="gap-1.5 border-emerald-500/50 bg-emerald-50 px-4 py-1.5 text-emerald-700 transition-all duration-300 ease-premium hover:scale-[1.02] hover:bg-emerald-100 hover:shadow-[0_2px_8px_rgba(16,185,129,0.2)]"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    {totalEmployerCount > 0
                      ? `${totalEmployerCount} employers hiring`
                      : "Top employers"}
                  </Badge>
                </div>
                <h1 className="text-[28px] font-semibold leading-[1.2] text-foreground sm:text-[48px]">
                  Browse ABA{" "}
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent sm:whitespace-nowrap">
                    Employers
                  </span>
                </h1>
                <p className="mx-auto hidden max-w-2xl text-lg text-muted-foreground sm:block">
                  Discover top ABA therapy providers hiring BCBAs, RBTs, and
                  behavior analysts. Learn about companies, their locations, and
                  open positions.
                </p>
              </div>
            </div>
          </BubbleBackground>
        </section>

        {/* Social Proof Bar */}
        <section className="!mt-0 border-y border-border/60 bg-gradient-to-r from-white via-emerald-50/30 to-white py-5">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 text-sm sm:px-6">
            <div className="group flex items-center gap-2.5 transition-all duration-300 ease-premium hover:scale-[1.02]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 transition-all duration-300 ease-premium group-hover:scale-[1.05] group-hover:bg-emerald-500/15">
                <Building2 className="h-4 w-4 text-emerald-600" aria-hidden />
              </div>
              <span className="font-medium text-foreground">
                {totalEmployerCount} employers
              </span>
            </div>
            <div className="group flex items-center gap-2.5 transition-all duration-300 ease-premium hover:scale-[1.02]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 transition-all duration-300 ease-premium group-hover:scale-[1.05] group-hover:bg-emerald-500/15">
                <Briefcase className="h-4 w-4 text-emerald-600" aria-hidden />
              </div>
              <span className="font-medium text-foreground">
                {totalOpenJobs} open positions
              </span>
            </div>
            <div className="group flex items-center gap-2.5 transition-all duration-300 ease-premium hover:scale-[1.02]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 transition-all duration-300 ease-premium group-hover:scale-[1.05] group-hover:bg-emerald-500/15">
                <CheckCircle className="h-4 w-4 text-emerald-600" aria-hidden />
              </div>
              <span className="font-medium text-foreground">
                Verified employers
              </span>
            </div>
          </div>
        </section>

        {/* Employers Grid */}
        <section className="!mt-0 bg-white px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <header className="mb-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Building2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      All companies
                    </p>
                    <h2 className="mt-1 text-3xl font-semibold">
                      ABA Employers
                      <span className="ml-2 text-lg font-normal text-muted-foreground">
                        ({employers.length})
                      </span>
                    </h2>
                  </div>
                </div>
                <Link
                  href="/jobs/search"
                  className="group inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 transition-all duration-300 ease-premium hover:gap-2"
                >
                  Browse all jobs
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover:translate-x-0.5" />
                </Link>
              </div>
            </header>

            {/* Search */}
            <div className="mb-8">
              <Suspense fallback={null}>
                <EmployerSearch />
              </Suspense>
              {(searchQuery || hiringOnly) && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {employers.length === 0
                    ? searchQuery
                      ? `No employers found for "${searchQuery}"${hiringOnly ? " that are currently hiring" : ""}`
                      : "No employers currently hiring"
                    : `Showing ${employers.length} employer${employers.length !== 1 ? "s" : ""}${searchQuery ? ` matching "${searchQuery}"` : ""}${hiringOnly ? " currently hiring" : ""}`}
                </p>
              )}
            </div>

            {employers.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center py-16 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  {searchQuery ? (
                    <>
                      <h3 className="text-lg font-semibold">No matching employers</h3>
                      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                        No employers found matching &quot;{searchQuery}&quot;
                        {hiringOnly ? " that are currently hiring" : ""}. Try a
                        different search term or browse all employers.
                      </p>
                      <Button asChild className="mt-6 rounded-full" variant="outline">
                        <Link href="/employers">View All Employers</Link>
                      </Button>
                    </>
                  ) : hiringOnly ? (
                    <>
                      <h3 className="text-lg font-semibold">No employers hiring</h3>
                      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                        No employers are currently hiring. Turn off the filter to
                        browse all ABA therapy providers.
                      </p>
                      <Button asChild className="mt-6 rounded-full" variant="outline">
                        <Link href="/employers">View All Employers</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold">No employers yet</h3>
                      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                        We&apos;re growing our network of ABA employers. Check back
                        soon or browse available jobs.
                      </p>
                      <Button asChild className="mt-6 rounded-full" variant="outline">
                        <Link href="/jobs/search">Browse All Jobs</Link>
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {employers.map((employer, index) => (
                  <EmployerCard
                    key={employer.id}
                    employer={employer}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="mx-auto max-w-5xl px-4 sm:px-6">
          <Card className="group relative overflow-hidden border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.03] via-white to-emerald-500/[0.06] transition-all duration-500 ease-premium hover:border-emerald-500/30 hover:shadow-[0_8px_30px_rgba(16,185,129,0.12)]">
            {/* Decorative elements */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/5 transition-transform duration-700 ease-premium group-hover:scale-150" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-emerald-500/10 transition-transform duration-700 ease-premium group-hover:scale-150" />
            <CardContent className="relative flex flex-col items-center gap-6 p-8 text-center sm:flex-row sm:text-left">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 transition-all duration-300 ease-premium group-hover:scale-[1.05] group-hover:bg-emerald-500/15">
                <Building2 className="h-7 w-7 text-emerald-600 transition-transform duration-300 ease-bounce-sm group-hover:scale-110" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-xl font-semibold text-foreground">
                  Want your company listed here?
                </p>
                <p className="text-muted-foreground">
                  Post jobs and connect with qualified BCBAs, RBTs, and behavior
                  technicians.
                </p>
              </div>
              <Button
                asChild
                className="group/btn shrink-0 rounded-full bg-emerald-600 px-8 py-5 text-base font-semibold text-white shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:bg-emerald-700 hover:shadow-[0_8px_20px_rgba(16,185,129,0.4)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(16,185,129,0.2)]"
              >
                <Link href="/employers/post">
                  Post a Job Free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}

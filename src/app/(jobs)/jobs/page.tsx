import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Briefcase, MapPin, CheckCircle, Building2, DollarSign } from "lucide-react";
import * as StateIcons from "@state-icons/react";

import { BubbleBackground } from "@/components/ui/bubble-background";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { US_STATES } from "@/lib/data/us-states";
import { getFeaturedJobs, getTotalJobCount } from "@/lib/queries/jobs";
import { FeaturedJobs } from "@/components/jobs/featured-jobs";
import { POSITION_TYPES } from "@/lib/validations/jobs";
import { jobsConfig } from "@/config/jobs";
import { JsonLd } from "@/components/seo/json-ld";
import { JobSearchForm } from "@/components/jobs/job-search-form";

const BASE_URL = "https://www.findabajobs.org";

export const metadata: Metadata = {
  title: "Find ABA Jobs - BCBA, RBT & Behavior Analyst Careers | Find ABA Jobs",
  description:
    "Search thousands of BCBA, RBT, and behavior technician jobs from top ABA therapy providers nationwide. Filter by location, salary, and position type to find your perfect ABA career.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Find ABA Jobs - BCBA, RBT & Behavior Analyst Careers",
    description:
      "Search thousands of ABA therapy jobs from top providers nationwide. Find BCBA, RBT, and behavior technician positions near you.",
    url: BASE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Find ABA Jobs - BCBA, RBT & Behavior Analyst Careers",
    description:
      "Search thousands of ABA therapy jobs from top providers nationwide. Find your perfect ABA career today.",
  },
};

// Position types for quick search
const positionCards = POSITION_TYPES.slice(0, 6).map((type) => ({
  label: type.label,
  description: type.description,
  href: `/jobs/search?position=${type.value}`,
  value: type.value,
}));

// Preview rows for job table
const previewRows = [
  { title: "BCBA - Full Time", company: "Sunrise ABA", city: "Phoenix, AZ", salary: "$85k - $95k/yr", type: "Full-time" },
  { title: "RBT - Part Time", company: "Bright Futures", city: "Dallas, TX", salary: "$22 - $28/hr", type: "Part-time" },
  { title: "Clinical Director", company: "Spectrum Care", city: "Remote", salary: "$110k - $130k/yr", type: "Full-time" },
];

export default async function JobsHomePage() {
  const [featuredJobs, totalJobCount] = await Promise.all([
    getFeaturedJobs(6),
    getTotalJobCount(),
  ]);

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: jobsConfig.name,
    url: BASE_URL,
    description: jobsConfig.description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/jobs/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <JsonLd data={websiteSchema} />
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
                    <Briefcase className="h-3.5 w-3.5" />
                    {totalJobCount > 0 ? `${totalJobCount.toLocaleString()} jobs available` : "New jobs daily"}
                  </Badge>
                </div>
                <h1 className="text-[28px] font-semibold leading-[1.2] text-foreground sm:text-[48px]">
                  Find Your Next ABA Career{" "}
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent sm:whitespace-nowrap">Opportunity</span>
                </h1>
                <p className="mx-auto hidden max-w-2xl text-lg text-muted-foreground sm:block">
                  Search thousands of BCBA, RBT, and behavior technician positions from top ABA providers nationwide.
                </p>
              </div>

              {/* Search Card */}
              <JobSearchForm />
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
                <span className="text-muted-foreground">Popular:</span>
                <Link href="/jobs/search?position=bcba" className="text-emerald-600 hover:underline">BCBA</Link>
                <span className="text-muted-foreground">&middot;</span>
                <Link href="/jobs/search?position=rbt_bt" className="text-emerald-600 hover:underline">RBT</Link>
                <span className="text-muted-foreground">&middot;</span>
                <Link href="/jobs/search?remote=true" className="text-emerald-600 hover:underline">Remote</Link>
                <span className="text-muted-foreground">&middot;</span>
                <Link href="/jobs/search?position=clinical_director" className="text-emerald-600 hover:underline">Clinical Director</Link>
              </div>
            </div>
          </BubbleBackground>
        </section>

        {/* Social Proof Bar */}
        <section className="border-y border-border/60 bg-gradient-to-r from-white via-emerald-50/30 to-white py-5 !mt-0">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 text-sm sm:px-6">
            <div className="group flex items-center gap-2.5 transition-all duration-300 ease-premium hover:scale-[1.02]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 transition-all duration-300 ease-premium group-hover:bg-emerald-500/15 group-hover:scale-[1.05]">
                <MapPin className="h-4 w-4 text-emerald-600" aria-hidden />
              </div>
              <span className="font-medium text-foreground">All 50 states</span>
            </div>
            <div className="group flex items-center gap-2.5 transition-all duration-300 ease-premium hover:scale-[1.02]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 transition-all duration-300 ease-premium group-hover:bg-emerald-500/15 group-hover:scale-[1.05]">
                <CheckCircle className="h-4 w-4 text-emerald-600" aria-hidden />
              </div>
              <span className="font-medium text-foreground">Verified employers</span>
            </div>
            <div className="group flex items-center gap-2.5 transition-all duration-300 ease-premium hover:scale-[1.02]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 transition-all duration-300 ease-premium group-hover:bg-emerald-500/15 group-hover:scale-[1.05]">
                <DollarSign className="h-4 w-4 text-emerald-600" aria-hidden />
              </div>
              <span className="font-medium text-foreground">Salary info included</span>
            </div>
          </div>
        </section>

        {/* Browse by Position */}
        <section className="bg-white px-4 py-14 !mt-0 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <header className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                  <Briefcase className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Find jobs by role
              </p>
              <h2 className="mt-2 text-3xl font-semibold">Browse by Position Type</h2>
              <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
                Find opportunities that match your certification and career goals.
              </p>
            </header>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {positionCards.map((position) => (
                <Link
                  key={position.value}
                  href={position.href}
                  className="group rounded-2xl border border-border/60 bg-white p-6 text-center transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] hover:shadow-[0_8px_30px_rgba(16,185,129,0.12)] active:translate-y-0 active:shadow-none"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 transition-all duration-300 ease-premium group-hover:bg-emerald-500/15 group-hover:scale-[1.05]">
                      <Briefcase className="h-5 w-5 text-emerald-600 transition-transform duration-300 ease-bounce-sm group-hover:scale-[1.1]" />
                    </div>
                    <span className="text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-emerald-700">{position.label}</span>
                    <span className="text-sm text-muted-foreground">{position.description}</span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <Link
                href="/jobs/search"
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 transition-all duration-300 ease-premium hover:gap-2"
              >
                View all positions
                <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Jobs */}
        {featuredJobs.length > 0 && (
          <section className="py-14 !mt-0 overflow-hidden bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/40">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Briefcase className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Latest opportunities
                    </p>
                    <h2 className="mt-1 text-3xl font-semibold">Featured Jobs</h2>
                  </div>
                </div>
                <Link
                  href="/jobs/search"
                  className="group inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 transition-all duration-300 ease-premium hover:gap-2"
                >
                  View all jobs
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover:translate-x-0.5" />
                </Link>
              </div>
              <div className="mt-8">
                <FeaturedJobs jobs={featuredJobs} />
              </div>
            </div>
          </section>
        )}

        {/* Job Preview Table */}
        <section className="bg-white py-14 !mt-0">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                  <Building2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Preview the job board
                  </p>
                  <h2 className="mt-1 text-3xl font-semibold">Browse ABA Jobs</h2>
                </div>
              </div>
            </div>
            <div className="relative mt-8 overflow-hidden rounded-3xl border border-border/80 bg-white shadow-sm transition-all duration-500 ease-premium hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border/60 bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide">Position</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide">Company</th>
                    <th className="hidden px-6 py-4 text-xs font-semibold uppercase tracking-wide sm:table-cell">Location</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide">Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, idx) => (
                    <tr
                      key={row.title}
                      className={`group border-t border-border/40 bg-white transition-all duration-300 ease-premium hover:bg-emerald-500/[0.02] ${idx === 0 ? "border-t-0" : ""}`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-foreground transition-colors duration-300 group-hover:text-emerald-600">{row.title}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{row.type}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-muted-foreground">{row.company}</span>
                      </td>
                      <td className="hidden px-6 py-4 sm:table-cell">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {row.city}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-emerald-600">{row.salary}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/90 to-transparent" />
              <div className="absolute inset-x-0 bottom-6 flex justify-center">
                <Button
                  asChild
                  className="group rounded-full border border-emerald-600 bg-emerald-600 px-8 py-5 text-base font-semibold text-white shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:bg-emerald-700 hover:shadow-[0_8px_20px_rgba(16,185,129,0.35)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(16,185,129,0.2)]"
                >
                  <Link href="/jobs/search">
                    See all jobs
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Browse by State */}
        <section className="mx-auto max-w-5xl px-4 sm:px-6">
          <Card className="overflow-hidden border border-border/80 bg-white shadow-sm transition-all duration-500 ease-premium hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                    <MapPin className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Explore by location</p>
                    <h2 className="mt-1 text-3xl font-semibold">Find ABA Jobs Near You</h2>
                    <p className="mt-2 text-muted-foreground">Browse jobs in every state or jump directly to your region.</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {US_STATES.map((state) => {
                  const Icon = StateIcons[state.abbreviation as keyof typeof StateIcons];

                  return (
                    <Link
                      key={state.value}
                      href={`/jobs/${state.value}`}
                      className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-white px-4 py-3 transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] hover:shadow-[0_4px_20px_rgba(16,185,129,0.1)] active:translate-y-0 active:shadow-none"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition-all duration-300 ease-premium group-hover:scale-[1.05] group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-[0_2px_10px_rgba(16,185,129,0.4)]">
                        {Icon ? (
                          <Icon aria-hidden size={28} color="currentColor" />
                        ) : (
                          <span className="text-sm font-semibold">{state.abbreviation}</span>
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block text-base font-medium text-foreground transition-colors duration-300 group-hover:text-emerald-600">{state.label}</span>
                        <span className="block text-xs text-muted-foreground">{state.abbreviation} &middot; ABA Jobs</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/50 opacity-0 transition-all duration-300 ease-bounce-sm group-hover:translate-x-0.5 group-hover:text-emerald-600 group-hover:opacity-100" />
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Employer CTA */}
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
                <p className="text-xl font-semibold text-foreground">Looking to hire ABA professionals?</p>
                <p className="text-muted-foreground">
                  Post jobs and connect with qualified BCBAs, RBTs, and behavior technicians.
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

import type { Metadata } from "next";
import Link from "next/link";
import { Users, BookOpen, ArrowRight, Clock, Shield, MapPin, Sparkles, CheckCircle, Heart } from "lucide-react";
import * as StateIcons from "@state-icons/react";

import { HomeSearchCard } from "@/components/home/home-search-card";
import { StateSearchInput } from "@/components/home/state-search-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { Badge } from "@/components/ui/badge";
import { FeaturedBadge } from "@/components/ui/featured-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { US_STATES } from "@/lib/data/us-states";
import { getFeaturedArticles, ARTICLE_CATEGORIES } from "@/lib/content/articles";
import { getHomepageFeaturedListings } from "@/lib/queries/search";
import { JsonLd } from "@/components/seo/json-ld";
import { generateOrganizationSchema, generateWebSiteSchema, generateFAQSchema } from "@/lib/seo/schemas";

const BASE_URL = "https://www.findabatherapy.com";

export const metadata: Metadata = {
  title: "Find ABA Therapy Providers Near You | Find ABA Therapy",
  description:
    "Search our nationwide directory of verified ABA therapy providers. Compare in-home, center-based, and telehealth autism therapy services. Filter by insurance, location, and specialties to find the right fit for your family.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Find Local ABA Therapy Providers Who Take Your Insurance",
    description:
      "Connect with verified ABA providers in your area. Compare services, check insurance coverage, and find the right fit for your family.",
    url: BASE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Find ABA Therapy Providers Near You",
    description:
      "Search our nationwide directory of verified ABA therapy providers. Compare services and find the right fit for your family.",
  },
};

// Homepage FAQs for rich snippets
const homepageFaqs = [
  {
    question: "How do I find ABA therapy providers near me?",
    answer:
      "Use our search tool to find ABA therapy providers in your area. Enter your city, state, or ZIP code to see a list of verified providers. You can filter by insurance accepted, service type (in-home, center-based, telehealth), and more.",
  },
  {
    question: "Does insurance cover ABA therapy?",
    answer:
      "Yes, most health insurance plans cover ABA therapy due to autism insurance mandates in all 50 states. Coverage varies by plan, so use our directory to find providers that accept your specific insurance and contact them to verify your benefits.",
  },
  {
    question: "What is the difference between in-home and center-based ABA therapy?",
    answer:
      "In-home ABA therapy takes place in your home, allowing for natural environment teaching. Center-based ABA therapy occurs at a clinic with specialized equipment and peer interaction opportunities. Many families use a combination of both based on their child's needs.",
  },
  {
    question: "How do I choose the right ABA therapy provider?",
    answer:
      "Consider factors like location, insurance acceptance, service types offered, staff qualifications (BCBAs on staff), availability, and reviews from other families. Our directory provides detailed information about each provider to help you make an informed decision.",
  },
];

const insuranceCarriers = [
  { name: "Aetna", slug: "aetna" },
  { name: "Cigna", slug: "cigna" },
  { name: "UnitedHealthcare", slug: "unitedhealthcare" },
  { name: "Medicaid", slug: "medicaid" },
  { name: "Blue Cross Blue Shield", slug: "blue-cross-blue-shield" },
  { name: "Tricare", slug: "tricare" },
];

const previewRows = [
  { name: "Elevate Behavioral Health", city: "Dallas, TX", services: "In-home · Center", tier: "Premium" },
  { name: "Green Sprouts ABA", city: "Nashville, TN", services: "In-home", tier: "Basic" },
  { name: "Sunrise Autism Center", city: "Miami, FL", services: "Center · Telehealth", tier: "Premium" },
];

const SPONSORED_SECTION_BG = "#FDFAEE";

export default async function HomePage() {
  const featuredProviders = await getHomepageFeaturedListings(12);
  return (
    <>
      <JsonLd
        data={[
          generateOrganizationSchema(),
          generateWebSiteSchema(),
          generateFAQSchema(homepageFaqs),
        ]}
      />
      <div className="space-y-16 pb-16">
        <section className="px-0 pt-0">
        <BubbleBackground
          interactive
          transition={{ stiffness: 100, damping: 50, mass: 0.5 }}
          className="w-full bg-gradient-to-br from-white via-yellow-50/50 to-blue-50/50 py-8 sm:py-16"
          colors={{
            first: "255,255,255",
            second: "255,236,170",
            third: "135,176,255",
            fourth: "255,248,210",
            fifth: "190,210,255",
            sixth: "240,248,255",
          }}
        >
          <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 sm:gap-8 sm:px-6">
            <div className="space-y-3 text-center sm:space-y-5">
              {/* Trust badge - hidden on mobile to save space */}
              <div className="hidden justify-center sm:flex">
                <Badge
                  variant="outline"
                  className="gap-1.5 border-emerald-500/50 bg-emerald-50 px-4 py-1.5 text-emerald-700 transition-all duration-300 ease-premium hover:scale-[1.02] hover:bg-emerald-100 hover:shadow-[0_2px_8px_rgba(16,185,129,0.2)]"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Trusted by families nationwide
                </Badge>
              </div>
              <h1 className="text-[28px] font-semibold leading-[1.2] text-foreground sm:text-[48px]">
                Find Local ABA Therapy Providers{" "}
                <span className="bg-gradient-to-r from-[#5788FF] to-[#7BA3FF] bg-clip-text text-transparent sm:whitespace-nowrap">Who Take Your Insurance</span>
              </h1>
              <p className="mx-auto hidden max-w-2xl text-lg text-muted-foreground sm:block">
                Connect with verified ABA providers in your area. Compare services, check insurance coverage, and find the right fit for your family.
              </p>
            </div>
            <HomeSearchCard />
          </div>
        </BubbleBackground>
      </section>

      {/* Social Proof Bar */}
      <section className="border-y border-border/60 bg-gradient-to-r from-white via-yellow-50/30 to-white py-5 !mt-0">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 text-sm sm:px-6">
          <div className="group flex items-center gap-2.5 transition-all duration-300 ease-premium hover:scale-[1.02]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5788FF]/10 transition-all duration-300 ease-premium group-hover:bg-[#5788FF]/15 group-hover:scale-[1.05]">
              <MapPin className="h-4 w-4 text-[#5788FF]" aria-hidden />
            </div>
            <span className="font-medium text-foreground">All 50 states</span>
          </div>
          <div className="group flex items-center gap-2.5 transition-all duration-300 ease-premium hover:scale-[1.02]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 transition-all duration-300 ease-premium group-hover:bg-emerald-500/15 group-hover:scale-[1.05]">
              <CheckCircle className="h-4 w-4 text-emerald-600" aria-hidden />
            </div>
            <span className="font-medium text-foreground">Verified providers</span>
          </div>
          <div className="group flex items-center gap-2.5 transition-all duration-300 ease-premium hover:scale-[1.02]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10 transition-all duration-300 ease-premium group-hover:bg-violet-500/15 group-hover:scale-[1.05]">
              <Shield className="h-4 w-4 text-violet-600" aria-hidden />
            </div>
            <span className="font-medium text-foreground">Insurance info included</span>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 !mt-0 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <header className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10">
                <Shield className="h-6 w-6 text-violet-600" />
              </div>
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Find an in-network agency
            </p>
            <h2 className="mt-2 text-3xl font-semibold">Search by Insurance</h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              Add your coverage to make sure the agencies you contact are in network.
            </p>
          </header>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {insuranceCarriers.map((carrier) => (
              <Link
                key={carrier.slug}
                href={`/insurance/${carrier.slug}`}
                className="group rounded-2xl border border-border/60 bg-white p-6 text-center transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-violet-500/30 hover:bg-violet-500/[0.03] hover:shadow-[0_8px_30px_rgba(139,92,246,0.12)] active:translate-y-0 active:shadow-none"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 transition-all duration-300 ease-premium group-hover:bg-violet-500/15 group-hover:scale-[1.05]">
                    <Shield className="h-5 w-5 text-violet-600 transition-transform duration-300 ease-bounce-sm group-hover:scale-[1.1]" />
                  </div>
                  <span className="text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-violet-700">{carrier.name}</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Link
              href="/insurance"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 transition-all duration-300 ease-premium hover:gap-2"
            >
              View all insurances
              <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Providers - Show marquee for 4+ providers, static grid for 1-3 */}
      {featuredProviders.length > 0 && (
        <section className="py-14 !mt-0 overflow-hidden" style={{ backgroundColor: SPONSORED_SECTION_BG }}>
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFF5C2]">
                  <Sparkles className="h-6 w-6 text-[#5788FF]" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Featured providers
                  </p>
                  <h2 className="mt-1 text-3xl font-semibold">Sponsored Listings</h2>
                </div>
              </div>
              <Link
                href="/search"
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-[#5788FF] transition-all duration-300 ease-premium hover:gap-2"
              >
                View all providers
                <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
          {/* Static grid for 1-3 providers */}
          {featuredProviders.length < 4 ? (
            <div className="mx-auto mt-8 max-w-5xl px-4 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featuredProviders.map((provider) => (
                  <Link
                    key={provider.id}
                    href={`/provider/${provider.slug}`}
                    className="group"
                  >
                    <Card className="h-full border border-border/60 bg-white shadow-sm transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-[#5788FF]/30 hover:shadow-[0_8px_30px_rgba(87,136,255,0.1)]">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border-2 border-[#FEE720]/50 transition-all duration-300 ease-premium group-hover:border-[#FEE720] group-hover:scale-[1.03]">
                            {provider.logoUrl ? (
                              <AvatarImage src={provider.logoUrl} alt={provider.profile.agencyName} />
                            ) : null}
                            <AvatarFallback className="bg-[#FFF5C2] font-semibold text-[#5788FF]">
                              {provider.profile.agencyName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="truncate text-base transition-colors duration-300 group-hover:text-[#5788FF]">{provider.profile.agencyName}</CardTitle>
                            {provider.primaryLocation && (
                              <CardDescription className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3" />
                                {provider.primaryLocation.city}, {provider.primaryLocation.state}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <FeaturedBadge withHover />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            /* Marquee for 4+ providers */
            <div className="relative mt-8">
              <div className="flex animate-marquee gap-4 hover:[animation-play-state:paused]">
                {[...featuredProviders, ...featuredProviders].map((provider, idx) => (
                  <Link
                    key={`${provider.id}-${idx}`}
                    href={`/provider/${provider.slug}`}
                    className="group flex-shrink-0"
                  >
                    <Card className="w-72 border border-border/60 bg-white shadow-sm transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-[#5788FF]/30 hover:shadow-[0_8px_30px_rgba(87,136,255,0.1)]">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border-2 border-[#FEE720]/50 transition-all duration-300 ease-premium group-hover:border-[#FEE720] group-hover:scale-[1.03]">
                            {provider.logoUrl ? (
                              <AvatarImage src={provider.logoUrl} alt={provider.profile.agencyName} />
                            ) : null}
                            <AvatarFallback className="bg-[#FFF5C2] font-semibold text-[#5788FF]">
                              {provider.profile.agencyName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="truncate text-base transition-colors duration-300 group-hover:text-[#5788FF]">{provider.profile.agencyName}</CardTitle>
                            {provider.primaryLocation && (
                              <CardDescription className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3" />
                                {provider.primaryLocation.city}, {provider.primaryLocation.state}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <FeaturedBadge withHover />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="bg-white py-14 !mt-0">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10">
                <Users className="h-6 w-6 text-[#5788FF]" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Preview the directory
                </p>
                <h2 className="mt-1 text-3xl font-semibold">Browse ABA Providers</h2>
              </div>
            </div>
          </div>
          <div className="relative mt-8 overflow-hidden rounded-3xl border border-border/80 bg-white shadow-sm transition-all duration-500 ease-premium hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide">Agency</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide">City</th>
                  <th className="hidden px-6 py-4 text-xs font-semibold uppercase tracking-wide sm:table-cell">Services</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide">Tier</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, idx) => (
                  <tr
                    key={row.name}
                    className={`group border-t border-border/40 bg-white transition-all duration-300 ease-premium hover:bg-[#5788FF]/[0.02] ${idx === 0 ? "border-t-0" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground transition-colors duration-300 group-hover:text-[#5788FF]">{row.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {row.city}
                      </span>
                    </td>
                    <td className="hidden px-6 py-4 sm:table-cell">
                      <span className="text-muted-foreground">{row.services}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={`text-xs transition-all duration-300 ease-premium ${
                          row.tier === "Premium"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 group-hover:bg-amber-500/15"
                            : "border-[#5788FF]/30 bg-[#5788FF]/10 text-[#5788FF] group-hover:bg-[#5788FF]/15"
                        }`}
                      >
                        {row.tier}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/90 to-transparent" />
            <div className="absolute inset-x-0 bottom-6 flex justify-center">
              <Button
                asChild
                className="group rounded-full border border-[#FEE720] bg-[#FEE720] px-8 py-5 text-base font-semibold text-[#333333] shadow-[0_4px_14px_rgba(254,231,32,0.3)] transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:bg-[#FFF5C2] hover:shadow-[0_8px_20px_rgba(254,231,32,0.35)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(254,231,32,0.2)]"
              >
                <Link href="/search">
                  See all providers
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Learn About ABA Section */}
      <section className="bg-gradient-to-br from-emerald-50/40 via-white to-blue-50/40 py-14 !mt-0">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                <BookOpen className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Resources for families
                </p>
                <h2 className="mt-1 text-3xl font-semibold">Learn About ABA Therapy</h2>
                <p className="mt-2 max-w-lg text-muted-foreground">
                  Expert guides to help you understand ABA therapy and make informed decisions.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/learn"
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-[#5788FF] transition-all duration-300 ease-premium hover:gap-2"
              >
                View all guides
                <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover:translate-x-0.5" />
              </Link>
              <span className="text-muted-foreground/50">·</span>
              <Link
                href="/faq"
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 transition-all duration-300 ease-premium hover:gap-2"
              >
                FAQ
                <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/learn/glossary"
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 transition-all duration-300 ease-premium hover:gap-2"
              >
                Glossary
                <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {getFeaturedArticles().slice(0, 3).map((article) => {
              const categoryInfo = ARTICLE_CATEGORIES[article.category];
              return (
                <Link key={article.slug} href={`/learn/${article.slug}`} className="group">
                  <Card className="h-full border border-border/60 bg-white transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-emerald-500/30 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)]">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className={`${categoryInfo.color} transition-all duration-300 ease-premium group-hover:scale-[1.02]`}>
                          {categoryInfo.label}
                        </Badge>
                        <span className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {article.readTime} min
                        </span>
                      </div>
                      <CardTitle className="mt-4 text-lg leading-snug transition-colors duration-300 group-hover:text-emerald-700">
                        {article.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="line-clamp-2">
                        {article.description}
                      </CardDescription>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 transition-all duration-300 ease-premium group-hover:gap-1.5">
                        Read guide
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover:translate-x-0.5" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6">
        <Card className="overflow-hidden border border-border/80 bg-white shadow-sm transition-all duration-500 ease-premium hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10">
                  <MapPin className="h-6 w-6 text-[#5788FF]" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Explore by state</p>
                  <h2 className="mt-1 text-3xl font-semibold">Find ABA Providers Near You</h2>
                  <p className="mt-2 text-muted-foreground">Browse every state or jump directly to your region.</p>
                </div>
              </div>
              <div className="w-full max-w-sm">
                <label className="block text-sm font-medium text-muted-foreground">
                  Search by city or ZIP
                </label>
                <div className="mt-2">
                  <StateSearchInput />
                </div>
              </div>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {US_STATES.map((state) => {
                const Icon = StateIcons[state.abbreviation as keyof typeof StateIcons];

                return (
                  <Link
                    key={state.value}
                    href={`/${state.value}`}
                    className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-white px-4 py-3 transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-[#5788FF]/30 hover:bg-[#5788FF]/[0.02] hover:shadow-[0_4px_20px_rgba(87,136,255,0.1)] active:translate-y-0 active:shadow-none"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFF5C2] text-[#5788FF] transition-all duration-300 ease-premium group-hover:scale-[1.05] group-hover:bg-[#5788FF] group-hover:text-white group-hover:shadow-[0_2px_10px_rgba(87,136,255,0.4)]">
                      {Icon ? (
                        <Icon aria-hidden size={28} color="currentColor" />
                      ) : (
                        <span className="text-sm font-semibold">{state.abbreviation}</span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-base font-medium text-foreground transition-colors duration-300 group-hover:text-[#5788FF]">{state.label}</span>
                      <span className="block text-xs text-muted-foreground">{state.abbreviation} · ABA Therapy</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 opacity-0 transition-all duration-300 ease-bounce-sm group-hover:translate-x-0.5 group-hover:text-[#5788FF] group-hover:opacity-100" />
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6">
        <Card className="group relative overflow-hidden border border-[#5788FF]/20 bg-gradient-to-br from-[#5788FF]/[0.03] via-white to-[#5788FF]/[0.06] transition-all duration-500 ease-premium hover:border-[#5788FF]/30 hover:shadow-[0_8px_30px_rgba(87,136,255,0.12)]">
          {/* Decorative elements */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[#5788FF]/5 transition-transform duration-700 ease-premium group-hover:scale-150" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-primary/10 transition-transform duration-700 ease-premium group-hover:scale-150" />
          <CardContent className="relative flex flex-col items-center gap-6 p-8 text-center sm:flex-row sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10 transition-all duration-300 ease-premium group-hover:scale-[1.05] group-hover:bg-[#5788FF]/15">
              <Heart className="h-7 w-7 text-[#5788FF] transition-transform duration-300 ease-bounce-sm group-hover:scale-110" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-xl font-semibold text-foreground">Are you an ABA therapy provider?</p>
              <p className="text-muted-foreground">
                List your practice and connect with families searching for ABA services in your area.
              </p>
            </div>
            <Button
              asChild
              className="group/btn shrink-0 rounded-full bg-[#5788FF] px-8 py-5 text-base font-semibold text-white shadow-[0_4px_14px_rgba(87,136,255,0.3)] transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:bg-[#4A7AEE] hover:shadow-[0_8px_20px_rgba(87,136,255,0.4)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(87,136,255,0.2)]"
            >
              <Link href="/get-listed">
                Get Listed Free
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

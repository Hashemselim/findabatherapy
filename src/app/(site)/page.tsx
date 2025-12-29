import Link from "next/link";
import { Star, Users, Zap, BookOpen, ArrowRight, Clock } from "lucide-react";
import * as StateIcons from "@state-icons/react";

import { HomeSearchCard } from "@/components/home/home-search-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { US_STATES } from "@/lib/data/us-states";
import { getFeaturedArticles, ARTICLE_CATEGORIES } from "@/lib/content/articles";
import { getHomepageFeaturedListings } from "@/lib/queries/search";

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
    <div className="space-y-16 pb-16">
      <section className="px-0 pt-0">
        <BubbleBackground
          interactive
          transition={{ stiffness: 100, damping: 50, mass: 0.5 }}
          className="w-full bg-gradient-to-br from-white via-yellow-50/50 to-blue-50/50 py-12 sm:py-16"
          colors={{
            first: "255,255,255",
            second: "255,236,170",
            third: "135,176,255",
            fourth: "255,248,210",
            fifth: "190,210,255",
            sixth: "240,248,255",
          }}
        >
          <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 sm:px-6">
            <div className="space-y-5 text-center">
              <h1 className="text-[32px] font-semibold leading-[40px] text-foreground sm:text-[44px] sm:leading-[60px]">
                Find Local ABA Therapy Providers{" "}
                <span className="text-[#5788FF] sm:whitespace-nowrap">Who Take Your Insurance</span>
              </h1>
            </div>
            <HomeSearchCard />
          </div>
        </BubbleBackground>
      </section>

      {/* Social Proof Bar */}
      <section className="border-y border-border/60 bg-white py-6 !mt-0">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-4 px-4 text-sm text-muted-foreground sm:px-6">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" aria-hidden />
            Trusted by 500+ providers
          </span>
          <span className="flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" aria-hidden />
            4.9/5 provider satisfaction
          </span>
          <span className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" aria-hidden />
            Set up in under 5 minutes
          </span>
        </div>
      </section>

      <section className="bg-white px-4 py-12 !mt-0 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <header className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Find an in-network agency
            </p>
            <h2 className="mt-2 text-3xl font-semibold">Search by insurance</h2>
            <p className="mt-2 text-muted-foreground">
              Add your coverage to make sure the agencies you contact are in network.
            </p>
          </header>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {insuranceCarriers.map((carrier) => (
              <Link
                key={carrier.slug}
                href={`/insurance/${carrier.slug}`}
                className="rounded-2xl border-2 border-border/60 bg-white text-center text-lg font-semibold text-foreground transition hover:border-primary hover:shadow-md"
              >
                <div className="flex h-24 items-center justify-center">{carrier.name}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Providers - Show marquee for 4+ providers, static grid for 1-3 */}
      {featuredProviders.length > 0 && (
        <section className="py-12 !mt-0 overflow-hidden" style={{ backgroundColor: SPONSORED_SECTION_BG }}>
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Star className="mr-1 inline h-4 w-4" />
                  Featured providers
                </p>
                <h2 className="mt-1 text-3xl font-semibold">Sponsored Listings</h2>
              </div>
              <Link href="/search" className="text-sm text-[#5788FF] hover:underline">
                View all providers →
              </Link>
            </div>
          </div>
          {/* Static grid for 1-3 providers */}
          {featuredProviders.length < 4 ? (
            <div className="mx-auto mt-6 max-w-5xl px-4 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featuredProviders.map((provider) => (
                  <Link
                    key={provider.id}
                    href={`/provider/${provider.slug}`}
                  >
                    <Card className="h-full border-2 border-[#5788FF]/30 bg-white shadow-sm transition-all hover:border-[#5788FF] hover:shadow-md">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border-2 border-[#5788FF]/20">
                            {provider.logoUrl ? (
                              <AvatarImage src={provider.logoUrl} alt={provider.profile.agencyName} />
                            ) : null}
                            <AvatarFallback className="bg-[#5788FF]/10 text-[#5788FF] font-semibold">
                              {provider.profile.agencyName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="truncate text-base">{provider.profile.agencyName}</CardTitle>
                            {provider.primaryLocation && (
                              <CardDescription className="truncate">
                                {provider.primaryLocation.city}, {provider.primaryLocation.state}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Badge className="bg-[#5788FF]/10 text-[#5788FF] hover:bg-[#5788FF]/20">
                          <Star className="mr-1 h-3 w-3" />
                          Featured
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            /* Marquee for 4+ providers */
            <div className="relative mt-6">
              <div className="flex animate-marquee gap-4 hover:[animation-play-state:paused]">
                {[...featuredProviders, ...featuredProviders].map((provider, idx) => (
                  <Link
                    key={`${provider.id}-${idx}`}
                    href={`/provider/${provider.slug}`}
                    className="flex-shrink-0"
                  >
                    <Card className="w-72 border-2 border-[#5788FF]/30 bg-white shadow-sm transition-all hover:border-[#5788FF] hover:shadow-md">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border-2 border-[#5788FF]/20">
                            {provider.logoUrl ? (
                              <AvatarImage src={provider.logoUrl} alt={provider.profile.agencyName} />
                            ) : null}
                            <AvatarFallback className="bg-[#5788FF]/10 text-[#5788FF] font-semibold">
                              {provider.profile.agencyName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="truncate text-base">{provider.profile.agencyName}</CardTitle>
                            {provider.primaryLocation && (
                              <CardDescription className="truncate">
                                {provider.primaryLocation.city}, {provider.primaryLocation.state}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Badge className="bg-[#5788FF]/10 text-[#5788FF] hover:bg-[#5788FF]/20">
                          <Star className="mr-1 h-3 w-3" />
                          Featured
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="bg-white py-12 !mt-0">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Preview the directory
              </p>
              <h2 className="text-3xl font-semibold">Browse ABA Providers</h2>
            </div>
          </div>
          <div className="relative mt-6 overflow-hidden rounded-3xl border border-border bg-muted/30">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/70 text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-medium">Agency</th>
                  <th className="px-6 py-4 font-medium">City</th>
                  <th className="px-6 py-4 font-medium">Services</th>
                  <th className="px-6 py-4 font-medium">Tier</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.name} className="border-t border-border/60 bg-white/90">
                    <td className="px-6 py-4 font-medium text-foreground">{row.name}</td>
                    <td className="px-6 py-4">{row.city}</td>
                    <td className="px-6 py-4">{row.services}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary-foreground">
                        {row.tier}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#FDFAEE] via-[#FDFAEE]/80 to-transparent" />
            <div className="absolute inset-x-0 bottom-6 flex justify-center">
              <Button
                asChild
                className="rounded-full border border-[#FEE720] bg-[#FEE720] px-6 text-base font-semibold text-[#333333] hover:bg-[#FFF5C2]"
              >
                <Link href="/search">See all providers</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Learn About ABA Section */}
      <section className="bg-gradient-to-br from-purple-50/50 to-blue-50/50 py-12 !mt-0">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <BookOpen className="mr-1 inline h-4 w-4" />
                Resources for families
              </p>
              <h2 className="mt-2 text-3xl font-semibold">Learn About ABA Therapy</h2>
              <p className="mt-2 text-muted-foreground">
                Expert guides to help you understand ABA therapy and make informed decisions.
              </p>
            </div>
            <Link
              href="/learn"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#5788FF] hover:underline"
            >
              View all guides
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {getFeaturedArticles().slice(0, 3).map((article) => {
              const categoryInfo = ARTICLE_CATEGORIES[article.category];
              return (
                <Link key={article.slug} href={`/learn/${article.slug}`}>
                  <Card className="group h-full border border-border/70 bg-white transition-all hover:border-primary hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className={categoryInfo.color}>
                          {categoryInfo.label}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {article.readTime} min
                        </span>
                      </div>
                      <CardTitle className="mt-3 text-lg leading-snug group-hover:text-primary">
                        {article.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="line-clamp-2">
                        {article.description}
                      </CardDescription>
                      <span className="mt-4 inline-flex items-center text-sm font-medium text-[#5788FF]">
                        Read guide
                        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
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
        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Explore by state</p>
              <h2 className="text-3xl font-semibold">Find ABA providers near you</h2>
              <p className="mt-2 text-muted-foreground">Browse every state or jump directly to your region.</p>
            </div>
            <div className="w-full max-w-sm">
              <label className="text-sm font-medium text-muted-foreground">
                Search by city or ZIP
                <Input placeholder="e.g., Denver, CO" className="mt-2 h-11" />
              </label>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {US_STATES.map((state) => {
              const Icon = StateIcons[state.abbreviation as keyof typeof StateIcons];

              return (
                <Link
                  key={state.value}
                  href={`/${state.value}`}
                  className="group flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-muted-foreground transition hover:border-primary hover:text-foreground"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFF5C2] text-[#5788FF] transition group-hover:bg-[#FEE720] group-hover:text-[#5788FF]">
                    {Icon ? (
                      <Icon aria-hidden size={28} color="currentColor" />
                    ) : (
                      <span className="text-sm font-semibold">{state.abbreviation}</span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <span className="block text-base font-medium text-foreground">{state.label}</span>
                    <span className="block text-xs text-muted-foreground">{state.abbreviation} · ABA Therapy</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6">
        <Card className="border border-[#5788FF]/30 bg-gradient-to-br from-[#5788FF]/5 to-[#5788FF]/10">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
            <div className="flex-1 space-y-1">
              <p className="text-lg font-semibold text-foreground">Are you an ABA therapy provider?</p>
              <p className="text-sm text-muted-foreground">
                List your practice and connect with families searching for ABA services.
              </p>
            </div>
            <Button asChild className="shrink-0 rounded-full border border-[#5788FF] bg-[#5788FF] px-6 text-white hover:bg-[#5A84E6]">
              <Link href="/get-listed">Get Listed Free</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

import Link from "next/link";
import { ShieldCheck, Star, Users } from "lucide-react";
import * as StateIcons from "@state-icons/react";

import { HomeSearchCard } from "@/components/home/home-search-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { US_STATES } from "@/lib/data/us-states";

const insuranceCarriers = ["Aetna", "Cigna", "UnitedHealthcare", "Medicaid", "Blue Cross Blue Shield", "Tricare"];

const sponsoredListings = [
  { name: "Bright Path ABA", city: "Los Angeles, CA", plan: "Featured", initials: "BP" },
  { name: "Spectrum Steps", city: "Phoenix, AZ", plan: "Featured", initials: "SS" },
  { name: "Harbor ABA Group", city: "Austin, TX", plan: "Featured", initials: "HA" },
];

const previewRows = [
  { name: "Elevate Behavioral Health", city: "Dallas, TX", services: "In-home · Center", tier: "Premium" },
  { name: "Green Sprouts ABA", city: "Nashville, TN", services: "In-home", tier: "Basic" },
  { name: "Sunrise Autism Center", city: "Miami, FL", services: "Center · Telehealth", tier: "Premium" },
];

const SPONSORED_SECTION_BG = "#FDFAEE";

export default function HomePage() {
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
                <span className="sm:whitespace-nowrap">Who Take Your Insurance</span>
              </h1>
            </div>
            <HomeSearchCard />
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" aria-hidden />
                Thousands of families search monthly
              </span>
              <span className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" aria-hidden />
                Premium agencies highlighted first
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                Verified insurance + service info
              </span>
            </div>
          </div>
        </BubbleBackground>
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
                key={carrier}
                href={`/search?insurance=${encodeURIComponent(carrier)}`}
                className="rounded-2xl border-2 border-border/60 bg-white text-center text-lg font-semibold text-foreground transition hover:border-primary hover:shadow-md"
              >
                <div className="flex h-24 items-center justify-center">{carrier}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 !mt-0 sm:px-6" style={{ backgroundColor: SPONSORED_SECTION_BG }}>
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Featured partners
              </p>
              <h2 className="text-3xl font-semibold">Sponsored ABA agencies</h2>
            </div>
            <Link href="/partners/advertise" className="text-sm text-primary hover:underline">
              Advertise with us →
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {sponsoredListings.map((listing) => (
              <Card key={listing.name} className="border-2 border-primary/40 bg-white shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 bg-[#FEE720] text-[#333333]">
                      <AvatarFallback>{listing.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{listing.name}</CardTitle>
                      <CardDescription>{listing.city}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>{listing.plan} placement · Highlighted across search</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-12 !mt-0">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Preview the directory
              </p>
              <h2 className="text-3xl font-semibold">Top ABA agencies near you</h2>
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
                className="rounded-full border border-[#FEE720] bg-[#FEE720] px-6 text-base font-semibold text-[#333333] hover:bg-[#f5d900]"
              >
                <Link href="/search">See all providers</Link>
              </Button>
            </div>
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
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF5C2] text-[#87B0FF] transition group-hover:bg-[#FEE720] group-hover:text-[#87B0FF]">
                    {Icon ? (
                      <Icon aria-hidden size={28} color="currentColor" />
                    ) : (
                      <span className="text-sm font-semibold">{state.abbreviation}</span>
                    )}
                  </span>
                  <span className="text-base font-medium">{state.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#FDFAEE] py-16">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 rounded-3xl border border-border bg-white/90 p-8 text-center shadow-lg">
          <h2 className="text-3xl font-semibold">Ready to list your practice?</h2>
          <p className="text-lg text-muted-foreground">
            Join hundreds of ABA agencies generating leads from families searching for care. Improve SEO, appear on Google
            Maps, and unlock premium placements.
          </p>
          <Button
            asChild
            className="mx-auto rounded-full border border-[#FEE720] bg-[#FEE720] px-8 text-base font-semibold text-[#333333] hover:bg-[#f5d900]"
          >
            <Link href="/get-listed">Get Listed</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { MapPin, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const featuredProviders = [
  {
    name: "Bright Path ABA",
    distance: "2.1 mi",
    insurance: "Aetna · BCBS",
    description: "In-home and center-based ABA with bilingual clinicians.",
  },
  {
    name: "Spectrum Steps Clinic",
    distance: "4.3 mi",
    insurance: "Cigna · Medicaid",
    description: "Clinic-based early intervention with parent coaching.",
  },
];

const otherProviders = [
  {
    name: "Harbor ABA Group",
    distance: "5.8 mi",
    insurance: "UnitedHealthcare",
    description: "In-home ABA focused on school readiness.",
  },
  {
    name: "Sunrise Autism Center",
    distance: "6.2 mi",
    insurance: "Aetna · Medicaid",
    description: "Center + telehealth with BCBA supervision.",
  },
];

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          <span className="text-sm font-semibold uppercase tracking-wide">Filters</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-[1.8fr_1.3fr_1.3fr_auto] lg:items-end">
          <label className="text-sm font-medium text-muted-foreground">
            Location
            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border px-3">
              <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden />
              <Input placeholder="City or ZIP" className="border-0 shadow-none focus-visible:ring-0" />
            </div>
          </label>
          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground">Setting</span>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-full border-primary/60 bg-primary/10 text-primary-foreground hover:bg-primary/20">
                In-home
              </Button>
              <Button variant="outline" className="flex-1 rounded-full text-muted-foreground">
                Center
              </Button>
            </div>
          </div>
          <label className="text-sm font-medium text-muted-foreground">
            Insurance
            <Select defaultValue="any">
              <SelectTrigger className="mt-2 h-11 rounded-2xl">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="aetna">Aetna</SelectItem>
                <SelectItem value="cigna">Cigna</SelectItem>
                <SelectItem value="medicaid">Medicaid</SelectItem>
                <SelectItem value="bcbs">Blue Cross Blue Shield</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <div className="flex flex-wrap gap-3 md:col-span-2 lg:col-span-1 lg:justify-end">
            <Button size="sm" className="rounded-full">
              Apply filters
            </Button>
            <Button size="sm" variant="ghost" className="text-muted-foreground">
              Reset
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground lg:justify-end">
          Sort:
          <Button variant="ghost" size="sm" className="rounded-full bg-primary/10 text-primary-foreground">
            Distance
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground">
            Name A–Z
          </Button>
        </div>
      </section>

      <section className="space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sponsored</p>
            <h2 className="text-2xl font-semibold">Featured ABA agencies near Newark, NJ</h2>
          </div>
          <Link href="/partners/advertise" className="text-sm text-primary hover:underline">
            Sponsor your agency →
          </Link>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {featuredProviders.map((provider) => (
            <Card key={provider.name} className="border-2 border-primary/50">
              <CardHeader>
                <CardTitle>{provider.name}</CardTitle>
                <CardDescription>{provider.distance} · {provider.insurance}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>{provider.description}</p>
                <Button className="rounded-full">View profile</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">All results</p>
          <h2 className="text-2xl font-semibold">More ABA providers in New Jersey</h2>
        </header>
        <div className="space-y-3">
          {otherProviders.map((provider) => (
            <Card key={provider.name} className="border border-border/70">
              <CardHeader>
                <CardTitle>{provider.name}</CardTitle>
                <CardDescription>
                  {provider.distance} · {provider.insurance}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>{provider.description}</p>
                <Button variant="outline" className="rounded-full">
                  View details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

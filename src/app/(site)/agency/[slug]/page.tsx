import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle, Globe, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_TIERS } from "@/lib/constants/listings";

type AgencyPageParams = {
  slug: string;
};

type AgencyPageProps = {
  params: AgencyPageParams;
};

const sampleAgencies = [
  {
    slug: "thrive-spectrum-aba",
    name: "Thrive Spectrum ABA",
    tagline: "Family-first ABA for every setting",
    description:
      "Thrive Spectrum ABA provides in-home, center-based, and telehealth ABA services across the valley. Our board-certified team partners closely with families, schools, and pediatricians to build individualized programs with measurable outcomes.",
    plan: "featured" as const,
    services: ["In-home ABA", "Center-based ABA", "Telehealth parent consultation"],
    insurances: ["BCBS", "Aetna", "Medicaid (DDD)", "Self-pay"],
    locations: [
      { city: "Phoenix", state: "AZ", address: "123 North Ave, Phoenix, AZ 85004" },
      { city: "Scottsdale", state: "AZ", address: "8200 E Mountain View Rd, Scottsdale, AZ 85258" },
    ],
    contact: {
      phone: "(480) 555-1182",
      email: "hello@thrivespectrumaba.com",
      website: "https://thrivespectrumaba.com",
    },
    highlights: [
      "BCBA-led clinical teams",
      "Parent training built into every program",
      "Real-time data dashboards for families",
      "School collaboration and IEP support",
    ],
    media: {
      gallery: [
        "https://images.unsplash.com/photo-1523450599440-56c2f25224fa?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80",
      ],
    },
  },
];

const badgeStyles: Record<(typeof PLAN_TIERS)[number]["value"], string> = {
  free: "bg-secondary text-secondary-foreground",
  premium: "bg-primary/90 text-primary-foreground",
  featured: "bg-primary text-primary-foreground",
};

const getAgency = (slug: string) => sampleAgencies.find((agency) => agency.slug === slug);

export async function generateMetadata({ params }: AgencyPageProps): Promise<Metadata> {
  const agency = getAgency(params.slug);

  if (!agency) {
    return {};
  }

  return {
    title: `${agency.name} | ABA Therapy`,
    description: `${agency.name} provides ${agency.services.join(", ")}. Explore availability, insurances accepted, and contact details.`,
    alternates: {
      canonical: `/agency/${agency.slug}`,
    },
    openGraph: {
      title: agency.name,
      description: agency.description,
      images: agency.media.gallery,
    },
  };
}

export default function AgencyPage({ params }: AgencyPageProps) {
  const agency = getAgency(params.slug);

  if (!agency) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Badge className={`${badgeStyles[agency.plan]} w-fit`}>{agency.plan.toUpperCase()}</Badge>
            <h1 className="text-4xl font-semibold leading-tight">{agency.name}</h1>
            <p className="text-lg text-muted-foreground">{agency.tagline}</p>
          </div>
          <div className="rounded-2xl border border-border px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Phone className="h-4 w-4 text-primary" aria-hidden />
              {agency.contact.phone}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" aria-hidden />
              <a href={agency.contact.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Visit website
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card className="border border-border/80">
            <CardHeader>
              <CardTitle>Locations</CardTitle>
              <CardDescription>Serving families across the metro area.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {agency.locations.map((location) => (
                <div key={location.address} className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm">
                  <p className="font-semibold text-foreground">
                    {location.city}, {location.state}
                  </p>
                  <p className="text-muted-foreground">{location.address}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-border/80">
            <CardHeader>
              <CardTitle>Services & insurance</CardTitle>
              <CardDescription>Families can confirm fit at a glance.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Services</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {agency.services.map((service) => (
                    <li key={service} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" aria-hidden />
                      {service}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Insurances</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {agency.insurances.map((insurance) => (
                    <Badge key={insurance} variant="outline">
                      {insurance}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80">
            <CardHeader>
              <CardTitle>About {agency.name}</CardTitle>
              <CardDescription>Secondary details & approach.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>{agency.description}</p>
              <ul className="grid gap-2 md:grid-cols-2">
                {agency.highlights.map((highlight) => (
                  <li key={highlight} className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                    {highlight}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border border-border/80">
            <CardHeader>
              <CardTitle>Media gallery</CardTitle>
              <CardDescription>Peek inside the clinic before you call.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {agency.media.gallery.map((image) => (
                <div
                  key={image}
                  className="aspect-video overflow-hidden rounded-2xl bg-muted/40"
                  style={{
                    backgroundImage: `url(${image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="border border-border/80">
            <CardHeader>
              <CardTitle>Contact {agency.name}</CardTitle>
              <CardDescription>Reach out to confirm openings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="font-semibold text-foreground">{agency.contact.phone}</div>
              <div>{agency.contact.email}</div>
              <Button asChild className="w-full rounded-full">
                <a href={`mailto:${agency.contact.email}`}>Email agency</a>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

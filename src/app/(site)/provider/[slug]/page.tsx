import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle, Globe, Mail, Phone } from "lucide-react";

import { ProviderLogo } from "@/components/provider/provider-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProviderLocationsCard } from "@/components/provider/provider-locations-card";
import { PLAN_TIERS } from "@/lib/constants/listings";

type ProviderPageParams = {
  slug: string;
};

type ProviderPageProps = {
  params: ProviderPageParams;
};

const sampleProviders = [
  {
    slug: "bright-path-aba",
    name: "Bright Path ABA",
    logo: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=400&q=80",
    tagline: "Dedicated care teams with bilingual support",
    description:
      "Bright Path ABA blends in-home and center-based programs so families can keep a consistent team wherever therapy happens. Families work with a dedicated care coordinator, bilingual RBTs, and quarterly progress reviews to keep goals on track.",
    plan: "featured" as const,
    services: ["In-home ABA", "Center-based clinics", "Parent coaching"],
    insurances: ["Aetna", "BCBS", "Cigna", "UnitedHealthcare"],
    locations: [
      { city: "Newark", state: "NJ", address: "230 Market St, Newark, NJ 07102" },
      { city: "Jersey City", state: "NJ", address: "480 Marin Blvd, Jersey City, NJ 07302" },
    ],
    contact: {
      phone: "(973) 555-0124",
      email: "hello@brightpathaba.com",
      website: "https://brightpathaba.com",
    },
    highlights: [
      "Dedicated BCBA for each family",
      "Spanish-speaking clinicians available",
      "Quarterly progress reviews with goals dashboard",
      "Weekend family coaching workshops",
    ],
    media: {
      gallery: [
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1498079022511-d15614cb1c02?auto=format&fit=crop&w=1200&q=80",
      ],
    },
  },
  {
    slug: "spectrum-steps-clinic",
    name: "Spectrum Steps Clinic",
    logo: "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?auto=format&fit=crop&w=400&q=80",
    tagline: "Sensory-friendly clinics built for early learners",
    description:
      "Spectrum Steps specializes in preschool and early elementary learners with sensory-forward clinic spaces, telehealth coaching, and embedded parent training.",
    plan: "featured" as const,
    services: ["Clinic-based ABA", "Telehealth coaching", "Caregiver workshops"],
    insurances: ["Cigna", "Medicaid", "Horizon"],
    locations: [{ city: "Harrison", state: "NJ", address: "15 Frank E Rodgers Blvd, Harrison, NJ 07029" }],
    contact: {
      phone: "(201) 555-8866",
      email: "intake@spectrumsteps.com",
      website: "https://spectrumsteps.com",
    },
    highlights: [
      "Sensory gyms with natural light",
      "Real-time parent messaging app",
      "Same-week intake calls",
      "BCBA team focused on ages 2–8",
    ],
    media: {
      gallery: [
        "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
      ],
    },
  },
  {
    slug: "harbor-aba-group",
    name: "Harbor ABA Group",
    logo: "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=400&q=80",
    tagline: "Neighborhood-based teams with school collaboration",
    description:
      "Harbor ABA Group partners with local districts and pediatricians to deliver flexible in-home and center sessions plus school support for IEP goals.",
    plan: "featured" as const,
    services: ["In-home ABA", "Center-based ABA", "School support"],
    insurances: ["UnitedHealthcare", "Aetna", "Tricare"],
    locations: [
      { city: "Jersey City", state: "NJ", address: "245 Grove St, Jersey City, NJ 07302" },
      { city: "Hoboken", state: "NJ", address: "77 Hudson St, Hoboken, NJ 07030" },
    ],
    contact: {
      phone: "(201) 555-4290",
      email: "support@harboraba.com",
      website: "https://harboraba.com",
    },
    highlights: [
      "School collaboration and IEP attendance",
      "Caregiver coaching built into every plan",
      "Waitlist under two weeks",
      "On-site occupational therapy partners",
    ],
    media: {
      gallery: [
        "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
      ],
    },
  },
  {
    slug: "sunrise-autism-center",
    name: "Sunrise Autism Center",
    logo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80",
    tagline: "Weekend parent workshops and hybrid care",
    description:
      "Sunrise Autism Center operates a hybrid clinic with weekend workshops and telehealth check-ins so working families can stay engaged between visits.",
    plan: "premium" as const,
    services: ["Center-based ABA", "Telehealth check-ins", "Parent workshops"],
    insurances: ["Aetna", "Medicaid", "Horizon", "Optum"],
    locations: [{ city: "Bayonne", state: "NJ", address: "300 Broadway, Bayonne, NJ 07002" }],
    contact: {
      phone: "(201) 555-6612",
      email: "contact@sunriseautismcenter.com",
      website: "https://sunriseautismcenter.com",
    },
    highlights: [
      "Weekend coaching sessions",
      "Telehealth BCBA office hours",
      "Sensory-friendly classrooms",
      "Peer social groups on Saturdays",
    ],
    media: {
      gallery: [
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80",
      ],
    },
  },
  {
    slug: "elevate-behavioral-health",
    name: "Elevate Behavioral Health",
    logo: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80",
    tagline: "Small caseloads focused on social skills",
    description:
      "Elevate Behavioral Health limits each BCBA to six families, enabling deep coaching, social groups, and generalization sessions in the community.",
    plan: "premium" as const,
    services: ["In-home ABA", "Social skills groups", "Community outings"],
    insurances: ["BCBS", "Cigna", "Aetna"],
    locations: [{ city: "Montclair", state: "NJ", address: "10 Bloomfield Ave, Montclair, NJ 07042" }],
    contact: {
      phone: "(973) 555-7810",
      email: "team@elevatebh.com",
      website: "https://elevatebh.com",
    },
    highlights: [
      "Caseload cap of six clients per BCBA",
      "Weekly social groups by age",
      "Community-based reinforcement planning",
      "Parent coaching included monthly",
    ],
    media: {
      gallery: [
        "https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1448932223592-d1fc686e76ea?auto=format&fit=crop&w=1200&q=80",
      ],
    },
  },
  {
    slug: "green-sprouts-aba",
    name: "Green Sprouts ABA",
    tagline: "Bilingual in-home teams for early learners",
    description:
      "Green Sprouts ABA serves toddlers through elementary-aged children with bilingual therapists, parent coaching, and flexible scheduling.",
    plan: "free" as const,
    services: ["In-home ABA", "Parent coaching", "Early intervention"],
    insurances: ["Medicaid", "Horizon"],
    locations: [{ city: "Elizabeth", state: "NJ", address: "120 Broad St, Elizabeth, NJ 07201" }],
    contact: {
      phone: "(908) 555-9044",
      email: "care@greensproutsaba.com",
      website: "https://greensproutsaba.com",
    },
    highlights: [
      "Bilingual RBT teams",
      "Flexible evening sessions",
      "Caregiver coaching every month",
      "Collaboration with local preschools",
    ],
    media: {
      gallery: [
        "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1200&q=80",
      ],
    },
  },
];

const badgeStyles: Record<(typeof PLAN_TIERS)[number]["value"], string> = {
  free: "bg-secondary text-secondary-foreground",
  premium: "bg-primary/90 text-primary-foreground",
  featured: "bg-primary text-primary-foreground",
};

const getProvider = (slug: string) => sampleProviders.find((agency) => agency.slug === slug);

export async function generateMetadata({ params }: ProviderPageProps): Promise<Metadata> {
  const provider = getProvider(params.slug);

  if (!provider) {
    return {};
  }

  return {
    title: `${provider.name} | ABA Therapy`,
    description: `${provider.name} provides ${provider.services.join(", ")}. Explore availability, insurances accepted, and contact details.`,
    alternates: {
      canonical: `/provider/${provider.slug}`,
    },
    openGraph: {
      title: provider.name,
      description: provider.description,
      images: provider.media.gallery,
    },
  };
}

export default function ProviderPage({ params }: ProviderPageProps) {
  const provider = getProvider(params.slug);

  if (!provider) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <ProviderLogo name={provider.name} logoUrl={provider.logo} size="lg" className="shrink-0" />
          <div className="space-y-2">
            <Badge className={`${badgeStyles[provider.plan]} w-fit`}>{provider.plan.toUpperCase()}</Badge>
            <h1 className="text-4xl font-semibold leading-tight">{provider.name}</h1>
            <p className="text-lg text-muted-foreground">{provider.tagline}</p>
          </div>
        </div>
      </section>

      <div className="space-y-6">
        <Card className="border border-border/80">
          <CardHeader>
            <CardTitle>Contact {provider.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-start gap-x-8 gap-y-4 text-sm text-muted-foreground">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</p>
                <a
                  href={`tel:${provider.contact.phone}`}
                  className="mt-1 flex max-w-full items-center gap-2 text-base font-medium text-foreground"
                >
                  <Phone className="h-4 w-4 text-primary" aria-hidden />
                  {provider.contact.phone}
                </a>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
                <a
                  href={`mailto:${provider.contact.email}`}
                  className="mt-1 flex max-w-full items-center gap-2 text-base font-medium text-foreground"
                >
                  <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="break-words">{provider.contact.email}</span>
                </a>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Website</p>
                <a
                  href={provider.contact.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex max-w-full items-center gap-2 text-base font-medium text-foreground"
                >
                  <Globe className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="break-words">{provider.contact.website.replace(/^https?:\/\//, "")}</span>
                </a>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="flex-1 rounded-full text-base">
                <a href={provider.contact.website} target="_blank" rel="noopener noreferrer">
                  Visit Website
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <ProviderLocationsCard locations={provider.locations} />

        <Card className="border border-border/80">
          <CardHeader>
            <CardTitle>Services</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {provider.services.map((service) => (
                <li
                  key={service}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-2"
                >
                  <CheckCircle className="h-4 w-4 text-primary" aria-hidden />
                  {service}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border border-border/80">
          <CardHeader>
            <CardTitle>Insurances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {provider.insurances.map((insurance) => (
                <Badge key={insurance} variant="outline" className="rounded-full px-4 py-2 text-sm">
                  {insurance}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80">
          <CardHeader>
            <CardTitle>About {provider.name}</CardTitle>
            <CardDescription>Secondary details & approach.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{provider.description}</p>
            <ul className="grid gap-2 md:grid-cols-2">
              {provider.highlights.map((highlight) => (
                <li key={highlight} className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                  {highlight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border border-border/80">
          <CardHeader>
            <CardTitle>Photos and Videos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {provider.media.gallery.map((image) => (
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
    </div>
  );
}

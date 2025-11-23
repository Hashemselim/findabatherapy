import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { HomeSearchCard } from "@/components/home/home-search-card";
import { ProviderLogo } from "@/components/provider/provider-logo";
import { Badge } from "@/components/ui/badge";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Provider = {
  slug: string;
  name: string;
  logo?: string;
  location: string;
  distanceMiles?: number;
  description: string;
  insurance: string[];
  additionalLocations?: number;
  offersInHome?: boolean;
  offersInCenter?: boolean;
  featured?: boolean;
};

const searchMeta = {
  location: "Newark, NJ",
  total: 18,
};

const searchFilters = {
  selectedInsurance: "Aetna",
};

const featuredProviders: Provider[] = [
  {
    slug: "bright-path-aba",
    name: "Bright Path ABA",
    logo: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=400&q=80",
    location: "Newark, NJ",
    distanceMiles: 2.1,
    description: "Hybrid in-home and center-based ABA with bilingual BCBAs and parent coaching.",
    insurance: ["Aetna", "BCBS", "Cigna", "UnitedHealthcare"],
    additionalLocations: 2,
    offersInHome: true,
    offersInCenter: true,
    featured: true,
  },
  {
    slug: "spectrum-steps-clinic",
    name: "Spectrum Steps Clinic",
    logo: "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?auto=format&fit=crop&w=400&q=80",
    location: "Harrison, NJ",
    distanceMiles: 4.3,
    description: "Early intervention specialists with sensory-friendly clinic rooms and telehealth check-ins.",
    insurance: ["Cigna", "Medicaid", "Horizon"],
    offersInCenter: true,
    featured: true,
  },
  {
    slug: "harbor-aba-group",
    name: "Harbor ABA Group",
    logo: "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=400&q=80",
    location: "Jersey City, NJ",
    distanceMiles: 5,
    description: "Community-based programs that pair school readiness goals with flexible scheduling.",
    insurance: ["UnitedHealthcare", "Aetna", "Tricare"],
    additionalLocations: 1,
    offersInHome: true,
    offersInCenter: true,
    featured: true,
  },
];

const otherProviders: Provider[] = [
  {
    slug: "sunrise-autism-center",
    name: "Sunrise Autism Center",
    logo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80",
    location: "Bayonne, NJ",
    distanceMiles: 6.2,
    description: "Center + telehealth blend with weekend parent workshops.",
    insurance: ["Aetna", "Medicaid", "Horizon", "Optum"],
    offersInCenter: true,
  },
  {
    slug: "elevate-behavioral-health",
    name: "Elevate Behavioral Health",
    logo: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80",
    location: "Montclair, NJ",
    distanceMiles: 8.4,
    description: "Small caseload model focused on social skills groups.",
    insurance: ["BCBS", "Cigna", "Aetna"],
    offersInHome: true,
  },
  {
    slug: "green-sprouts-aba",
    name: "Green Sprouts ABA",
    location: "Elizabeth, NJ",
    distanceMiles: 9.1,
    description: "In-home programs with bilingual therapists and caregiver coaching.",
    insurance: ["Medicaid", "Horizon"],
    offersInHome: true,
  },
];

function ProviderCard({
  provider,
  hasVisitorLocation,
  selectedInsurance,
}: {
  provider: Provider;
  hasVisitorLocation: boolean;
  selectedInsurance?: string | null;
}) {
  const previewedInsurance = provider.insurance.slice(0, 3);
  const extraInsuranceCount = provider.insurance.length - previewedInsurance.length;
  const formattedDistance =
    hasVisitorLocation && typeof provider.distanceMiles === "number"
      ? `${provider.distanceMiles} miles`
      : null;

  return (
    <Card
      className={cn(
        "rounded-2xl border border-border/80 bg-white/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg",
        provider.featured && "border-primary/50 bg-[#FDFAEE]",
      )}
    >
      <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="flex w-full gap-4 sm:gap-6">
          <ProviderLogo name={provider.name} logoUrl={provider.logo} className="shrink-0" />
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg font-semibold text-foreground">{provider.name}</CardTitle>
                {provider.featured && (
                  <Badge className="rounded-full border border-[#F6D96F] bg-[#FFF3B0] text-[11px] font-semibold text-[#5C4B1C]">
                    Featured
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{provider.location}</span>
                {formattedDistance ? (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span>{formattedDistance}</span>
                  </>
                ) : null}
                {provider.additionalLocations ? (
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-white/80 text-[11px] font-medium text-muted-foreground"
                  >
                    +{provider.additionalLocations} more locations
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {provider.offersInHome && (
                <Badge variant="outline" className="rounded-full border-primary/40 px-3 py-0.5 text-xs font-semibold">
                  In-home
                </Badge>
              )}
              {provider.offersInCenter && (
                <Badge variant="outline" className="rounded-full border-primary/40 px-3 py-0.5 text-xs font-semibold">
                  In-center
                </Badge>
              )}
              {selectedInsurance ? (
                <Badge className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  In Network with {selectedInsurance}
                </Badge>
              ) : (
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Insurance{" "}
                  <span className="text-sm font-semibold text-foreground">
                    {previewedInsurance.join(", ")}
                    {extraInsuranceCount > 0 ? ` · +${extraInsuranceCount} more` : ""}
                  </span>
                </span>
              )}
            </div>

            <p className="text-sm text-muted-foreground">{provider.description}</p>
          </div>
        </div>
        <div className="flex w-full justify-end sm:w-auto">
          <Button
            asChild
            className="w-full rounded-full border border-[#FEE720] bg-[#FEE720] px-6 text-sm font-semibold text-[#333333] hover:bg-[#f5d900] sm:w-auto"
          >
            <Link href={`/provider/${provider.slug}`}>View provider</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SearchPage() {
  const providers = [...featuredProviders, ...otherProviders];

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
          </div>
        </BubbleBackground>
      </section>

      <section className="mx-auto max-w-5xl space-y-10 px-4 sm:px-6">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Showing {searchMeta.total} matches
            </p>
            <h1 className="text-3xl font-semibold text-foreground">ABA providers near {searchMeta.location}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-muted-foreground" role="radiogroup">
            <span className="text-muted-foreground">Sort:</span>
            <div className="inline-flex rounded-full border border-border/80 bg-muted/30 p-1">
              <button
                type="button"
                role="radio"
                aria-checked="true"
                className="rounded-full bg-white px-4 py-1 text-sm font-semibold text-foreground shadow-sm"
              >
                Sort by Distance
              </button>
              <button
                type="button"
                role="radio"
                aria-checked="false"
                className="rounded-full px-4 py-1 text-sm text-muted-foreground"
              >
                Sort by Name
              </button>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.name}
              provider={provider}
              hasVisitorLocation={Boolean(searchMeta.location)}
              selectedInsurance={searchFilters.selectedInsurance}
            />
          ))}
        </section>
      </section>
    </div>
  );
}

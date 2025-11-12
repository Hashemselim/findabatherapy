import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Filter, MapPin } from "lucide-react";

import { ListingCard } from "@/components/listings/listing-card";
import { AgencySearchForm } from "@/components/search/agency-search-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FILTERABLE_ATTRIBUTES, SERVICE_TYPES } from "@/lib/constants/listings";
import { type StateValue, US_STATES } from "@/lib/data/us-states";

const stateLookup = new Map(US_STATES.map((state) => [state.value, state]));

type StatePageParams = {
  state: StateValue;
};

type StatePageSearchParams = {
  serviceType?: string | string[];
};

type StatePageProps = {
  params: StatePageParams;
  searchParams: StatePageSearchParams;
};

const sampleListings = [
  {
    name: "Thrive Spectrum ABA",
    slug: "thrive-spectrum-aba",
    summary:
      "In-home ABA with parent coaching, telehealth supervision, and school collaboration across major metros.",
    plan: "featured" as const,
    serviceAreas: ["Phoenix", "Scottsdale", "Mesa"],
    attributes: [
      { label: "Services", value: "In-home · Center-based · Telehealth" },
      { label: "Insurances", value: "BCBS · Aetna · Medicaid" },
      { label: "Ages", value: "18 months – 18 years" },
      { label: "Specialties", value: "Early intervention, school consulting" },
    ],
    isAcceptingClients: true,
  },
  {
    name: "Elevate ABA Clinics",
    slug: "elevate-aba-clinics",
    summary: "Clinic-based ABA with sensory gyms, BCBA mentoring, and weekend social skills groups.",
    plan: "premium" as const,
    serviceAreas: ["Phoenix", "Tucson"],
    attributes: [
      { label: "Services", value: "Center-based" },
      { label: "Insurances", value: "UnitedHealthcare · Cigna · Self-pay" },
      { label: "Ages", value: "3 – 12 years" },
      { label: "Extras", value: "Parent training, OT collaboration" },
    ],
    isAcceptingClients: false,
  },
  {
    name: "Desert Sun Behavioral",
    slug: "desert-sun-behavioral",
    summary: "Family-owned ABA agency offering bilingual services and in-home early intervention.",
    plan: "free" as const,
    serviceAreas: ["Mesa", "Chandler", "Gilbert"],
    attributes: [
      { label: "Services", value: "In-home" },
      { label: "Insurances", value: "Medicaid (DDD) · Aetna" },
      { label: "Languages", value: "English · Spanish" },
      { label: "Ages", value: "2 – 14 years" },
    ],
    isAcceptingClients: true,
  },
];

export async function generateStaticParams() {
  return US_STATES.map((state) => ({ state: state.value }));
}

export async function generateMetadata({ params }: StatePageProps): Promise<Metadata> {
  const state = stateLookup.get(params.state);

  if (!state) {
    return {};
  }

  const title = `Find ABA Therapy in ${state.label}`;
  const description = `Browse verified ABA therapy agencies providing in-home and center-based services across ${state.label}. Filter by insurance, specialties, availability, and more.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

const normalizeServiceType = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value ?? undefined;

const filterListingsByServiceType = (serviceType?: string) => {
  if (!serviceType) return sampleListings;

  return sampleListings.filter((listing) =>
    listing.attributes.some(
      (attribute) =>
        attribute.label === "Services" &&
        attribute.value.toLowerCase().includes(serviceType.replace("_", "-")),
    ),
  );
};

export default function StatePage({ params, searchParams }: StatePageProps) {
  const state = stateLookup.get(params.state);

  if (!state) {
    notFound();
  }

  const serviceType = normalizeServiceType(searchParams.serviceType);
  const filteredListings = filterListingsByServiceType(serviceType);

  return (
    <div className="container px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-6 border-b border-border pb-10 md:flex-row md:items-end md:justify-between">
        <div className="space-y-4">
          <Badge variant="secondary" className="w-fit uppercase">
            {state.abbreviation}
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight">ABA Therapy in {state.label}</h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            Explore agencies offering in-home, in-center, and hybrid services. Listings update instantly as providers
            add new locations, insurances, or specialties.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" aria-hidden />
              Major metros covered: Phoenix, Tucson, Flagstaff
            </span>
            <span className="inline-flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" aria-hidden />
              Filter by any attribute
            </span>
          </div>
        </div>
        <div className="w-full max-w-xl">
          <AgencySearchForm />
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-6 rounded-3xl border border-border bg-muted/20 p-6">
          <h2 className="text-base font-semibold uppercase tracking-wide text-muted-foreground">
            Refine results
          </h2>
          <Accordion type="multiple" defaultValue={["serviceType", "insurances"]}>
            <AccordionItem value="serviceType">
              <AccordionTrigger>Service type</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  {SERVICE_TYPES.map((option) => (
                    <button
                      key={option.value}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 transition ${
                        option.value === serviceType
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-transparent hover:border-border"
                      }`}
                    >
                      {option.label}
                      <span className="text-xs text-muted-foreground">23</span>
                    </button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
            {FILTERABLE_ATTRIBUTES.map((attribute) => (
              <AccordionItem key={attribute.key} value={attribute.key}>
                <AccordionTrigger>{attribute.label}</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Dynamic filter controls will appear here, tailored to the selected attribute type.
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </aside>

        <section className="space-y-6">
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold">Featured agencies in {state.label}</h2>
            <p className="text-sm text-muted-foreground">
              Featured listings stay at the top of state search results and appear across sponsored placements.
            </p>
          </div>
          <div className="space-y-6">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.slug} {...listing} />
            ))}
          </div>
          <Card className="border-dashed border-primary/50 bg-primary/[0.04]">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Want to see your agency here first?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Upgrade to Featured to secure top placement, plus homepage banner rotations and monthly performance
              reporting. Start from the dashboard in minutes.
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_TIERS } from "@/lib/constants/listings";

type ListingPlan = (typeof PLAN_TIERS)[number]["value"];

export type ListingCardProps = {
  name: string;
  slug: string;
  summary: string;
  plan: ListingPlan;
  serviceAreas: string[];
  attributes: { label: string; value: string }[];
  isAcceptingClients?: boolean;
};

const planStyles: Record<ListingPlan, string> = {
  free: "border-border/70",
  premium: "border-primary/60 bg-primary/[0.04]",
  featured: "border-primary bg-primary/[0.08] shadow-lg",
};

const planBadges: Record<ListingPlan, string> = {
  free: "Basic listing",
  premium: "Premium placement",
  featured: "Featured listing",
};

export function ListingCard({
  name,
  slug,
  summary,
  plan,
  serviceAreas,
  attributes,
  isAcceptingClients,
}: ListingCardProps) {
  return (
    <Card className={`relative border-2 transition hover:-translate-y-0.5 ${planStyles[plan]}`}>
      {plan === "featured" && (
        <div className="absolute -left-2 -top-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg">
          Featured
        </div>
      )}
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Badge variant={plan === "free" ? "outline" : "secondary"}>{planBadges[plan]}</Badge>
          {isAcceptingClients && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#FEE720] bg-[#FFF5C2] px-2 py-1 text-[#333333]">
              <Star className="h-3 w-3" aria-hidden />
              Accepting new clients
            </span>
          )}
        </div>
        <CardTitle className="text-2xl font-semibold text-foreground">{name}</CardTitle>
        <CardDescription>{summary}</CardDescription>
        <p className="text-sm font-medium text-muted-foreground">
          Service areas: {serviceAreas.join(" · ")}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <ul className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
          {attributes.map((attribute) => (
            <li key={attribute.label}>
              <span className="font-medium text-foreground">{attribute.label}: </span>
              {attribute.value}
            </li>
          ))}
        </ul>
        <Link
          href={`/agency/${slug}`}
          className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2 text-sm font-medium text-primary transition hover:border-primary hover:text-primary"
        >
          View details
          <ArrowUpRight className="ml-2 h-3.5 w-3.5" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { Heart, Briefcase, ArrowRight, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { brandColors } from "@/config/brands";

type Props = {
  currentBrand: "therapy" | "jobs";
};

const brandData = {
  therapy: {
    name: "Find ABA Therapy",
    tagline: "Get found by families searching for ABA care",
    color: brandColors.therapy,
    icon: Heart,
    features: [
      "List your practice in search results",
      "Receive family inquiries directly",
      "Boost your SEO with backlinks",
      "Showcase services & specialties",
    ],
    ctaText: "Learn more",
    ctaHref: "/get-listed",
    domain: "findabatherapy.org",
  },
  jobs: {
    name: "Find ABA Jobs",
    tagline: "Hire BCBAs, RBTs & behavior analysts",
    color: brandColors.jobs,
    icon: Briefcase,
    features: [
      "Post job openings",
      "Receive qualified applications",
      "Build your employer brand",
      "Applicant management dashboard",
    ],
    ctaText: "Learn more",
    ctaHref: "/employers/post",
    domain: "findabajobs.org",
  },
};

export function CrossBrandBenefits({ currentBrand }: Props) {
  const otherBrand = currentBrand === "therapy" ? "jobs" : "therapy";
  const other = brandData[otherBrand];
  const OtherIcon = other.icon;

  return (
    <section className="bg-gradient-to-b from-slate-50/80 to-white py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Header */}
        <header className="text-center">
          <Badge
            variant="outline"
            className="mb-4 border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-600"
          >
            Included with your subscription
          </Badge>
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Also get full access to {other.name}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Your Behavior Work account unlocks both platforms. {other.tagline}.
          </p>
        </header>

        {/* Other Brand Card */}
        <Card className="mt-10 overflow-hidden border-2 border-slate-200 bg-white shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              {/* Left side - Brand info */}
              <div className="flex-1 p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ background: `${other.color}15` }}
                  >
                    <OtherIcon className="h-5 w-5" style={{ color: other.color }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{other.name}</h3>
                    <p className="text-sm text-muted-foreground">{other.domain}</p>
                  </div>
                </div>

                <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {other.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5 text-sm text-foreground">
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                        style={{ background: `${other.color}15` }}
                      >
                        <Check className="h-3 w-3" style={{ color: other.color }} />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex items-center gap-3">
                  <Button
                    asChild
                    size="sm"
                    className="rounded-full px-5"
                    style={{
                      background: other.color,
                      color: "white",
                    }}
                  >
                    <Link href={other.ctaHref}>
                      {other.ctaText}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Link
                    href={`https://www.${other.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Visit site
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Right side - Visual accent */}
              <div
                className="hidden w-48 md:block"
                style={{
                  background: `linear-gradient(135deg, ${other.color}08, ${other.color}15)`,
                }}
              >
                <div className="flex h-full items-center justify-center">
                  <OtherIcon
                    className="h-20 w-20 opacity-20"
                    style={{ color: other.color }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          One account, one subscription, two powerful platforms for your ABA business.
        </p>
      </div>
    </section>
  );
}

// Export brand data for use in pricing cards
export { brandData };

"use client";

import Link from "next/link";
import { Heart, Briefcase, Check, ArrowRight } from "lucide-react";
import { brandColors } from "@/config/brands";

type Props = {
  otherBrand: "therapy" | "jobs";
  planTier: "free" | "pro" | "enterprise";
};

const brandData = {
  therapy: {
    name: "Find ABA Therapy",
    color: brandColors.therapy,
    icon: Heart,
    href: "/get-listed",
    // Normalized to 3 features each for consistent card heights
    featuresByPlan: {
      free: ["Basic practice listing", "1 service location", "SEO backlink"],
      pro: ["Priority search placement", "Up to 5 locations", "Direct family inquiries"],
      enterprise: ["Unlimited locations", "Homepage placement", "All Pro features"],
    },
  },
  jobs: {
    name: "Find ABA Jobs",
    color: brandColors.jobs,
    icon: Briefcase,
    href: "/employers/post",
    // Normalized to 3 features each for consistent card heights
    featuresByPlan: {
      free: ["1 active job posting", "Basic applicant tracking", "Email notifications"],
      pro: ["Up to 5 active jobs", "Applicant dashboard", "Hiring analytics"],
      enterprise: ["Unlimited job postings", "Featured placement", "All Pro features"],
    },
  },
};

export function AlsoIncludedBadge({ otherBrand, planTier }: Props) {
  const brand = brandData[otherBrand];
  const BrandIcon = brand.icon;
  const features = brand.featuresByPlan[planTier];

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      {/* Header with brand name */}
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: `${brand.color}15` }}
        >
          <BrandIcon className="h-4 w-4" style={{ color: brand.color }} />
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Also included
          </p>
          <p className="text-sm font-semibold" style={{ color: brand.color }}>
            {brand.name}
          </p>
        </div>
      </div>

      {/* Features list */}
      <ul className="mt-3 space-y-1.5">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-xs text-slate-600">
            <Check className="h-3 w-3 shrink-0" style={{ color: brand.color }} />
            {feature}
          </li>
        ))}
      </ul>

      {/* Link */}
      <Link
        href={brand.href}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium transition-colors hover:underline"
        style={{ color: brand.color }}
      >
        Learn more
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

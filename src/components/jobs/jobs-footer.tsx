import Link from "next/link";

import { jobsConfig } from "@/config/jobs";
import { POSITION_TYPES } from "@/lib/validations/jobs";

const footerLinks = [
  {
    title: "Job Seekers",
    links: [
      { label: "Home", href: "/jobs" },
      { label: "Search Jobs", href: "/jobs/search" },
      { label: "Remote Jobs", href: "/jobs/search?remote=true" },
    ],
  },
  {
    title: "By Position",
    links: [
      { label: "BCBA Jobs", href: "/bcba-jobs" },
      { label: "RBT Jobs", href: "/rbt-jobs" },
      { label: "BCaBA Jobs", href: "/bcaba-jobs" },
      { label: "Clinical Director", href: "/clinical-director-jobs" },
    ],
  },
  {
    title: "Employers",
    links: [
      { label: "Post a Job", href: "/employers/post" },
      { label: "Sign in", href: "/auth/sign-in" },
      { label: "Dashboard", href: "/dashboard/jobs" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: `mailto:${jobsConfig.contactEmail}` },
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Service", href: "/legal/terms" },
    ],
  },
];

// Top states for SEO internal linking
const topStates = [
  { label: "California", href: "/jobs/california" },
  { label: "Texas", href: "/jobs/texas" },
  { label: "Florida", href: "/jobs/florida" },
  { label: "New York", href: "/jobs/new-york" },
  { label: "Pennsylvania", href: "/jobs/pennsylvania" },
  { label: "Illinois", href: "/jobs/illinois" },
  { label: "Ohio", href: "/jobs/ohio" },
  { label: "Georgia", href: "/jobs/georgia" },
  { label: "North Carolina", href: "/jobs/north-carolina" },
  { label: "Michigan", href: "/jobs/michigan" },
  { label: "New Jersey", href: "/jobs/new-jersey" },
  { label: "Virginia", href: "/jobs/virginia" },
];

// Top cities for SEO internal linking
const topCities = [
  { label: "Los Angeles, CA", href: "/jobs/search?state=CA&city=Los+Angeles" },
  { label: "Houston, TX", href: "/jobs/search?state=TX&city=Houston" },
  { label: "Phoenix, AZ", href: "/jobs/search?state=AZ&city=Phoenix" },
  { label: "New York, NY", href: "/jobs/search?state=NY&city=New+York" },
  { label: "Chicago, IL", href: "/jobs/search?state=IL&city=Chicago" },
  { label: "Miami, FL", href: "/jobs/search?state=FL&city=Miami" },
  { label: "Dallas, TX", href: "/jobs/search?state=TX&city=Dallas" },
  { label: "Atlanta, GA", href: "/jobs/search?state=GA&city=Atlanta" },
];

// Position type slug mapping for SEO-friendly URLs
const POSITION_SLUG_MAP: Record<string, string> = {
  bcba: "bcba",
  bcaba: "bcaba",
  rbt: "rbt",
  bt: "bt",
  clinical_director: "clinical-director",
  regional_director: "regional-director",
  executive_director: "executive-director",
  admin: "admin",
};

// Position types for SEO
const positionLinks = POSITION_TYPES.slice(0, 6).map((type) => ({
  label: `${type.label} Jobs`,
  href: `/${POSITION_SLUG_MAP[type.value] || type.value}-jobs`,
}));

export function JobsFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      {/* Main footer links */}
      <div className="container grid gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-6">
        <div className="md:col-span-2">
          <h3 className="text-lg font-semibold text-foreground">{jobsConfig.name}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{jobsConfig.description}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {jobsConfig.name}. All rights reserved.
          </p>
        </div>
        {footerLinks.map((section) => (
          <div key={section.title} className="md:col-span-1">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {section.links.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition hover:text-foreground">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* SEO internal links section */}
      <div className="border-t border-border/40">
        <div className="container grid gap-8 px-4 py-8 sm:px-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Popular States */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              ABA Jobs by State
            </h4>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {topStates.map((state) => (
                <Link
                  key={state.href}
                  href={state.href}
                  className="text-sm text-muted-foreground transition hover:text-foreground"
                >
                  {state.label}
                </Link>
              ))}
              <Link
                href="/jobs/search"
                className="text-sm font-medium text-primary transition hover:text-primary/80"
              >
                All jobs &rarr;
              </Link>
            </div>
          </div>

          {/* Popular Cities */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Popular Cities
            </h4>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {topCities.map((city) => (
                <Link
                  key={city.href}
                  href={city.href}
                  className="text-sm text-muted-foreground transition hover:text-foreground"
                >
                  {city.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Position Types */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Jobs by Position
            </h4>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {positionLinks.map((position) => (
                <Link
                  key={position.href}
                  href={position.href}
                  className="text-sm text-muted-foreground transition hover:text-foreground"
                >
                  {position.label}
                </Link>
              ))}
              <Link
                href="/jobs/search"
                className="text-sm font-medium text-primary transition hover:text-primary/80"
              >
                All jobs &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

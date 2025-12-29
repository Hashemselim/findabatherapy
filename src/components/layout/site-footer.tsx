import Link from "next/link";

import { siteConfig } from "@/config/site";

const footerLinks = [
  {
    title: "Visitors",
    links: [
      { label: "Home", href: "/" },
      { label: "Search Providers", href: "/search" },
      { label: "Browse by State", href: "/states" },
      { label: "Learn About ABA", href: "/learn" },
    ],
  },
  {
    title: "Providers",
    links: [
      { label: "Get Listed", href: "/get-listed" },
      { label: "Sign up", href: "/auth/sign-up" },
      { label: "Sign in", href: "/auth/sign-in" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Partners",
    links: [
      { label: "Advertise", href: "/partners/advertise" },
      { label: "Featured spots", href: "/#sponsored" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: `mailto:${siteConfig.contactEmail}` },
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Service", href: "/legal/terms" },
    ],
  },
];

// Top states for SEO internal linking (expanded to 12)
const topStates = [
  { label: "California", href: "/california" },
  { label: "Texas", href: "/texas" },
  { label: "Florida", href: "/florida" },
  { label: "New York", href: "/new-york" },
  { label: "Pennsylvania", href: "/pennsylvania" },
  { label: "Illinois", href: "/illinois" },
  { label: "Ohio", href: "/ohio" },
  { label: "Georgia", href: "/georgia" },
  { label: "North Carolina", href: "/north-carolina" },
  { label: "Michigan", href: "/michigan" },
  { label: "New Jersey", href: "/new-jersey" },
  { label: "Virginia", href: "/virginia" },
];

// Top cities for SEO internal linking
const topCities = [
  { label: "Los Angeles, CA", href: "/california/los-angeles" },
  { label: "Houston, TX", href: "/texas/houston" },
  { label: "Phoenix, AZ", href: "/arizona/phoenix" },
  { label: "New York, NY", href: "/new-york/new-york-city" },
  { label: "Chicago, IL", href: "/illinois/chicago" },
  { label: "Miami, FL", href: "/florida/miami" },
  { label: "Dallas, TX", href: "/texas/dallas" },
  { label: "Atlanta, GA", href: "/georgia/atlanta" },
];

// Top insurances for SEO internal linking
const topInsurances = [
  { label: "Medicaid", href: "/insurance/medicaid" },
  { label: "Blue Cross Blue Shield", href: "/insurance/blue-cross-blue-shield" },
  { label: "Aetna", href: "/insurance/aetna" },
  { label: "UnitedHealthcare", href: "/insurance/unitedhealthcare" },
  { label: "Cigna", href: "/insurance/cigna" },
  { label: "Tricare", href: "/insurance/tricare" },
];

// Popular guides for SEO internal linking
const popularGuides = [
  { label: "What is ABA Therapy?", href: "/learn/what-is-aba-therapy" },
  { label: "How to Choose a Provider", href: "/learn/how-to-choose-aba-provider" },
  { label: "ABA Therapy Cost Guide", href: "/learn/aba-therapy-cost" },
  { label: "Insurance Coverage", href: "/learn/insurance-coverage-aba" },
  { label: "In-Home vs Center-Based", href: "/learn/in-home-vs-center-based-aba" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      {/* Main footer links */}
      <div className="container grid gap-8 px-4 py-10 sm:px-6 md:grid-cols-12">
        <div className="md:col-span-4">
          <h3 className="text-lg font-semibold text-foreground">{siteConfig.name}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{siteConfig.description}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
        </div>
        {footerLinks.map((section) => (
          <div key={section.title} className="md:col-span-2">
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
        <div className="container grid gap-8 px-4 py-8 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Popular States */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              ABA Therapy by State
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
                href="/states"
                className="text-sm font-medium text-primary transition hover:text-primary/80"
              >
                All states →
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

          {/* Popular Insurances */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              ABA Therapy by Insurance
            </h4>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {topInsurances.map((insurance) => (
                <Link
                  key={insurance.href}
                  href={insurance.href}
                  className="text-sm text-muted-foreground transition hover:text-foreground"
                >
                  {insurance.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Popular Guides */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Popular Guides
            </h4>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {popularGuides.map((guide) => (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="text-sm text-muted-foreground transition hover:text-foreground"
                >
                  {guide.label}
                </Link>
              ))}
              <Link
                href="/learn"
                className="text-sm font-medium text-primary transition hover:text-primary/80"
              >
                All guides →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

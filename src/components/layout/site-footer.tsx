import Link from "next/link";

import { siteConfig } from "@/config/site";

const footerLinks = [
  {
    title: "Visitors",
    links: [
      { label: "Home", href: "/" },
      { label: "Search", href: "/search" },
      { label: "Learn", href: "/learn" },
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

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
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
    </footer>
  );
}

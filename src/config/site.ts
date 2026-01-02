export const siteConfig = {
  name: "Find ABA Therapy",
  tagline: "Discover trusted ABA therapy providers near you",
  description:
    "Find ABA Therapy is the fastest way for families to discover in-home and center-based ABA agencies. Providers can manage free or premium listings, featured placements, and sponsorships in minutes.",
  seo: {
    keywords: [
      "aba therapy directory",
      "find aba therapy",
      "autism services",
      "behavior therapy providers",
      "aba clinics",
    ],
  },
  social: {
    twitter: "https://twitter.com/findabatherapy",
    linkedin: "https://www.linkedin.com/company/findabatherapy",
  },
  contactEmail: "support@findabatherapy.org",
} as const;

export type SiteConfig = typeof siteConfig;

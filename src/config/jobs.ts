export const jobsConfig = {
  name: "Find ABA Jobs",
  tagline: "Discover ABA therapy careers near you",
  description:
    "Find ABA Jobs is the fastest way to discover BCBA, RBT, and behavior technician positions. Search thousands of jobs from top ABA providers nationwide.",
  seo: {
    keywords: [
      "aba jobs",
      "bcba jobs",
      "rbt jobs",
      "behavior analyst careers",
      "aba therapy jobs",
      "autism jobs",
    ],
  },
  social: {
    twitter: "https://twitter.com/findabajobs",
    linkedin: "https://www.linkedin.com/company/findabajobs",
  },
  contactEmail: "support@findabajobs.org",
} as const;

export type JobsConfig = typeof jobsConfig;

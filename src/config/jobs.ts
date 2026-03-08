export const jobsConfig = {
  name: "GoodABA Jobs",
  tagline: "Discover ABA therapy careers on GoodABA",
  description:
    "GoodABA Jobs is the fastest way to discover BCBA, RBT, and behavior technician positions from top ABA providers nationwide.",
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
    twitter: "https://twitter.com/goodaba",
    linkedin: "https://www.linkedin.com/company/goodaba",
  },
  contactEmail: "support@goodaba.com",
} as const;

export type JobsConfig = typeof jobsConfig;

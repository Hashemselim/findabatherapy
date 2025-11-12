export const planTiers = [
  {
    id: "free",
    name: "Free Listing",
    summary: "Core profile with contact details, services, and insurance information.",
    billing: "$0 / month",
    features: [
      "Searchable company profile",
      "State & service type indexing",
      "Logo, description, and contact info",
      "Do-follow backlink to your website",
    ],
    idealFor: "Agencies getting started with digital visibility or expanding into new markets.",
  },
  {
    id: "premium",
    name: "Premium Listing",
    summary: "Unlock multimedia, extended content, and lead generation enhancements.",
    billing: "Subscription (Monthly or Yearly)",
    features: [
      "Photo and video galleries",
      "Enhanced long-form description",
      "Call-to-action highlights",
      "Priority placement above free listings",
    ],
    idealFor:
      "Growing agencies who want to showcase their brand, differentiate services, and increase conversions.",
  },
  {
    id: "featured",
    name: "Featured Placement",
    summary: "Top-of-state placement plus banner rotations across directories and homepage.",
    billing: "Add-on to Free or Premium",
    features: [
      "Pinned to top of state search results",
      "Sponsored banner placements",
      "Auto-generated creative from your brand kit",
      "Monthly performance snapshots",
    ],
    idealFor: "Multi-location or high-growth agencies that need consistent visibility across regions.",
  },
] as const;

export type PlanTier = (typeof planTiers)[number];

export const featuredPartnerCategories = [
  {
    title: "Credentialing & Compliance",
    description: "Stay audit-ready with credentialing, licensing, and payer enrollment support.",
    partners: ["Therapist Compliance Co.", "ABA Credentialing Hub", "PayorFast"],
  },
  {
    title: "Billing & RCM",
    description: "Streamline claims, eligibility checks, and cash acceleration with ABA-focused RCM.",
    partners: ["RevLoop Health", "ClaimPath ABA", "LedgerBridge"],
  },
  {
    title: "Staffing & HR",
    description: "Hire and retain BCBA and RBT talent with tools for recruiting, onboarding, and payroll.",
    partners: ["TalentWave ABA", "BrightHire Clinical", "CareTeam HR"],
  },
  {
    title: "Family Engagement",
    description: "Boost satisfaction with scheduling, parent portals, and outcome tracking platforms.",
    partners: ["ConnectCare ABA", "FamilyPulse", "Journey Journals"],
  },
  {
    title: "Marketing & Growth",
    description: "Turn web traffic into booked assessments with marketing and sales automation.",
    partners: ["PipelineLift", "GrowthFoundry", "Beacon Digital ABA"],
  },
  {
    title: "Operations & Software",
    description: "Practice management suites, data collection apps, and workflow automation.",
    partners: ["ABA Suite One", "TheraFlow", "Spectrum Ops"],
  },
] as const;

export type FeaturedPartnerCategory = (typeof featuredPartnerCategories)[number];

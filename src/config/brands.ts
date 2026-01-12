export const brandsConfig = {
  // Parent brand - the unified platform
  parent: {
    name: "Behavior Work",
    tagline: "Your complete ABA practice management platform",
    description:
      "Behavior Work is the all-in-one platform for ABA providers to manage their practice, recruit talent, and connect with families.",
  },

  // Find ABA Therapy - connecting families with providers
  findABATherapy: {
    name: "Find ABA Therapy",
    tagline: "Discover trusted ABA therapy providers near you",
    color: "#5788FF", // Blue
    icon: "Heart", // Lucide icon name
    publicBasePath: "/provider",
    dashboardSection: "therapy",
  },

  // Find ABA Jobs - connecting providers with talent
  findABAJobs: {
    name: "Find ABA Jobs",
    tagline: "Discover ABA therapy careers near you",
    color: "#10B981", // Emerald
    icon: "Briefcase", // Lucide icon name
    publicBasePath: "/employers",
    dashboardSection: "jobs",
  },

  // Behavior Work CRM - team and client management (coming soon)
  behaviorWorkCRM: {
    name: "Team & CRM",
    tagline: "Manage your team and clients",
    color: "#8B5CF6", // Purple
    icon: "Users", // Lucide icon name
    isPlaceholder: true,
    dashboardSection: "crm",
  },
} as const;

// Brand color constants for easy access
export const brandColors = {
  therapy: "#5788FF",
  jobs: "#10B981",
  crm: "#8B5CF6",
  // Gradient for parent brand icon
  parentGradient: {
    from: "#5788FF",
    to: "#10B981",
  },
} as const;

export type BrandsConfig = typeof brandsConfig;
export type BrandColors = typeof brandColors;

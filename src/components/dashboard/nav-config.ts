/**
 * Single source of truth for all dashboard navigation.
 *
 * Consumed by:
 *   - DashboardSidebar   (desktop sidebar and mobile drawer — same component)
 *   - DashboardTopbar    (mobile quick-link slider)
 *
 * Any change here is automatically reflected everywhere.
 */

import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CheckSquare,
  CreditCard,
  FileInput,
  FileText,
  LayoutDashboard,
  Mail,
  MapPin,
  Palette,
  Settings,
  User,
  UserCheck,
  UserCircle,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NavItemConfig {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Show a live badge count (notifications, tasks, applicants) */
  showBadge?: boolean;
  /** Show "Pro" tag */
  proBadge?: boolean;
  /** Only match the exact path, not child routes */
  exactMatch?: boolean;
  /** Legacy route aliases for active-state matching */
  aliases?: string[];
  /** Include this item in the mobile quick-link slider */
  quickLink?: boolean;
}

export interface NavSectionConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  defaultOpen: boolean;
  items: NavItemConfig[];
}

// ---------------------------------------------------------------------------
// Persistent items (always visible above sections)
// ---------------------------------------------------------------------------

export const persistentItems: NavItemConfig[] = [
  {
    href: "/dashboard/notifications",
    label: "Notifications",
    icon: Bell,
    showBadge: true,
    quickLink: true,
    aliases: ["/dashboard/inbox", "/dashboard/client-growth/notifications"],
  },
  {
    href: "/dashboard/tasks",
    label: "Tasks",
    icon: CheckSquare,
    showBadge: true,
    quickLink: true,
    aliases: ["/dashboard/operations/tasks"],
  },
];

// ---------------------------------------------------------------------------
// Section-based navigation
// ---------------------------------------------------------------------------

export const sectionNav: NavSectionConfig[] = [
  {
    id: "clients",
    label: "Clients",
    icon: Users,
    defaultOpen: true,
    items: [
      {
        href: "/dashboard/clients/pipeline",
        label: "Pipeline",
        icon: LayoutDashboard,
        quickLink: true,
        aliases: ["/dashboard/client-growth"],
      },
      {
        href: "/dashboard/clients/leads",
        label: "Leads",
        icon: UserPlus,
        quickLink: true,
      },
      {
        href: "/dashboard/clients",
        label: "All Clients",
        icon: UserCircle,
        exactMatch: true,
        quickLink: true,
        aliases: ["/dashboard/operations/clients"],
      },
      {
        href: "/dashboard/clients/communications",
        label: "Communications",
        icon: Mail,
        proBadge: true,
      },
    ],
  },
  {
    id: "intake_pages",
    label: "Branded Pages",
    icon: FileInput,
    defaultOpen: false,
    items: [
      {
        href: "/dashboard/branded-pages",
        label: "All Pages",
        icon: FileText,
        aliases: [
          "/dashboard/forms",
          "/dashboard/intake-pages/intake-form",
          "/dashboard/intake-pages/contact-form",
          "/dashboard/intake-pages/resources",
          "/dashboard/intake-pages/branded-page",
          "/dashboard/operations/forms",
        ],
      },
      {
        href: "/dashboard/branding",
        label: "Brand Style",
        icon: Palette,
      },
    ],
  },
  {
    id: "team",
    label: "Team",
    icon: Briefcase,
    defaultOpen: false,
    items: [
      {
        href: "/dashboard/team/employees",
        label: "Employees",
        icon: Users,
        aliases: ["/dashboard/hiring/employees", "/dashboard/employees"],
      },
      {
        href: "/dashboard/team/jobs",
        label: "Jobs",
        icon: Briefcase,
        quickLink: true,
        aliases: ["/dashboard/hiring/jobs", "/dashboard/jobs"],
      },
      {
        href: "/dashboard/team/applicants",
        label: "Applicants",
        icon: UserCheck,
        showBadge: true,
        quickLink: true,
        aliases: ["/dashboard/hiring/applicants"],
      },
      {
        href: "/dashboard/team/careers",
        label: "Careers Page",
        icon: Building2,
        aliases: ["/dashboard/hiring/careers", "/dashboard/careers"],
      },
    ],
  },
  {
    id: "settings",
    label: "Company & Settings",
    icon: Settings,
    defaultOpen: false,
    items: [
      {
        href: "/dashboard/settings/profile",
        label: "Company Profile",
        icon: Building2,
        aliases: [
          "/dashboard/company",
          "/dashboard/intake-pages/directory",
          "/dashboard/client-growth/company",
        ],
      },
      {
        href: "/dashboard/settings/locations",
        label: "Locations",
        icon: MapPin,
        aliases: ["/dashboard/client-growth/locations", "/dashboard/locations"],
      },
      {
        href: "/dashboard/settings/analytics",
        label: "Analytics",
        icon: BarChart3,
        quickLink: true,
        aliases: ["/dashboard/client-growth/analytics", "/dashboard/analytics"],
      },
      {
        href: "/dashboard/settings/billing",
        label: "Billing",
        icon: CreditCard,
        aliases: ["/dashboard/billing"],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Onboarding item (shown when onboarding is incomplete)
// ---------------------------------------------------------------------------

export const onboardingNavItem: NavItemConfig = {
  href: "/dashboard/onboarding",
  label: "Onboarding",
  icon: User,
};

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

/** All nav items flattened (persistent + all section items). */
export function getAllNavItems(): NavItemConfig[] {
  return [
    ...persistentItems,
    ...sectionNav.flatMap((s) => s.items),
  ];
}

/**
 * Quick-link items for the mobile slider, preserving section grouping.
 * Returns an array of groups: persistent items first, then each section
 * that has at least one quickLink item.
 */
export interface QuickLinkGroup {
  /** null for persistent items, section id for section items */
  sectionId: string | null;
  sectionLabel: string | null;
  items: NavItemConfig[];
}

export function getQuickLinkGroups(): QuickLinkGroup[] {
  const groups: QuickLinkGroup[] = [];

  // Persistent quick links
  const persistentQL = persistentItems.filter((i) => i.quickLink);
  if (persistentQL.length > 0) {
    groups.push({ sectionId: null, sectionLabel: null, items: persistentQL });
  }

  // Section quick links
  for (const section of sectionNav) {
    const sectionQL = section.items.filter((i) => i.quickLink);
    if (sectionQL.length > 0) {
      groups.push({
        sectionId: section.id,
        sectionLabel: section.label,
        items: sectionQL,
      });
    }
  }

  return groups;
}

/** Flat list of all quick-link items (for simple iteration). */
export function getQuickLinkItems(): NavItemConfig[] {
  return getAllNavItems().filter((i) => i.quickLink);
}

// ---------------------------------------------------------------------------
// Shared active-state helper
// ---------------------------------------------------------------------------

export function isNavItemActive(
  item: NavItemConfig,
  pathname: string,
): boolean {
  if (!item.href.startsWith("/")) return false;
  const pathsToMatch = [item.href, ...(item.aliases ?? [])];
  return pathsToMatch.some((p) =>
    item.exactMatch
      ? pathname === p
      : pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Infer which section contains the currently active route.
 * Returns the section id, or null if the active route is a persistent item
 * or not found.
 */
export function inferActiveSectionFromPath(
  pathname: string,
): string | null {
  for (const section of sectionNav) {
    for (const item of section.items) {
      if (isNavItemActive(item, pathname)) return section.id;
    }
  }
  return null;
}

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
  BookOpen,
  Briefcase,
  Building2,
  CheckSquare,
  ClipboardList,
  CreditCard,
  FileInput,
  Globe,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageSquare,
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
// Main navigation items (flat, top-level — displayed in order)
// ---------------------------------------------------------------------------

export const mainNavItems: NavItemConfig[] = [
  {
    href: "/dashboard/clients/pipeline",
    label: "Dashboard",
    icon: LayoutDashboard,
    quickLink: true,
    aliases: ["/dashboard/client-growth"],
  },
  {
    href: "/dashboard/tasks",
    label: "Tasks",
    icon: CheckSquare,
    showBadge: true,
    quickLink: true,
    aliases: ["/dashboard/operations/tasks"],
  },
  {
    href: "/dashboard/notifications",
    label: "Notifications",
    icon: Bell,
    showBadge: true,
    quickLink: true,
    aliases: ["/dashboard/inbox", "/dashboard/client-growth/notifications"],
  },
  {
    href: "/dashboard/clients/leads",
    label: "Leads",
    icon: UserPlus,
    quickLink: true,
  },
  {
    href: "/dashboard/clients",
    label: "Clients",
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
];

// ---------------------------------------------------------------------------
// Legacy persistent items (kept for backwards compat)
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
// Section-based navigation (collapsible groups)
// ---------------------------------------------------------------------------

export const sectionNav: NavSectionConfig[] = [
  {
    id: "forms",
    label: "Forms",
    icon: FileInput,
    defaultOpen: false,
    items: [
      {
        href: "/dashboard/forms/contact",
        label: "Contact Form",
        icon: MessageSquare,
        aliases: [
          "/dashboard/branded-pages",
          "/dashboard/forms",
          "/dashboard/intake-pages/contact-form",
          "/dashboard/operations/forms",
        ],
      },
      {
        href: "/dashboard/forms/intake",
        label: "Intake Form",
        icon: ClipboardList,
        aliases: ["/dashboard/intake-pages/intake-form"],
      },
      {
        href: "/dashboard/forms/agency",
        label: "Agency Brochure",
        icon: Globe,
        aliases: ["/dashboard/intake-pages/branded-page"],
      },
      {
        href: "/dashboard/forms/resources",
        label: "Family Resources",
        icon: BookOpen,
        aliases: ["/dashboard/intake-pages/resources"],
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
    id: "company",
    label: "Company",
    icon: Building2,
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
        href: "/dashboard/settings",
        label: "Settings",
        icon: Settings,
        exactMatch: true,
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

/** All nav items flattened (main + all section items). */
export function getAllNavItems(): NavItemConfig[] {
  return [
    ...mainNavItems,
    ...sectionNav.flatMap((s) => s.items),
  ];
}

/**
 * Quick-link items for the mobile slider, preserving section grouping.
 * Returns an array of groups: main items first, then each section
 * that has at least one quickLink item.
 */
export interface QuickLinkGroup {
  /** null for main items, section id for section items */
  sectionId: string | null;
  sectionLabel: string | null;
  items: NavItemConfig[];
}

export function getQuickLinkGroups(): QuickLinkGroup[] {
  const groups: QuickLinkGroup[] = [];

  // Main quick links
  const mainQL = mainNavItems.filter((i) => i.quickLink);
  if (mainQL.length > 0) {
    groups.push({ sectionId: null, sectionLabel: null, items: mainQL });
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
 * Returns the section id, or null if the active route is a main item
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

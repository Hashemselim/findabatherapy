"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  Building2,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  Eye,
  FileText,
  GaugeCircle,
  Heart,
  HelpCircle,
  Image,
  Link2,
  LogOut,
  LucideIcon,
  Mail,
  MapPin,
  MessageSquare,
  User,
  UserCircle,
  UserPlus,
  Users,
  FileInput,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SupportContactDialog } from "@/components/support-contact-dialog";
import { NavSectionComponent, NavSection, NavItem } from "./nav-section";
import { brandColors } from "@/config/brands";
import { cn } from "@/lib/utils";
import { getUnreadInquiryCount } from "@/lib/actions/inquiries";
import { getNewApplicationCount } from "@/lib/actions/applications";
import { signOut } from "@/lib/auth/actions";
import { useNavCollapseState } from "@/hooks/use-nav-collapse-state";

export type { NavItem, NavSection };

// Company brand color (neutral slate)
const companyColor = "#64748B";

// Section-based dashboard navigation structure
const dashboardNavSections: NavSection[] = [
  {
    id: "overview",
    label: "",
    isCollapsible: false,
    items: [{ href: "/dashboard", label: "Dashboard", icon: GaugeCircle }],
  },
  {
    id: "company",
    label: "Company Details",
    icon: Building2,
    brandColor: companyColor,
    isCollapsible: true,
    defaultOpen: false,
    items: [
      { href: "/dashboard/company", label: "Company Profile", icon: FileText },
      { href: "/dashboard/locations", label: "Locations", icon: MapPin },
      { href: "/dashboard/media", label: "Media", icon: Image },
    ],
  },
  {
    id: "therapy",
    label: "Find ABA Therapy",
    icon: Heart,
    brandColor: brandColors.therapy,
    isCollapsible: true,
    defaultOpen: false,
    items: [
      { href: "/dashboard/inbox", label: "Inbox", icon: Mail, showBadge: true },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/intake", label: "Intake Form", icon: FileInput },
    ],
  },
  {
    id: "jobs",
    label: "Find ABA Jobs",
    icon: Briefcase,
    brandColor: brandColors.jobs,
    isCollapsible: true,
    defaultOpen: false,
    items: [
      { href: "/dashboard/jobs", label: "Job Postings", icon: Briefcase, exactMatch: true },
      { href: "/dashboard/jobs/applications", label: "Applications", icon: UserPlus, showBadge: true },
      { href: "/dashboard/jobs/careers", label: "Careers Page", icon: Link2 },
    ],
  },
  {
    id: "crm",
    label: "Team & CRM",
    icon: Users,
    brandColor: brandColors.crm,
    isCollapsible: true,
    defaultOpen: false,
    items: [
      { href: "/dashboard/clients", label: "Clients", icon: UserCircle },
      { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/dashboard/team", label: "Staff / Team", icon: Users, isPlaceholder: true },
    ],
  },
];

// Onboarding nav item shown when onboarding is incomplete
const onboardingNavItem: NavItem = {
  href: "/dashboard/onboarding",
  label: "Onboarding",
  icon: ClipboardList,
};

export interface CompanyProfile {
  name: string;
  logoUrl?: string | null;
  planTier: "free" | "pro" | "enterprise";
  subscriptionStatus?: string | null;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface DashboardSidebarProps {
  isOnboardingComplete: boolean;
  isDemo?: boolean;
  companyProfile?: CompanyProfile;
  /** User profile for the sidebar user dropdown */
  userProfile?: UserProfile;
  /** For demo mode: pass static unread count instead of fetching */
  staticUnreadCount?: number;
  /** For demo mode: pass custom nav items */
  customNavItems?: NavItem[];
  /** data-tour attribute for guided tour highlighting */
  dataTour?: string;
  /** Provider's listing slug for "View Profile" links */
  providerSlug?: string | null;
}

export function DashboardSidebar({
  isOnboardingComplete,
  isDemo = false,
  companyProfile,
  userProfile,
  staticUnreadCount,
  customNavItems,
  dataTour,
  providerSlug,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(staticUnreadCount ?? 0);
  const [newApplicationCount, setNewApplicationCount] = useState(0);

  // Smart collapse state for all collapsible sections (accordion behavior)
  const { isSectionOpen, toggleSection } = useNavCollapseState();

  useEffect(() => {
    // Skip fetching if static count is provided (demo mode)
    if (staticUnreadCount !== undefined) return;

    async function fetchCounts() {
      const [inquiryResult, applicationResult] = await Promise.all([
        getUnreadInquiryCount(),
        getNewApplicationCount(),
      ]);
      if (inquiryResult.success && inquiryResult.data) {
        setUnreadCount(inquiryResult.data);
      }
      if (applicationResult.success && applicationResult.data) {
        setNewApplicationCount(applicationResult.data);
      }
    }
    fetchCounts();
  }, [pathname, staticUnreadCount]); // Refetch when pathname changes

  const handleLogout = async () => {
    // Clear dev bypass cookie on client side
    document.cookie = "dev_bypass=; path=/; max-age=0";
    // Use server action for reliable logout
    await signOut();
  };

  // Helper function to get badge count for a nav item
  const getBadgeCount = (href: string): number => {
    if (href.includes("/applications")) return newApplicationCount;
    if (href.includes("/inbox")) return unreadCount;
    return 0;
  };

  // Helper to get total badge count for a section (for collapsed display)
  const getSectionBadgeCount = (sectionId: string): number => {
    const section = dashboardNavSections.find((s) => s.id === sectionId);
    if (!section) return 0;

    return section.items.reduce((total, item) => {
      if (item.showBadge) {
        return total + getBadgeCount(item.href);
      }
      return total;
    }, 0);
  };

  // Build navigation sections based on mode
  const getNavSections = (): NavSection[] => {
    // If custom nav items provided (demo mode), convert to single section
    if (customNavItems) {
      return [
        {
          id: "custom",
          label: "",
          isCollapsible: false,
          items: customNavItems,
        },
      ];
    }

    // Inject "View Profile" items when providerSlug is available
    const sectionsWithProfiles = providerSlug
      ? dashboardNavSections.map((section) => {
          if (section.id === "jobs") {
            return {
              ...section,
              items: [
                ...section.items,
                {
                  href: `/employers/${providerSlug}`,
                  label: "View Profile",
                  icon: Eye,
                  isExternal: true,
                },
              ],
            };
          }
          if (section.id === "therapy") {
            return {
              ...section,
              items: [
                ...section.items,
                {
                  href: `/provider/${providerSlug}`,
                  label: "View Profile",
                  icon: Eye,
                  isExternal: true,
                },
              ],
            };
          }
          return section;
        })
      : dashboardNavSections;

    // If onboarding incomplete, show onboarding item first
    if (!isOnboardingComplete) {
      return [
        {
          id: "onboarding",
          label: "",
          isCollapsible: false,
          items: [onboardingNavItem],
        },
        ...sectionsWithProfiles,
      ];
    }

    return sectionsWithProfiles;
  };

  const navSections = getNavSections();

  return (
    <aside
      data-tour={dataTour}
      className="flex h-full w-full flex-col justify-between overflow-y-auto rounded-2xl border border-border/60 bg-muted/30 p-4 shadow-sm"
    >
      <div className="space-y-4">
        {/* Company Profile Section */}
        {companyProfile && (
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/50 p-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border/60">
              {companyProfile.logoUrl ? (
                <NextImage
                  src={companyProfile.logoUrl}
                  alt={companyProfile.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#5788FF]/10 text-sm font-bold text-[#5788FF]">
                  {companyProfile.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {companyProfile.name}
              </p>
              <Badge variant="secondary" className="mt-0.5 text-xs">
                {(companyProfile.planTier === "pro" || companyProfile.planTier === "enterprise") &&
                (companyProfile.subscriptionStatus === "active" || companyProfile.subscriptionStatus === "trialing")
                  ? companyProfile.planTier === "enterprise" ? "Enterprise Plan" : "Pro Plan"
                  : "Free Plan"}
              </Badge>
            </div>
          </div>
        )}

        <nav className="space-y-2">
          {navSections.map((section) => {
            // Use controlled state for all collapsible sections
            const isControlled = section.isCollapsible;

            return (
              <NavSectionComponent
                key={section.id}
                section={section}
                pathname={pathname}
                getBadgeCount={getBadgeCount}
                sectionBadgeCount={getSectionBadgeCount(section.id)}
                isOnboardingComplete={isOnboardingComplete}
                isDemo={isDemo}
                // Controlled props for collapsible sections
                controlledOpen={isControlled ? isSectionOpen(section.id) : undefined}
                onToggle={isControlled ? () => toggleSection(section.id) : undefined}
              />
            );
          })}
        </nav>
      </div>

      <div className="border-t border-border/60 pt-4">
        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent"
            >
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted">
                {userProfile?.avatarUrl ? (
                  <NextImage
                    src={userProfile.avatarUrl}
                    alt={userProfile.name}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-medium text-muted-foreground">
                    {userProfile?.name
                      ?.split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || <User className="h-4 w-4" />}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {userProfile?.name || "Account"}
                </p>
                {userProfile?.email && (
                  <p className="truncate text-xs text-muted-foreground">
                    {userProfile.email}
                  </p>
                )}
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/account" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Account Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/billing" className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />
                Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <SupportContactDialog>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <HelpCircle className="mr-2 h-4 w-4" />
                Need Help?
              </DropdownMenuItem>
            </SupportContactDialog>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/feedback" className="cursor-pointer">
                <MessageSquare className="mr-2 h-4 w-4" />
                Send Feedback
              </Link>
            </DropdownMenuItem>
            {!isDemo && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {isDemo && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Demo mode - changes won&apos;t be saved
          </p>
        )}
      </div>
    </aside>
  );
}

"use client";

import { type PropsWithChildren } from "react";
import {
  BarChart3,
  FileText,
  GaugeCircle,
  Image as ImageIcon,
  Mail,
  MapPin,
} from "lucide-react";

import { DemoProvider } from "@/contexts/demo-context";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { type NavItem } from "@/components/dashboard/dashboard-sidebar";
import { DemoBanner } from "@/components/demo/demo-banner";
import { DemoTour } from "@/components/demo/demo-tour";
import { Toaster } from "@/components/ui/sonner";
import { DEMO_LISTING, DEMO_INQUIRIES } from "@/lib/demo/data";

// Demo navigation items (subset of dashboard nav - no billing/settings/onboarding)
const demoNavItems: NavItem[] = [
  { href: "/demo", label: "Overview", icon: GaugeCircle },
  { href: "/demo/company", label: "Company Details", icon: FileText },
  { href: "/demo/locations", label: "Locations", icon: MapPin },
  { href: "/demo/media", label: "Media", icon: ImageIcon },
  { href: "/demo/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/demo/inbox", label: "Contact Form Inbox", icon: Mail, showBadge: true },
];

// Calculate unread count from demo data
const unreadCount = DEMO_INQUIRIES.filter((i) => i.status === "unread").length;

// Build company profile from demo listing
const companyProfile = {
  name: DEMO_LISTING.profile.agencyName,
  logoUrl: DEMO_LISTING.logoUrl,
  planTier: DEMO_LISTING.profile.planTier as "free" | "pro",
};

export function DemoLayoutClient({ children }: PropsWithChildren) {
  return (
    <DemoProvider>
      <DashboardShell
        isOnboardingComplete={true}
        isDemo={true}
        demoBanner={<DemoBanner />}
        companyProfile={companyProfile}
        staticUnreadCount={unreadCount}
        customNavItems={demoNavItems}
        sidebarDataTour="sidebar"
      >
        {children}
      </DashboardShell>
      <DemoTour />
      <Toaster position="bottom-right" />
    </DemoProvider>
  );
}

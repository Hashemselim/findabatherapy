import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  Globe,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BrandedPageCard } from "@/components/dashboard/branded-page-card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { SharePageHeaderActions } from "@/components/dashboard/share-page-header-actions";
import { DashboardEmptyState, DashboardFeatureCard } from "@/components/dashboard/ui";
import { getProfile, createClient } from "@/lib/supabase/server";
import { getProviderWebsitePath } from "@/lib/utils/public-paths";

export default async function WebsitePage() {
  const profile = await getProfile();

  if (!profile?.onboarding_completed_at) {
    return <OnboardingGate />;
  }

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("slug")
    .eq("profile_id", profile.id)
    .single();

  const listingSlug = listing?.slug ?? null;

  if (!listingSlug) {
    return <NoListingState />;
  }

  const planTier = (profile as { plan_tier?: string }).plan_tier ?? "free";
  const websitePath = getProviderWebsitePath(listingSlug);

  return (
    <div className="space-y-3">
      <DashboardPageHeader
        title="Website"
        description="Your auto-generated provider website with all your agency info, services, and forms in one place."
      >
        <SharePageHeaderActions relativePath={websitePath} />
      </DashboardPageHeader>

      <BrandedPageCard
        title="Provider Website"
        sentence="A full website for your agency — automatically built from your profile, services, locations, and branding."
        relativePath={websitePath}
        iconName="website"
        showActions={false}
        defaultExpanded
        howItWorks={[
          "Your website is auto-generated from your dashboard data — no extra setup needed.",
          "It includes your services, locations, reviews, gallery, contact form, intake, careers, and resources.",
          "Share the link with families, referral partners, or use it as your agency's main website.",
        ]}
      />

      <CustomDomainCard planTier={planTier} />
    </div>
  );
}

function OnboardingGate() {
  return (
    <div className="space-y-3">
      <DashboardPageHeader
        title="Website"
        description="Your auto-generated provider website."
      />
      <DashboardEmptyState
        icon={ClipboardList}
        title="Complete Onboarding First"
        description="Finish setting up your practice profile to access your provider website."
        benefits={["Auto-generated site", "Branded design", "All-in-one link"]}
        tone="info"
        action={(
          <Button asChild size="lg">
            <Link href="/dashboard/onboarding" className="gap-2">
              Continue Onboarding
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      />
    </div>
  );
}

function NoListingState() {
  return (
    <div className="space-y-3">
      <DashboardPageHeader
        title="Website"
        description="Your auto-generated provider website."
      />
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Unable to load website</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Please complete your company profile setup to access your provider
            website.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/company">Go to Company Profile</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CustomDomainCard({ planTier }: { planTier: string }) {
  const isPaidPlan = planTier !== "free";

  if (!isPaidPlan) {
    return (
      <DashboardFeatureCard
        title="Custom Domain"
        description="Point your existing domain to your provider website for a fully branded experience."
        icon={Globe}
        badgeLabel="Pro"
        highlights={[
          {
            icon: Sparkles,
            title: "Upgrade benefit",
            description: "Use your own domain instead of a hosted listing URL.",
            tone: "premium",
          },
          {
            icon: Globe,
            title: "Branded experience",
            description: "Keep families on your own web address end to end.",
            tone: "info",
          },
        ]}
        bullets={[
          "Your own domain name",
          "Free SSL certificate",
          "No watermark on your site",
          "Professional appearance",
        ]}
        footer={<span className="font-medium text-foreground">Ready to use your own domain?</span>}
        action={(
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link href="/dashboard/billing">Upgrade Now</Link>
          </Button>
        )}
      />
    );
  }

  return (
    <DashboardFeatureCard
      title="Custom Domain"
      description="We handle domain configuration, DNS, and SSL so your provider website runs on your own branded address."
      icon={Globe}
      badgeLabel="Included"
      tone="info"
      highlights={[
        {
          icon: Globe,
          title: "Managed setup",
          description: "Tell us the domain and we will configure it for you.",
          tone: "info",
        },
        {
          icon: Sparkles,
          title: "Professional finish",
          description: "Deliver a seamless branded experience across your site.",
          tone: "premium",
        },
      ]}
      bullets={[
        "Full setup handled for you",
        "Free SSL certificate included",
        "DNS configuration included",
        "Professional branded experience",
      ]}
      footer="Ready to use your own domain?"
      action={(
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link href="/dashboard/feedback">Request Domain Setup</Link>
        </Button>
      )}
    />
  );
}

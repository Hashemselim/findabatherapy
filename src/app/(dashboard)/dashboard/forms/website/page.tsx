import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  Globe,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { BrandedPageCard } from "@/components/dashboard/branded-page-card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { getProfile, createClient } from "@/lib/supabase/server";

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

  return (
    <div className="space-y-3">
      <DashboardPageHeader
        title="Website"
        description="Your auto-generated provider website with all your agency info, services, and forms in one place."
      />

      <BrandedPageCard
        title="Provider Website"
        sentence="A full website for your agency — automatically built from your profile, services, locations, and branding."
        relativePath={`/site/${listingSlug}`}
        iconName="website"
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
      <Card className="overflow-hidden border-slate-200">
        <BubbleBackground
          interactive={false}
          size="default"
          className="bg-gradient-to-br from-white via-cyan-50/50 to-blue-50/50"
          colors={{
            first: "255,255,255",
            second: "180,235,245",
            third: "135,176,255",
            fourth: "200,240,248",
            fifth: "190,210,255",
            sixth: "240,248,255",
          }}
        >
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0891B2] shadow-lg shadow-[#0891B2]/25">
              <ClipboardList className="h-8 w-8 text-white" />
            </div>
            <p className="text-xl font-semibold text-slate-900">
              Complete Onboarding First
            </p>
            <p className="mt-3 max-w-md text-sm text-slate-600">
              Finish setting up your practice profile to access your provider
              website.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {["Auto-generated site", "Branded design", "All-in-one link"].map(
                (b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#0891B2]" />
                    {b}
                  </span>
                )
              )}
            </div>
            <Button asChild size="lg" className="mt-8">
              <Link href="/dashboard/onboarding" className="gap-2">
                Continue Onboarding
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </BubbleBackground>
      </Card>
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
      <div className="relative overflow-hidden rounded-xl border border-cyan-100 bg-gradient-to-br from-cyan-50/80 via-white to-slate-50 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(8,145,178,0.06),transparent_50%)]" />

        <div className="relative p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-900">
                  Custom Domain
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-medium text-cyan-700">
                  <Sparkles className="h-3 w-3" />
                  Pro
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                <span className="font-medium text-slate-800">
                  Use your own domain.
                </span>{" "}
                Point your existing domain (like www.youragency.com) to your
                provider website for a fully branded experience.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Your own domain name</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Free SSL certificate</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>No watermark on your site</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Professional appearance</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">
                Ready to use your own domain?
              </span>
            </p>
            <Button
              asChild
              size="sm"
              className="w-full shrink-0 rounded-full sm:w-auto"
            >
              <Link href="/dashboard/billing">Upgrade Now</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-border/60">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
            <Globe className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-slate-900">
              Custom Domain
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Want to use your own domain? We&apos;ll handle the entire setup
              for you — domain configuration, DNS, and SSL. Just tell us the
              domain you&apos;d like to use and we&apos;ll take care of the
              rest.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Full setup handled for you</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Free SSL certificate included</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>DNS configuration included</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Professional branded experience</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-lg bg-cyan-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-700">
            Ready to use your own domain?
          </p>
          <Button
            asChild
            size="sm"
            className="w-full shrink-0 sm:w-auto"
          >
            <Link href="/dashboard/feedback">Request Domain Setup</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

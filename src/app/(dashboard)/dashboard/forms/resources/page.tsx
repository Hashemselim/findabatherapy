import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { BrandedPageCard } from "@/components/dashboard/branded-page-card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { getProfile, createClient } from "@/lib/supabase/server";

export default async function FamilyResourcesPage() {
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

  return (
    <div className="space-y-3">
      <DashboardPageHeader title="Family Resources" description="Share one trusted page with FAQs, glossary terms, and parent guides." />

      <BrandedPageCard
        title="Client Resources"
        sentence="Share one trusted page with FAQs, glossary terms, and parent guides."
        relativePath={`/resources/${listingSlug}`}
        iconName="resources"
        defaultExpanded
        howItWorks={[
          "Share the link after inquiry or during onboarding.",
          "Families browse FAQs, terms, and educational guides.",
          "Your team spends less time repeating the same basics.",
        ]}
      />
    </div>
  );
}

function OnboardingGate() {
  return (
    <div className="space-y-3">
      <DashboardPageHeader title="Family Resources" description="Share one trusted page with FAQs, glossary terms, and parent guides." />
      <Card className="overflow-hidden border-slate-200">
        <BubbleBackground
          interactive={false}
          size="default"
          className="bg-gradient-to-br from-white via-yellow-50/50 to-blue-50/50"
          colors={{
            first: "255,255,255",
            second: "255,236,170",
            third: "135,176,255",
            fourth: "255,248,210",
            fifth: "190,210,255",
            sixth: "240,248,255",
          }}
        >
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5788FF] shadow-lg shadow-[#5788FF]/25">
              <ClipboardList className="h-8 w-8 text-white" />
            </div>
            <p className="text-xl font-semibold text-slate-900">Complete Onboarding First</p>
            <p className="mt-3 max-w-md text-sm text-slate-600">
              Finish setting up your practice profile to access your branded forms.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {["Shareable link", "Custom branding", "Lead capture"].map((b) => (
                <span key={b} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#5788FF]" />
                  {b}
                </span>
              ))}
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
      <DashboardPageHeader title="Family Resources" description="Share one trusted page with FAQs, glossary terms, and parent guides." />
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Unable to load form</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Please complete your company profile setup to access your branded forms.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/company">Go to Company Profile</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, FileText, Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { BrandedPageCard } from "@/components/dashboard/branded-page-card";
import { getProfile, createClient } from "@/lib/supabase/server";
import { getJobsByProvider } from "@/lib/queries/jobs";

export default async function IntakeFormPage() {
  const profile = await getProfile();

  // If onboarding is not complete, show the gate message
  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Done-for-you Branded Pages</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Share ready-made pages for inquiries, intake, hiring, and family education.
          </p>
        </div>

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
            <CardContent className="flex flex-col items-center py-12 px-6 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5788FF] shadow-lg shadow-[#5788FF]/25">
                <ClipboardList className="h-8 w-8 text-white" />
              </div>

              <h3 className="text-xl font-semibold text-slate-900">
                Complete Onboarding First
              </h3>

              <p className="mt-3 max-w-md text-sm text-slate-600">
                Finish setting up your practice profile to access your branded forms.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {["Shareable link", "Custom branding", "Lead capture"].map((benefit) => (
                  <span
                    key={benefit}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#5788FF]" />
                    {benefit}
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

  // Get listing slug and client intake enabled status
  const supabase = await createClient();
  const listingResult = await supabase
    .from("listings")
    .select("slug, client_intake_enabled")
    .eq("profile_id", profile.id)
    .single();

  const listingSlug = listingResult.data?.slug ?? null;
  const clientIntakeEnabled = listingResult.data?.client_intake_enabled ?? false;

  // If no listing slug, something went wrong
  if (!listingSlug) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Done-for-you Branded Pages</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Share ready-made pages for inquiries, intake, hiring, and family education.
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Unable to load forms</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Please complete your company profile setup to access your branded forms.
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard/company">
                Go to Company Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const jobs = await getJobsByProvider(listingSlug);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Done-for-you Branded Pages</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Share ready-made pages for inquiries, intake, hiring, and family education.
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="w-fit self-start sm:mt-1">
          <Link href="/dashboard/branding" className="items-center gap-2">
            <Palette className="h-4 w-4" />
            Edit Brand Style
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        <BrandedPageCard
          title="Client Contact Form"
          sentence="Capture new family inquiries with a fast, low-friction first step."
          relativePath={`/contact/${listingSlug}`}
          iconName="contact"
          howItWorks={[
            "A family opens your contact page and enters basic details.",
            "The inquiry is sent to your dashboard inbox and email notifications.",
            "Your team follows up and guides the family to next steps.",
          ]}
        />
        <BrandedPageCard
          title="Client Intake Form"
          sentence={clientIntakeEnabled
            ? "Collect complete parent, child, and insurance details before the first call."
            : "Enable this when you are ready to collect full onboarding details up front."}
          relativePath={`/intake/${listingSlug}/client`}
          iconName="intake"
          howItWorks={[
            "A family completes your detailed intake questionnaire.",
            "Information is organized for your team to review quickly.",
            "You can prioritize follow-up based on readiness and fit.",
          ]}
        />
        <BrandedPageCard
          title="Client Resources"
          sentence="Share one trusted page with FAQs, glossary terms, and parent guides."
          relativePath={`/resources/${listingSlug}`}
          iconName="resources"
          howItWorks={[
            "Share the link after inquiry or during onboarding.",
            "Families browse FAQs, terms, and educational guides.",
            "Your team spends less time repeating the same basics.",
          ]}
        />
        <BrandedPageCard
          title="Careers Page"
          sentence={`Publish one hiring destination for ${jobs.length} ${jobs.length === 1 ? "open role" : "open roles"} with direct applications.`}
          relativePath={`/careers/${listingSlug}`}
          iconName="careers"
          howItWorks={[
            "Candidates view all active roles on one page.",
            "They open a role and submit an application directly.",
            "Your team reviews applicants in your hiring workflow.",
          ]}
        />
      </div>

    </div>
  );
}

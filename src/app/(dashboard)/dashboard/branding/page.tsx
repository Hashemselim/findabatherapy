import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Palette } from "lucide-react";

import { BubbleBackground } from "@/components/ui/bubble-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IntakeFormSettings } from "@/components/dashboard/intake/intake-form-settings";
import { LogoUploader } from "@/components/dashboard/logo-uploader";
import { createClient, getProfile } from "@/lib/supabase/server";
import type { IntakeFormSettings as IntakeFormSettingsType } from "@/lib/actions/intake";

export default async function BrandingPage() {
  const profile = await getProfile();

  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Brand Style</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Set your logo and colors once for every page.
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
            <CardContent className="flex flex-col items-center px-6 py-12 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5788FF] shadow-lg shadow-[#5788FF]/25">
                <Palette className="h-8 w-8 text-white" />
              </div>

              <h3 className="text-xl font-semibold text-slate-900">Complete Onboarding First</h3>

              <p className="mt-3 max-w-md text-sm text-slate-600">
                Finish setting up your practice profile to configure your shared brand style.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {["One shared style", "Logo + colors", "All forms & pages"].map((benefit) => (
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

  const supabase = await createClient();
  const listingResult = await supabase
    .from("listings")
    .select("slug, logo_url")
    .eq("profile_id", profile.id)
    .single();

  const listingSlug = listingResult.data?.slug ?? null;
  const logoUrl = listingResult.data?.logo_url ?? null;

  if (!listingSlug) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Brand Style</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Set your logo and colors once for every page.
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Unable to load brand style settings</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Please complete your company profile setup to configure your forms and pages.
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard/company">Go to Company Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const defaultSettings: IntakeFormSettingsType = {
    background_color: "#5788FF",
    show_powered_by: true,
  };

  const intakeFormSettings = profile.intake_form_settings
    ? {
        ...defaultSettings,
        ...(profile.intake_form_settings as Partial<IntakeFormSettingsType>),
      }
    : defaultSettings;

  return (
    <div className="space-y-4 sm:space-y-6">
      <Button asChild size="sm" variant="ghost" className="w-fit -ml-2">
        <Link href="/dashboard/branded-pages" className="items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </Button>

      <div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Brand Style</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Set your logo and colors once for every page.
          </p>
        </div>
      </div>

      <Card className="border-border/60 bg-white">
        <CardHeader>
          <CardTitle className="text-foreground">Logo</CardTitle>
          <CardDescription>
            Update your logo here or in Company Details. Both screens edit the same logo. Recommended: 400x400px, max 2MB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUploader currentLogoUrl={logoUrl} hideHeader />
        </CardContent>
      </Card>

      <IntakeFormSettings
        listingSlug={listingSlug}
        settings={intakeFormSettings}
        previewLabel="All Forms & Pages"
      />
    </div>
  );
}

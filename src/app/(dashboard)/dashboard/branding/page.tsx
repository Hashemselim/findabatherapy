import Link from "next/link";
import { ArrowRight, FileText, Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardEmptyState } from "@/components/dashboard/ui";
import { IntakeFormSettings } from "@/components/dashboard/intake/intake-form-settings";
import { LogoUploader } from "@/components/dashboard/logo-uploader";
import { createClient, getProfile } from "@/lib/supabase/server";
import type { IntakeFormSettings as IntakeFormSettingsType } from "@/lib/actions/intake";

export default async function BrandingPage() {
  const profile = await getProfile();

  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader title="Brand Style" description="Set your logo and colors once for every page." />

        <DashboardEmptyState
          icon={Palette}
          title="Complete Onboarding First"
          description="Finish setting up your practice profile to configure your shared brand style."
          benefits={["One shared style", "Logo + colors", "All forms & pages"]}
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
      <div className="space-y-3">
        <DashboardPageHeader title="Brand Style" description="Set your logo and colors once for every page." />

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
    background_color: "#0866FF",
    show_powered_by: true,
  };

  const intakeFormSettings = profile.intake_form_settings
    ? {
        ...defaultSettings,
        ...(profile.intake_form_settings as Partial<IntakeFormSettingsType>),
      }
    : defaultSettings;

  return (
    <div className="space-y-3">
      <DashboardPageHeader title="Brand Style" description="Set your logo and colors once for every page." />

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

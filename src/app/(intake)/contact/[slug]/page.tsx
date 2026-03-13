import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Globe } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ContactFormIntake } from "@/components/contact/contact-form-intake";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { getContactPageData } from "@/lib/actions/intake";
import { getContrastingTextColor } from "@/lib/utils/brand-color";

type ContactPageParams = {
  slug: string;
};

type ContactPageProps = {
  params: Promise<ContactPageParams>;
  searchParams: Promise<{ ref?: string }>;
};

// Revalidate every 5 minutes (ISR)
export const revalidate = 300;

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getContactPageData(slug);

  if (!result.success || !result.data) {
    return {
      title: "Contact Form",
      robots: { index: false, follow: false },
    };
  }

  const { profile } = result.data;

  return {
    title: `Contact ${profile.agencyName} | Interest Form`,
    description: `Submit an inquiry to ${profile.agencyName}. Fill out the form and we'll be in touch shortly.`,
    robots: { index: false, follow: false }, // Private form, not for search
  };
}

// Helper to create a lighter shade of the brand color
function getLighterShade(hexColor: string, opacity: number = 0.1) {
  return `${hexColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
}

export default async function ContactPage({ params, searchParams }: ContactPageProps) {
  const { slug } = await params;
  const { ref } = await searchParams;
  const result = await getContactPageData(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const { listing, profile } = result.data;
  const isPreview =
    profile.planTier === "free" ||
    (profile.subscriptionStatus !== "active" &&
      profile.subscriptionStatus !== "trialing");
  const { background_color, show_powered_by } = profile.intakeFormSettings;
  const contrastColor = getContrastingTextColor(background_color);

  // Generate initials for avatar fallback
  const initials = profile.agencyName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${background_color} 0%, ${background_color}dd 50%, ${background_color}bb 100%)`,
      }}
    >
      {isPreview && (
        <PreviewBanner
          variant="public"
          message="This contact form is in preview mode. Activate your account to receive inquiries."
          triggerFeature="contact_form"
        />
      )}
      {/* Main Content Container */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* White Card Container */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
          {/* Header Section with tinted background */}
          <div
            className="px-6 py-8 text-center sm:px-8 sm:py-12"
            style={{ backgroundColor: getLighterShade(background_color, 0.08) }}
          >
            {/* Logo */}
            <div className="mx-auto mb-6">
              <Avatar
                className="mx-auto h-20 w-20 border-4 shadow-lg sm:h-24 sm:w-24"
                style={{ borderColor: background_color }}
              >
                {listing.logoUrl ? (
                  <AvatarImage src={listing.logoUrl} alt={profile.agencyName} />
                ) : null}
                <AvatarFallback
                  className="text-xl font-bold sm:text-2xl"
                  style={{ backgroundColor: getLighterShade(background_color, 0.15), color: background_color }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Company Name & Form Title */}
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                {profile.agencyName}
              </h1>

              {/* Divider */}
              <div
                className="mx-auto h-0.5 w-12 rounded-full"
                style={{ backgroundColor: getLighterShade(background_color, 0.3) }}
              />

              <h2 className="text-lg font-medium text-foreground">Contact Form</h2>
              <p className="mx-auto max-w-lg text-base text-muted-foreground sm:text-lg">
                We&apos;d love to hear from you. Fill out the form below and we&apos;ll be in touch shortly.
              </p>

              {/* Website Link */}
              {profile.website && (
                <div className="pt-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    style={{
                      borderColor: background_color,
                      color: "#111827",
                    }}
                  >
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gap-2"
                    >
                      <Globe className="h-4 w-4" />
                      Visit Website
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Form Section */}
          <div className={`px-6 py-8 sm:px-8 sm:py-10 ${isPreview ? "pointer-events-none select-none opacity-60" : ""}`}>
            <ContactFormIntake
              listingId={listing.id}
              providerName={profile.agencyName}
              websiteUrl={profile.website}
              initialReferralSource={ref === "findabatherapy" ? "findabatherapy" : undefined}
            />
          </div>

          {/* Footer - Branded like careers page */}
          <div
            className="px-6 py-4 sm:px-8"
            style={{ backgroundColor: getLighterShade(background_color, 0.05) }}
          >
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6 border border-border/60">
                  {listing.logoUrl ? (
                    <AvatarImage src={listing.logoUrl} alt={profile.agencyName} />
                  ) : null}
                  <AvatarFallback
                    className="text-[10px] font-semibold"
                    style={{ backgroundColor: getLighterShade(background_color, 0.15), color: background_color }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">
                  {profile.agencyName}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} {profile.agencyName}. All rights reserved.
              </p>
            </div>
          </div>
        </div>

        {/* Powered by badge - prominent for show_powered_by, subtle otherwise */}
        {show_powered_by ? (
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              style={{ color: background_color }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              Powered by Find ABA Therapy
            </Link>
          </div>
        ) : (
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-xs font-medium backdrop-blur-xs transition-colors hover:bg-white/30"
              style={{ color: contrastColor }}
            >
              Powered by Find ABA Therapy
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

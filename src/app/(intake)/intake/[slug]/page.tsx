import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { ProviderLogo } from "@/components/provider/provider-logo";
import { ContactFormIntake } from "@/components/contact/contact-form-intake";
import { getIntakePageData } from "@/lib/actions/intake";

type IntakePageParams = {
  slug: string;
};

type IntakePageProps = {
  params: Promise<IntakePageParams>;
};

// Revalidate every 5 minutes (ISR)
export const revalidate = 300;

export async function generateMetadata({ params }: IntakePageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getIntakePageData(slug);

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

export default async function IntakePage({ params }: IntakePageProps) {
  const { slug } = await params;
  const result = await getIntakePageData(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const { listing, profile } = result.data;
  const { background_color, show_powered_by } = profile.intakeFormSettings;

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4 sm:p-6"
      style={{
        backgroundColor: background_color,
        backgroundImage:
          "radial-gradient(ellipse at top, rgba(255,255,255,0.1), transparent)",
      }}
    >
      {/* Card with form */}
      <div
        className="w-full max-w-lg animate-fade-up rounded-2xl bg-white p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] sm:p-8"
        style={{
          animationDelay: "0ms",
          animationFillMode: "backwards",
        }}
      >
        {/* Header section */}
        <div className="mb-6 flex flex-col items-center text-center">
          {listing.logoUrl && (
            <ProviderLogo
              name={profile.agencyName}
              logoUrl={listing.logoUrl}
              size="lg"
              className="mb-4"
            />
          )}

          <h1 className="font-poppins text-2xl font-semibold text-foreground sm:text-3xl">
            {profile.agencyName}
          </h1>

          {/* Divider */}
          <div className="mx-auto my-4 h-px w-16 bg-border/50" />

          <h2 className="text-lg font-medium text-foreground">Interest Form</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            We&apos;d love to hear from you. Fill out the form below and we&apos;ll be in touch shortly.
          </p>
        </div>

        {/* Form */}
        <ContactFormIntake
          listingId={listing.id}
          providerName={profile.agencyName}
          websiteUrl={profile.website}
        />

        {/* Back to website link */}
        {profile.website && (
          <div className="mt-6 text-center">
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              <span className="transition-transform duration-200 group-hover:-translate-x-1">
                &larr;
              </span>
              Back to {profile.agencyName} website
            </a>
          </div>
        )}

        {/* Powered by footer */}
        {show_powered_by && (
          <>
            <div className="mx-auto my-6 h-px w-16 bg-border/50" />
            <p className="text-center text-xs text-muted-foreground">
              Powered by{" "}
              <Link
                href="/"
                className="underline-offset-2 hover:underline"
              >
                FindABATherapy
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

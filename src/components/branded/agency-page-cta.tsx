import Link from "next/link";
import { Mail, FileText, Phone, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AgencyPageCtaProps {
  slug: string;
  agencyName: string;
  isPremium: boolean;
  contactFormEnabled: boolean;
  contactEmail: string;
  contactPhone: string | null;
  referralSource?: string;
  brandColor?: string;
}

// Helper to create a lighter shade of the brand color
function getLighterShade(hexColor: string, opacity: number = 0.1) {
  return `${hexColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
}

export function AgencyPageCta({
  slug,
  agencyName,
  isPremium,
  contactFormEnabled,
  contactEmail,
  contactPhone,
  referralSource,
  brandColor = "#5788FF",
}: AgencyPageCtaProps) {
  const refParam = referralSource ? `?ref=${encodeURIComponent(referralSource)}` : "";
  return (
    <section>
      <div
        className="rounded-2xl border p-8 text-center sm:p-12"
        style={{
          background: `linear-gradient(135deg, ${getLighterShade(brandColor, 0.08)}, white, ${getLighterShade(brandColor, 0.04)})`,
          borderColor: getLighterShade(brandColor, 0.2),
        }}
      >
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
          Get Started
        </h2>
        <p className="mt-2 text-muted-foreground">
          {isPremium
            ? `Take the first step toward quality ABA therapy with ${agencyName}.`
            : `Reach out to ${agencyName} to learn more about our services.`}
        </p>

        {isPremium ? (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {contactFormEnabled && (
              <Button
                asChild
                size="lg"
                className="w-full rounded-full text-base sm:w-auto"
                style={{ backgroundColor: brandColor }}
              >
                <Link href={`/contact/${slug}${refParam}`}>
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Us
                </Link>
              </Button>
            )}
            <Button
              asChild
              size="lg"
              variant={contactFormEnabled ? "outline" : "default"}
              className="w-full rounded-full text-base sm:w-auto"
              style={contactFormEnabled ? { borderColor: brandColor, color: brandColor } : { backgroundColor: brandColor }}
            >
              <Link href={`/intake/${slug}/client${refParam}`}>
                <FileText className="mr-2 h-4 w-4" />
                Start Intake
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              {contactPhone && (
                <Button
                  asChild
                  size="lg"
                  className="w-full rounded-full text-base sm:w-auto"
                  style={{ backgroundColor: brandColor }}
                >
                  <a href={`tel:+1${contactPhone.replace(/\D/g, "")}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    {contactPhone}
                  </a>
                </Button>
              )}
              <Button
                asChild
                size="lg"
                variant={contactPhone ? "outline" : "default"}
                className="w-full rounded-full text-base sm:w-auto"
                style={contactPhone ? { borderColor: brandColor, color: brandColor } : { backgroundColor: brandColor }}
              >
                <a href={`mailto:${contactEmail}`}>
                  <Mail className="mr-2 h-4 w-4" />
                  {contactEmail}
                </a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              <Link
                href={`/provider/${slug}`}
                className="inline-flex items-center gap-1 hover:underline"
                style={{ color: brandColor }}
              >
                View our FindABATherapy listing
                <ArrowRight className="h-3 w-3" />
              </Link>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

import Link from "next/link";
import { Mail, Phone, Globe } from "lucide-react";

interface AgencyPageFooterProps {
  agencyName: string;
  slug: string;
  contactEmail: string;
  contactPhone: string | null;
  website: string | null;
}

export function AgencyPageFooter({
  agencyName,
  slug,
  contactEmail,
  contactPhone,
  website,
}: AgencyPageFooterProps) {
  return (
    <footer className="mt-16 border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
          {/* Agency info */}
          <div className="flex-1 space-y-3">
            <p className="font-semibold text-foreground">{agencyName}</p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground sm:justify-start">
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                {contactEmail}
              </a>
              {contactPhone && (
                <a
                  href={`tel:+1${contactPhone.replace(/\D/g, "")}`}
                  className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {contactPhone}
                </a>
              )}
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                </a>
              )}
            </div>
          </div>

          {/* Powered by */}
          <div className="text-center sm:text-right">
            <p className="text-xs text-muted-foreground">
              {agencyName} is a registered ABA therapy provider.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Powered by{" "}
              <Link
                href="https://behaviorwork.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#5788FF] hover:underline"
              >
                Behavior Work
              </Link>
              {" "}|{" "}
              <Link
                href={`/provider/${slug}`}
                className="text-[#5788FF] hover:underline"
              >
                View Directory Listing
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

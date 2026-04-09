import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, FileStack, Megaphone, Sparkles } from "lucide-react";

import { BrandedLogo } from "@/components/branded/branded-logo";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { getOnboardingData } from "@/lib/actions/onboarding";

type LivePreviewPageProps = {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{
    agencyName?: string;
    brandColor?: string;
    logoUrl?: string;
  }>;
};

function getLighterShade(hexColor: string, opacity: number = 0.1) {
  return `${hexColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
}

function SocialPreviewBody({ brandColor }: { brandColor: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          "Early intervention tips",
          "What families can expect",
          "Behind the scenes at your agency",
        ].map((title, index) => (
          <article
            key={title}
            className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm"
          >
            <div
              className="aspect-square"
              style={{
                background:
                  index === 1
                    ? `linear-gradient(135deg, ${brandColor} 0%, ${getLighterShade(
                        brandColor,
                        0.68,
                      )} 100%)`
                    : `linear-gradient(145deg, ${getLighterShade(
                        brandColor,
                        0.18,
                      )} 0%, rgba(255,255,255,0.98) 100%)`,
              }}
            />
            <div className="space-y-3 p-4">
              <span
                className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: getLighterShade(brandColor, 0.12),
                  color: brandColor,
                }}
              >
                Ready to post
              </span>
              <h2 className="text-base font-semibold text-slate-900">{title}</h2>
              <p className="text-sm leading-6 text-slate-600">
                Branded captions, imagery, and layouts sized for Instagram, Facebook,
                and stories.
              </p>
            </div>
          </article>
        ))}
      </div>

      <aside className="space-y-4">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarDays className="h-4 w-4" style={{ color: brandColor }} />
            Weekly Content Plan
          </div>
          <div className="mt-4 space-y-3">
            {["Monday: Parent tip", "Wednesday: Agency spotlight", "Friday: Therapist highlight"].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                >
                  {item}
                </div>
              ),
            )}
          </div>
        </div>

        <div
          className="rounded-3xl p-5 text-white shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${brandColor} 0%, ${getLighterShade(
              brandColor,
              0.74,
            )} 100%)`,
          }}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4" />
            Built to keep your brand active
          </div>
          <p className="mt-3 text-sm leading-6 text-white/88">
            Your upgraded plan turns these previews into a repeatable branded posting
            system your team can use right away.
          </p>
        </div>
      </aside>
    </div>
  );
}

function DocumentsPreviewBody({ brandColor }: { brandColor: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-3">
        {[
          {
            title: "Consent to Treat",
            subtitle: "Required before first appointment",
          },
          {
            title: "Insurance Assignment",
            subtitle: "Captures benefits and authorization details",
          },
          {
            title: "Telehealth Agreement",
            subtitle: "Preview of your secure digital signing flow",
          },
        ].map((document) => (
          <div
            key={document.title}
            className="rounded-3xl border border-slate-100 bg-white px-5 py-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{document.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{document.subtitle}</p>
              </div>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: getLighterShade(brandColor, 0.12),
                  color: brandColor,
                }}
              >
                Preview ready
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FileStack className="h-4 w-4" style={{ color: brandColor }} />
          Secure Upload Experience
        </div>
        <div className="mt-4 space-y-3">
          {["Diagnosis report", "Referral", "Insurance card", "Medical records"].map(
            (item) => (
              <div
                key={item}
                className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
              >
                {item}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export default async function OnboardingLivePreviewPage({
  params,
  searchParams,
}: LivePreviewPageProps) {
  noStore();
  const { kind } = await params;
  const query = await searchParams;
  if (kind !== "social" && kind !== "documents") {
    notFound();
  }

  const result = await getOnboardingData();
  const agencyName =
    query.agencyName ||
    (result.success ? result.data?.profile?.agencyName || "Your agency" : "Your agency");
  const logoUrl =
    query.logoUrl || (result.success ? result.data?.listing?.logoUrl || null : null);
  const brandColor =
    query.brandColor ||
    (result.success ? result.data?.profile?.brandColor || "#0866FF" : "#0866FF");
  const heading = kind === "social" ? "Social Media Toolkit" : "Agreement Forms";
  const intro =
    kind === "social"
      ? "A branded social content system designed to keep your agency visible and credible."
      : "A branded agreement and document experience families can trust from day one.";

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 50%, ${brandColor}bb 100%)`,
      }}
    >
      <PreviewBanner
        variant="public"
        message={
          kind === "social"
            ? "This social toolkit is in preview mode. Activate your account to publish and use it."
            : "This agreement page is in preview mode. Activate your account to collect documents and signatures."
        }
        triggerFeature={kind === "social" ? "social_posts" : "client_intake"}
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div
            className="px-6 py-8 text-center sm:px-8 sm:py-12"
            style={{ backgroundColor: getLighterShade(brandColor, 0.08) }}
          >
            <div className="mx-auto mb-6">
              <BrandedLogo
                logoUrl={logoUrl}
                agencyName={agencyName}
                brandColor={brandColor}
                variant="hero"
              />
            </div>

            <div className="space-y-3">
              <span
                className="mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
                style={{
                  backgroundColor: getLighterShade(brandColor, 0.15),
                  color: brandColor,
                }}
              >
                {kind === "social" ? <Megaphone className="h-4 w-4" /> : <FileStack className="h-4 w-4" />}
                Preview Mode
              </span>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                {heading} for {agencyName}
              </h1>
              <p className="mx-auto max-w-2xl text-base text-slate-600 sm:text-lg">
                {intro}
              </p>
            </div>
          </div>

          <div className="px-5 py-6 sm:px-8 sm:py-8">
            {kind === "social" ? (
              <SocialPreviewBody brandColor={brandColor} />
            ) : (
              <DocumentsPreviewBody brandColor={brandColor} />
            )}
          </div>

          <div
            className="px-6 py-4 text-slate-700 sm:px-8"
            style={{ backgroundColor: getLighterShade(brandColor, 0.05) }}
          >
            <div className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
              <div className="flex items-center gap-2">
                <BrandedLogo
                  logoUrl={logoUrl}
                  agencyName={agencyName}
                  brandColor={brandColor}
                  variant="footer"
                  className="mx-0"
                />
                <span className="text-sm font-medium">{agencyName}</span>
              </div>
              <Link
                href="/dashboard/onboarding/plan"
                className="text-sm font-semibold"
                style={{ color: brandColor }}
              >
                Go Pro to unlock this page →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

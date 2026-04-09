"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  getProviderBrochurePath,
  getProviderCareersPath,
  getProviderContactPath,
  getProviderDocumentUploadPath,
  getProviderIntakePath,
  getProviderResourcesPath,
} from "@/lib/utils/public-paths";
import { readOnboardingPreviewDraft } from "@/lib/onboarding/preview-session";
import { cn } from "@/lib/utils";

type PreviewKind =
  | "brochure"
  | "contact"
  | "intake"
  | "resources"
  | "careers"
  | "documents"
  | "social";

interface ToolkitBrandData {
  agencyName: string;
  headline: string | null;
  description: string | null;
  logoUrl: string | null;
  brandColor: string;
  contactEmail: string;
  contactPhone: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
}

interface ToolkitPreviewItem {
  id: PreviewKind;
  title: string;
  description: string;
  href: string | null;
  icon: LucideIcon;
  eyebrow: string;
}

interface BrandedToolkitGalleryProps {
  brandData: ToolkitBrandData;
  slug: string | null;
  continueHref: string;
  planHref: string;
}

/* ---------------- helpers ---------------- */

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return `rgba(8, 102, 255, ${alpha})`;
  }

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function lighten(hex: string, alpha: number): string {
  return hexToRgba(hex, alpha);
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

function wrapIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

function generatePreviewSlug(agencyName: string): string {
  return agencyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

function getOnboardingLivePreviewPath(
  kind: PreviewKind,
  options?: { agencyName?: string; brandColor?: string; logoUrl?: string | null },
): string {
  const params = new URLSearchParams();
  if (options?.agencyName) {
    params.set("agencyName", options.agencyName);
  }
  if (options?.brandColor) {
    params.set("brandColor", options.brandColor);
  }
  if (options?.logoUrl) {
    params.set("logoUrl", options.logoUrl);
  }
  const query = params.toString();
  return `/preview/onboarding/${kind}${query ? `?${query}` : ""}`;
}

/* ---------------- preview items ---------------- */

function getPreviewItems(
  slug: string | null,
  brandData?: Pick<ToolkitBrandData, "agencyName" | "brandColor" | "logoUrl">,
): ToolkitPreviewItem[] {
  return [
    {
      id: "brochure",
      title: "Your Agency Brochure",
      description:
        "A polished landing page that introduces your agency, services, and story to every family.",
      href: slug ? getProviderBrochurePath(slug) : null,
      icon: Sparkles,
      eyebrow: "Brand foundation",
    },
    {
      id: "contact",
      title: "Contact Form",
      description: "A branded inquiry form that turns visitors into real conversations.",
      href: slug ? getProviderContactPath(slug) : null,
      icon: Mail,
      eyebrow: "Lead capture",
    },
    {
      id: "intake",
      title: "Intake Form",
      description: "A structured intake flow that collects the right family details up front.",
      href: slug ? getProviderIntakePath(slug) : null,
      icon: ClipboardCheck,
      eyebrow: "Operations ready",
    },
    {
      id: "resources",
      title: "Parent Resources",
      description: "A branded content hub that builds trust before the first phone call.",
      href: slug ? getProviderResourcesPath(slug) : null,
      icon: Sparkles,
      eyebrow: "Trust builder",
    },
    {
      id: "careers",
      title: "Careers Page",
      description: "A branded hiring destination with open roles, culture, and application flow.",
      href: slug ? getProviderCareersPath(slug) : null,
      icon: Briefcase,
      eyebrow: "Hiring engine",
    },
    {
      id: "documents",
      title: "Agreement Forms",
      description: "A branded document hub for agreements, signatures, and onboarding paperwork.",
      href: slug ? getProviderDocumentUploadPath(slug) : null,
      icon: ClipboardCheck,
      eyebrow: "Client onboarding",
    },
    {
      id: "social",
      title: "Social Media",
      description: "A branded content set that makes your agency look active, modern, and trusted.",
      href: getOnboardingLivePreviewPath("social", brandData),
      icon: Megaphone,
      eyebrow: "Visibility boost",
    },
  ];
}

/* ---------------- mock skeleton pieces ---------------- */

function SkelLine({
  width = "100%",
  tone = "muted",
  className,
}: {
  width?: string;
  tone?: "muted" | "dark";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-1.5 rounded-full",
        tone === "dark" ? "bg-slate-300" : "bg-slate-200",
        className,
      )}
      style={{ width }}
    />
  );
}

function MockLogo({
  brandData,
  size = 48,
}: {
  brandData: ToolkitBrandData;
  size?: number;
}) {
  const initials = brandData.agencyName.slice(0, 2).toUpperCase();

  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
      style={{
        width: size,
        height: size,
        backgroundColor: hexToRgba(brandData.brandColor, 0.08),
      }}
    >
      {brandData.logoUrl ? (
        <Image
          src={brandData.logoUrl}
          alt={`${brandData.agencyName} logo`}
          width={size}
          height={size}
          className="h-full w-full object-contain p-1.5"
        />
      ) : (
        <span
          className="font-semibold tracking-tight text-slate-700"
          style={{ fontSize: Math.max(11, size * 0.33) }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

/**
 * Shared "branded page shell" mirroring the real public pages:
 *   full brand-gradient background → white rounded card → tinted hero header
 *   (logo centered, agency name, divider, subtitle, optional badge/location/website)
 *   → body slot → footer strip
 */
function BrandedPageMock({
  brandData,
  item,
  subtitle,
  bodySlot,
  showLocation = false,
  showWebsite = true,
  compact = false,
}: {
  brandData: ToolkitBrandData;
  item: ToolkitPreviewItem;
  subtitle: string;
  bodySlot: React.ReactNode;
  showLocation?: boolean;
  showWebsite?: boolean;
  compact?: boolean;
}) {
  const brand = brandData.brandColor;
  const tint08 = lighten(brand, 0.08);
  const tint15 = lighten(brand, 0.15);
  const tint05 = lighten(brand, 0.05);

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${brand} 0%, ${hexToRgba(brand, 0.87)} 50%, ${hexToRgba(brand, 0.74)} 100%)`,
      }}
    >
      {/* Inner rounded white card — mimics the max-w-4xl container */}
      <div className="mx-3 my-3 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_rgba(15,23,42,0.2)] sm:mx-4 sm:my-4">
        {/* Header block */}
        <div
          className={cn(
            "flex flex-col items-center px-4 text-center",
            compact ? "py-3" : "py-5",
          )}
          style={{ backgroundColor: tint08 }}
        >
          <MockLogo brandData={brandData} size={compact ? 38 : 46} />

          <h1
            className={cn(
              "mt-2 truncate font-bold tracking-tight text-slate-900",
              compact ? "text-[11px]" : "text-[13px]",
            )}
          >
            {item.id === "careers" ? `Careers at ${brandData.agencyName}` : brandData.agencyName}
          </h1>

          {/* divider */}
          <div
            className="mt-1.5 h-0.5 w-8 rounded-full"
            style={{ backgroundColor: lighten(brand, 0.3) }}
          />

          {/* subtitle / form title */}
          <div
            className={cn(
              "mt-1.5 font-semibold text-slate-700",
              compact ? "text-[9px]" : "text-[10px]",
            )}
          >
            {subtitle}
          </div>

          {/* verified badge + location + website strip */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[8px] font-semibold"
              style={{ backgroundColor: tint15, color: brand }}
            >
              <BadgeCheck className="h-2.5 w-2.5" />
              Verified Provider
            </span>
            {showLocation && brandData.city ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-[3px] text-[8px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                <MapPin className="h-2.5 w-2.5" />
                {brandData.city}
                {brandData.state ? `, ${brandData.state}` : ""}
              </span>
            ) : null}
            {showWebsite ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[8px] font-semibold"
                style={{ borderColor: brand, color: "#111827" }}
              >
                <Globe className="h-2.5 w-2.5" />
                Visit Website
              </span>
            ) : null}
          </div>
        </div>

        {/* Body */}
        <div className={cn("flex-1 px-4", compact ? "py-3" : "py-4")}>{bodySlot}</div>

        {/* Footer strip */}
        <div
          className="flex items-center justify-between gap-2 px-4 py-2"
          style={{ backgroundColor: tint05 }}
        >
          <div className="flex items-center gap-1.5">
            <MockLogo brandData={brandData} size={16} />
            <span className="max-w-[80px] truncate text-[8px] font-medium text-slate-600">
              {brandData.agencyName}
            </span>
          </div>
          <span className="text-[7px] text-slate-400">© Powered by GoodABA</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- per-page body variants ---------------- */

function BrochureBody({ brandData }: { brandData: ToolkitBrandData }) {
  const brand = brandData.brandColor;
  return (
    <div className="space-y-2.5">
      {/* Description lines */}
      <div className="space-y-1.5">
        <SkelLine width="95%" />
        <SkelLine width="88%" />
        <SkelLine width="72%" />
      </div>
      {/* Services row */}
      <div>
        <SkelLine tone="dark" width="32%" className="mb-1.5" />
        <div className="flex flex-wrap gap-1">
          {["In-home ABA", "Center-based", "Parent training", "Assessments"].map((s) => (
            <span
              key={s}
              className="rounded-full px-1.5 py-[3px] text-[8px] font-medium"
              style={{ backgroundColor: hexToRgba(brand, 0.12), color: "#111827" }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
      {/* Insurance row */}
      <div>
        <SkelLine tone="dark" width="28%" className="mb-1.5" />
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-5 w-10 rounded-md bg-slate-100"
            />
          ))}
        </div>
      </div>
      {/* CTA */}
      <div
        className="mt-1 flex h-7 items-center justify-center rounded-lg text-[10px] font-semibold text-white"
        style={{ backgroundColor: brand }}
      >
        Request an appointment
      </div>
    </div>
  );
}

function ContactBody({ brandData }: { brandData: ToolkitBrandData }) {
  const brand = brandData.brandColor;
  return (
    <div className="space-y-2">
      {["Parent name", "Email", "Phone"].map((label) => (
        <div key={label} className="space-y-0.5">
          <div className="text-[8px] font-medium text-slate-500">{label}</div>
          <div className="h-6 rounded-md border border-slate-200 bg-slate-50" />
        </div>
      ))}
      <div className="space-y-0.5">
        <div className="text-[8px] font-medium text-slate-500">Message</div>
        <div className="h-12 rounded-md border border-slate-200 bg-slate-50" />
      </div>
      <div
        className="flex h-7 items-center justify-center rounded-lg text-[10px] font-semibold text-white"
        style={{ backgroundColor: brand }}
      >
        Send message
      </div>
    </div>
  );
}

function IntakeBody({ brandData }: { brandData: ToolkitBrandData }) {
  const brand = brandData.brandColor;
  return (
    <div className="space-y-3">
      {/* stepper */}
      <div className="flex items-center gap-1">
        {["Family", "Clinical", "Insurance", "Done"].map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-1">
            <div
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[7px] font-semibold text-white"
              style={{ backgroundColor: i <= 1 ? brand : hexToRgba(brand, 0.25) }}
            >
              {i + 1}
            </div>
            {i < 3 ? (
              <div
                className="h-0.5 flex-1 rounded-full"
                style={{ backgroundColor: i === 0 ? brand : hexToRgba(brand, 0.2) }}
              />
            ) : null}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {["Parent", "Child name", "DOB", "Diagnosis"].map((f) => (
          <div key={f} className="space-y-0.5">
            <div className="text-[8px] font-medium text-slate-500">{f}</div>
            <div className="h-6 rounded-md border border-slate-200 bg-slate-50" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-medium text-slate-400">Step 2 of 4</span>
        <div
          className="flex h-6 items-center rounded-lg px-3 text-[9px] font-semibold text-white"
          style={{ backgroundColor: brand }}
        >
          Continue →
        </div>
      </div>
    </div>
  );
}

function ResourcesBody({ brandData }: { brandData: ToolkitBrandData }) {
  const brand = brandData.brandColor;
  return (
    <div className="space-y-2.5">
      {/* category pills */}
      <div className="flex gap-1">
        {["Guides", "FAQ", "Glossary", "Videos"].map((c, i) => (
          <span
            key={c}
            className="rounded-full px-1.5 py-[3px] text-[8px] font-medium"
            style={{
              backgroundColor: i === 0 ? hexToRgba(brand, 0.15) : "#f1f5f9",
              color: i === 0 ? brand : "#475569",
            }}
          >
            {c}
          </span>
        ))}
      </div>
      {/* article grid */}
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1">
            <div
              className="aspect-[4/3] rounded-lg"
              style={{ backgroundColor: hexToRgba(brand, 0.12 + i * 0.03) }}
            />
            <SkelLine tone="dark" width="92%" className="h-1" />
            <SkelLine width="70%" className="h-1" />
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <SkelLine width="96%" />
        <SkelLine width="80%" />
      </div>
    </div>
  );
}

function CareersBody({ brandData }: { brandData: ToolkitBrandData }) {
  const brand = brandData.brandColor;
  return (
    <div className="space-y-2">
      <div className="mb-1 flex items-center gap-1.5">
        <div
          className="flex h-5 w-5 items-center justify-center rounded-full"
          style={{ backgroundColor: hexToRgba(brand, 0.15), color: brand }}
        >
          <Briefcase className="h-3 w-3" />
        </div>
        <span className="text-[10px] font-bold text-slate-900">Open Positions</span>
        <span className="text-[9px] font-medium text-slate-400">(4)</span>
      </div>
      {[
        { title: "BCBA Clinical Supervisor", meta: "Full-time · Remote-friendly" },
        { title: "RBT / Behavior Technician", meta: "Full-time · On-site" },
        { title: "Center Director", meta: "Leadership · On-site" },
      ].map((job) => (
        <div
          key={job.title}
          className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2"
        >
          <div className="min-w-0">
            <div className="truncate text-[10px] font-semibold text-slate-800">{job.title}</div>
            <div className="truncate text-[8px] text-slate-500">{job.meta}</div>
          </div>
          <div
            className="shrink-0 rounded-full px-2 py-0.5 text-[8px] font-semibold text-white"
            style={{ backgroundColor: brand }}
          >
            Apply
          </div>
        </div>
      ))}
    </div>
  );
}

function DocumentsBody({ brandData }: { brandData: ToolkitBrandData }) {
  const brand = brandData.brandColor;
  return (
    <div className="space-y-2.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-900">Welcome Packet</span>
        <span
          className="rounded-full px-2 py-0.5 text-[8px] font-semibold text-white"
          style={{ backgroundColor: brand }}
        >
          Ready
        </span>
      </div>
      {["Consent to Treat", "Insurance Assignment", "Telehealth Agreement"].map((title, index) => (
        <div
          key={title}
          className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2"
        >
          <div className="min-w-0">
            <div className="truncate text-[10px] font-semibold text-slate-800">{title}</div>
            <div className="truncate text-[8px] text-slate-500">
              {index === 0 ? "Required before first session" : "Secure e-signature enabled"}
            </div>
          </div>
          <div
            className="shrink-0 rounded-full px-2 py-0.5 text-[8px] font-semibold"
            style={{ backgroundColor: hexToRgba(brand, 0.12), color: brand }}
          >
            Review
          </div>
        </div>
      ))}
    </div>
  );
}

function SocialBody({ brandData }: { brandData: ToolkitBrandData }) {
  const brand = brandData.brandColor;
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/80"
          >
            <div
              className="aspect-square"
              style={{
                background:
                  index === 0
                    ? `linear-gradient(135deg, ${hexToRgba(brand, 0.18)} 0%, rgba(255,255,255,0.92) 100%)`
                    : `linear-gradient(145deg, ${brand} 0%, ${hexToRgba(brand, 0.7)} 100%)`,
              }}
            />
            <div className="space-y-1 px-2 py-2">
              <SkelLine tone="dark" width="84%" className="h-1" />
              <SkelLine width="64%" className="h-1" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-2.5 py-2">
        <div className="min-w-0">
          <div className="truncate text-[10px] font-semibold text-slate-800">
            Weekly branded post pack
          </div>
          <div className="truncate text-[8px] text-slate-500">
            Sized for Instagram, Facebook, and stories
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[8px] font-semibold text-white"
          style={{ backgroundColor: brand }}
        >
          Ready
        </span>
      </div>
    </div>
  );
}

function PageBody({
  item,
  brandData,
}: {
  item: ToolkitPreviewItem;
  brandData: ToolkitBrandData;
}) {
  switch (item.id) {
    case "brochure":
      return <BrochureBody brandData={brandData} />;
    case "contact":
      return <ContactBody brandData={brandData} />;
    case "intake":
      return <IntakeBody brandData={brandData} />;
    case "resources":
      return <ResourcesBody brandData={brandData} />;
    case "careers":
      return <CareersBody brandData={brandData} />;
    case "documents":
      return <DocumentsBody brandData={brandData} />;
    case "social":
      return <SocialBody brandData={brandData} />;
  }
}

/* ---------------- card wrapper (gallery card: mock top + label drawer bottom) ---------------- */

function PreviewCard({
  item,
  brandData,
  isActive = false,
  onSeeItLive,
}: {
  item: ToolkitPreviewItem;
  brandData: ToolkitBrandData;
  isActive?: boolean;
  onSeeItLive?: () => void;
}) {
  const subtitle =
    item.id === "contact"
      ? "Contact Form"
      : item.id === "intake"
        ? "New Client Intake"
        : item.id === "resources"
          ? "Parent Resources"
          : item.id === "careers"
            ? "Join Our Team"
            : item.id === "documents"
              ? "Agreement Forms"
            : item.id === "social"
              ? "Social Media Posts"
            : brandData.headline || "Compassionate ABA therapy for your family";

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[26px] bg-white shadow-[0_40px_80px_-30px_rgba(15,23,42,0.4),0_18px_36px_-18px_rgba(15,23,42,0.22)] ring-1 ring-black/5">
      {/* Top — page mock (the "image" of the gallery card) */}
      <div className="relative h-[176px] shrink-0 overflow-hidden sm:h-[228px] lg:h-[244px]">
        <BrandedPageMock
          brandData={brandData}
          item={item}
          subtitle={subtitle}
          showLocation={item.id === "brochure" || item.id === "careers"}
          showWebsite={item.id !== "intake" && item.id !== "contact" && item.id !== "documents"}
          compact
          bodySlot={<PageBody item={item} brandData={brandData} />}
        />
      </div>

      {/* Bottom — label / heading / description / action */}
      <div className="flex flex-1 flex-col items-start gap-2.5 bg-white px-4 pb-8 pt-4 sm:px-5 sm:pb-6 sm:pt-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
          <item.icon className="h-3 w-3" style={{ color: brandData.brandColor }} />
          {item.eyebrow}
        </span>
        <h2 className="mt-0.5 text-balance text-[1.1rem] font-bold tracking-tight text-slate-950 sm:text-[1.6rem] lg:text-2xl">
          {item.title}
        </h2>
        <p className="text-pretty text-[12px] leading-snug text-slate-600 sm:text-[13px]">
          {item.description}
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isActive) onSeeItLive?.();
          }}
          tabIndex={isActive ? 0 : -1}
          className="mt-auto w-full self-stretch rounded-[18px] px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-[0_14px_28px_-14px_rgba(15,23,42,0.55)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            backgroundColor: brandData.brandColor,
          }}
        >
          See it live →
        </button>
      </div>
    </div>
  );
}

/* ---------------- modal with iframe ---------------- */

function PreviewModal({
  item,
  brandData,
  open,
  onOpenChange,
  onPrevious,
  onNext,
}: {
  item: ToolkitPreviewItem;
  brandData: ToolkitBrandData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    if (open) setIframeLoaded(false);
  }, [open, item.id]);

  const body = (
    <div className="flex h-full w-full flex-col bg-slate-950">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevious}
            aria-label="Show previous preview"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/96 text-slate-900 shadow-[0_12px_32px_rgba(15,23,42,0.4)] ring-1 ring-black/5 transition hover:scale-[1.06] hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Show next preview"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/96 text-slate-900 shadow-[0_12px_32px_rgba(15,23,42,0.4)] ring-1 ring-black/5 transition hover:scale-[1.06] hover:bg-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="min-w-0 flex-1 px-2 text-center">
          <div className="truncate text-sm font-semibold text-white">{item.title}</div>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close preview"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-900 shadow-[0_12px_32px_rgba(15,23,42,0.4)] ring-1 ring-black/5 transition hover:scale-[1.06] hover:bg-slate-50"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        {item.href ? (
          <>
            {!iframeLoaded ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-white/60" />
              </div>
            ) : null}
            <iframe
              key={item.id}
              title={`${item.title} live preview`}
              src={item.href}
              className="h-full w-full border-0 bg-white"
              onLoad={() => setIframeLoaded(true)}
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white">
            <div className="mx-auto w-full max-w-[560px] px-4">
              <div className="h-[70vh] overflow-hidden">
                <PreviewCard item={item} brandData={brandData} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="h-[94vh] w-[calc(100vw-3rem)] max-w-none gap-0 overflow-hidden border-0 bg-slate-950 p-0 shadow-2xl sm:max-w-[1360px]"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">{item.title} preview</DialogTitle>
          <DialogDescription className="sr-only">
            Interactive preview of {item.title}.
          </DialogDescription>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="inset-0 h-[100dvh] gap-0 rounded-none border-0 bg-slate-950 p-0"
        showCloseButton={false}
      >
        <SheetTitle className="sr-only">{item.title} preview</SheetTitle>
        <SheetDescription className="sr-only">
          Interactive preview of {item.title}.
        </SheetDescription>
        {body}
      </SheetContent>
    </Sheet>
  );
}

/* ---------------- main gallery ---------------- */

export function BrandedToolkitGallery({
  brandData,
  slug,
  continueHref,
  planHref,
}: BrandedToolkitGalleryProps) {
  const router = useRouter();
  const [resolvedBrandData, setResolvedBrandData] = useState(brandData);
  const [resolvedSlug, setResolvedSlug] = useState(slug);
  const previewItems = useMemo(
    () =>
      getPreviewItems(resolvedSlug, {
        agencyName: resolvedBrandData.agencyName,
        brandColor: resolvedBrandData.brandColor,
        logoUrl: resolvedBrandData.logoUrl,
      }),
    [resolvedBrandData.agencyName, resolvedBrandData.brandColor, resolvedBrandData.logoUrl, resolvedSlug],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [throwingId, setThrowingId] = useState<string | null>(null);
  const throwTimerRef = useRef<number | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const displayBrandData = resolvedBrandData;

  useEffect(() => {
    const draft = readOnboardingPreviewDraft();
    const draftAgencyName = draft?.agencyName?.trim();
    setResolvedBrandData({
      ...brandData,
      agencyName: draftAgencyName || brandData.agencyName,
      headline: draft?.headline ?? brandData.headline,
      description: draft?.description ?? brandData.description,
      logoUrl: draft?.logoUrl ?? brandData.logoUrl,
      brandColor: draft?.brandColor || brandData.brandColor,
      contactEmail: draft?.contactEmail || brandData.contactEmail,
      contactPhone: draft?.contactPhone ?? brandData.contactPhone,
      website: draft?.website ?? brandData.website,
      city: draft?.city || brandData.city,
      state: draft?.state || brandData.state,
    });
    setResolvedSlug(
      draft?.slug ||
        slug ||
        (draftAgencyName ? generatePreviewSlug(draftAgencyName) : null),
    );
  }, [brandData, slug]);

  const activeItem = previewItems[activeIndex];

  // Advance to a new index AND mark the outgoing card as "throwing" in the
  // same state batch so the outgoing card stays mounted for its slide-out animation.
  const goToIndex = (nextIndex: number) => {
    const target = wrapIndex(nextIndex, previewItems.length);
    if (target === activeIndex) return;
    const outgoing = previewItems[activeIndex];
    if (outgoing) {
      setThrowingId(outgoing.id);
      if (throwTimerRef.current) window.clearTimeout(throwTimerRef.current);
      throwTimerRef.current = window.setTimeout(() => {
        setThrowingId(null);
      }, 780);
    }
    setActiveIndex(target);
  };
  const handleNext = () => goToIndex(activeIndex + 1);
  const handlePrevious = () => goToIndex(activeIndex - 1);

  useEffect(() => {
    return () => {
      if (throwTimerRef.current) window.clearTimeout(throwTimerRef.current);
    };
  }, []);

  // Auto-cycle every 4.5s
  useEffect(() => {
    if (dialogOpen || isHovered || isTouching || prefersReducedMotion) return;
    const timer = window.setTimeout(() => {
      goToIndex(activeIndex + 1);
    }, 4500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, dialogOpen, isHovered, isTouching, prefersReducedMotion]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartRef.current = event.touches[0]?.clientX ?? null;
    setIsTouching(true);
  };
  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const touchEnd = event.changedTouches[0]?.clientX ?? null;
    const touchStart = touchStartRef.current;
    touchStartRef.current = null;
    setIsTouching(false);
    if (touchStart === null || touchEnd === null) return;
    const delta = touchEnd - touchStart;
    if (Math.abs(delta) < 48) return;
    if (delta > 0) handlePrevious();
    else handleNext();
  };

  const visibleDepth = 3; // active + 3 behind

  return (
    <div className="relative -my-4 flex min-h-[calc(100svh-5.5rem)] flex-col gap-2 overflow-visible sm:-my-8 sm:h-[calc(100svh-7rem)] sm:gap-3 sm:overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute left-1/2 top-[38%] h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ backgroundColor: hexToRgba(displayBrandData.brandColor, 0.14) }}
        />
        <div className="absolute left-[12%] top-[80%] h-48 w-48 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute right-[10%] top-[6%] h-44 w-44 rounded-full bg-sky-200/50 blur-3xl" />
      </div>

      {/* === HEADER (hero copy about the toolkit) === */}
      <div className="flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-medium tracking-wide text-emerald-700">
            Step 5 of 7 · Your branded toolkit
          </span>
        </div>

        <h1 className="mt-1.5 max-w-3xl text-balance text-[1.5rem] font-semibold tracking-tight text-slate-950 sm:mt-2 sm:text-[1.875rem] lg:text-[2.25rem] lg:leading-[1.1]">
          Your branded toolkit is ready.
        </h1>

        <div
          className="mt-1 inline-flex max-w-[92vw] items-center justify-center rounded-full px-3 py-1.5 text-center text-[11px] font-semibold sm:mt-1.5 sm:max-w-none sm:text-sm"
          style={{
            backgroundColor: hexToRgba(displayBrandData.brandColor, 0.1),
            color: displayBrandData.brandColor,
          }}
        >
          <span className="line-clamp-2 break-words sm:line-clamp-1">
            Built for {displayBrandData.agencyName}
          </span>
        </div>

        <p className="mt-1 max-w-xl text-pretty text-[11px] leading-snug text-slate-600 sm:mt-1.5 sm:text-sm">
          Branded pages, forms, and onboarding tools are already styled with your colors.
          Tap any card to see it in action.
        </p>
      </div>

      {/* === CARD STAGE (full gallery cards: mock + label) === */}
      <div
        className="relative mx-auto flex flex-1 flex-col items-center justify-center pt-2.5 sm:pt-4"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className="relative h-[372px] w-[min(88vw,320px)] sm:h-[428px] sm:w-[358px] lg:h-[448px] lg:w-[398px]"
          style={{ perspective: "1800px", perspectiveOrigin: "50% 40%" }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {previewItems.map((item, index) => {
            // depth: 0 = active (front), 1,2,3 = behind
            const raw = wrapIndex(index - activeIndex, previewItems.length);
            const depth =
              raw > previewItems.length / 2 ? raw - previewItems.length : raw;

            const isThrowing = item.id === throwingId;
            // We still render the throwing card even though its new depth
            // is outside visible range — the keyframes carry it off-screen.
            if (!isThrowing && (depth < 0 || depth > visibleDepth)) return null;

            const isActive = depth === 0;

            // Back cards fan UPWARD (negative y) so they peek above the active card.
            const safeDepth = Math.max(0, Math.min(visibleDepth, depth));
            const finalScale = 1 - safeDepth * 0.055;
            const finalY = -safeDepth * 26;
            const finalZ = -safeDepth * 80;
            const finalOpacity = safeDepth === 0 ? 1 : Math.max(0.4, 0.9 - (safeDepth - 1) * 0.2);

            // Dramatic "throw to back" target: slide LEFT off-screen, rotate, fade.
            // Other cards spring-promote forward to fill the gap.
            const throwTarget = {
              x: -680,
              y: 28,
              scale: 0.86,
              rotateZ: -12,
              rotateY: 20,
              z: 80,
              opacity: 0,
            };
            const normalTarget = {
              x: 0,
              y: finalY,
              scale: finalScale,
              rotateZ: 0,
              rotateY: 0,
              z: finalZ,
              opacity: finalOpacity,
            };

            return (
              <motion.div
                key={item.id}
                className="absolute inset-x-0 top-0 mx-auto h-full w-full"
                style={{
                  transformStyle: "preserve-3d",
                  zIndex: isThrowing ? 60 : 50 - safeDepth,
                  pointerEvents: isActive && !isThrowing ? "auto" : "none",
                }}
                initial={
                  isThrowing
                    ? {
                        x: 0,
                        y: 0,
                        scale: 1,
                        rotateZ: 0,
                        rotateY: 0,
                        z: 0,
                        opacity: 1,
                      }
                    : false
                }
                animate={isThrowing ? throwTarget : normalTarget}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : isThrowing
                      ? {
                          duration: 0.78,
                          ease: [0.55, 0.05, 0.3, 1],
                        }
                      : { type: "spring", stiffness: 220, damping: 28, mass: 0.9 }
                }
              >
                <div
                  role={isActive && !isThrowing ? "button" : undefined}
                  tabIndex={isActive && !isThrowing ? 0 : -1}
                  onClick={
                    isActive && !isThrowing
                      ? () => setDialogOpen(true)
                      : undefined
                  }
                  onKeyDown={
                    isActive && !isThrowing
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setDialogOpen(true);
                          }
                        }
                      : undefined
                  }
                  aria-label={
                    isActive ? `Open ${item.title} preview` : undefined
                  }
                  className={cn(
                    "h-full w-full rounded-[26px] outline-none",
                    isActive &&
                      !isThrowing &&
                      "cursor-pointer focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                  )}
                  style={
                    {
                      ["--tw-ring-color" as string]: hexToRgba(displayBrandData.brandColor, 0.4),
                    } as React.CSSProperties
                  }
                >
                  <PreviewCard
                    item={item}
                    brandData={displayBrandData}
                    isActive={isActive && !isThrowing}
                    onSeeItLive={() => setDialogOpen(true)}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* === CONTROLS + FOOTER === */}
      <div className="mt-auto flex flex-col items-center gap-1.5 pb-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrevious}
            aria-label="Show previous preview"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:scale-105 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            {previewItems.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goToIndex(index)}
                  aria-label={`Go to ${item.title}`}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    isActive ? "w-7" : "w-2 bg-slate-300 hover:bg-slate-400",
                  )}
                  style={isActive ? { backgroundColor: displayBrandData.brandColor } : undefined}
                />
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Show next preview"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:scale-105 hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div
          className="flex w-full max-w-3xl flex-col items-center gap-2 rounded-2xl border border-slate-200/80 px-4 py-2 shadow-[0_16px_50px_-24px_rgba(15,23,42,0.3)] sm:flex-row sm:justify-between sm:px-5 sm:py-3"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba(displayBrandData.brandColor, 0.08)} 0%, rgba(255,250,240,0.95) 60%, rgba(255,255,255,0.98) 100%)`,
          }}
        >
          <div className="flex items-center gap-2 text-center sm:text-left">
            <Sparkles className="h-4 w-4 shrink-0 text-slate-500" />
            <p className="text-[11px] font-medium text-slate-700 sm:text-[13px]">
              Go Pro to publish everything instantly.
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              type="button"
              size="sm"
              className="h-8 flex-1 rounded-full px-4 text-[11.5px] font-semibold sm:h-9 sm:flex-none sm:text-[12px]"
              onClick={() => router.push(planHref)}
            >
              Go Pro
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline-solid"
              className="h-8 flex-1 rounded-full px-4 text-[11.5px] font-semibold sm:h-9 sm:flex-none sm:text-[12px]"
              onClick={() => router.push(continueHref)}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>

        <PreviewModal
          item={activeItem}
          brandData={displayBrandData}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onPrevious={handlePrevious}
          onNext={handleNext}
        />
    </div>
  );
}

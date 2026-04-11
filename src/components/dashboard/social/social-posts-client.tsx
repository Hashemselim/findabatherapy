"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  CalendarDays,
  Copy,
  Download,
  Check,
  ImageIcon,
  Lock,
  Loader2,
  X,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardCard } from "@/components/dashboard/ui";
import {
  type SocialTemplate,
  type SocialCategory,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from "@/lib/social/types";
import { generateSocialAssets, getSocialAssetUrls } from "@/lib/actions/social";

interface UpcomingTemplate extends SocialTemplate {
  daysUntil: number;
  /** ISO string — serialized from server */
  nextOccurrence: string;
}

interface SocialPostsClientProps {
  templates: SocialTemplate[];
  upcoming: UpcomingTemplate[];
  assetsReady: boolean;
  alreadyGenerating?: boolean;
  assetUrls?: Record<string, string>;
  previewMode?: boolean;
  previewAgencyName?: string;
}

const FILTER_CATEGORIES: { value: SocialCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "aba_tip", label: "ABA Tips" },
  { value: "quote", label: "Quotes" },
  { value: "aba_observance", label: "ABA Observances" },
  { value: "autism_observance", label: "Autism" },
  { value: "national_holiday", label: "Holidays" },
  { value: "seasonal", label: "Seasonal" },
  { value: "announcement", label: "Announcements" },
];

// ---------- Image with loading state ----------

function ImageWithLoader({
  src,
  alt,
  className = "h-full w-full object-cover",
  spinnerSize = "h-8 w-8",
  retryOnError = false,
}: {
  src: string;
  alt: string;
  className?: string;
  spinnerSize?: string;
  /** If true, retry loading on error with jittered backoff */
  retryOnError?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  // On error, schedule a retry by updating the src with a cache-buster.
  // Keep the <img> mounted so the browser's lazy-loading observer stays active.
  const handleError = useCallback(() => {
    if (!retryOnError || retryCount >= 30) return;
    // Jittered backoff: 2-5s base + random jitter to avoid thundering herd
    const delay = 2000 + Math.random() * 3000;
    const timer = setTimeout(() => {
      setRetryCount((c) => c + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [retryOnError, retryCount]);

  // Bust browser cache on retries by appending query param
  const imgSrc = retryCount > 0 ? `${src}?r=${retryCount}` : src;

  return (
    <div className="relative h-full w-full">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2
            className={`${spinnerSize} animate-spin text-muted-foreground`}
          />
        </div>
      )}
      {/* Always keep <img> mounted so loading="lazy" intersection observer works */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        key={retryCount}
        src={imgSrc}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={handleError}
      />
    </div>
  );
}

export function SocialPostsClient({
  templates,
  upcoming,
  assetsReady: initialAssetsReady,
  alreadyGenerating = false,
  assetUrls = {},
  previewMode = false,
  previewAgencyName = "Acorn ABA Therapy",
}: SocialPostsClientProps) {
  const [filter, setFilter] = useState<SocialCategory | "all">("all");
  const [assetsReady, setAssetsReady] = useState(initialAssetsReady);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");
  const [resolvedAssetUrls, setResolvedAssetUrls] = useState(assetUrls);

  const buildImageUrl = useCallback(
    (templateId: string) => {
      if (previewMode) {
        const template = templates.find((item) => item.id === templateId);
        if (!template) return "";
        return buildPreviewImageUrl(template, previewAgencyName);
      }
      return resolvedAssetUrls[templateId] || "";
    },
    [previewAgencyName, previewMode, resolvedAssetUrls, templates]
  );

  useEffect(() => {
    setResolvedAssetUrls(assetUrls);
  }, [assetUrls]);

  useEffect(() => {
    if (previewMode) return;
    if (assetsReady) return;

    let cancelled = false;

    async function checkAndGenerate() {
      const knownAssetCount = Object.keys(resolvedAssetUrls).length;
      if (knownAssetCount > 0) {
        setAssetsReady(true);
        return;
      }

      if (cancelled) return;

      if (alreadyGenerating) {
        // Another tab/visit already started generation — just poll for completion
        setIsGenerating(true);
        const interval = setInterval(async () => {
          try {
            const { checkSocialAssetsStatus } = await import(
              "@/lib/actions/social"
            );
            const status = await checkSocialAssetsStatus();
            if (status.success && status.data.ready) {
              const urlsResult = await getSocialAssetUrls(status.data.brandHash);
              if (!urlsResult.success) {
                throw new Error(urlsResult.error);
              }
              setAssetsReady(true);
              setResolvedAssetUrls(urlsResult.data || {});
              setIsGenerating(false);
              clearInterval(interval);
            }
          } catch {
            // Keep polling
          }
        }, 5000);
        return;
      }

      // No generation in progress — start one
      setIsGenerating(true);

      generateSocialAssets()
        .then((result) => {
          if (cancelled) return;
          if (result.success) {
            return getSocialAssetUrls(result.data.brandHash).then((urlsResult) => {
              if (!urlsResult.success) {
                setGenerationProgress(`Error: ${urlsResult.error}`);
                return;
              }
              setResolvedAssetUrls(urlsResult.data || {});
              setAssetsReady(true);
              setGenerationProgress("");
            });
          } else {
            setGenerationProgress(`Error: ${result.error}`);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setGenerationProgress("Generation failed. Try refreshing.");
          }
        })
        .finally(() => {
          if (!cancelled) setIsGenerating(false);
        });
    }

    checkAndGenerate();
    return () => { cancelled = true; };
  }, [alreadyGenerating, assetsReady, previewMode, resolvedAssetUrls, templates]);

  const filteredTemplates =
    filter === "all"
      ? templates
      : templates.filter((t) => t.category === filter);

  const getImageUrl = buildImageUrl;

  return (
    <Tabs defaultValue="library">
      <TabsList>
        <TabsTrigger value="library" className="gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" />
          Library
        </TabsTrigger>
        <TabsTrigger value="calendar" className="gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          Calendar
        </TabsTrigger>
      </TabsList>

      {isGenerating && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating your branded posts... This takes 1-2 minutes for all 50 images.
        </div>
      )}
      {generationProgress && !isGenerating && generationProgress.startsWith("Error") && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {generationProgress}
        </div>
      )}

      {/* ===== Calendar Tab — list view sorted by date ===== */}
      <TabsContent value="calendar" className="mt-3">
        {upcoming.length === 0 ? (
          <DashboardCard className="p-5 sm:p-6">
            <p className="text-sm text-muted-foreground">
              No upcoming events in the next 3 weeks. Check the Library tab for
              all templates.
            </p>
          </DashboardCard>
        ) : (
          <div className="space-y-3">
            {upcoming.map((template) => (
              <CalendarRow
                key={template.id}
                template={template}
                imageUrl={getImageUrl(template.id)}
                daysUntil={template.daysUntil}
                previewMode={previewMode}
              />
            ))}
          </div>
        )}
      </TabsContent>

      {/* ===== Library Tab — grid with filters ===== */}
      <TabsContent value="library" className="mt-3 space-y-4">
        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2">
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === cat.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-background p-3">
          <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <SocialPostCard
                key={template.id}
                template={template}
                imageUrl={getImageUrl(template.id)}
                previewMode={previewMode}
              />
            ))}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function buildPreviewImageUrl(template: SocialTemplate, agencyName: string) {
  const palette: Record<SocialCategory, { bg: string; accent: string; panel: string }> = {
    aba_observance: { bg: "#E9F2FF", accent: "#2563EB", panel: "#D9E8FF" },
    autism_observance: { bg: "#F2EAFE", accent: "#7C3AED", panel: "#E5D6FF" },
    national_holiday: { bg: "#FFF0F0", accent: "#DC2626", panel: "#FFD7D7" },
    seasonal: { bg: "#FFF7E6", accent: "#D97706", panel: "#FFE7B5" },
    aba_tip: { bg: "#EAF8F1", accent: "#059669", panel: "#D4F3E3" },
    quote: { bg: "#FFF0F7", accent: "#DB2777", panel: "#FFD6EA" },
    announcement: { bg: "#EEF2FF", accent: "#4F46E5", panel: "#DDE2FF" },
  };

  const colors = palette[template.category];
  const captionPreview = template.caption.slice(0, 120);
  const captionLineOne = captionPreview.slice(0, 58);
  const captionLineTwo = captionPreview.slice(58, 116);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
      <rect width="1080" height="1080" fill="${colors.bg}" />
      <circle cx="130" cy="130" r="90" fill="${colors.panel}" />
      <circle cx="940" cy="180" r="120" fill="${colors.panel}" />
      <circle cx="930" cy="930" r="160" fill="${colors.panel}" />
      <rect x="86" y="86" width="908" height="908" rx="48" fill="white" stroke="${colors.panel}" stroke-width="8"/>
      <text x="130" y="180" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="${colors.accent}">${escapeXml(agencyName)}</text>
      <text x="130" y="245" font-family="Arial, sans-serif" font-size="64" font-weight="700" fill="#172033">${escapeXml(template.layoutProps.headline)}</text>
      <text x="130" y="310" font-family="Arial, sans-serif" font-size="30" fill="#516077">${escapeXml(template.layoutProps.subline || template.title)}</text>
      <rect x="130" y="378" width="820" height="260" rx="32" fill="${colors.panel}" />
      <text x="170" y="462" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="${colors.accent}">${escapeXml(CATEGORY_LABELS[template.category])}</text>
      <text x="170" y="530" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#172033">${escapeXml(template.title)}</text>
      <text x="170" y="606" font-family="Arial, sans-serif" font-size="27" fill="#516077">${escapeXml(captionLineOne)}</text>
      <text x="170" y="648" font-family="Arial, sans-serif" font-size="27" fill="#516077">${escapeXml(captionLineTwo)}${template.caption.length > 116 ? "..." : ""}</text>
      <rect x="130" y="862" width="280" height="70" rx="35" fill="${colors.accent}" />
      <text x="270" y="906" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="white">Preview Only</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ---------- Image Lightbox Modal ----------

function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
      >
        <X className="h-6 w-6" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[85vh] max-w-[85vw] rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ---------- Calendar Row (list view) ----------

function CalendarRow({
  template,
  imageUrl,
  daysUntil,
  previewMode = false,
}: {
  template: SocialTemplate & { nextOccurrence: string };
  imageUrl: string;
  daysUntil: number;
  previewMode?: boolean;
}) {
  const [captionCopied, setCaptionCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const captionRef = useRef<HTMLParagraphElement>(null);

  // Detect if text is actually overflowing the line-clamp
  const checkClamped = useCallback(() => {
    const el = captionRef.current;
    if (el && !showFullCaption) {
      setIsClamped(el.scrollHeight > el.clientHeight);
    }
  }, [showFullCaption]);

  useEffect(() => {
    checkClamped();
    window.addEventListener("resize", checkClamped);
    return () => window.removeEventListener("resize", checkClamped);
  }, [checkClamped]);

  async function copyCaption() {
    if (previewMode) return;
    await navigator.clipboard.writeText(
      `${template.caption}\n\n${template.hashtags}`
    );
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
  }

  async function copyImage() {
    if (previewMode) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 2000);
    } catch {
      downloadImage();
    }
  }

  function downloadImage() {
    if (previewMode) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `${template.id}.png`;
    a.click();
  }

  const categoryColor = CATEGORY_COLORS[template.category];

  // Format the event date nicely
  const eventDate = new Date(template.nextOccurrence);
  const monthName = eventDate.toLocaleDateString("en-US", { month: "short" });
  const dayNum = eventDate.getDate();

  const daysLabel =
    daysUntil <= 0
      ? "Today"
      : daysUntil === 1
        ? "Tomorrow"
        : `In ${daysUntil} days`;

  return (
    <>
      {lightboxOpen && (
        <ImageLightbox
          src={imageUrl}
          alt={template.title}
          onClose={() => setLightboxOpen(false)}
        />
      )}
      <DashboardCard className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
        {/* Date badge */}
        <div className="flex shrink-0 flex-col items-center justify-center rounded-lg bg-primary/5 px-4 py-2 text-center sm:self-start">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            {monthName}
          </span>
          <span className="text-2xl font-bold text-primary">{dayNum}</span>
          <span className="text-[10px] text-muted-foreground">{daysLabel}</span>
        </div>

        {/* Mobile: full-width image like library view */}
      <button
        type="button"
        className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted sm:hidden"
        onClick={() => setLightboxOpen(true)}
      >
        {previewMode && (
          <div className="absolute right-2 top-2 z-10 rounded-full bg-background/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground shadow-sm">
            Preview
          </div>
        )}
        <ImageWithLoader
          src={imageUrl}
          alt={template.title}
          retryOnError
        />
        </button>

        {/* Desktop: larger clickable thumbnail */}
      <button
        type="button"
        className="relative hidden h-36 w-36 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-muted transition-shadow hover:ring-2 hover:ring-primary/30 sm:block"
        onClick={() => setLightboxOpen(true)}
      >
        {previewMode && (
          <div className="absolute right-2 top-2 z-10 rounded-full bg-background/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground shadow-sm">
            Preview
          </div>
        )}
        <ImageWithLoader
          src={imageUrl}
          alt={template.title}
          spinnerSize="h-5 w-5"
            retryOnError
          />
        </button>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold">{template.title}</h3>
            <Badge
              variant="outline"
              className={`shrink-0 text-[10px] ${categoryColor}`}
            >
              {CATEGORY_LABELS[template.category]}
            </Badge>
          </div>

          {/* Caption preview — only show "Show more" if text actually overflows */}
          <p
            ref={captionRef}
            className={`text-xs text-muted-foreground ${showFullCaption ? "" : "line-clamp-2"}`}
          >
            {template.caption}
          </p>
          {isClamped && !showFullCaption && (
            <button
              onClick={() => setShowFullCaption(true)}
              className="self-start text-xs font-medium text-primary hover:underline"
            >
              Show more
            </button>
          )}
          {showFullCaption && (
            <button
              onClick={() => setShowFullCaption(false)}
              className="self-start text-xs font-medium text-primary hover:underline"
            >
              Show less
            </button>
          )}

          {/* Actions */}
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              onClick={copyImage}
              disabled={previewMode}
            >
              {previewMode ? (
                <Lock className="h-3.5 w-3.5" />
              ) : imageCopied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {previewMode ? "Upgrade to copy" : imageCopied ? "Copied!" : "Image"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              onClick={copyCaption}
              disabled={previewMode}
            >
              {previewMode ? (
                <Lock className="h-3.5 w-3.5" />
              ) : captionCopied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {previewMode ? "Upgrade to copy" : captionCopied ? "Copied!" : "Caption"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 px-2"
              onClick={downloadImage}
              disabled={previewMode}
              title="Download image"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DashboardCard>
    </>
  );
}

// ---------- Library Card (grid view) ----------

function SocialPostCard({
  template,
  imageUrl,
  previewMode = false,
}: {
  template: SocialTemplate;
  imageUrl: string;
  previewMode?: boolean;
}) {
  const [captionCopied, setCaptionCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const libCaptionRef = useRef<HTMLParagraphElement>(null);

  const checkLibClamped = useCallback(() => {
    const el = libCaptionRef.current;
    if (el && !showFullCaption) {
      setIsClamped(el.scrollHeight > el.clientHeight);
    }
  }, [showFullCaption]);

  useEffect(() => {
    checkLibClamped();
    window.addEventListener("resize", checkLibClamped);
    return () => window.removeEventListener("resize", checkLibClamped);
  }, [checkLibClamped]);

  async function copyCaption() {
    if (previewMode) return;
    await navigator.clipboard.writeText(
      `${template.caption}\n\n${template.hashtags}`
    );
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
  }

  async function copyImage() {
    if (previewMode) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 2000);
    } catch {
      downloadImage();
    }
  }

  function downloadImage() {
    if (previewMode) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `${template.id}.png`;
    a.click();
  }

  const categoryColor = CATEGORY_COLORS[template.category];

  return (
    <DashboardCard className="flex h-full flex-col overflow-hidden">
      {/* Image preview */}
      <div className="relative aspect-square bg-muted">
        {previewMode && (
          <div className="absolute right-2 top-2 z-10 rounded-full bg-background/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground shadow-sm">
            Preview
          </div>
        )}
        <ImageWithLoader
          src={imageUrl}
          alt={template.title}
          retryOnError
        />
      </div>

      {/* Card body — flex col so buttons stick to bottom */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold">{template.title}</h3>
          <Badge
            variant="outline"
            className={`shrink-0 text-[10px] ${categoryColor}`}
          >
            {CATEGORY_LABELS[template.category]}
          </Badge>
        </div>

        {/* Caption preview — 4 lines, show more only if actually overflowing */}
        <div className="flex-1">
          <p
            ref={libCaptionRef}
            className={`text-xs text-muted-foreground ${showFullCaption ? "" : "line-clamp-4"}`}
          >
            {template.caption}
          </p>
          {isClamped && !showFullCaption && (
            <button
              onClick={() => setShowFullCaption(true)}
              className="mt-1 text-xs font-medium text-primary hover:underline"
            >
              Show more
            </button>
          )}
          {showFullCaption && (
            <button
              onClick={() => setShowFullCaption(false)}
              className="mt-1 text-xs font-medium text-primary hover:underline"
            >
              Show less
            </button>
          )}
        </div>

        {/* Action buttons — always at bottom */}
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="min-w-0 flex-1 gap-1 text-xs"
            onClick={copyImage}
            disabled={previewMode}
          >
            {previewMode ? (
              <Lock className="h-3.5 w-3.5 shrink-0" />
            ) : imageCopied ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">
              {previewMode ? "Upgrade to copy" : imageCopied ? "Copied!" : "Image"}
            </span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="min-w-0 flex-1 gap-1 text-xs"
            onClick={copyCaption}
            disabled={previewMode}
          >
            {previewMode ? (
              <Lock className="h-3.5 w-3.5 shrink-0" />
            ) : captionCopied ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">
              {previewMode ? "Upgrade to copy" : captionCopied ? "Copied!" : "Caption"}
            </span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 px-2"
            onClick={downloadImage}
            disabled={previewMode}
            title="Download image"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardCard>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  CalendarDays,
  Copy,
  Download,
  Check,
  ImageIcon,
  Loader2,
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
import { generateSocialAssets } from "@/lib/actions/social";

interface UpcomingTemplate extends SocialTemplate {
  daysUntil: number;
  /** ISO string — serialized from server */
  nextOccurrence: string;
}

interface SocialPostsClientProps {
  templates: SocialTemplate[];
  upcoming: UpcomingTemplate[];
  profileId: string;
  assetsReady: boolean;
  alreadyGenerating?: boolean;
  brandHash?: string;
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
  /** If true, retry loading every 3s on error (for images being generated) */
  retryOnError?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (error && retryOnError) {
      const timer = setTimeout(() => {
        setError(false);
        setRetryKey((k) => k + 1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, retryOnError]);

  return (
    <div className="relative h-full w-full">
      {(!loaded || error) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2
            className={`${spinnerSize} animate-spin text-muted-foreground`}
          />
        </div>
      )}
      {!error && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={retryKey}
          src={src}
          alt={alt}
          className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

export function SocialPostsClient({
  templates,
  upcoming,
  profileId,
  assetsReady: initialAssetsReady,
  alreadyGenerating = false,
  brandHash = "",
}: SocialPostsClientProps) {
  const [filter, setFilter] = useState<SocialCategory | "all">("all");
  const [assetsReady, setAssetsReady] = useState(initialAssetsReady);
  const [isGenerating, setIsGenerating] = useState(alreadyGenerating);
  const [generationProgress, setGenerationProgress] = useState("");
  const [cacheBuster, setCacheBuster] = useState(brandHash);

  // Trigger generation if assets aren't ready and not already generating elsewhere
  useEffect(() => {
    if (assetsReady) return;

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
            setAssetsReady(true);
            setCacheBuster(status.data.brandHash);
            setIsGenerating(false);
            clearInterval(interval);
          }
        } catch {
          // Keep polling
        }
      }, 5000);
      return () => clearInterval(interval);
    }

    // No generation in progress — start one (fire and forget)
    // Images will appear progressively as each one is uploaded
    if (!isGenerating) {
      setIsGenerating(true);

      generateSocialAssets()
        .then((result) => {
          if (result.success) {
            setAssetsReady(true);
            setGenerationProgress("");
          } else {
            setGenerationProgress(`Error: ${result.error}`);
          }
        })
        .catch(() => {
          setGenerationProgress("Generation failed. Try refreshing.");
        })
        .finally(() => {
          setIsGenerating(false);
        });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTemplates =
    filter === "all"
      ? templates
      : templates.filter((t) => t.category === filter);

  // Build image URL with hash in path (not query param) to bust CDN cache
  const getImageUrl = (templateId: string) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const hash = cacheBuster || brandHash;
    return hash
      ? `${supabaseUrl}/storage/v1/object/public/social-posts/${profileId}/${hash}/${templateId}.png`
      : `${supabaseUrl}/storage/v1/object/public/social-posts/${profileId}/${templateId}.png`;
  };

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
                assetsReady={assetsReady}
                daysUntil={template.daysUntil}
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

        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <SocialPostCard
              key={template.id}
              template={template}
              imageUrl={getImageUrl(template.id)}
              assetsReady={assetsReady}
            />
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}

// ---------- Calendar Row (list view) ----------

function CalendarRow({
  template,
  imageUrl,
  assetsReady,
  daysUntil,
}: {
  template: SocialTemplate & { nextOccurrence: string };
  imageUrl: string;
  assetsReady: boolean;
  daysUntil: number;
}) {
  const [captionCopied, setCaptionCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
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
    await navigator.clipboard.writeText(
      `${template.caption}\n\n${template.hashtags}`
    );
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
  }

  async function copyImage() {
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
    <DashboardCard className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
      {/* Date badge */}
      <div className="flex shrink-0 flex-col items-center justify-center rounded-lg bg-primary/5 px-4 py-2 text-center">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          {monthName}
        </span>
        <span className="text-2xl font-bold text-primary">{dayNum}</span>
        <span className="text-[10px] text-muted-foreground">{daysLabel}</span>
      </div>

      {/* Image thumbnail — always try loading, retries on 404 */}
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
        <ImageWithLoader
          src={imageUrl}
          alt={template.title}
          spinnerSize="h-5 w-5"
          retryOnError={!assetsReady}
        />
      </div>

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

          >
            {imageCopied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {imageCopied ? "Copied!" : "Image"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs"
            onClick={copyCaption}
          >
            {captionCopied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {captionCopied ? "Copied!" : "Caption"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 px-2"
            onClick={downloadImage}

            title="Download image"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardCard>
  );
}

// ---------- Library Card (grid view) ----------

function SocialPostCard({
  template,
  imageUrl,
  assetsReady,
}: {
  template: SocialTemplate;
  imageUrl: string;
  assetsReady: boolean;
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
    await navigator.clipboard.writeText(
      `${template.caption}\n\n${template.hashtags}`
    );
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
  }

  async function copyImage() {
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
        <ImageWithLoader
          src={imageUrl}
          alt={template.title}
          retryOnError={!assetsReady}
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

          >
            {imageCopied ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">
              {imageCopied ? "Copied!" : "Image"}
            </span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="min-w-0 flex-1 gap-1 text-xs"
            onClick={copyCaption}
          >
            {captionCopied ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">
              {captionCopied ? "Copied!" : "Caption"}
            </span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 px-2"
            onClick={downloadImage}

            title="Download image"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardCard>
  );
}

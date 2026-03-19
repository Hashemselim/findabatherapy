"use client";

import { useState, useEffect, useTransition } from "react";
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
}: {
  src: string;
  alt: string;
  className?: string;
  spinnerSize?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

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
          src={src}
          alt={alt}
          className={`${className} transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
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
  brandHash = "",
}: SocialPostsClientProps) {
  const [filter, setFilter] = useState<SocialCategory | "all">("all");
  const [assetsReady, setAssetsReady] = useState(initialAssetsReady);
  const [generating, startGeneration] = useTransition();
  const [cacheBuster, setCacheBuster] = useState(brandHash);

  // Trigger generation if assets aren't ready
  useEffect(() => {
    if (!assetsReady && !generating) {
      startGeneration(async () => {
        const result = await generateSocialAssets();
        if (result.success) {
          setAssetsReady(true);
          setCacheBuster(Date.now().toString());
        }
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
    <Tabs defaultValue="calendar">
      <TabsList>
        <TabsTrigger value="calendar" className="gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          Calendar
        </TabsTrigger>
        <TabsTrigger value="library" className="gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" />
          Library
        </TabsTrigger>
      </TabsList>

      {generating && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating your branded posts... This may take a minute.
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Image thumbnail */}
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
        {assetsReady ? (
          <ImageWithLoader
            src={imageUrl}
            alt={template.title}
            spinnerSize="h-5 w-5"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
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

        {/* Caption preview */}
        <p
          className={`text-xs text-muted-foreground ${showFullCaption ? "" : "line-clamp-2"}`}
        >
          {template.caption}
        </p>
        {template.caption.length > 120 && (
          <button
            onClick={() => setShowFullCaption(!showFullCaption)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {showFullCaption ? "Show less" : "Show more"}
          </button>
        )}

        {/* Actions */}
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs"
            onClick={copyImage}
            disabled={!assetsReady}
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
            disabled={!assetsReady}
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
    <DashboardCard className="overflow-hidden">
      {/* Image preview */}
      <div className="relative aspect-square bg-muted">
        {assetsReady ? (
          <ImageWithLoader src={imageUrl} alt={template.title} />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold">{template.title}</h3>
          <Badge
            variant="outline"
            className={`shrink-0 text-[10px] ${categoryColor}`}
          >
            {CATEGORY_LABELS[template.category]}
          </Badge>
        </div>

        {/* Caption preview — 4 lines visible, expandable only if very long */}
        <p
          className={`text-xs text-muted-foreground ${showFullCaption ? "" : "line-clamp-4"}`}
        >
          {template.caption}
        </p>
        {template.caption.length > 200 && (
          <button
            onClick={() => setShowFullCaption(!showFullCaption)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {showFullCaption ? "Show less" : "Show more"}
          </button>
        )}

        {/* Action buttons */}
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="min-w-0 flex-1 gap-1 text-xs"
            onClick={copyImage}
            disabled={!assetsReady}
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
            disabled={!assetsReady}
            title="Download image"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardCard>
  );
}

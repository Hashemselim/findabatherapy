"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Calendar,
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
  nextOccurrence: Date;
}

interface SocialPostsClientProps {
  templates: SocialTemplate[];
  upcoming: UpcomingTemplate[];
  profileId: string;
  assetsReady: boolean;
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

export function SocialPostsClient({
  templates,
  upcoming,
  profileId,
  assetsReady: initialAssetsReady,
}: SocialPostsClientProps) {
  const [filter, setFilter] = useState<SocialCategory | "all">("all");
  const [assetsReady, setAssetsReady] = useState(initialAssetsReady);
  const [generating, startGeneration] = useTransition();

  // Trigger generation if assets aren't ready
  useEffect(() => {
    if (!assetsReady && !generating) {
      startGeneration(async () => {
        const result = await generateSocialAssets();
        if (result.success) {
          setAssetsReady(true);
        }
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTemplates =
    filter === "all"
      ? templates
      : templates.filter((t) => t.category === filter);

  // Build image URL helper (client-side, uses public bucket URL)
  const getImageUrl = (templateId: string) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    return `${supabaseUrl}/storage/v1/object/public/social-posts/${profileId}/${templateId}.png`;
  };

  return (
    <Tabs defaultValue="upcoming">
      <TabsList>
        <TabsTrigger value="upcoming" className="gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          Upcoming
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

      <TabsContent value="upcoming" className="mt-3">
        {upcoming.length === 0 ? (
          <DashboardCard className="p-5 sm:p-6">
            <p className="text-sm text-muted-foreground">
              No upcoming events in the next 3 weeks. Check the Library tab for
              all templates.
            </p>
          </DashboardCard>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((template) => (
              <SocialPostCard
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

// ---------- Individual Card ----------

function SocialPostCard({
  template,
  imageUrl,
  assetsReady,
  daysUntil,
}: {
  template: SocialTemplate;
  imageUrl: string;
  assetsReady: boolean;
  daysUntil?: number;
}) {
  const [captionCopied, setCaptionCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);

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
      // Fallback: download
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={template.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">{template.title}</h3>
            {daysUntil !== undefined && (
              <p className="text-xs text-muted-foreground">
                {daysUntil <= 0
                  ? "Today!"
                  : daysUntil === 1
                    ? "Tomorrow"
                    : `In ${daysUntil} days`}
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 text-[10px] ${categoryColor}`}
          >
            {CATEGORY_LABELS[template.category]}
          </Badge>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5 text-xs"
            onClick={copyImage}
            disabled={!assetsReady}
          >
            {imageCopied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {imageCopied ? "Copied!" : "Copy Image"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5 text-xs"
            onClick={copyCaption}
          >
            {captionCopied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {captionCopied ? "Copied!" : "Copy Caption"}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={downloadImage}
            disabled={!assetsReady}
            title="Download image"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </DashboardCard>
  );
}

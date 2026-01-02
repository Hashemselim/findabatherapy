"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Video, Loader2, ExternalLink, X, Sparkles, Play, Smile, MessageCircle, CheckCircle2, Pencil, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getVideoUrl, updateVideoUrl } from "@/lib/storage/actions";
import { extractVideoId, getVideoEmbedUrl } from "@/lib/storage/config";

interface VideoEmbedFormProps {
  planTier: string;
  /** Enable demo mode - uses static data and disables editing */
  isDemo?: boolean;
  /** Static video URL for demo mode */
  demoVideoUrl?: string | null;
  /** Callback when user tries to edit in demo mode */
  onDemoAction?: () => void;
  /** data-tour attribute for guided tour */
  dataTour?: string;
}

export function VideoEmbedForm({
  planTier,
  isDemo = false,
  demoVideoUrl,
  onDemoAction,
  dataTour,
}: VideoEmbedFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>(isDemo && demoVideoUrl ? demoVideoUrl : "");
  const [savedVideoUrl, setSavedVideoUrl] = useState<string>(isDemo && demoVideoUrl ? demoVideoUrl : ""); // Track saved state
  const [isLoading, setIsLoading] = useState(!isDemo);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isPremium = planTier !== "free";
  const embedUrl = videoUrl ? getVideoEmbedUrl(videoUrl) : null;
  const savedEmbedUrl = savedVideoUrl ? getVideoEmbedUrl(savedVideoUrl) : null;
  const videoInfo = videoUrl ? extractVideoId(videoUrl) : null;
  const savedVideoInfo = savedVideoUrl ? extractVideoId(savedVideoUrl) : null;

  // Load current video URL on mount (skip for demo)
  useEffect(() => {
    if (isDemo) return;

    async function loadVideo() {
      const result = await getVideoUrl();
      if (result.success && result.data?.url) {
        setVideoUrl(result.data.url);
        setSavedVideoUrl(result.data.url);
      }
      setIsLoading(false);
    }
    loadVideo();
  }, [isDemo]);

  const handleSave = async () => {
    setError(null);
    setSuccessMessage(null);

    // Validate URL if provided
    if (videoUrl && !extractVideoId(videoUrl)) {
      setError("Please enter a valid YouTube or Vimeo URL.");
      return;
    }

    setIsSaving(true);

    const result = await updateVideoUrl(videoUrl || null);

    if (result.success) {
      setSavedVideoUrl(videoUrl);
      setSuccessMessage("Video updated successfully.");
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(result.error);
    }

    setIsSaving(false);
  };

  const handleCancel = () => {
    setVideoUrl(savedVideoUrl);
    setError(null);
    setIsEditing(false);
  };

  const handleRemove = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    const result = await updateVideoUrl(null);

    if (result.success) {
      setVideoUrl("");
      setSavedVideoUrl("");
      setSuccessMessage("Video removed successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(result.error);
    }

    setIsSaving(false);
  };

  if (!isPremium) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 via-white to-slate-50 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.06),transparent_50%)]" />

        <div className="relative p-6">
          {/* Header with strong value prop */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <Video className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-900">Video Introduction</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  <Sparkles className="h-3 w-3" />
                  Pro
                </span>
              </div>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                <span className="font-medium text-slate-800">Let families meet you before they call.</span> A 1-2 minute video introduction builds instant connection. Families feel like they already know you - making that first appointment so much easier.
              </p>
            </div>
          </div>

          {/* What to include */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Smile className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Introduce yourself</p>
                <p className="text-xs text-slate-500">Your background & approach</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Play className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Show your space</p>
                <p className="text-xs text-slate-500">Quick facility tour</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Speak to parents</p>
                <p className="text-xs text-slate-500">What to expect working with you</p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>YouTube & Vimeo supported</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Embedded player on your listing</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Just paste the URL - we handle the rest</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Convert visitors into inquiries</span>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 flex flex-col gap-3 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">Ready to make a personal connection?</span>
            </p>
            <Button asChild size="sm" className="w-full shrink-0 rounded-full sm:w-auto">
              <Link href="/dashboard/billing">
                Upgrade Now
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // View Mode - Read-only display
  if (!isEditing) {
    return (
      <Card className="border-border/60" data-tour={dataTour}>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 shrink-0" />
                <span>Video Introduction</span>
              </CardTitle>
              <CardDescription className="mt-1">Video displayed on your listing page</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isDemo && onDemoAction) {
                  onDemoAction();
                } else {
                  setIsEditing(true);
                }
              }}
              className="shrink-0 self-start"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : savedEmbedUrl ? (
            <div className="space-y-3">
              {successMessage && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {successMessage}
                </div>
              )}

              {/* Video Preview - Read Only */}
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-black">
                <iframe
                  src={savedEmbedUrl}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Video info */}
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {savedVideoInfo?.platform === "youtube" ? "YouTube" : "Vimeo"}
                </Badge>
                <a
                  href={savedVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View on {savedVideoInfo?.platform === "youtube" ? "YouTube" : "Vimeo"}
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 p-8 text-center">
              <Video className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No video added yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  if (isDemo && onDemoAction) {
                    onDemoAction();
                  } else {
                    setIsEditing(true);
                  }
                }}
              >
                Add Video
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Edit Mode - Full editing capability
  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 shrink-0" />
              <span>Edit Video</span>
            </CardTitle>
            <CardDescription className="mt-1">
              Add a YouTube or Vimeo video to your listing.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleCancel} className="shrink-0 self-start">
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* URL Input */}
            <div className="space-y-2">
              <Label htmlFor="video-url">Video URL</Label>
              <Input
                id="video-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  setError(null);
                }}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Supports YouTube and Vimeo URLs
              </p>
            </div>

            {/* Video Preview */}
            {embedUrl && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Preview</Label>
                  <div className="flex items-center gap-2">
                    {videoInfo && (
                      <span className="text-xs text-muted-foreground">
                        {videoInfo.platform === "youtube" ? "YouTube" : "Vimeo"}
                      </span>
                    )}
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#5788FF] hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-black">
                  <iframe
                    src={embedUrl}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  disabled={isSaving}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                  Remove Video
                </Button>
              </div>
            )}

            {/* No Video State */}
            {!embedUrl && !videoUrl && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 py-8">
                <Video className="mb-2 h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No video added yet</p>
                <p className="text-xs text-muted-foreground">
                  Paste a YouTube or Vimeo URL above
                </p>
              </div>
            )}

            {/* Invalid URL State */}
            {videoUrl && !embedUrl && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-50 p-4 dark:bg-amber-950/20">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  The URL you entered doesn&apos;t appear to be a valid YouTube or Vimeo video URL.
                  Please check the URL and try again.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

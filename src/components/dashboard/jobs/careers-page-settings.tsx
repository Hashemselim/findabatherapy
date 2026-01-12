"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Palette, Type, MousePointer2, RotateCcw, Lock, Sparkles, Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateCareersPageSettings, updateCareersHideBadge } from "@/lib/actions/listings";

interface CareersPageSettingsProps {
  initialBrandColor: string;
  initialHeadline: string | null;
  initialCtaText: string;
  initialHideBadge: boolean;
  isFreeUser: boolean;
}

const PRESET_COLORS = [
  { color: "#10B981", name: "Emerald" },
  { color: "#5788FF", name: "Blue" },
  { color: "#8B5CF6", name: "Purple" },
  { color: "#F59E0B", name: "Amber" },
  { color: "#EF4444", name: "Red" },
  { color: "#EC4899", name: "Pink" },
  { color: "#14B8A6", name: "Teal" },
  { color: "#6366F1", name: "Indigo" },
];

export function CareersPageSettings({
  initialBrandColor,
  initialHeadline,
  initialCtaText,
  initialHideBadge,
  isFreeUser,
}: CareersPageSettingsProps) {
  const [isPending, startTransition] = useTransition();
  const [isBadgePending, startBadgeTransition] = useTransition();
  const [brandColor, setBrandColor] = useState(initialBrandColor);
  const [headline, setHeadline] = useState(initialHeadline || "");
  const [ctaText, setCtaText] = useState(initialCtaText);
  const [hideBadge, setHideBadge] = useState(initialHideBadge);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBadgeToggle = (checked: boolean) => {
    setHideBadge(checked);
    startBadgeTransition(async () => {
      const result = await updateCareersHideBadge(checked);
      if (!result.success) {
        // Revert on error
        setHideBadge(!checked);
      }
    });
  };

  const hasChanges =
    brandColor !== initialBrandColor ||
    headline !== (initialHeadline || "") ||
    ctaText !== initialCtaText;

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateCareersPageSettings({
        brandColor,
        headline,
        ctaText,
      });

      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(result.error);
      }
    });
  };

  const handleReset = () => {
    setBrandColor(initialBrandColor);
    setHeadline(initialHeadline || "");
    setCtaText(initialCtaText);
    setError(null);
  };

  // Helper to calculate contrasting text color
  const getContrastColor = (hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#000000" : "#FFFFFF";
  };

  return (
    <Card className="border-border/60 bg-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
            style={{ backgroundColor: brandColor }}
          >
            <Palette className="h-5 w-5" style={{ color: getContrastColor(brandColor) }} />
          </div>
          <div>
            <CardTitle className="text-foreground">Customize Appearance</CardTitle>
            <CardDescription>
              Personalize your careers page to match your brand
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upgrade Banner for Free Users */}
        {isFreeUser && (
          <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                <Sparkles className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900">Unlock Customization</h4>
                <p className="mt-1 text-sm text-amber-700">
                  Upgrade to Pro to customize your careers page with your brand colors, custom headline, and personalized apply button text. Free users get a standard emerald theme.
                </p>
                <Button asChild size="sm" className="mt-3 bg-amber-600 hover:bg-amber-700">
                  <Link href="/dashboard/billing">
                    Upgrade to Pro
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Hide Badge Toggle - Pro+ only */}
        {!isFreeUser && (
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
            <div className="space-y-0.5">
              <Label htmlFor="hide-badge-toggle" className="flex cursor-pointer items-center gap-2 font-medium">
                {hideBadge ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
                Hide &quot;Powered by&quot; Badge
              </Label>
              <p className="text-sm text-muted-foreground">
                Remove the Find ABA Therapy badge from your careers page
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isBadgePending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Switch
                id="hide-badge-toggle"
                checked={hideBadge}
                onCheckedChange={handleBadgeToggle}
                disabled={isBadgePending}
              />
            </div>
          </div>
        )}

        {/* Brand Color */}
        <div className={`space-y-3 ${isFreeUser ? "opacity-60" : ""}`}>
          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
            Brand Color
            {isFreeUser && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          </Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset.color}
                type="button"
                onClick={() => !isFreeUser && setBrandColor(preset.color)}
                disabled={isFreeUser}
                className={`group relative h-10 w-10 rounded-lg border-2 transition-all ${isFreeUser ? "cursor-not-allowed" : "hover:scale-110"}`}
                style={{
                  backgroundColor: preset.color,
                  borderColor: brandColor === preset.color ? preset.color : "transparent",
                  boxShadow: brandColor === preset.color ? `0 0 0 2px white, 0 0 0 4px ${preset.color}` : "none",
                }}
                title={preset.name}
              >
                {brandColor === preset.color && (
                  <Check className="absolute inset-0 m-auto h-5 w-5 text-white" />
                )}
              </button>
            ))}
            <div className="relative">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => !isFreeUser && setBrandColor(e.target.value)}
                disabled={isFreeUser}
                className={`absolute inset-0 h-10 w-10 opacity-0 ${isFreeUser ? "cursor-not-allowed" : "cursor-pointer"}`}
              />
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50"
                style={{
                  background: !PRESET_COLORS.some((p) => p.color === brandColor)
                    ? brandColor
                    : undefined,
                }}
              >
                {PRESET_COLORS.some((p) => p.color === brandColor) ? (
                  <span className="text-xs text-muted-foreground">+</span>
                ) : (
                  <Check className="h-5 w-5" style={{ color: getContrastColor(brandColor) }} />
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={brandColor}
              onChange={(e) => {
                if (isFreeUser) return;
                const value = e.target.value;
                if (value.startsWith("#") || value === "") {
                  setBrandColor(value.startsWith("#") ? value : `#${value}`);
                }
              }}
              disabled={isFreeUser}
              placeholder="#10B981"
              className="w-28 font-mono text-sm"
            />
            <span className="text-xs text-muted-foreground">Hex color code</span>
          </div>
        </div>

        {/* Custom Headline */}
        <div className={`space-y-2 ${isFreeUser ? "opacity-60" : ""}`}>
          <Label htmlFor="headline" className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Type className="h-4 w-4 text-muted-foreground" />
            Custom Headline
            {isFreeUser && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          </Label>
          <Input
            id="headline"
            type="text"
            value={headline}
            onChange={(e) => !isFreeUser && setHeadline(e.target.value)}
            disabled={isFreeUser}
            placeholder="Join our mission to make a difference"
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">
            Shown below your company name on the careers page (optional)
          </p>
        </div>

        {/* CTA Button Text */}
        <div className={`space-y-2 ${isFreeUser ? "opacity-60" : ""}`}>
          <Label htmlFor="ctaText" className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MousePointer2 className="h-4 w-4 text-muted-foreground" />
            Application Button Text
            {isFreeUser && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          </Label>
          <Input
            id="ctaText"
            type="text"
            value={ctaText}
            onChange={(e) => !isFreeUser && setCtaText(e.target.value)}
            disabled={isFreeUser}
            placeholder="Apply Now"
            maxLength={30}
          />
          <p className="text-xs text-muted-foreground">
            Text shown on the apply button for each job
          </p>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Preview</Label>
          <div
            className="rounded-xl p-6 transition-colors"
            style={{ backgroundColor: `${brandColor}15` }}
          >
            <div className="mx-auto max-w-sm space-y-4 text-center">
              <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold transition-colors"
                style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
              >
                AB
              </div>
              <div>
                <p className="font-semibold text-foreground">Careers at Your Company</p>
                {headline && <p className="mt-1 text-sm text-muted-foreground">{headline}</p>}
              </div>
              <button
                type="button"
                className="rounded-lg px-6 py-2 text-sm font-medium transition-colors"
                style={{ backgroundColor: brandColor, color: getContrastColor(brandColor) }}
              >
                {ctaText || "Apply Now"}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {/* Actions - hidden for free users */}
        {!isFreeUser && (
          <div className="flex items-center justify-between border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={!hasChanges || isPending}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || isPending}
              className="gap-2"
              style={hasChanges ? { backgroundColor: brandColor, color: getContrastColor(brandColor) } : undefined}
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  Saved!
                </>
              ) : isPending ? (
                "Saving..."
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

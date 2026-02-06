"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Check, Loader2, ExternalLink, Pipette } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { updateIntakeFormSettings, type IntakeFormSettings as IntakeFormSettingsType } from "@/lib/actions/intake";

const COLOR_PRESETS = [
  { name: "Blue", value: "#5788FF" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Rose", value: "#F43F5E" },
  { name: "Orange", value: "#F97316" },
  { name: "Emerald", value: "#10B981" },
  { name: "Slate", value: "#475569" },
];

interface IntakeFormSettingsProps {
  listingSlug: string;
  settings: IntakeFormSettingsType;
  urlTemplate?: string;
  previewLabel?: string;
}

export function IntakeFormSettings({
  listingSlug,
  settings: initialSettings,
  urlTemplate = "/contact/{slug}",
  previewLabel = "Interest Form",
}: IntakeFormSettingsProps) {
  const normalizeHex = (value: string) => value.trim().toUpperCase();

  const colorInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [hexDraft, setHexDraft] = useState(normalizeHex(initialSettings.background_color));
  const [previewUrl, setPreviewUrl] = useState(
    urlTemplate.replace("{slug}", listingSlug)
  );

  // Set full URL after hydration to avoid hydration mismatch
  useEffect(() => {
    setPreviewUrl(
      `${window.location.origin}${urlTemplate.replace("{slug}", listingSlug)}`
    );
  }, [listingSlug, urlTemplate]);

  const handleColorChange = (color: string) => {
    const normalized = normalizeHex(color);
    setSettings((prev) => ({ ...prev, background_color: normalized }));
    setHexDraft(normalized);
    startTransition(async () => {
      await updateIntakeFormSettings({ background_color: normalized });
    });
  };

  const handleCustomColorChange = (value: string) => {
    const normalized = normalizeHex(value);
    setHexDraft(normalized);
    // Only update if valid hex color
    if (/^#[0-9A-F]{6}$/.test(normalized)) {
      setSettings((prev) => ({ ...prev, background_color: normalized }));
      startTransition(async () => {
        await updateIntakeFormSettings({ background_color: normalized });
      });
    }
  };

  const handlePoweredByChange = (checked: boolean) => {
    setSettings((prev) => ({ ...prev, show_powered_by: checked }));
    startTransition(async () => {
      await updateIntakeFormSettings({ show_powered_by: checked });
    });
  };

  const normalizedBackgroundColor = normalizeHex(settings.background_color);

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card className="border-border/60 bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Customize Appearance</CardTitle>
              <CardDescription>
                Customize how your branded page looks to visitors.
              </CardDescription>
            </div>
            {isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Color Presets */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Color</Label>
            <div className="flex flex-wrap gap-3">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleColorChange(color.value)}
                  className={`group relative h-10 w-10 rounded-xl border-2 transition-all duration-200 hover:scale-110 ${
                    normalizedBackgroundColor === normalizeHex(color.value)
                      ? "border-foreground ring-2 ring-foreground/20"
                      : "border-transparent hover:border-border"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {normalizedBackgroundColor === normalizeHex(color.value) && (
                    <Check className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Color */}
          <div className="space-y-3">
            <Label htmlFor="custom-color" className="text-sm font-medium">
              Pick or enter a hex color
            </Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div
                className="h-10 w-10 shrink-0 rounded-xl border-2 border-border"
                style={{ backgroundColor: normalizedBackgroundColor }}
              />
              <div className="flex items-center gap-3">
                <Input
                  id="custom-color"
                  type="text"
                  placeholder="#5788FF"
                  value={hexDraft}
                  onChange={(e) => handleCustomColorChange(e.target.value)}
                  className="max-w-[150px] font-mono"
                />
                <input
                  ref={colorInputRef}
                  type="color"
                  value={normalizedBackgroundColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="sr-only"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => colorInputRef.current?.click()}
                >
                  <Pipette className="h-4 w-4" />
                  Pick
                </Button>
              </div>
            </div>
          </div>

          {/* Powered By Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="space-y-0.5">
              <Label htmlFor="show-powered-by" className="text-sm font-medium">
                Show &quot;Powered by FindABATherapy&quot;
              </Label>
              <p className="text-sm text-muted-foreground">
                Display a small attribution link at the bottom of the form.
              </p>
            </div>
            <Switch
              id="show-powered-by"
              checked={settings.show_powered_by}
              onCheckedChange={handlePoweredByChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card className="border-border/60 bg-white">
        <CardHeader>
          <CardTitle className="text-foreground">Preview</CardTitle>
          <CardDescription>
            See how your page will appear to visitors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="relative overflow-hidden rounded-xl p-4"
            style={{
              backgroundColor: settings.background_color,
              backgroundImage:
                "radial-gradient(ellipse at top, rgba(255,255,255,0.1), transparent)",
            }}
          >
            <div className="mx-auto max-w-xs rounded-lg bg-white p-4 shadow-lg">
              <div className="flex flex-col items-center text-center">
                <div className="mb-2 h-12 w-12 rounded-lg bg-muted" />
                <p className="text-sm font-semibold">Your Agency Name</p>
                <div className="my-2 h-px w-8 bg-border/50" />
                <p className="text-xs text-muted-foreground">{previewLabel}</p>
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-8 rounded-lg bg-muted/50" />
                <div className="h-8 rounded-lg bg-muted/50" />
                <div className="h-16 rounded-lg bg-muted/50" />
              </div>
              {settings.show_powered_by && (
                <>
                  <div className="mx-auto my-3 h-px w-8 bg-border/50" />
                  <p className="text-center text-[10px] text-muted-foreground">
                    Powered by FindABATherapy
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <Button asChild variant="outline" size="sm">
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View Full Page
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

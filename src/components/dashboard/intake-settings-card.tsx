"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { updateIntakeFormSettings, type IntakeFormSettings } from "@/lib/actions/intake";

const COLOR_PRESETS = [
  { name: "Blue", value: "#5788FF" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Rose", value: "#F43F5E" },
  { name: "Orange", value: "#F97316" },
  { name: "Emerald", value: "#10B981" },
  { name: "Slate", value: "#475569" },
];

interface IntakeSettingsCardProps {
  listingSlug: string;
  settings: IntakeFormSettings;
}

export function IntakeSettingsCard({
  listingSlug,
  settings: initialSettings,
}: IntakeSettingsCardProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [customColor, setCustomColor] = useState(
    COLOR_PRESETS.some((p) => p.value === settings.background_color)
      ? ""
      : settings.background_color
  );

  const contactUrl = typeof window !== "undefined"
    ? `${window.location.origin}/contact/${listingSlug}`
    : `/contact/${listingSlug}`;

  const handleColorChange = (color: string) => {
    setSettings((prev) => ({ ...prev, background_color: color }));
    setCustomColor(COLOR_PRESETS.some((p) => p.value === color) ? "" : color);
    startTransition(async () => {
      await updateIntakeFormSettings({ background_color: color });
    });
  };

  const handleCustomColorChange = (value: string) => {
    setCustomColor(value);
    // Only update if valid hex color
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setSettings((prev) => ({ ...prev, background_color: value }));
      startTransition(async () => {
        await updateIntakeFormSettings({ background_color: value });
      });
    }
  };

  const handlePoweredByChange = (checked: boolean) => {
    setSettings((prev) => ({ ...prev, show_powered_by: checked }));
    startTransition(async () => {
      await updateIntakeFormSettings({ show_powered_by: checked });
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(contactUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = contactUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selectedPreset = COLOR_PRESETS.find((p) => p.value === settings.background_color);
  const isCustomColor = !selectedPreset && settings.background_color !== "#5788FF";

  return (
    <div className="space-y-6">
      {/* Share Card */}
      <Card className="border-border/60 bg-white">
        <CardHeader>
          <CardTitle className="text-foreground">Share Your Public Form</CardTitle>
          <CardDescription>
            A standalone contact form page you can link from anywhere. All submissions go to your Messages inbox.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
              <p className="truncate text-sm text-muted-foreground">{contactUrl}</p>
            </div>
            <Button
              onClick={handleCopyLink}
              className="shrink-0 gap-2"
              variant={copied ? "outline" : "default"}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Link
                </>
              )}
            </Button>
          </div>

          {/* Use cases */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <p className="mb-2 text-sm font-medium text-foreground">Ways to use this:</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                Link from your website&apos;s &quot;Contact Us&quot; button
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                Share directly with families via email or text
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                Add to your email signature
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                Post on social media or marketing materials
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card className="border-border/60 bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Customize Appearance</CardTitle>
              <CardDescription>
                Customize how your public form page looks to visitors.
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
            <Label className="text-sm font-medium">Background Color</Label>
            <div className="flex flex-wrap gap-3">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleColorChange(color.value)}
                  className={`group relative h-10 w-10 rounded-xl border-2 transition-all duration-200 hover:scale-110 ${
                    settings.background_color === color.value
                      ? "border-foreground ring-2 ring-foreground/20"
                      : "border-transparent hover:border-border"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {settings.background_color === color.value && (
                    <Check className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Color */}
          <div className="space-y-3">
            <Label htmlFor="custom-color" className="text-sm font-medium">
              Custom Color (Hex)
            </Label>
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 shrink-0 rounded-xl border-2 ${
                  isCustomColor ? "border-foreground ring-2 ring-foreground/20" : "border-border"
                }`}
                style={{ backgroundColor: customColor || settings.background_color }}
              />
              <Input
                id="custom-color"
                type="text"
                placeholder="#5788FF"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className="max-w-[150px] font-mono"
              />
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
            See how your public form will appear to visitors.
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
                <p className="text-xs text-muted-foreground">Interest Form</p>
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
              <a href={contactUrl} target="_blank" rel="noopener noreferrer">
                View Full Page
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

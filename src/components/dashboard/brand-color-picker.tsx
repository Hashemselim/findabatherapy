"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2, Pipette } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const BRAND_COLOR_PRESETS = [
  { name: "Blue", value: "#0866FF" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Rose", value: "#F43F5E" },
  { name: "Orange", value: "#F97316" },
  { name: "Emerald", value: "#10B981" },
  { name: "Slate", value: "#475569" },
] as const;

interface BrandColorPickerProps {
  value: string;
  onColorChange: (color: string) => Promise<void> | void;
  label?: string;
  description?: string;
}

function normalizeHex(value: string) {
  return value.trim().toUpperCase();
}

export function BrandColorPicker({
  value,
  onColorChange,
  label = "Brand color",
  description = "Use your primary brand color across your branded pages.",
}: BrandColorPickerProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [currentColor, setCurrentColor] = useState(normalizeHex(value || "#0866FF"));
  const [hexDraft, setHexDraft] = useState(normalizeHex(value || "#0866FF"));

  useEffect(() => {
    const normalized = normalizeHex(value || "#0866FF");
    setCurrentColor(normalized);
    setHexDraft(normalized);
  }, [value]);

  function persistColor(nextColor: string) {
    const normalized = normalizeHex(nextColor);
    setCurrentColor(normalized);
    setHexDraft(normalized);
    startTransition(async () => {
      await onColorChange(normalized);
    });
  }

  function handleCustomColorChange(nextValue: string) {
    const normalized = normalizeHex(nextValue);
    setHexDraft(normalized);
    if (/^#[0-9A-F]{6}$/.test(normalized)) {
      persistColor(normalized);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Label className="text-sm font-medium text-[#3c2f20]">{label}</Label>
          <p className="text-sm leading-6 text-[#6d5a3f]">{description}</p>
        </div>
        {isPending && (
          <div className="flex items-center gap-2 text-xs font-medium text-[#7b6b52]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {BRAND_COLOR_PRESETS.map((color) => {
          const isSelected = currentColor === normalizeHex(color.value);

          return (
            <button
              key={color.value}
              type="button"
              onClick={() => persistColor(color.value)}
              className={`relative h-11 w-11 rounded-2xl border-2 transition hover:scale-[1.04] ${
                isSelected
                  ? "border-[#2f2416] ring-4 ring-[#2f2416]/10"
                  : "border-transparent hover:border-[#d8c4a2]"
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            >
              {isSelected && (
                <Check className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-md" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className="h-11 w-11 shrink-0 rounded-2xl border border-[#d8c4a2]"
          style={{ backgroundColor: currentColor }}
        />
        <div className="flex flex-1 items-center gap-3">
          <Input
            type="text"
            value={hexDraft}
            onChange={(event) => handleCustomColorChange(event.target.value)}
            className="max-w-[160px] border-[#e4d4bd] font-mono"
            placeholder="#0866FF"
          />
          <input
            ref={colorInputRef}
            type="color"
            value={currentColor}
            onChange={(event) => persistColor(event.target.value)}
            className="sr-only"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 border-[#dfcfb6] bg-white"
            onClick={() => colorInputRef.current?.click()}
          >
            <Pipette className="h-4 w-4" />
            Pick
          </Button>
        </div>
      </div>
    </div>
  );
}

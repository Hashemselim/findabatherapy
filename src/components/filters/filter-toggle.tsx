"use client";

import type { LucideIcon } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface FilterToggleProps {
  /** Main label for the toggle */
  label: string;
  /** Optional description text */
  description?: string;
  /** Current checked state */
  checked: boolean;
  /** Called when toggle state changes */
  onChange: (checked: boolean) => void;
  /** Optional icon to display */
  icon?: LucideIcon;
  /** Optional className for the container */
  className?: string;
}

export function FilterToggle({
  label,
  description,
  checked,
  onChange,
  icon: Icon,
  className,
}: FilterToggleProps) {
  return (
    <div className={`flex items-center justify-between rounded-lg border p-4 ${className || ""}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

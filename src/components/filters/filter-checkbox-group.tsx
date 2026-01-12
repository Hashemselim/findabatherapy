"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterCheckboxGroupProps {
  /** Array of options with value and label */
  options: readonly FilterOption[] | FilterOption[];
  /** Currently selected values */
  selected: string[];
  /** Called when a value is toggled */
  onChange: (value: string) => void;
  /** Max height for scrollable lists (e.g., "12rem") */
  maxHeight?: string;
  /** Optional className for the container */
  className?: string;
}

export function FilterCheckboxGroup({
  options,
  selected,
  onChange,
  maxHeight,
  className,
}: FilterCheckboxGroupProps) {
  return (
    <div
      className={cn("space-y-2", className)}
      style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
    >
      {options.map((option) => (
        <div key={option.value} className="flex items-center space-x-2">
          <Checkbox
            id={`filter-${option.value}`}
            checked={selected.includes(option.value)}
            onCheckedChange={() => onChange(option.value)}
          />
          <Label
            htmlFor={`filter-${option.value}`}
            className="text-sm font-normal cursor-pointer"
          >
            {option.label}
          </Label>
        </div>
      ))}
    </div>
  );
}

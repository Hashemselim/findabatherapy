"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  /** Array of options with value and label */
  options: readonly FilterOption[] | FilterOption[];
  /** Currently selected value (undefined means "all") */
  value: string | undefined;
  /** Called when selection changes (undefined passed for "all") */
  onChange: (value: string | undefined) => void;
  /** Placeholder text shown when nothing selected */
  placeholder?: string;
  /** Label for the "all" option */
  allLabel?: string;
  /** Optional className for the trigger */
  className?: string;
}

export function FilterSelect({
  options,
  value,
  onChange,
  placeholder = "All",
  allLabel = "All",
  className,
}: FilterSelectProps) {
  return (
    <Select
      value={value || "all"}
      onValueChange={(val) => onChange(val === "all" ? undefined : val)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

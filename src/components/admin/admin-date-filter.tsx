"use client";

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type DatePreset = "today" | "7d" | "30d" | "90d" | "all" | "custom";

export interface DateRange {
  start: Date;
  end: Date;
}

interface AdminDateFilterProps {
  value: DatePreset;
  customRange?: DateRange;
  onChange: (preset: DatePreset, customRange?: DateRange) => void;
}

const presets: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "all", label: "All Time" },
];

export function AdminDateFilter({ value, customRange, onChange }: AdminDateFilterProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [tempStart, setTempStart] = useState<Date | undefined>(customRange?.start);
  const [tempEnd, setTempEnd] = useState<Date | undefined>(customRange?.end);

  const handlePresetClick = (preset: DatePreset) => {
    if (preset === "custom") {
      setIsCustomOpen(true);
    } else {
      onChange(preset);
    }
  };

  const handleApplyCustom = () => {
    if (tempStart && tempEnd) {
      onChange("custom", { start: tempStart, end: tempEnd });
      setIsCustomOpen(false);
    }
  };

  const getCustomLabel = () => {
    if (value === "custom" && customRange) {
      return `${format(customRange.start, "MMM d")} - ${format(customRange.end, "MMM d")}`;
    }
    return "Custom";
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => (
        <Button
          key={preset.value}
          variant={value === preset.value ? "default" : "outline"}
          size="sm"
          onClick={() => handlePresetClick(preset.value)}
        >
          {preset.label}
        </Button>
      ))}

      <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={value === "custom" ? "default" : "outline"}
            size="sm"
            className="min-w-[120px]"
          >
            <Calendar className="mr-2 h-4 w-4" />
            {getCustomLabel()}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex flex-col gap-4 p-4">
            <div className="flex gap-4">
              <div>
                <p className="mb-2 text-sm font-medium">Start Date</p>
                <CalendarComponent
                  mode="single"
                  selected={tempStart}
                  onSelect={setTempStart}
                  disabled={(date) => date > new Date() || (tempEnd ? date > tempEnd : false)}
                  initialFocus
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">End Date</p>
                <CalendarComponent
                  mode="single"
                  selected={tempEnd}
                  onSelect={setTempEnd}
                  disabled={(date) => date > new Date() || (tempStart ? date < tempStart : false)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsCustomOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleApplyCustom} disabled={!tempStart || !tempEnd}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function getDateRangeFromPreset(preset: DatePreset, customRange?: DateRange): DateRange | undefined {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today":
      return { start: today, end: now };
    case "7d":
      return { start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
    case "30d":
      return { start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
    case "90d":
      return { start: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000), end: now };
    case "all":
      return undefined;
    case "custom":
      return customRange;
  }
}

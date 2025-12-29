"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface LocationOption {
  id: string;
  label: string | null;
  city: string;
  state: string;
}

interface AnalyticsLocationFilterProps {
  locations: LocationOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}

export function AnalyticsLocationFilter({
  locations,
  selectedIds,
  onChange,
  className,
}: AnalyticsLocationFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allSelected = selectedIds.length === locations.length;
  const noneSelected = selectedIds.length === 0;

  const toggleLocation = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(locations.map((l) => l.id));
    }
  };

  const getDisplayText = () => {
    if (allSelected || noneSelected) {
      return "All Locations";
    }
    if (selectedIds.length === 1) {
      const loc = locations.find((l) => l.id === selectedIds[0]);
      return loc ? (loc.label || `${loc.city}, ${loc.state}`) : "1 location";
    }
    return `${selectedIds.length} of ${locations.length} locations`;
  };

  const getLocationLabel = (loc: LocationOption) => {
    return loc.label || `${loc.city}, ${loc.state}`;
  };

  if (locations.length <= 1) {
    return null;
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 gap-2"
      >
        <MapPin className="h-4 w-4" />
        <span>{getDisplayText()}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border border-border bg-background shadow-lg">
          <div className="p-2">
            {/* Select All option */}
            <button
              type="button"
              onClick={toggleAll}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <div
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border",
                  allSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/50"
                )}
              >
                {allSelected && <Check className="h-3 w-3" />}
              </div>
              <span className="font-medium">All Locations</span>
            </button>

            <div className="my-1 border-t border-border" />

            {/* Individual locations */}
            {locations.map((loc) => {
              const isSelected = selectedIds.includes(loc.id) || allSelected;
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => toggleLocation(loc.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/50"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 text-left">
                    <span className="block">{getLocationLabel(loc)}</span>
                    {loc.label && (
                      <span className="text-xs text-muted-foreground">
                        {loc.city}, {loc.state}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

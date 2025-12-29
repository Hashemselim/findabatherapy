"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SORT_OPTIONS,
  parseFiltersFromParams,
  parseOptionsFromParams,
  filtersToSearchParams,
} from "@/lib/search/filters";

interface SortToggleProps {
  className?: string;
}

export function SortToggle({ className }: SortToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const options = parseOptionsFromParams(searchParams);
  const currentSort = options.sortBy || "relevance";

  const handleSortChange = (value: string) => {
    const filters = parseFiltersFromParams(searchParams);
    const params = filtersToSearchParams(filters, {
      ...options,
      sortBy: value as "relevance" | "name" | "newest" | "distance",
      page: 1, // Reset to first page when sorting changes
    });
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className={className}>
      <Select value={currentSort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[160px]">
          <ArrowUpDown className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

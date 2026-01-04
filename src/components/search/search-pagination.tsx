"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { parseFiltersFromParams, parseOptionsFromParams, filtersToSearchParams } from "@/lib/search/filters";
import { cn } from "@/lib/utils";

interface SearchPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  className?: string;
}

export function SearchPagination({
  currentPage,
  totalPages,
  total,
  className,
}: SearchPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goToPage = (page: number) => {
    const filters = parseFiltersFromParams(searchParams);
    const options = parseOptionsFromParams(searchParams);
    const params = filtersToSearchParams(filters, { ...options, page });
    router.push(`/search?${params.toString()}`);
  };

  if (totalPages <= 1) {
    return null;
  }

  // Generate page numbers to show
  const pages = generatePageNumbers(currentPage, totalPages);

  return (
    <div className={cn("flex flex-col items-center gap-4 sm:flex-row sm:justify-between", className)}>
      <p className="text-sm text-muted-foreground">
        Showing page {currentPage} of {totalPages} ({total} results)
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="transition-all duration-300 ease-premium hover:border-[#5788FF]/50 hover:bg-[#5788FF]/10 hover:text-[#5788FF] disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map((page, index) => {
          if (page === "...") {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                ...
              </span>
            );
          }

          return (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="icon"
              onClick={() => goToPage(page)}
              className={cn(
                "transition-all duration-300 ease-premium",
                page === currentPage
                  ? "bg-[#5788FF] text-white hover:bg-[#4A7AEE]"
                  : "hover:border-[#5788FF]/50 hover:bg-[#5788FF]/10 hover:text-[#5788FF]"
              )}
            >
              {page}
            </Button>
          );
        })}

        <Button
          variant="outline"
          size="icon"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="transition-all duration-300 ease-premium hover:border-[#5788FF]/50 hover:bg-[#5788FF]/10 hover:text-[#5788FF] disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function generatePageNumbers(
  current: number,
  total: number
): Array<number | "..."> {
  const pages: Array<number | "..."> = [];
  const delta = 2; // Number of pages to show on each side of current

  // Always show first page
  pages.push(1);

  // Calculate start and end of page range
  const start = Math.max(2, current - delta);
  const end = Math.min(total - 1, current + delta);

  // Add ellipsis after first page if needed
  if (start > 2) {
    pages.push("...");
  }

  // Add page numbers
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  // Add ellipsis before last page if needed
  if (end < total - 1) {
    pages.push("...");
  }

  // Always show last page if more than 1 page
  if (total > 1) {
    pages.push(total);
  }

  return pages;
}

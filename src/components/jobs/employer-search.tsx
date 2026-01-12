"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function EmployerSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const query = searchParams.get("q") || "";
  const hiringOnly = searchParams.get("hiring") === "true";

  const updateParams = useCallback(
    (updates: { q?: string; hiring?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.q !== undefined) {
        if (updates.q) {
          params.set("q", updates.q);
        } else {
          params.delete("q");
        }
      }

      if (updates.hiring !== undefined) {
        if (updates.hiring) {
          params.set("hiring", "true");
        } else {
          params.delete("hiring");
        }
      }

      startTransition(() => {
        router.push(`/employers?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams]
  );

  const handleSearch = useCallback(
    (value: string) => {
      updateParams({ q: value });
    },
    [updateParams]
  );

  const handleHiringToggle = useCallback(
    (checked: boolean) => {
      updateParams({ hiring: checked });
    },
    [updateParams]
  );

  const handleClear = useCallback(() => {
    handleSearch("");
  }, [handleSearch]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search employers..."
          defaultValue={query}
          onChange={(e) => handleSearch(e.target.value)}
          className={`h-10 rounded-full border-border/60 bg-white pl-9 pr-9 transition-all duration-300 focus:border-emerald-500/50 focus:ring-emerald-500/20 ${
            isPending ? "opacity-70" : ""
          }`}
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full p-0 hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="hiring-filter"
          checked={hiringOnly}
          onCheckedChange={handleHiringToggle}
          className="data-[state=checked]:bg-emerald-600"
        />
        <Label
          htmlFor="hiring-filter"
          className="cursor-pointer text-sm font-medium text-muted-foreground"
        >
          Currently hiring
        </Label>
      </div>
    </div>
  );
}

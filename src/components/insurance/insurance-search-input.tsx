"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INSURANCES } from "@/lib/data/insurances";

export function InsuranceSearchInput() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredInsurances = useMemo(() => {
    if (!searchTerm.trim()) return INSURANCES;
    const term = searchTerm.toLowerCase();
    return INSURANCES.filter(
      (ins) =>
        ins.name.toLowerCase().includes(term) ||
        ins.shortName.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const handleSelect = (slug: string) => {
    router.push(`/insurance/${slug}`);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && filteredInsurances.length === 1) {
      handleSelect(filteredInsurances[0].slug);
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search insurance..."
            className="h-12 rounded-xl border-border/60 bg-muted/30 pl-10 text-base transition-all duration-300 ease-premium focus:border-violet-500/50 focus:bg-white focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)] md:text-sm"
          />
        </div>
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="h-12 shrink-0 rounded-xl bg-violet-600 px-4 text-white shadow-sm transition-all duration-300 ease-premium hover:-translate-y-[1px] hover:bg-violet-700 hover:shadow-md active:translate-y-0"
        >
          <Search className="h-5 w-5" />
        </Button>
      </div>

      {/* Dropdown */}
      {isOpen && searchTerm.trim() && (
        <div className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-border bg-white shadow-lg">
          {filteredInsurances.length > 0 ? (
            filteredInsurances.map((insurance) => (
              <button
                key={insurance.slug}
                onClick={() => handleSelect(insurance.slug)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-violet-50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10">
                  <Shield className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{insurance.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {insurance.shortName}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No insurance found matching &quot;{searchTerm}&quot;
            </div>
          )}
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && searchTerm.trim() && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

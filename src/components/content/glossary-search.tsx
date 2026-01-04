"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GlossaryTerm {
  term: string;
  definition: string;
  category: string;
}

interface GlossarySearchProps {
  terms: GlossaryTerm[];
}

export function GlossarySearch({ terms }: GlossarySearchProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Group terms by first letter
  const termsByLetter = useMemo(() => {
    return terms.reduce(
      (acc, item) => {
        const letter = item.term[0].toUpperCase();
        if (!acc[letter]) {
          acc[letter] = [];
        }
        acc[letter].push(item);
        return acc;
      },
      {} as Record<string, GlossaryTerm[]>
    );
  }, [terms]);

  // Get all unique letters that have terms
  const availableLetters = useMemo(
    () => Object.keys(termsByLetter).sort(),
    [termsByLetter]
  );

  // Filter terms based on search query
  const filteredTerms = useMemo(() => {
    if (!searchQuery.trim()) return null;

    const query = searchQuery.toLowerCase();
    return terms.filter(
      (item) =>
        item.term.toLowerCase().includes(query) ||
        item.definition.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    );
  }, [searchQuery, terms]);

  // Group filtered terms by letter
  const filteredByLetter = useMemo(() => {
    if (!filteredTerms) return null;

    return filteredTerms.reduce(
      (acc, item) => {
        const letter = item.term[0].toUpperCase();
        if (!acc[letter]) {
          acc[letter] = [];
        }
        acc[letter].push(item);
        return acc;
      },
      {} as Record<string, GlossaryTerm[]>
    );
  }, [filteredTerms]);

  const isSearching = searchQuery.trim().length > 0;
  const hasResults = filteredTerms && filteredTerms.length > 0;

  // Determine which letters to show in nav (highlight matching ones when searching)
  const currentTermsByLetter = isSearching && filteredByLetter ? filteredByLetter : termsByLetter;
  const currentAvailableLetters = Object.keys(currentTermsByLetter).sort();

  return (
    <div className="space-y-8">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search terms... (e.g., 'BCBA', 'reinforcement', 'DTT')"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 rounded-xl border-border/60 bg-white pl-12 pr-12 text-base transition-all duration-300 ease-premium focus:border-[#5788FF]/50 focus:shadow-[0_0_0_3px_rgba(87,136,255,0.1)]"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search results count */}
      {isSearching && (
        <p className="text-sm text-muted-foreground">
          {hasResults ? (
            <>
              Found {filteredTerms.length} term{filteredTerms.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
            </>
          ) : (
            <>No results found for &quot;{searchQuery}&quot;</>
          )}
        </p>
      )}

      {/* Alphabet Navigation */}
      <nav className="sticky top-4 z-10 rounded-xl border border-border bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap justify-center gap-1">
          {Array.from({ length: 26 }, (_, i) =>
            String.fromCharCode(65 + i)
          ).map((letter) => {
            const hasTerms = availableLetters.includes(letter);
            const hasMatchingTerms = isSearching
              ? currentAvailableLetters.includes(letter)
              : hasTerms;

            return (
              <a
                key={letter}
                href={hasMatchingTerms ? `#letter-${letter}` : undefined}
                className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                  hasMatchingTerms
                    ? "bg-[#5788FF]/10 text-[#5788FF] hover:bg-[#5788FF] hover:text-white"
                    : isSearching && hasTerms
                      ? "text-muted-foreground/40"
                      : "cursor-not-allowed text-muted-foreground/40"
                }`}
              >
                {letter}
              </a>
            );
          })}
        </div>
      </nav>

      {/* No results message */}
      {isSearching && !hasResults && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center">
          <Search className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-4 font-medium text-foreground">No terms found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try different keywords or browse the alphabet above
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setSearchQuery("")}
          >
            Clear search
          </Button>
        </div>
      )}

      {/* Terms by Letter */}
      {(isSearching ? hasResults : true) && (
        <div className="space-y-10">
          {(isSearching ? currentAvailableLetters : availableLetters).map((letter) => (
            <section key={letter} id={`letter-${letter}`}>
              <div className="sticky top-20 z-[5] -mx-4 mb-4 bg-white/95 px-4 py-2 backdrop-blur">
                <h2 className="text-3xl font-bold text-[#5788FF]">{letter}</h2>
              </div>

              <div className="space-y-4">
                {currentTermsByLetter[letter]?.map((item) => (
                  <Card key={item.term} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {isSearching ? (
                            <HighlightText text={item.term} query={searchQuery} />
                          ) : (
                            item.term
                          )}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {isSearching ? (
                          <HighlightText text={item.definition} query={searchQuery} />
                        ) : (
                          item.definition
                        )}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper component to highlight search matches
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="rounded bg-[#FEE720]/50 px-0.5 text-inherit">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X, ArrowRight, HelpCircle, BookOpen, type LucideIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FAQ {
  question: string;
  answer: string;
  link?: string;
}

interface FAQCategoryInput {
  id: string;
  title: string;
  iconName: "BookOpen" | "HelpCircle" | "Search";
  faqs: FAQ[];
}

interface FAQSearchProps {
  categories: FAQCategoryInput[];
}

// Map icon names to actual icons
const iconMap: Record<string, LucideIcon> = {
  BookOpen,
  HelpCircle,
  Search,
};

export function FAQSearch({ categories }: FAQSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Flatten all FAQs with category info for searching
  const allFaqs = useMemo(() => {
    return categories.flatMap((cat) =>
      cat.faqs.map((faq) => ({
        ...faq,
        categoryId: cat.id,
        categoryTitle: cat.title,
        iconName: cat.iconName,
      }))
    );
  }, [categories]);

  // Filter FAQs based on search query
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return null;

    const query = searchQuery.toLowerCase();
    return allFaqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
    );
  }, [searchQuery, allFaqs]);

  // Group filtered results by category
  const groupedResults = useMemo(() => {
    if (!filteredResults) return null;

    return filteredResults.reduce(
      (acc, faq) => {
        if (!acc[faq.categoryId]) {
          acc[faq.categoryId] = {
            title: faq.categoryTitle,
            iconName: faq.iconName,
            faqs: [],
          };
        }
        acc[faq.categoryId].faqs.push(faq);
        return acc;
      },
      {} as Record<string, { title: string; iconName: string; faqs: FAQ[] }>
    );
  }, [filteredResults]);

  const isSearching = searchQuery.trim().length > 0;
  const hasResults = filteredResults && filteredResults.length > 0;

  return (
    <div className="space-y-8">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search questions... (e.g., 'insurance', 'cost', 'how long')"
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

      {/* Search Results */}
      {isSearching && (
        <div className="space-y-6">
          {hasResults ? (
            <>
              <p className="text-sm text-muted-foreground">
                Found {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
              </p>

              {groupedResults &&
                Object.entries(groupedResults).map(([categoryId, category]) => {
                  const CategoryIcon = iconMap[category.iconName] || HelpCircle;
                  return (
                    <section key={categoryId}>
                      <div className="mb-4 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5788FF]/10">
                          <CategoryIcon className="h-4 w-4 text-[#5788FF]" />
                        </div>
                        <h3 className="font-semibold">{category.title}</h3>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {category.faqs.length}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {category.faqs.map((faq, index) => (
                          <Card key={index} className="border-[#5788FF]/20 bg-[#5788FF]/[0.02]">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base font-medium">
                                <HighlightText text={faq.question} query={searchQuery} />
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground">
                                <HighlightText text={faq.answer} query={searchQuery} />
                              </p>
                              {faq.link && (
                                <Link
                                  href={faq.link}
                                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#5788FF] hover:underline"
                                >
                                  Learn more
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </section>
                  );
                })}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center">
              <Search className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-4 font-medium text-foreground">No results found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try different keywords or browse categories below
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
        </div>
      )}

      {/* Quick Navigation - shown when not searching */}
      {!isSearching && (
        <nav className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Jump to section:
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                {category.title}
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* FAQ Categories - shown when not searching */}
      {!isSearching && (
        <div className="space-y-12">
          {categories.map((category) => {
            const CategoryIcon = iconMap[category.iconName] || HelpCircle;
            return (
              <section key={category.id} id={category.id}>
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5788FF]/10">
                    <CategoryIcon className="h-5 w-5 text-[#5788FF]" />
                  </div>
                  <h2 className="text-2xl font-semibold">{category.title}</h2>
                </div>

                <div className="space-y-4">
                  {category.faqs.map((faq, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium">
                          {faq.question}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {faq.answer}
                        </p>
                        {faq.link && (
                          <Link
                            href={faq.link}
                            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#5788FF] hover:underline"
                          >
                            Learn more
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
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

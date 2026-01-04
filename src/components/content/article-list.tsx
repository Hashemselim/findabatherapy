"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Clock, ArrowRight, BookOpen, Lightbulb, Scale, Workflow, X, Search, Sparkles } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ARTICLES, ARTICLE_CATEGORIES, getFeaturedArticles, type Article } from "@/lib/content/articles";

const categoryIcons = {
  guide: BookOpen,
  education: Lightbulb,
  comparison: Scale,
  process: Workflow,
};

type CategoryKey = keyof typeof ARTICLE_CATEGORIES;

export function ArticleList() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const featuredArticles = getFeaturedArticles();

  const filteredArticles = useMemo(() => {
    let articles = ARTICLES;

    // Filter by category
    if (selectedCategory !== "all") {
      articles = articles.filter((article) => article.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      articles = articles.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.description.toLowerCase().includes(query)
      );
    }

    return articles;
  }, [selectedCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: ARTICLES.length };
    Object.keys(ARTICLE_CATEGORIES).forEach((cat) => {
      counts[cat] = ARTICLES.filter((a) => a.category === cat).length;
    });
    return counts;
  }, []);

  const clearFilters = () => {
    setSelectedCategory("all");
    setSearchQuery("");
  };

  const hasActiveFilters = selectedCategory !== "all" || searchQuery.trim() !== "";

  return (
    <div className="space-y-8">
      {/* Search and Category Filters */}
      <section className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 rounded-xl border-border/60 bg-white pl-12 text-base transition-all duration-300 ease-premium focus:border-[#5788FF]/50 focus:shadow-[0_0_0_3px_rgba(87,136,255,0.1)]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
            className={`rounded-full transition-all duration-300 ease-premium hover:-translate-y-[1px] ${
              selectedCategory === "all"
                ? "bg-[#5788FF] text-white shadow-[0_4px_14px_rgba(87,136,255,0.3)] hover:bg-[#4A7AEE] hover:shadow-[0_6px_20px_rgba(87,136,255,0.35)]"
                : "border-border/60 hover:border-[#5788FF]/30 hover:bg-[#5788FF]/5 hover:shadow-[0_4px_12px_rgba(87,136,255,0.1)]"
            }`}
          >
            All Articles
            <Badge variant="secondary" className={`ml-2 rounded-full px-2 transition-all duration-300 ${selectedCategory === "all" ? "bg-white/20 text-white" : "bg-muted"}`}>
              {categoryCounts.all}
            </Badge>
          </Button>

          {(Object.keys(ARTICLE_CATEGORIES) as CategoryKey[]).map((category) => {
            const Icon = categoryIcons[category];
            const info = ARTICLE_CATEGORIES[category];
            const isSelected = selectedCategory === category;

            return (
              <Button
                key={category}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full transition-all duration-300 ease-premium hover:-translate-y-[1px] ${
                  isSelected
                    ? "bg-[#5788FF] text-white shadow-[0_4px_14px_rgba(87,136,255,0.3)] hover:bg-[#4A7AEE] hover:shadow-[0_6px_20px_rgba(87,136,255,0.35)]"
                    : "border-border/60 hover:border-[#5788FF]/30 hover:bg-[#5788FF]/5 hover:shadow-[0_4px_12px_rgba(87,136,255,0.1)]"
                }`}
              >
                <Icon className="mr-1.5 h-3.5 w-3.5 transition-transform duration-300 ease-bounce-sm" />
                {info.label}
                <Badge
                  variant="secondary"
                  className={`ml-2 rounded-full px-2 transition-all duration-300 ${isSelected ? "bg-white/20 text-white" : "bg-muted"}`}
                >
                  {categoryCounts[category]}
                </Badge>
              </Button>
            );
          })}
        </div>

        {/* Active filters indicator */}
        {hasActiveFilters && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-50/50 px-4 py-2.5 text-sm text-amber-800">
            <span className="font-medium">
              Showing {filteredArticles.length} of {ARTICLES.length} articles
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-auto rounded-full p-1.5 text-amber-700 transition-all duration-300 ease-premium hover:bg-amber-100 hover:text-amber-900"
            >
              <X className="h-3.5 w-3.5" />
              <span className="ml-1">Clear</span>
            </Button>
          </div>
        )}
      </section>

      {/* Featured Articles - Show only when no filters active */}
      {!hasActiveFilters && featuredArticles.length > 0 && (
        <section>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFF5C2]">
              <Sparkles className="h-6 w-6 text-[#5788FF]" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Start here
              </p>
              <h2 className="mt-1 text-3xl font-semibold">Featured Guides</h2>
              <p className="mt-2 max-w-lg text-muted-foreground">
                Essential reading for families starting their ABA journey.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featuredArticles.slice(0, 3).map((article) => (
              <ArticleCard key={article.slug} article={article} featured />
            ))}
          </div>
        </section>
      )}

      {/* All/Filtered Articles */}
      <section>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10">
            <BookOpen className="h-6 w-6 text-[#5788FF]" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {hasActiveFilters ? "Filtered results" : "Explore all"}
            </p>
            <h2 className="mt-1 text-3xl font-semibold">
              {hasActiveFilters
                ? selectedCategory !== "all"
                  ? `${ARTICLE_CATEGORIES[selectedCategory].label} Articles`
                  : "Search Results"
                : "All Resources"}
            </h2>
            <p className="mt-2 max-w-lg text-muted-foreground">
              {hasActiveFilters
                ? `${filteredArticles.length} article${filteredArticles.length !== 1 ? "s" : ""} found`
                : "Browse all our ABA therapy guides and resources."}
            </p>
          </div>
        </div>

        {filteredArticles.length > 0 ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {filteredArticles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-muted/20 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 font-medium text-foreground">No articles found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters</p>
            <Button
              variant="outline"
              onClick={clearFilters}
              className="mt-5 rounded-full border-border/60 transition-all duration-300 ease-premium hover:-translate-y-[1px] hover:border-[#5788FF]/30 hover:bg-[#5788FF]/5 hover:shadow-[0_4px_12px_rgba(87,136,255,0.1)]"
            >
              Clear filters
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

// Article Card Component
function ArticleCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  const Icon = categoryIcons[article.category];
  const categoryInfo = ARTICLE_CATEGORIES[article.category];

  if (featured) {
    return (
      <Link href={`/learn/${article.slug}`} className="group">
        <Card className="h-full border border-border/60 bg-white transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-[#5788FF]/30 hover:shadow-[0_8px_30px_rgba(87,136,255,0.1)]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className={`${categoryInfo.color} transition-all duration-300 ease-premium group-hover:scale-[1.02]`}>
                <Icon className="mr-1.5 h-3.5 w-3.5 transition-transform duration-300 ease-bounce-sm group-hover:scale-[1.1]" />
                {categoryInfo.label}
              </Badge>
              <span className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground transition-all duration-300 group-hover:bg-[#5788FF]/10 group-hover:text-[#5788FF]">
                <Clock className="h-3 w-3" />
                {article.readTime} min
              </span>
            </div>
            <CardTitle className="mt-4 text-lg leading-snug transition-colors duration-300 group-hover:text-[#5788FF]">
              {article.title}
            </CardTitle>
            <CardDescription className="line-clamp-2">{article.description}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <span className="inline-flex items-center gap-1 text-sm font-medium text-[#5788FF] transition-all duration-300 ease-premium group-hover:gap-1.5">
              Read guide
              <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover:translate-x-0.5" />
            </span>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/learn/${article.slug}`} className="group">
      <Card className="h-full border border-border/60 bg-white transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-[#5788FF]/30 hover:shadow-[0_8px_30px_rgba(87,136,255,0.1)]">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className={`${categoryInfo.color} transition-all duration-300 ease-premium group-hover:scale-[1.02]`}>
              <Icon className="mr-1.5 h-3.5 w-3.5 transition-transform duration-300 ease-bounce-sm group-hover:scale-[1.1]" />
              {categoryInfo.label}
            </Badge>
            <span className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground transition-all duration-300 group-hover:bg-[#5788FF]/10 group-hover:text-[#5788FF]">
              <Clock className="h-3 w-3" />
              {article.readTime} min
            </span>
          </div>
          <h3 className="font-semibold leading-tight transition-colors duration-300 group-hover:text-[#5788FF]">
            {article.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{article.description}</p>
          <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-[#5788FF] transition-all duration-300 ease-premium group-hover:gap-1.5">
            Read article
            <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover:translate-x-0.5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

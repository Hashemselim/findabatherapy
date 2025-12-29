"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Clock, ArrowRight, BookOpen, Lightbulb, Scale, Workflow, Filter, X, Search } from "lucide-react";

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
      {/* Category Filters */}
      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter by category</span>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
            className="rounded-full"
          >
            All Articles
            <Badge variant="secondary" className={`ml-2 rounded-full px-2 ${selectedCategory === "all" ? "bg-white/20" : ""}`}>
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
                className="rounded-full"
              >
                <Icon className="mr-1 h-3 w-3" />
                {info.label}
                <Badge
                  variant="secondary"
                  className={`ml-2 rounded-full px-2 ${isSelected ? "bg-white/20" : ""}`}
                >
                  {categoryCounts[category]}
                </Badge>
              </Button>
            );
          })}
        </div>

        {/* Active filters indicator */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Showing {filteredArticles.length} of {ARTICLES.length} articles
            </span>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-1">
              <X className="mr-1 h-3 w-3" />
              Clear filters
            </Button>
          </div>
        )}
      </section>

      {/* Featured Articles - Show only when no filters active */}
      {!hasActiveFilters && featuredArticles.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold">Featured Guides</h2>
          <p className="mt-2 text-muted-foreground">
            Essential reading for families starting their ABA journey.
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredArticles.slice(0, 3).map((article) => (
              <ArticleCard key={article.slug} article={article} featured />
            ))}
          </div>
        </section>
      )}

      {/* All/Filtered Articles */}
      <section>
        <h2 className="text-2xl font-semibold">
          {hasActiveFilters
            ? selectedCategory !== "all"
              ? `${ARTICLE_CATEGORIES[selectedCategory].label} Articles`
              : "Search Results"
            : "All Resources"}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {hasActiveFilters
            ? `${filteredArticles.length} article${filteredArticles.length !== 1 ? "s" : ""} found`
            : "Browse all our ABA therapy guides and resources."}
        </p>

        {filteredArticles.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {filteredArticles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        ) : (
          <div className="mt-8 text-center">
            <p className="text-muted-foreground">No articles found matching your criteria.</p>
            <Button variant="outline" onClick={clearFilters} className="mt-4">
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
      <Link href={`/learn/${article.slug}`}>
        <Card className="group h-full border border-border/70 transition-all hover:border-primary hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className={categoryInfo.color}>
                <Icon className="mr-1 h-3 w-3" />
                {categoryInfo.label}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {article.readTime} min read
              </span>
            </div>
            <CardTitle className="mt-3 text-lg group-hover:text-primary">
              {article.title}
            </CardTitle>
            <CardDescription className="line-clamp-2">{article.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="inline-flex items-center text-sm font-medium text-[#5788FF]">
              Read article
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/learn/${article.slug}`}>
      <Card className="group h-full border border-border/70 transition-all hover:border-primary hover:shadow-sm">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className={categoryInfo.color}>
              <Icon className="mr-1 h-3 w-3" />
              {categoryInfo.label}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {article.readTime} min
            </span>
          </div>
          <h3 className="font-semibold leading-tight group-hover:text-primary">
            {article.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{article.description}</p>
          <span className="mt-auto inline-flex items-center text-sm font-medium text-[#5788FF]">
            Read article
            <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

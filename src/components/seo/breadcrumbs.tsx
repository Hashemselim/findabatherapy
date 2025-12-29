"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

import { JsonLd } from "./json-ld";
import { generateBreadcrumbSchema } from "@/lib/seo/schemas";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  // Add home as first item if not present
  const allItems: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    ...items,
  ];

  // Generate schema data
  const schemaData = generateBreadcrumbSchema(
    allItems.map((item) => ({
      name: item.label,
      url: item.href,
    }))
  );

  return (
    <>
      <JsonLd data={schemaData} />
      <nav
        aria-label="Breadcrumb"
        className={cn("flex items-center gap-1 text-sm text-muted-foreground", className)}
      >
        <ol className="flex items-center gap-1">
          {allItems.map((item, index) => {
            const isLast = index === allItems.length - 1;
            const isFirst = index === 0;

            return (
              <li key={item.href} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight className="h-3 w-3 flex-shrink-0" aria-hidden />
                )}
                {isLast ? (
                  <span className="font-medium text-foreground" aria-current="page">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    {isFirst && <Home className="h-3 w-3" aria-hidden />}
                    <span className={cn(isFirst && "sr-only sm:not-sr-only")}>
                      {item.label}
                    </span>
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

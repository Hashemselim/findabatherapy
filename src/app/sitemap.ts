import type { MetadataRoute } from "next";

import { createClient } from "@/lib/supabase/server";
import { getAllCities, STATE_NAMES } from "@/lib/data/cities";
import { INSURANCES } from "@/lib/data/insurances";
import { ARTICLES } from "@/lib/content/articles";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.findabatherapy.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  // Get all published listings for provider pages
  const { data: listings } = await supabase
    .from("listings")
    .select("slug, updated_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  const providerPages: MetadataRoute.Sitemap = (listings || []).map((listing) => ({
    url: `${BASE_URL}/provider/${listing.slug}`,
    lastModified: new Date(listing.updated_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/states`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/get-listed`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/learn`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/legal/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/legal/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Insurance pages (highest SEO value)
  const insurancePages: MetadataRoute.Sitemap = INSURANCES.map((insurance) => ({
    url: `${BASE_URL}/insurance/${insurance.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 1.0,
  }));

  // State pages
  const statePages: MetadataRoute.Sitemap = Object.entries(STATE_NAMES).map(
    ([, name]) => ({
      url: `${BASE_URL}/${name.toLowerCase().replace(/\s+/g, "-")}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    })
  );

  // City pages
  const allCities = getAllCities();
  const cityPages: MetadataRoute.Sitemap = allCities.map((city) => ({
    url: `${BASE_URL}/${city.stateName.toLowerCase().replace(/\s+/g, "-")}/${city.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  // Article pages (Learn section)
  const articlePages: MetadataRoute.Sitemap = ARTICLES.map((article) => ({
    url: `${BASE_URL}/learn/${article.slug}`,
    lastModified: new Date(article.updatedAt || article.publishedAt),
    changeFrequency: "monthly" as const,
    priority: article.featured ? 0.9 : 0.8,
  }));

  return [
    ...staticPages,
    ...insurancePages,
    ...statePages,
    ...cityPages,
    ...articlePages,
    ...providerPages,
  ];
}

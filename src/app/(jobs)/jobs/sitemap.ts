import type { MetadataRoute } from "next";

import { createClient } from "@/lib/supabase/server";
import { STATE_NAMES } from "@/lib/data/cities";
import { getBaseUrl } from "@/lib/utils/domains";

// Use the jobs domain for sitemap URLs (safe - never returns localhost in production)
const BASE_URL = getBaseUrl("jobs");

// Position types for category pages
const POSITION_TYPES = [
  "bcba",
  "bcaba",
  "rbt",
  "bt",
  "clinical-director",
  "regional-director",
  "executive-director",
  "admin",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  // Get all active job listings
  const { data: jobs } = await supabase
    .from("jobs")
    .select("slug, updated_at")
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  const jobPages: MetadataRoute.Sitemap = (jobs || []).map((job) => ({
    url: `${BASE_URL}/job/${job.slug}`,
    lastModified: new Date(job.updated_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/jobs`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/jobs/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/employers`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  // Position type pages (e.g., /bcba-jobs, /rbt-jobs)
  const positionPages: MetadataRoute.Sitemap = POSITION_TYPES.map((position) => ({
    url: `${BASE_URL}/${position}-jobs`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.95,
  }));

  // State pages for jobs (e.g., /jobs/california)
  const statePages: MetadataRoute.Sitemap = Object.entries(STATE_NAMES).map(
    ([, name]) => ({
      url: `${BASE_URL}/jobs/${name.toLowerCase().replace(/\s+/g, "-")}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    })
  );

  // Get employers with career pages
  const { data: employers } = await supabase
    .from("listings")
    .select("slug, updated_at")
    .eq("status", "published")
    .eq("has_career_page", true);

  const employerCareerPages: MetadataRoute.Sitemap = (employers || []).map(
    (employer) => ({
      url: `${BASE_URL}/provider/${employer.slug}/careers`,
      lastModified: new Date(employer.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })
  );

  return [
    ...staticPages,
    ...positionPages,
    ...statePages,
    ...jobPages,
    ...employerCareerPages,
  ];
}

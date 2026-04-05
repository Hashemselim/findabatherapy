import type { MetadataRoute } from "next";

import { isConvexDataEnabled } from "@/lib/platform/config";
import { filterPublicProfiles } from "@/lib/public-visibility";
import { STATE_NAMES } from "@/lib/data/cities";
import { getBaseUrl } from "@/lib/utils/domains";
import { getJobsEmployersPath, getJobsPostPath, getJobsRolePath } from "@/lib/utils/public-paths";

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

async function getJobAndEmployerPages(): Promise<{
  jobPages: MetadataRoute.Sitemap;
  employerCareerPages: MetadataRoute.Sitemap;
}> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
      const jobSlugs = await queryConvexUnauthenticated<Array<{ slug: string; updatedAt: string }>>(
        "jobs:getPublishedJobSlugs",
      );
      const jobPages: MetadataRoute.Sitemap = (jobSlugs || []).map((job) => ({
        url: `${BASE_URL}${getJobsPostPath(job.slug)}`,
        lastModified: new Date(job.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));

      const employerSlugs = await queryConvexUnauthenticated<Array<{ slug: string; updatedAt: string }>>(
        "listings:getPublishedListingSlugs",
      );
      const employerCareerPages: MetadataRoute.Sitemap = (employerSlugs || []).map((employer) => ({
        url: `${BASE_URL}/provider/${employer.slug}/careers`,
        lastModified: new Date(employer.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));

      return { jobPages, employerCareerPages };
    } catch {
      return { jobPages: [], employerCareerPages: [] };
    }
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("slug, updated_at")
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  const jobPages: MetadataRoute.Sitemap = (jobs || []).map((job) => ({
    url: `${BASE_URL}${getJobsPostPath(job.slug)}`,
    lastModified: new Date(job.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const { data: employers } = await supabase
    .from("listings")
    .select("slug, updated_at, profiles!inner(contact_email, is_seeded)")
    .eq("status", "published")
    .eq("has_career_page", true);

  const employerCareerPages: MetadataRoute.Sitemap = filterPublicProfiles(
    employers || [],
    (employer) =>
      employer.profiles as {
        contact_email?: string | null;
        is_seeded?: boolean | null;
      }
  ).map(
    (employer) => ({
      url: `${BASE_URL}/provider/${employer.slug}/careers`,
      lastModified: new Date(employer.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })
  );

  return { jobPages, employerCareerPages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { jobPages, employerCareerPages } = await getJobAndEmployerPages();

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
      url: `${BASE_URL}${getJobsEmployersPath()}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  // Position type pages under the GoodABA jobs namespace.
  const positionPages: MetadataRoute.Sitemap = POSITION_TYPES.map((position) => ({
    url: `${BASE_URL}${getJobsRolePath(position)}`,
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

  return [
    ...staticPages,
    ...positionPages,
    ...statePages,
    ...jobPages,
    ...employerCareerPages,
  ];
}

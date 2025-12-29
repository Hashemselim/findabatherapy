import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.findabatherapy.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/auth/",
          "/api/",
          "/auth/callback",
          "/auth/confirm",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

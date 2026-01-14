import type { Metadata } from "next";
import { PropsWithChildren } from "react";

import { JobsHeader } from "@/components/jobs/jobs-header";
import { JobsFooter } from "@/components/jobs/jobs-footer";
import { jobsConfig } from "@/config/jobs";

const BASE_URL = "https://www.findabajobs.org";

export const metadata: Metadata = {
  title: {
    default: `${jobsConfig.name} | ${jobsConfig.tagline}`,
    template: `%s | ${jobsConfig.name}`,
  },
  description: jobsConfig.description,
  metadataBase: new URL(BASE_URL),
  keywords: jobsConfig.seo.keywords,
  authors: [{ name: jobsConfig.name, url: BASE_URL }],
  creator: jobsConfig.name,
  publisher: jobsConfig.name,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: jobsConfig.name,
    title: `${jobsConfig.name} | ${jobsConfig.tagline}`,
    description: jobsConfig.description,
    images: [
      {
        url: `${BASE_URL}/api/og?brand=jobs&title=${encodeURIComponent(jobsConfig.name)}&subtitle=${encodeURIComponent(jobsConfig.tagline)}`,
        width: 1200,
        height: 630,
        alt: jobsConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${jobsConfig.name} | ${jobsConfig.tagline}`,
    description: jobsConfig.description,
    images: [
      `${BASE_URL}/api/og?brand=jobs&title=${encodeURIComponent(jobsConfig.name)}&subtitle=${encodeURIComponent(jobsConfig.tagline)}`,
    ],
    creator: "@findabajobs",
    site: "@findabajobs",
  },
  other: {
    "theme-color": "#10B981",
    "msapplication-TileColor": "#10B981",
  },
};

export default function JobsLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <JobsHeader />
      <main className="flex-1">{children}</main>
      <JobsFooter />
    </div>
  );
}

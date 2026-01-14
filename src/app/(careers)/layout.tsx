import type { Metadata } from "next";
import { PropsWithChildren } from "react";

import { jobsConfig } from "@/config/jobs";

const BASE_URL = "https://www.findabajobs.org";

/**
 * Careers Layout - Minimal layout for private branded job boards
 *
 * This layout intentionally excludes the main site navigation (JobsHeader/JobsFooter)
 * to provide a clean, branded experience for providers to share with candidates.
 * Providers can link to their careers page from:
 * - Their company website careers section
 * - Indeed/LinkedIn/other job board postings
 * - Internal employee referral programs
 */

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: jobsConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    creator: "@findabajobs",
    site: "@findabajobs",
  },
  other: {
    "theme-color": "#10B981",
  },
};

export default function CareersLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex-1">{children}</main>
    </div>
  );
}

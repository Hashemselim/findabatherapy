import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { PropsWithChildren } from "react";

import "./globals.css";
import { Providers } from "@/components/providers";
import { siteConfig } from "@/config/site";
import { JsonLd } from "@/components/seo/json-ld";
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
} from "@/lib/seo/schemas";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

const BASE_URL = "https://www.findabatherapy.org";

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} | ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description:
    "Search a nationwide directory of ABA therapy agencies offering in-home and center-based services. Compare plans, explore sponsored providers, and get connected quickly.",
  metadataBase: new URL(BASE_URL),
  keywords: [
    ...siteConfig.seo.keywords,
    "aba therapy near me",
    "autism therapy providers",
    "applied behavior analysis",
    "aba therapy for autism",
    "in-home aba therapy",
    "center-based aba therapy",
  ],
  authors: [{ name: siteConfig.name, url: BASE_URL }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  // Google Search Console verification - replace with your actual verification code
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
  },
  // Mobile/PWA meta tags
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteConfig.name,
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: siteConfig.name,
    title: `${siteConfig.name} | ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [
      {
        url: `${BASE_URL}/api/og?title=${encodeURIComponent(siteConfig.name)}&subtitle=${encodeURIComponent(siteConfig.tagline)}`,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} | ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [
      `${BASE_URL}/api/og?title=${encodeURIComponent(siteConfig.name)}&subtitle=${encodeURIComponent(siteConfig.tagline)}`,
    ],
    creator: "@findabatherapy",
    site: "@findabatherapy",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
  other: {
    "theme-color": "#5788FF",
    "msapplication-TileColor": "#5788FF",
  },
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className="scroll-smooth bg-background antialiased">
      <head>
        <JsonLd data={[generateOrganizationSchema(), generateWebSiteSchema()]} />
      </head>
      <body className={`${poppins.variable} min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

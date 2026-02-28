import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PropsWithChildren } from "react";

import { getProviderWebsiteData } from "@/lib/actions/provider-website";
import { WebsiteProvider } from "@/components/website/layout/website-provider";
import { WebsiteNav } from "@/components/website/layout/website-nav";
import { WebsiteFooter } from "@/components/website/layout/website-footer";
import { WebsiteWatermark } from "@/components/website/layout/website-watermark";

type WebsiteLayoutProps = PropsWithChildren<{
  params: Promise<{ slug: string }>;
}>;

// ISR — revalidate every 5 minutes
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProviderWebsiteData(slug);

  if (!result.success) {
    return { title: "Provider Website" };
  }

  const { data: provider } = result;

  return {
    title: {
      default: provider.profile.agencyName,
      template: `%s | ${provider.profile.agencyName}`,
    },
    description:
      provider.summary ||
      provider.description ||
      `${provider.profile.agencyName} — ABA therapy services for children and families.`,
    openGraph: {
      title: provider.profile.agencyName,
      description:
        provider.summary ||
        provider.description ||
        `${provider.profile.agencyName} — ABA therapy services`,
      type: "website",
      ...(provider.logoUrl ? { images: [{ url: provider.logoUrl }] } : {}),
    },
  };
}

export default async function WebsiteSlugLayout({
  params,
  children,
}: WebsiteLayoutProps) {
  const { slug } = await params;
  const result = await getProviderWebsiteData(slug);

  if (!result.success) {
    notFound();
  }

  const provider = result.data;

  // Only render published websites
  if (!provider.websitePublished) {
    notFound();
  }

  return (
    <WebsiteProvider provider={provider}>
      <div className="flex min-h-screen flex-col bg-white">
        <WebsiteNav />
        <main className="flex-1">{children}</main>
        <WebsiteFooter />
        <WebsiteWatermark />
      </div>
    </WebsiteProvider>
  );
}

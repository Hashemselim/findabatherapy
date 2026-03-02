import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PropsWithChildren } from "react";

import { getProviderWebsiteData } from "@/lib/actions/provider-website";
import { WebsiteProvider } from "@/components/website/layout/website-provider";
import { WebsiteNav } from "@/components/website/layout/website-nav";
import { WebsiteFooter } from "@/components/website/layout/website-footer";
import { WebsiteWatermark } from "@/components/website/layout/website-watermark";
import { PreviewBanner } from "@/components/ui/preview-banner";

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
  const isPreview =
    provider.profile.planTier === "free" ||
    (provider.profile.subscriptionStatus !== "active" &&
      provider.profile.subscriptionStatus !== "trialing");

  // Only render published websites
  if (!provider.websitePublished) {
    notFound();
  }

  return (
    <WebsiteProvider provider={provider}>
      <div className="flex min-h-screen flex-col bg-white">
        {isPreview && (
          <PreviewBanner
            variant="public"
            message="This website is in preview mode. Activate your account to go live."
            triggerFeature="provider_website"
          />
        )}
        <WebsiteNav />
        <main className="flex-1">{children}</main>
        <WebsiteFooter />
        <WebsiteWatermark />
      </div>
    </WebsiteProvider>
  );
}

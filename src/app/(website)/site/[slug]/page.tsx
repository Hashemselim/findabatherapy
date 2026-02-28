import { notFound } from "next/navigation";

import { getProviderWebsiteData } from "@/lib/actions/provider-website";
import { ModernHome } from "@/components/website/templates/modern/modern-home";

type HomePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function WebsiteHomePage({ params }: HomePageProps) {
  const { slug } = await params;
  const result = await getProviderWebsiteData(slug);

  if (!result.success) {
    notFound();
  }

  return (
    <ModernHome sectionsOrder={result.data.websiteSettings.sections_order} />
  );
}

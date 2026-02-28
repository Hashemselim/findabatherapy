import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Briefcase } from "lucide-react";

import { getProviderWebsiteData } from "@/lib/actions/provider-website";
import { getJobsByProvider } from "@/lib/queries/jobs";
import { BrandedJobCard } from "@/components/jobs/branded-job-card";

type CareersPageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export async function generateMetadata({
  params,
}: CareersPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProviderWebsiteData(slug);

  if (!result.success) {
    return { title: "Careers" };
  }

  return {
    title: `Careers`,
    description: `Join the team at ${result.data.profile.agencyName}. View open positions and apply today.`,
  };
}

export default async function WebsiteCareersPage({
  params,
}: CareersPageProps) {
  const { slug } = await params;
  const [providerResult, jobs] = await Promise.all([
    getProviderWebsiteData(slug),
    getJobsByProvider(slug),
  ]);

  if (!providerResult.success) {
    notFound();
  }

  const provider = providerResult.data;
  const brandColor = provider.profile.intakeFormSettings.background_color;

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <span
            className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
            style={{
              backgroundColor: `${brandColor}15`,
              color: brandColor,
            }}
          >
            <Briefcase className="h-3.5 w-3.5" />
            Careers
          </span>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">
            Join Our Team
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-gray-500">
            We&apos;re looking for passionate professionals to help children
            and families thrive. Explore our open positions below.
          </p>
        </div>

        {/* Job Listings */}
        {jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map((job, index) => (
              <BrandedJobCard
                key={job.id}
                job={job}
                providerSlug={slug}
                index={index}
                brandColor={brandColor}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-gray-50/50 py-16 text-center">
            <Briefcase className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No Open Positions
            </h3>
            <p className="mt-2 text-gray-500">
              We don&apos;t have any open positions right now, but check back
              soon!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

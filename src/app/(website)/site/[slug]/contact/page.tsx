import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getContactPageData } from "@/lib/actions/intake";
import { ContactFormIntake } from "@/components/contact/contact-form-intake";

type ContactPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
};

export const revalidate = 300;

export async function generateMetadata({
  params,
}: ContactPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getContactPageData(slug);

  if (!result.success || !result.data) {
    return { title: "Contact" };
  }

  return {
    title: `Get Started | ${result.data.profile.agencyName}`,
    description: `Contact ${result.data.profile.agencyName} to learn about ABA therapy services for your child.`,
  };
}

export default async function WebsiteContactPage({
  params,
  searchParams,
}: ContactPageProps) {
  const { slug } = await params;
  const { ref } = await searchParams;
  const result = await getContactPageData(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const { listing, profile } = result.data;
  const brandColor =
    profile.intakeFormSettings?.background_color || "#3D6B4F";

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${brandColor}15` }}
          >
            <svg
              className="h-7 w-7"
              style={{ color: brandColor }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Get Started
          </h1>
          <p className="mt-3 text-gray-500">
            Fill out the form below and we&apos;ll be in touch shortly to
            discuss how we can help your family.
          </p>
        </div>

        <div
          className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8"
          style={{ borderColor: `${brandColor}20` }}
        >
          <ContactFormIntake
            listingId={listing.id}
            providerName={profile.agencyName}
            websiteUrl={profile.website}
            initialReferralSource={
              ref === "findabatherapy" ? "findabatherapy" : undefined
            }
            brandColor={brandColor}
          />
        </div>
      </div>
    </section>
  );
}

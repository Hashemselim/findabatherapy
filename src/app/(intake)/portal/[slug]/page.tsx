import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { PublicClientPortal } from "@/components/client-portal/public-client-portal";
import {
  getAuthenticatedPortalTargets,
  getPortalBrandingBySlug,
  getPublicClientPortalData,
} from "@/lib/actions/client-portal";
import { buildPortalAccessPath } from "@/lib/public-access";
import { getCurrentUser } from "@/lib/platform/auth/server";
import { BrandedLogo } from "@/components/branded/branded-logo";
import { Card } from "@/components/ui/card";

type PublicPortalPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string; client?: string }>;
};

export const revalidate = 60;

export async function generateMetadata({
  params,
}: PublicPortalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPortalBrandingBySlug(slug);

  if (!result.success || !result.data) {
    return {
      title: "Client Portal",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `Family Portal | ${result.data.agencyName}`,
    description: `Family portal for ${result.data.agencyName}.`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicPortalPage({
  params,
  searchParams,
}: PublicPortalPageProps) {
  const { slug } = await params;
  const { token, client } = await searchParams;

  if (token) {
    const accessPath = new URL(buildPortalAccessPath(slug), "http://localhost");
    accessPath.searchParams.set("token", token);
    redirect(`${accessPath.pathname}${accessPath.search}`);
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/portal/${slug}/sign-in`);
  }

  const result = await getPublicClientPortalData(slug, client ?? null);
  if (result.success && result.data) {
    return (
      <div
        className="min-h-screen"
        style={{
          background: `linear-gradient(135deg, ${result.data.branding.backgroundColor} 0%, ${result.data.branding.backgroundColor}dd 50%, ${result.data.branding.backgroundColor}bb 100%)`,
        }}
      >
        <PublicClientPortal slug={slug} data={result.data} />
        {result.data.branding.showPoweredBy ? (
          <div className="-mt-2 pb-8 text-center">
            <Link
              href="https://www.goodaba.com"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold shadow-lg transition-shadow hover:shadow-xl"
              style={{ color: result.data.branding.backgroundColor }}
            >
              Powered by GoodABA
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  const targets = await getAuthenticatedPortalTargets(slug);
  if (!targets.success || !targets.data) {
    notFound();
  }

  if (targets.data.entries.length === 1) {
    redirect(`/portal/${slug}?client=${targets.data.entries[0].clientId}`);
  }

  if (targets.data.entries.length === 0) {
    redirect(`/portal/${slug}/sign-in?error=${encodeURIComponent("This account does not have access to this family portal.")}`);
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${targets.data.branding.backgroundColor} 0%, ${targets.data.branding.backgroundColor}dd 52%, ${targets.data.branding.backgroundColor}bb 100%)`,
      }}
    >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 space-y-4 text-center text-white">
          <BrandedLogo
            logoUrl={targets.data.branding.logoUrl}
            agencyName={targets.data.branding.agencyName}
            brandColor={targets.data.branding.backgroundColor}
            variant="hero"
          />
          <div>
            <p className="text-sm font-medium text-white/75">
              {targets.data.branding.agencyName}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Choose the child portal you want to open
            </h1>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {targets.data.entries.map((entry) => (
            <Link
              key={entry.clientId}
              href={`/portal/${slug}?client=${entry.clientId}`}
              className="group"
            >
              <Card className="rounded-[30px] border-border/60 bg-white/96 p-6 shadow-2xl transition-transform duration-150 group-hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {entry.guardianName}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">
                      {entry.clientName}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Access status: {entry.accessStatus}
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

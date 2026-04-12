import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Globe, Mail } from "lucide-react";

import { BrandedLogo } from "@/components/branded/branded-logo";
import {
  FamilyPortalSignIn,
  FamilyPortalSignOutButton,
} from "@/components/client-portal/family-portal-sign-in";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  claimPortalInviteForCurrentUser,
  getAuthenticatedPortalTargets,
  getPortalBrandingBySlug,
} from "@/lib/actions/client-portal";
import { getCurrentUser } from "@/lib/platform/auth/server";
import { getContrastingTextColor } from "@/lib/utils/brand-color";

type FamilyPortalSignInPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string; email?: string; error?: string }>;
};

export const dynamic = "force-dynamic";

function getLighterShade(hexColor: string, opacity = 0.1) {
  return `${hexColor}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

export async function generateMetadata({
  params,
}: FamilyPortalSignInPageProps): Promise<Metadata> {
  const { slug } = await params;
  const branding = await getPortalBrandingBySlug(slug);

  if (!branding.success || !branding.data) {
    return {
      title: { absolute: "Family Portal Sign In" },
      robots: { index: false, follow: false },
    };
  }

  return {
    title: {
      absolute: `Family Portal Sign In | ${branding.data.agencyName}`,
    },
    description: `Sign in to your ${branding.data.agencyName} family portal.`,
    robots: { index: false, follow: false },
  };
}

export default async function FamilyPortalSignInPage({
  params,
  searchParams,
}: FamilyPortalSignInPageProps) {
  const { slug } = await params;
  const { token, email, error } = await searchParams;
  const [user, branding] = await Promise.all([
    getCurrentUser(),
    getPortalBrandingBySlug(slug),
  ]);

  if (!branding.success || !branding.data) {
    notFound();
  }

  let effectiveError = error ?? null;
  if (user && !effectiveError) {
    if (token) {
      const claimed = await claimPortalInviteForCurrentUser(slug, token);
      if (claimed.success && claimed.data) {
        redirect(`/portal/${slug}?client=${claimed.data.clientId}`);
      }
      effectiveError = claimed.success ? "Failed to open the family portal." : claimed.error;
    } else {
      const targets = await getAuthenticatedPortalTargets(slug);
      const entries = targets.success ? targets.data?.entries ?? [] : [];
      if (entries.length === 1) {
        redirect(`/portal/${slug}?client=${entries[0].clientId}`);
      }
      if (entries.length > 1) {
        redirect(`/portal/${slug}`);
      }
      effectiveError =
        targets.success
          ? "This signed-in account does not have access to this family portal."
          : targets.error;
    }
  }

  const callbackParams = new URLSearchParams();
  callbackParams.set("next", `/portal/${slug}`);
  callbackParams.set("auth_mode", "family");
  callbackParams.set("portal_slug", slug);
  if (token) {
    callbackParams.set("portal_token", token);
  }

  const callbackUrl = `/auth/callback?${callbackParams.toString()}`;
  const contrastColor = getContrastingTextColor(branding.data.backgroundColor);

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${branding.data.backgroundColor} 0%, ${branding.data.backgroundColor}dd 48%, ${branding.data.backgroundColor}bb 100%)`,
      }}
    >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
          <div
            className="px-6 py-8 text-center sm:px-8 sm:py-12"
            style={{ backgroundColor: getLighterShade(branding.data.backgroundColor, 0.08) }}
          >
            <div className="mx-auto mb-6">
              <BrandedLogo
                logoUrl={branding.data.logoUrl}
                agencyName={branding.data.agencyName}
                brandColor={branding.data.backgroundColor}
                variant="hero"
              />
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                {branding.data.agencyName}
              </h1>
              <div
                className="mx-auto h-0.5 w-12 rounded-full"
                style={{ backgroundColor: getLighterShade(branding.data.backgroundColor, 0.3) }}
              />
              <h2 className="text-lg font-medium text-foreground">Family portal sign in</h2>
              <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
                Sign in with the same email your provider invited. Once you&apos;re in, you can
                return anytime from GoodABA without hunting for an old invite link.
              </p>
              {branding.data.website ? (
                <div className="pt-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    style={{ borderColor: branding.data.backgroundColor, color: "#111827" }}
                  >
                    <a href={branding.data.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="mr-2 h-4 w-4" />
                      Visit Website
                    </a>
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-6 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.05fr_0.95fr]">
            <Card className="rounded-[28px] border-border/60 p-6 shadow-none">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  <Mail className="h-3.5 w-3.5" />
                  Secure access
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-semibold text-foreground">Welcome back</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Use email magic link or any enabled GoodABA sign-in method for your guardian
                    account. If you were invited recently, use that same email address here.
                  </p>
                </div>
                {effectiveError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {effectiveError}
                  </div>
                ) : null}
                {user ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    <p className="font-medium text-slate-950">Signed in as {user.email ?? "your current account"}</p>
                    <p className="mt-2 leading-6">
                      If this is not the invited guardian account, sign out and continue with the
                      email your provider invited.
                    </p>
                    <div className="mt-4">
                      <FamilyPortalSignOutButton />
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>

            {user ? (
              <Card className="rounded-[28px] border-border/60 p-6 shadow-none">
                <p className="text-sm leading-6 text-muted-foreground">
                  After you sign out, return to this page and request your magic link with the
                  invited email address.
                </p>
              </Card>
            ) : (
              <FamilyPortalSignIn slug={slug} callbackUrl={callbackUrl} email={email ?? null} />
            )}
          </div>

          <div
            className="px-6 py-4 sm:px-8"
            style={{ backgroundColor: getLighterShade(branding.data.backgroundColor, 0.05) }}
          >
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
              <div className="flex items-center gap-2">
                <BrandedLogo
                  logoUrl={branding.data.logoUrl}
                  agencyName={branding.data.agencyName}
                  brandColor={branding.data.backgroundColor}
                  variant="footer"
                  className="mx-0"
                />
                <span className="text-sm font-medium text-foreground">
                  {branding.data.agencyName}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Family access for documents, tasks, updates, and provider resources.
              </p>
            </div>
          </div>
        </div>

        {branding.data.showPoweredBy ? (
          <div className="mt-6 text-center">
            <Link
              href="https://www.goodaba.com"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              style={{ color: branding.data.backgroundColor }}
            >
              Powered by GoodABA
            </Link>
          </div>
        ) : (
          <div className="mt-6 text-center">
            <Link
              href="https://www.goodaba.com"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-xs font-medium backdrop-blur-xs transition-colors hover:bg-white/30"
              style={{ color: contrastColor }}
            >
              Powered by GoodABA
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { BrandedLogo } from "@/components/branded/branded-logo";
import { Card } from "@/components/ui/card";
import { getAuthenticatedPortalHomeEntries } from "@/lib/actions/client-portal";
import { getCurrentUser } from "@/lib/platform/auth/server";

export const revalidate = 60;

export default async function FamilyPortalHomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in?redirect=/portal&auth_mode=family");
  }

  const result = await getAuthenticatedPortalHomeEntries();
  const entries = result.success ? result.data ?? [] : [];

  if (entries.length === 1) {
    redirect(`/portal/${entries[0].slug}?client=${entries[0].clientId}`);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e6efff_0%,_#f7fbff_38%,_#eef5ec_100%)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            Family Portal
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Choose where you want to go
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Your account is ready. Pick the child portal you want to open and continue with tasks,
            documents, and updates.
          </p>
        </div>

        {entries.length === 0 ? (
          <Card className="rounded-[32px] border-border/60 bg-white/90 p-8 text-center shadow-xl backdrop-blur-xs">
            <p className="text-xl font-semibold text-slate-950">No family portals linked yet</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Sign in with the email your provider invited, or ask your provider to send a fresh
              family portal invitation.
            </p>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {entries.map((entry) => (
              <Link
                key={`${entry.slug}-${entry.clientId}`}
                href={`/portal/${entry.slug}?client=${entry.clientId}`}
                className="group"
              >
                <Card className="h-full rounded-[30px] border-border/60 bg-white/95 p-6 shadow-xl transition-transform duration-150 group-hover:-translate-y-0.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-4">
                      <BrandedLogo
                        logoUrl={entry.logoUrl}
                        agencyName={entry.agencyName}
                        brandColor={entry.backgroundColor}
                        variant="compact"
                        className="mx-0"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-500">{entry.agencyName}</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-950">
                          {entry.clientName}
                        </p>
                        <p className="mt-2 text-sm text-slate-600">
                          Guardian access for {entry.guardianName}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

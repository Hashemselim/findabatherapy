import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCurrentWorkspace } from "@/lib/platform/workspace/server";
import { getAllNotes } from "@/lib/actions/client-notes";
import { getClientsList } from "@/lib/actions/clients";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { LockedButton, PreviewBanner } from "@/components/ui/preview-banner";
import { PreviewOverlay } from "@/components/ui/preview-overlay";
import { Skeleton } from "@/components/ui/skeleton";

import { NotesList } from "./notes-list";

export const metadata = {
  title: "Notes | Dashboard",
  description: "Provider notes across all clients",
};

export default async function NotesPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/auth/sign-in");

  const planTier = await getCurrentPlanTier();
  const isPreview = planTier === "free";

  return (
    <div className="space-y-3">
      {isPreview && (
        <PreviewBanner
          message="This is a preview of notes management. Go Live to create and manage provider notes."
          variant="inline"
          triggerFeature="clients"
        />
      )}
      <DashboardPageHeader
        title="Notes"
        description="Session notes, call logs, and observations across all clients"
      >
        {isPreview ? (
          <LockedButton label="Add Note" />
        ) : (
          <Button asChild size="sm" className="w-full gap-2 sm:w-auto">
            <Link href="/dashboard/notes?new=1">
              <Plus className="h-4 w-4" />
              Add Note
            </Link>
          </Button>
        )}
      </DashboardPageHeader>

      <PreviewOverlay isPreview={isPreview}>
        {isPreview ? (
          <DashboardCard className="p-5 sm:p-6">
            <NotesList initialNotes={[]} clients={[]} />
          </DashboardCard>
        ) : (
          <Suspense fallback={<NotesContentFallback />}>
            <NotesContent />
          </Suspense>
        )}
      </PreviewOverlay>
    </div>
  );
}

async function NotesContent() {
  const [notesResult, clientsResult] = await Promise.all([
    getAllNotes(),
    getClientsList(),
  ]);

  const notes = notesResult.success ? notesResult.data || [] : [];
  const clients = clientsResult.success ? clientsResult.data || [] : [];

  return (
    <DashboardCard className="p-5 sm:p-6">
      <NotesList initialNotes={notes} clients={clients} />
    </DashboardCard>
  );
}

function NotesContentFallback() {
  return (
    <DashboardCard className="p-5 sm:p-6">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-16 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-full sm:w-[220px]" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-border/60 p-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}

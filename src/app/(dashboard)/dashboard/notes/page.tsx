import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/platform/auth/server";
import { getAllNotes } from "@/lib/actions/client-notes";
import { getClientsList } from "@/lib/actions/clients";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { LockedButton, PreviewBanner } from "@/components/ui/preview-banner";
import { PreviewOverlay } from "@/components/ui/preview-overlay";

import { NotesList } from "./notes-list";

export const metadata = {
  title: "Notes | Dashboard",
  description: "Provider notes across all clients",
};

export default async function NotesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const planTier = await getCurrentPlanTier();
  const isPreview = planTier === "free";

  let notes: Array<{
    id: string;
    clientId: string | null;
    clientName: string | null;
    profileId: string;
    category: "session" | "call" | "admin" | "clinical" | "general";
    body: string;
    createdAt: string;
    updatedAt: string;
    authorName: string | null;
  }> = [];
  let clients: { id: string; name: string }[] = [];

  if (!isPreview) {
    const [notesResult, clientsResult] = await Promise.all([
      getAllNotes(),
      getClientsList(),
    ]);
    notes = notesResult.success ? notesResult.data || [] : [];
    clients = clientsResult.success ? clientsResult.data || [] : [];
  }

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
        <DashboardCard className="p-5 sm:p-6">
          <NotesList initialNotes={notes} clients={clients} />
        </DashboardCard>
      </PreviewOverlay>
    </div>
  );
}

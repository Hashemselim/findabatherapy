"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileStack, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  savePortalDocumentShare,
  type ClientPortalData,
} from "@/lib/actions/client-portal";
import { DashboardCard, DashboardEmptyState, DashboardStatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { formatDate, getDocumentSourceMeta } from "./portal-utils";
import { PortalDocumentDialog } from "./dialogs/portal-document-dialog";

export function PortalDocumentsTab({ data }: { data: ClientPortalData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  const providerShared = data.documents.filter((d) => d.uploadSource === "dashboard");
  const familyUploaded = data.documents.filter((d) => d.uploadSource !== "dashboard");

  const handleToggleActionRequired = (doc: typeof data.documents[0]) => {
    startTransition(async () => {
      try {
        await savePortalDocumentShare({
          clientId: data.client.id,
          existingDocumentId: doc.id,
          label: doc.label,
          category: doc.category,
          note: doc.note,
          visibility: doc.visibility === "action_required" ? "visible" : "action_required",
          acknowledgementRequired: true,
          linkedTaskId: doc.linkedTaskId,
        });
        toast.success("Document visibility updated");
        router.refresh();
      } catch {
        toast.error("Failed to update document");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Documents</h2>
          {data.documents.length > 0 && (
            <DashboardStatusBadge tone="default">{data.documents.length}</DashboardStatusBadge>
          )}
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Upload document
        </Button>
      </div>

      {data.documents.length === 0 ? (
        <DashboardEmptyState
          icon={FileStack}
          title="No documents yet"
          description="Upload a document to share with this client's family."
          action={
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Upload document
            </Button>
          }
        />
      ) : (
        <>
          {/* Provider shared */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Shared with family</p>
            {providerShared.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shared documents yet.</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {providerShared.map((doc) => {
                  const source = getDocumentSourceMeta(doc.uploadSource);
                  return (
                    <DashboardCard key={doc.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">{doc.label}</p>
                            <DashboardStatusBadge tone={source.tone}>{source.label}</DashboardStatusBadge>
                          </div>
                          <p className="text-xs text-muted-foreground">{doc.category} · {doc.visibility}</p>
                        </div>
                        {doc.acknowledgementRequired && (
                          <DashboardStatusBadge tone="warning">Ack required</DashboardStatusBadge>
                        )}
                      </div>
                      {doc.note && (
                        <p className="mt-2 text-sm text-muted-foreground">{doc.note}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Acknowledged by {doc.acknowledgedByGuardianIds.length} guardian{doc.acknowledgedByGuardianIds.length !== 1 ? "s" : ""}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleToggleActionRequired(doc)}
                        >
                          {doc.visibility === "action_required" ? "Mark visible" : "Make action required"}
                        </Button>
                      </div>
                    </DashboardCard>
                  );
                })}
              </div>
            )}
          </div>

          {/* Family uploads */}
          {familyUploaded.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Family uploads</p>
              <div className="grid gap-3 lg:grid-cols-2">
                {familyUploaded.map((doc) => {
                  const source = getDocumentSourceMeta(doc.uploadSource);
                  return (
                    <DashboardCard key={doc.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">{doc.label}</p>
                            <DashboardStatusBadge tone={source.tone}>{source.label}</DashboardStatusBadge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {doc.category} · {formatDate(doc.createdAt)}
                          </p>
                        </div>
                      </div>
                      {doc.note && (
                        <p className="mt-2 text-sm text-muted-foreground">{doc.note}</p>
                      )}
                    </DashboardCard>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <PortalDocumentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientId={data.client.id}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}

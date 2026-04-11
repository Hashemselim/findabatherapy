"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Send, UserRound } from "lucide-react";
import { toast } from "sonner";

import {
  sendPortalGuardianMagicLink,
  type ClientPortalData,
  type PortalGuardianData,
} from "@/lib/actions/client-portal";
import { DashboardCard, DashboardEmptyState, DashboardStatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { formatDate } from "./portal-utils";
import { PortalGuardianDialog } from "./dialogs/portal-guardian-dialog";

function guardianStatusTone(status: string) {
  if (status === "active") return "success" as const;
  if (status === "invited") return "info" as const;
  if (status === "revoked") return "warning" as const;
  return "default" as const;
}

export function PortalGuardiansTab({ data }: { data: ClientPortalData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<PortalGuardianData | undefined>();
  const [sentGuardianId, setSentGuardianId] = useState<string | null>(null);

  const handleSendInvite = (guardian: PortalGuardianData) => {
    if (!guardian.email) {
      toast.error("Guardian has no email address");
      return;
    }
    startTransition(async () => {
      const result = await sendPortalGuardianMagicLink({
        clientId: data.client.id,
        guardianId: guardian.id,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (!result.data?.emailSent) {
        toast.error(result.data?.emailError || "Email was not sent");
        return;
      }
      toast.success(`Invite sent to ${guardian.email}`);
      setSentGuardianId(guardian.id);
      setTimeout(() => setSentGuardianId(null), 2000);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Guardians</h2>
          {data.guardians.length > 0 && (
            <DashboardStatusBadge tone="default">{data.guardians.length}</DashboardStatusBadge>
          )}
        </div>
        <Button size="sm" onClick={() => { setEditingGuardian(undefined); setDialogOpen(true); }}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add guardian
        </Button>
      </div>

      {data.guardians.length === 0 ? (
        <DashboardEmptyState
          icon={UserRound}
          title="No guardians yet"
          description="Add a guardian to give families access to the portal."
          action={
            <Button size="sm" onClick={() => { setEditingGuardian(undefined); setDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add guardian
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.guardians.map((guardian) => (
            <DashboardCard key={guardian.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{guardian.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {guardian.relationship}{guardian.email ? ` · ${guardian.email}` : ""}
                  </p>
                </div>
                <DashboardStatusBadge tone={guardianStatusTone(guardian.accessStatus)}>
                  {guardian.accessStatus}
                </DashboardStatusBadge>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {guardian.invitedAt && <span>Invited {formatDate(guardian.invitedAt)}</span>}
                {guardian.acceptedAt && <span>Accepted {formatDate(guardian.acceptedAt)}</span>}
                {guardian.lastViewedAt && <span>Last viewed {formatDate(guardian.lastViewedAt)}</span>}
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setEditingGuardian(guardian); setDialogOpen(true); }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  disabled={isPending || !guardian.email}
                  onClick={() => handleSendInvite(guardian)}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  {sentGuardianId === guardian.id ? "Sent!" : "Send invite"}
                </Button>
              </div>
            </DashboardCard>
          ))}
        </div>
      )}

      <PortalGuardianDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientId={data.client.id}
        guardian={editingGuardian}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}

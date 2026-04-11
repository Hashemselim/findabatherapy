"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Eye, Loader2, Send } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { DashboardStatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";

import type { ClientDetail } from "@/lib/actions/clients";
import {
  getPortalGuardianSignInPageLink,
  sendPortalGuardianMagicLink,
  setClientPortalEnabled,
  type ClientPortalData,
} from "@/lib/actions/client-portal";

interface SettingsTabProps {
  client: ClientDetail;
  portalData: ClientPortalData | null;
}

export function SettingsTab({ client, portalData }: SettingsTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sentGuardianId, setSentGuardianId] = useState<string | null>(null);

  const previewUrl = `/dashboard/clients/${client.id}/portal/preview`;

  const handleTogglePortal = (enabled: boolean) => {
    if (!portalData) return;
    startTransition(async () => {
      try {
        await setClientPortalEnabled(client.id, enabled);
        toast.success(enabled ? "Portal is now live" : "Portal hidden from family");
        router.refresh();
      } catch {
        toast.error("Failed to update portal status");
      }
    });
  };

  const handleCopyLink = () => {
    const primaryGuardian = portalData?.guardians.find((g) => g.email);
    if (!primaryGuardian || !portalData?.branding.slug) {
      toast.error("Add a parent with an email first");
      return;
    }
    startTransition(async () => {
      try {
        const result = await getPortalGuardianSignInPageLink({
          clientId: client.id,
          guardianId: primaryGuardian.id,
        });
        if (!result.success) { toast.error(result.error); return; }
        const url = result.data?.url;
        if (!url) { toast.error("Failed to create link"); return; }
        const normalized = typeof window !== "undefined"
          ? `${window.location.origin}${new URL(url, window.location.origin).pathname}${new URL(url, window.location.origin).search}`
          : url;
        await navigator.clipboard.writeText(normalized);
        toast.success("Sign-in link copied");
      } catch {
        toast.error("Failed to copy link");
      }
    });
  };

  const handleSendInvite = (guardianId: string, email: string) => {
    startTransition(async () => {
      try {
        const result = await sendPortalGuardianMagicLink({ clientId: client.id, guardianId });
        if (!result.success) { toast.error(result.error); return; }
        if (!result.data?.emailSent) {
          toast.error(result.data?.emailError || "Email was not sent");
          return;
        }
        toast.success(`Invite sent to ${email}`);
        setSentGuardianId(guardianId);
        setTimeout(() => setSentGuardianId(null), 2000);
        router.refresh();
      } catch {
        toast.error("Failed to send invite");
      }
    });
  };

  // Match parents to portal guardians by email
  const parentsWithPortalStatus = (client.parents || []).map((parent) => {
    const guardian = portalData?.guardians.find(
      (g) => g.email && parent.email && g.email.toLowerCase() === parent.email.toLowerCase()
    );
    return {
      ...parent,
      portalGuardianId: guardian?.id ?? null,
      portalStatus: guardian?.accessStatus ?? "not_invited",
    };
  });

  const portalStatusTone = (status: string) => {
    switch (status) {
      case "active": return "success" as const;
      case "invited": return "info" as const;
      case "revoked": return "danger" as const;
      case "not_invited": return "default" as const;
      default: return "default" as const;
    }
  };

  return (
    <div className="space-y-6">
      {/* Portal Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Portal Status</h3>
              <p className="text-sm text-muted-foreground">
                {portalData?.portal.enabled ? "Family can access the portal" : "Portal is hidden from family"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <DashboardStatusBadge tone={portalData?.portal.enabled ? "success" : "default"}>
                {portalData?.portal.enabled ? "Live" : "Off"}
              </DashboardStatusBadge>
              <Switch
                checked={portalData?.portal.enabled ?? false}
                disabled={isPending || !portalData}
                onCheckedChange={handleTogglePortal}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-foreground">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={previewUrl}>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Preview portal
              </Link>
            </Button>
            <Button variant="outline" size="sm" disabled={isPending} onClick={handleCopyLink}>
              {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
              Copy sign-in link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Portal Invites */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-foreground">Portal Invites</h3>
          {parentsWithPortalStatus.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add a parent/guardian in the Details tab to send portal invites.</p>
          ) : (
            <div className="space-y-3">
              {parentsWithPortalStatus.map((parent) => (
                <div key={parent.id} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">
                        {[parent.first_name, parent.last_name].filter(Boolean).join(" ") || "Unnamed"}
                      </p>
                      <DashboardStatusBadge tone={portalStatusTone(parent.portalStatus)}>
                        {parent.portalStatus === "not_invited" ? "Not invited" : parent.portalStatus}
                      </DashboardStatusBadge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {parent.email || "No email on file"}
                    </p>
                  </div>
                  {parent.email && parent.portalGuardianId && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => handleSendInvite(parent.portalGuardianId!, parent.email!)}
                    >
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      {sentGuardianId === parent.portalGuardianId ? "Sent!" : parent.portalStatus === "not_invited" ? "Send invite" : "Resend"}
                    </Button>
                  )}
                  {parent.email && !parent.portalGuardianId && (
                    <p className="text-xs text-muted-foreground">Portal guardian not linked</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Log */}
      {portalData && portalData.activity.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 font-semibold text-foreground">Activity Log</h3>
            <div className="divide-y divide-border rounded-lg border">
              {portalData.activity.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description || "Activity recorded"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">{item.actorName || item.actorType}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(item.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Eye, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import {
  getPortalGuardianSignInPageLink,
  sendPortalGuardianMagicLink,
  setClientPortalEnabled,
  type ClientPortalData,
} from "@/lib/actions/client-portal";
import { DashboardStatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface PortalHeaderProps {
  data: ClientPortalData;
  previewUrl: string;
  onTabChange: (tab: string) => void;
}

export function PortalHeader({ data, previewUrl, onTabChange }: PortalHeaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const primaryGuardian =
    data.guardians.find((g) => g.isPrimary && g.email) ??
    data.guardians.find((g) => g.email) ??
    null;

  const handleToggle = (enabled: boolean) => {
    startTransition(async () => {
      try {
        await setClientPortalEnabled(data.client.id, enabled);
        router.refresh();
        toast.success(enabled ? "Portal is now live" : "Portal hidden from family");
      } catch {
        toast.error("Failed to update portal status");
      }
    });
  };

  const handleCopyLink = () => {
    if (!data.branding.slug || !primaryGuardian?.email) {
      toast.error("Add a guardian with an email first");
      onTabChange("guardians");
      return;
    }

    startTransition(async () => {
      try {
        const result = await getPortalGuardianSignInPageLink({
          clientId: data.client.id,
          guardianId: primaryGuardian.id,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        const url = result.data?.url;
        if (!url) {
          toast.error("Failed to create sign-in link");
          return;
        }
        // Normalize URL to current origin
        const normalized =
          typeof window !== "undefined"
            ? `${window.location.origin}${new URL(url, window.location.origin).pathname}${new URL(url, window.location.origin).search}`
            : url;
        await navigator.clipboard.writeText(normalized);
        toast.success("Sign-in link copied to clipboard");
      } catch {
        toast.error("Failed to copy link");
      }
    });
  };

  const handleSendEmail = () => {
    if (!primaryGuardian?.email) {
      toast.error("Add a guardian with an email first");
      onTabChange("guardians");
      return;
    }

    startTransition(async () => {
      try {
        const result = await sendPortalGuardianMagicLink({
          clientId: data.client.id,
          guardianId: primaryGuardian.id,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        if (!result.data?.emailSent) {
          toast.error(result.data?.emailError || "Email was not sent");
          return;
        }
        toast.success(`Sign-in email sent to ${primaryGuardian.email}`);
        router.refresh();
      } catch {
        toast.error("Failed to send email");
      }
    });
  };

  const { portal } = data;

  return (
    <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: Name + toggle + status */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {data.client.name}
        </h1>
        <div className="flex items-center gap-2">
          <Switch
            checked={portal.enabled}
            disabled={isPending}
            onCheckedChange={handleToggle}
          />
          <DashboardStatusBadge tone={portal.enabled ? "success" : "default"}>
            {portal.enabled ? "Live" : "Off"}
          </DashboardStatusBadge>
        </div>
      </div>

      {/* Center: Stats */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>
          {portal.openTasks} open task{portal.openTasks !== 1 ? "s" : ""}
        </span>
        <span className="text-border">&middot;</span>
        <span>{portal.completionPercentage}% complete</span>
        <span className="text-border">&middot;</span>
        <span>
          {portal.guardiansReady}/{portal.guardiansTotal} guardian
          {portal.guardiansTotal !== 1 ? "s" : ""}
        </span>
        {portal.overdueTasks > 0 && (
          <DashboardStatusBadge tone="warning">
            {portal.overdueTasks} overdue
          </DashboardStatusBadge>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={previewUrl}>
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Preview
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={handleSendEmail}
        >
          {isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="mr-1.5 h-3.5 w-3.5" />
          )}
          Email
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={handleCopyLink}
        >
          {isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Copy className="mr-1.5 h-3.5 w-3.5" />
          )}
          Copy link
        </Button>
      </div>
    </div>
  );
}

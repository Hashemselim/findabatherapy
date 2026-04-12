"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, Mail, Phone, Plus, StickyNote } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { DashboardTabsList, DashboardTabsTrigger } from "@/components/dashboard/ui";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

import { updateClientStatus } from "@/lib/actions/clients";
import type { ClientDetail } from "@/lib/actions/clients";
import { CLIENT_STATUS_OPTIONS, type ClientStatus } from "@/lib/validations/clients";
import type { ClientPortalData } from "@/lib/actions/client-portal";
import type { AgreementPacketOption } from "@/lib/actions/agreements";
import type { ClientNote } from "@/lib/actions/client-notes";
import { TaskFormDialog } from "@/components/dashboard/tasks";

import { EMAIL_PROVIDER_OPTIONS, type EmailProvider } from "./client-detail-helpers";
import { DetailsTab } from "./tabs/details-tab";
import { NotesTab } from "./tabs/notes-tab";
import { MyTasksTab } from "./tabs/my-tasks-tab";
import { SettingsTab } from "./tabs/settings-tab";
import { ResourcesTab } from "./tabs/resources-tab";
import { PortalTasksTab } from "@/components/client-portal/portal-tasks-tab";
import { PortalMessagesTab } from "@/components/client-portal/portal-messages-tab";

interface ClientFullDetailProps {
  client: ClientDetail;
  agreementPackets: AgreementPacketOption[];
  portalData: ClientPortalData | null;
  notes: ClientNote[];
}

export function ClientFullDetail({ client, agreementPackets, portalData, notes }: ClientFullDetailProps) {
  const router = useRouter();
  const [isStatusPending, startStatusTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("details");
  const [clientStatus, setClientStatus] = useState<ClientStatus>(client.status);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [noteDialogPending, setNoteDialogPending] = useState(false);

  const childName = [client.child_first_name, client.child_last_name].filter(Boolean).join(" ") || "Client";
  const primaryParent = client.parents?.find((p) => p.is_primary) || client.parents?.[0];
  const primaryParentName = primaryParent
    ? [primaryParent.first_name, primaryParent.last_name].filter(Boolean).join(" ") || "Primary parent"
    : null;
  const primaryParentEmail = primaryParent?.email || null;
  const primaryParentPhone = primaryParent?.phone || null;

  useEffect(() => {
    setClientStatus(client.status);
  }, [client.status]);

  const handleStatusChange = (nextStatus: ClientStatus) => {
    if (nextStatus === clientStatus) return;
    const previousStatus = clientStatus;
    setClientStatus(nextStatus);
    startStatusTransition(async () => {
      const result = await updateClientStatus(client.id, nextStatus);
      if (!result.success) {
        setClientStatus(previousStatus);
        toast.error(result.error);
        return;
      }
      toast.success("Client status updated");
      router.refresh();
    });
  };

  const handleEmailProviderSelect = (provider: EmailProvider) => {
    if (!primaryParentEmail) return;
    const encodedEmail = encodeURIComponent(primaryParentEmail);
    const emailGreeting = encodeURIComponent(`Hi ${primaryParentName || "there"},`);
    const emailUrls: Record<EmailProvider, string> = {
      apple_mail: `mailto:${encodedEmail}?body=${emailGreeting}`,
      gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedEmail}&body=${emailGreeting}`,
      outlook: `https://outlook.live.com/mail/0/deeplink/compose?to=${encodedEmail}&body=${emailGreeting}`,
      yahoo: `https://compose.mail.yahoo.com/?to=${encodedEmail}&body=${emailGreeting}`,
    };
    if (provider === "apple_mail") {
      window.location.href = emailUrls[provider];
      return;
    }
    window.open(emailUrls[provider], "_blank", "noopener,noreferrer");
  };

  const handleCopyEmail = async () => {
    if (!primaryParentEmail) return;
    await navigator.clipboard.writeText(primaryParentEmail);
    toast.success("Email copied");
  };

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" asChild className="w-fit px-2">
        <Link href="/dashboard/clients">
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Link>
      </Button>

      <DashboardPageHeader title={childName}>
        <div className="w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-1.5 sm:w-auto" disabled={!primaryParentEmail}>
                <Mail className="h-4 w-4" />
                Email
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {EMAIL_PROVIDER_OPTIONS.map((provider) => (
                <DropdownMenuItem key={provider.value} onClick={() => handleEmailProviderSelect(provider.value)}>
                  {provider.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCopyEmail}>Copy Email</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!primaryParentPhone}
          onClick={() => {
            if (primaryParentPhone) window.location.href = `tel:${primaryParentPhone}`;
          }}
        >
          <Phone className="h-4 w-4" />
          Call
        </Button>

        <Button size="sm" className="gap-1.5" onClick={() => setTaskDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Task
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setActiveTab("notes");
            setNoteDialogPending(true);
          }}
        >
          <StickyNote className="h-4 w-4" />
          Add Note
        </Button>

        <div className="w-full sm:w-[190px]">
          <Select
            value={clientStatus}
            onValueChange={(value) => handleStatusChange(value as ClientStatus)}
            disabled={isStatusPending}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent align="end">
              {CLIENT_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </DashboardPageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <DashboardTabsList className="grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
          <DashboardTabsTrigger value="details">Details</DashboardTabsTrigger>
          <DashboardTabsTrigger value="notes">Notes</DashboardTabsTrigger>
          <DashboardTabsTrigger value="my-tasks">My Tasks</DashboardTabsTrigger>
          <DashboardTabsTrigger value="family-tasks">Family Tasks</DashboardTabsTrigger>
          <DashboardTabsTrigger value="messages">Messages</DashboardTabsTrigger>
          <DashboardTabsTrigger value="resources">Resources</DashboardTabsTrigger>
          <DashboardTabsTrigger value="settings">Settings</DashboardTabsTrigger>
        </DashboardTabsList>

        <TabsContent value="details">
          <DetailsTab client={client} portalData={portalData} agreementPackets={agreementPackets} />
        </TabsContent>

        <TabsContent value="notes">
          <NotesTab
            clientId={client.id}
            notes={notes}
            autoOpenDialog={noteDialogPending}
            onDialogOpened={() => setNoteDialogPending(false)}
          />
        </TabsContent>

        <TabsContent value="my-tasks">
          <MyTasksTab client={client} />
        </TabsContent>

        <TabsContent value="family-tasks">
          {portalData ? (
            <PortalTasksTab data={portalData} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Enable the portal in Settings to manage family tasks.
            </p>
          )}
        </TabsContent>

        <TabsContent value="messages">
          {portalData ? (
            <PortalMessagesTab data={portalData} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Enable the portal in Settings to publish messages.
            </p>
          )}
        </TabsContent>

        <TabsContent value="resources">
          <ResourcesTab portalData={portalData} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab client={client} portalData={portalData} />
        </TabsContent>
      </Tabs>

      {/* Global Add Task dialog - triggered from header */}
      <TaskFormDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={null}
        clientId={client.id}
        clientName={childName}
        onSuccess={() => {
          setTaskDialogOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

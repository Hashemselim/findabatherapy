"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deletePortalMessage,
  type ClientPortalData,
  type PortalMessageData,
} from "@/lib/actions/client-portal";
import { DashboardCard, DashboardEmptyState, DashboardStatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDate, messageTypeLabel } from "./portal-utils";
import { PortalMessageDialog } from "./dialogs/portal-message-dialog";

export function PortalMessagesTab({ data }: { data: ClientPortalData }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<PortalMessageData | undefined>();

  const handleDelete = (messageId: string) => {
    startTransition(async () => {
      try {
        await deletePortalMessage(data.client.id, messageId);
        toast.success("Message deleted");
        router.refresh();
      } catch {
        toast.error("Failed to delete message");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Messages</h2>
          {data.messages.length > 0 && (
            <DashboardStatusBadge tone="default">{data.messages.length}</DashboardStatusBadge>
          )}
        </div>
        <Button size="sm" onClick={() => { setEditingMessage(undefined); setDialogOpen(true); }}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Publish message
        </Button>
      </div>

      {data.messages.length === 0 ? (
        <DashboardEmptyState
          icon={Mail}
          title="No messages yet"
          description="Publish a message to share updates with this client's family."
          action={
            <Button size="sm" onClick={() => { setEditingMessage(undefined); setDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Publish message
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {data.messages.map((message) => (
            <DashboardCard key={message.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{message.subject}</p>
                    <DashboardStatusBadge tone="info">
                      {messageTypeLabel(message.messageType)}
                    </DashboardStatusBadge>
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{message.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(message.createdAt)} · Read by {message.readByGuardianIds.length} guardian{message.readByGuardianIds.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingMessage(message); setDialogOpen(true); }}
                  >
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete message</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete &quot;{message.subject}&quot;. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDelete(message.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </DashboardCard>
          ))}
        </div>
      )}

      <PortalMessageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientId={data.client.id}
        message={editingMessage}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}

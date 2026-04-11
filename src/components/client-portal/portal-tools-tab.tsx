"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Link2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deletePortalTool,
  type ClientPortalData,
  type PortalToolData,
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
import { normalizeExternalUrl } from "./portal-utils";
import { PortalToolDialog } from "./dialogs/portal-tool-dialog";

export function PortalToolsTab({ data }: { data: ClientPortalData }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<PortalToolData | undefined>();

  const handleDelete = (toolId: string) => {
    startTransition(async () => {
      try {
        await deletePortalTool(data.client.id, toolId);
        toast.success("Tool deleted");
        router.refresh();
      } catch {
        toast.error("Failed to delete tool");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Connected tools</h2>
          {data.connectedTools.length > 0 && (
            <DashboardStatusBadge tone="default">{data.connectedTools.length}</DashboardStatusBadge>
          )}
        </div>
        <Button size="sm" onClick={() => { setEditingTool(undefined); setDialogOpen(true); }}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add tool
        </Button>
      </div>

      {data.connectedTools.length === 0 ? (
        <DashboardEmptyState
          icon={Link2}
          title="No connected tools yet"
          description="Add external tools that families can access from the portal."
          action={
            <Button size="sm" onClick={() => { setEditingTool(undefined); setDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add tool
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.connectedTools.map((tool) => (
            <DashboardCard key={tool.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{tool.name}</p>
                  {tool.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {tool.description}
                    </p>
                  )}
                  {tool.whenToUse && (
                    <div className="mt-2 rounded-lg bg-muted/30 p-2 text-xs text-muted-foreground">
                      {tool.whenToUse}
                    </div>
                  )}
                  {(() => {
                    const url = normalizeExternalUrl(tool.url);
                    return url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary"
                      >
                        Open tool <ArrowUpRight className="h-3 w-3" />
                      </a>
                    ) : null;
                  })()}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingTool(tool); setDialogOpen(true); }}
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
                        <AlertDialogTitle>Delete tool</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete &quot;{tool.name}&quot;. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDelete(tool.id)}
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

      <PortalToolDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientId={data.client.id}
        tool={editingTool}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}

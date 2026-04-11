"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BookOpen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deletePortalResource,
  type ClientPortalData,
  type PortalResourceData,
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
import { PortalResourceDialog } from "./dialogs/portal-resource-dialog";

export function PortalResourcesTab({ data }: { data: ClientPortalData }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<PortalResourceData | undefined>();

  const handleDelete = (resourceId: string) => {
    startTransition(async () => {
      try {
        await deletePortalResource(data.client.id, resourceId);
        toast.success("Resource deleted");
        router.refresh();
      } catch {
        toast.error("Failed to delete resource");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Resources</h2>
          {data.resources.length > 0 && (
            <DashboardStatusBadge tone="default">{data.resources.length}</DashboardStatusBadge>
          )}
        </div>
        <Button size="sm" onClick={() => { setEditingResource(undefined); setDialogOpen(true); }}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add resource
        </Button>
      </div>

      {data.resources.length === 0 ? (
        <DashboardEmptyState
          icon={BookOpen}
          title="No resources yet"
          description="Add helpful links and resources for this client's family."
          action={
            <Button size="sm" onClick={() => { setEditingResource(undefined); setDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add resource
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.resources.map((resource) => (
            <DashboardCard key={resource.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{resource.title}</p>
                  {resource.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {resource.description}
                    </p>
                  )}
                  {(() => {
                    const url = normalizeExternalUrl(resource.href);
                    return url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary"
                      >
                        Open resource <ArrowUpRight className="h-3 w-3" />
                      </a>
                    ) : null;
                  })()}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingResource(resource); setDialogOpen(true); }}
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
                        <AlertDialogTitle>Delete resource</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete &quot;{resource.title}&quot;. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDelete(resource.id)}
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

      <PortalResourceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientId={data.client.id}
        resource={editingResource}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}

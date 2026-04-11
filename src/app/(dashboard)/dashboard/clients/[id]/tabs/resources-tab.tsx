"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BookOpen, Link2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deletePortalResource,
  deletePortalTool,
  type ClientPortalData,
  type PortalResourceData,
  type PortalToolData,
} from "@/lib/actions/client-portal";
import { DashboardCard, DashboardEmptyState, DashboardStatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { normalizeExternalUrl } from "@/components/client-portal/portal-utils";
import { PortalResourceDialog } from "@/components/client-portal/dialogs/portal-resource-dialog";
import { PortalToolDialog } from "@/components/client-portal/dialogs/portal-tool-dialog";

interface ResourcesTabProps {
  portalData: ClientPortalData | null;
}

export function ResourcesTab({ portalData }: ResourcesTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<PortalResourceData | undefined>();
  const [toolDialogOpen, setToolDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<PortalToolData | undefined>();

  const clientId = portalData?.client.id ?? "";
  const resources = portalData?.resources ?? [];
  const tools = portalData?.connectedTools ?? [];
  const totalCount = resources.length + tools.length;

  const handleDeleteResource = (resourceId: string) => {
    startTransition(async () => {
      try {
        await deletePortalResource(clientId, resourceId);
        toast.success("Resource deleted");
        router.refresh();
      } catch { toast.error("Failed to delete resource"); }
    });
  };

  const handleDeleteTool = (toolId: string) => {
    startTransition(async () => {
      try {
        await deletePortalTool(clientId, toolId);
        toast.success("Tool deleted");
        router.refresh();
      } catch { toast.error("Failed to delete tool"); }
    });
  };

  if (!portalData) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Resources</h2>
        <p className="text-sm text-muted-foreground">Portal data could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Resources</h2>
          {totalCount > 0 && (
            <DashboardStatusBadge tone="default">{totalCount}</DashboardStatusBadge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditingResource(undefined); setResourceDialogOpen(true); }}>
              <BookOpen className="mr-2 h-4 w-4" />
              Add resource
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setEditingTool(undefined); setToolDialogOpen(true); }}>
              <Link2 className="mr-2 h-4 w-4" />
              Add connected tool
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {totalCount === 0 ? (
        <DashboardEmptyState
          icon={BookOpen}
          title="No resources yet"
          description="Add helpful links, tools, FAQs, and external resources for this client's family."
          action={
            <Button size="sm" onClick={() => { setEditingResource(undefined); setResourceDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add resource
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Resources section */}
          {resources.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Resources</p>
              <div className="grid gap-3 lg:grid-cols-2">
                {resources.map((resource) => {
                  const url = normalizeExternalUrl(resource.href);
                  return (
                    <DashboardCard key={resource.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{resource.title}</p>
                          {resource.description && (
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{resource.description}</p>
                          )}
                          {url && (
                            <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                              Open <ArrowUpRight className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button variant="outline" size="sm" onClick={() => { setEditingResource(resource); setResourceDialogOpen(true); }}>
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
                                <AlertDialogDescription>This will permanently delete &quot;{resource.title}&quot;.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDeleteResource(resource.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </DashboardCard>
                  );
                })}
              </div>
            </div>
          )}

          {/* Connected Tools section */}
          {tools.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Connected Tools</p>
              <div className="grid gap-3 lg:grid-cols-2">
                {tools.map((tool) => {
                  const url = normalizeExternalUrl(tool.url);
                  return (
                    <DashboardCard key={tool.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{tool.name}</p>
                          {tool.description && (
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{tool.description}</p>
                          )}
                          {tool.whenToUse && (
                            <div className="mt-2 rounded-lg bg-muted/30 p-2 text-xs text-muted-foreground">{tool.whenToUse}</div>
                          )}
                          {url && (
                            <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                              Open tool <ArrowUpRight className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button variant="outline" size="sm" onClick={() => { setEditingTool(tool); setToolDialogOpen(true); }}>
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
                                <AlertDialogDescription>This will permanently delete &quot;{tool.name}&quot;.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDeleteTool(tool.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </DashboardCard>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <PortalResourceDialog
        open={resourceDialogOpen}
        onOpenChange={setResourceDialogOpen}
        clientId={clientId}
        resource={editingResource}
        onSuccess={() => router.refresh()}
      />
      <PortalToolDialog
        open={toolDialogOpen}
        onOpenChange={setToolDialogOpen}
        clientId={clientId}
        tool={editingTool}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}

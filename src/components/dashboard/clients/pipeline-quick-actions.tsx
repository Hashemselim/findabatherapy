"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardPlus, PlusCircle, Users } from "lucide-react";

import { TaskFormDialog } from "@/components/dashboard/tasks";
import { Button } from "@/components/ui/button";
import { LockedButton } from "@/components/ui/preview-banner";

interface ClientOption {
  id: string;
  name: string;
}

interface PipelineQuickActionsProps {
  isPreview: boolean;
  clients: ClientOption[];
}

export function PipelineQuickActions({
  isPreview,
  clients,
}: PipelineQuickActionsProps) {
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  return (
    <>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/dashboard/clients">
            <Users className="h-4 w-4" />
            View Clients
          </Link>
        </Button>

        {isPreview ? (
          <LockedButton label="Add Task" className="w-full sm:w-auto" />
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setIsTaskDialogOpen(true)}
          >
            <ClipboardPlus className="h-4 w-4" />
            Add Task
          </Button>
        )}

        {isPreview ? (
          <LockedButton label="Add Client" className="w-full sm:w-auto" />
        ) : (
          <Button asChild size="sm" className="gap-2">
            <Link href="/dashboard/clients/new">
              <PlusCircle className="h-4 w-4" />
              Add Client
            </Link>
          </Button>
        )}
      </div>

      {!isPreview && (
        <TaskFormDialog
          open={isTaskDialogOpen}
          onOpenChange={setIsTaskDialogOpen}
          clients={clients}
          showClientSelector
        />
      )}
    </>
  );
}

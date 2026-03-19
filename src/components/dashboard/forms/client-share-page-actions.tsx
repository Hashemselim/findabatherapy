"use client";

import { useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ClientLinkDialog } from "./client-link-dialog";

interface ClientSharePageActionsProps {
  clients: { id: string; name: string }[];
  kind: "documents" | "intake";
  previewPath?: string;
  previewLabel?: string;
  shareLabel?: string;
}

export function ClientSharePageActions({
  clients,
  kind,
  previewPath,
  previewLabel = "Preview",
  shareLabel = "Create Client Link",
}: ClientSharePageActionsProps) {
  const [open, setOpen] = useState(false);
  const canOpenDialog = kind === "intake" ? Boolean(previewPath) || clients.length > 0 : clients.length > 0;

  return (
    <>
      {previewPath ? (
        <Button asChild size="sm" variant="outline" className="w-full gap-2 sm:w-auto">
          <a href={previewPath} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            {previewLabel}
          </a>
        </Button>
      ) : null}
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full gap-2 sm:w-auto"
        disabled={!canOpenDialog}
      >
        <Link2 className="h-4 w-4" />
        {shareLabel}
      </Button>
      <ClientLinkDialog
        clients={clients}
        kind={kind}
        open={open}
        onOpenChange={setOpen}
        genericLinkPath={kind === "intake" ? previewPath : undefined}
      />
    </>
  );
}

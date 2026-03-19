"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClientDocumentUploadToken } from "@/lib/actions/clients";
import { createIntakeToken } from "@/lib/actions/intake";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ClientLinkKind = "documents" | "intake";

interface ClientLinkDialogProps {
  clients: { id: string; name: string }[];
  kind: ClientLinkKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  genericLinkPath?: string;
  fixedClientId?: string | null;
  fixedClientName?: string | null;
}

const copyToClipboard = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
};

const copyMap: Record<
  ClientLinkKind,
  {
    title: string;
    description: string;
    descriptionWithGeneric?: string;
    buttonLabel: string;
    emptyState: string;
    helper: string;
    genericHelper?: string;
    createdMessage: string;
    copiedMessage: string;
  }
> = {
  intake: {
    title: "Share Intake Form",
    description:
      "Create a client-specific intake link so the family's submission attaches to the right child automatically.",
    descriptionWithGeneric:
      "Create a reusable intake link, or assign it to a specific client when you want the submission attached automatically.",
    buttonLabel: "Create Link",
    emptyState: "Create a client first before sharing the intake form.",
    helper:
      "This link is tied to one client, so intake responses land on the correct record without any manual matching.",
    genericHelper:
      "Generic links open a blank intake form that any family can fill out. Assigned links prefill the client and keep the submission attached automatically.",
    createdMessage: "Intake link created.",
    copiedMessage: "Intake link copied to clipboard.",
  },
  documents: {
    title: "Share Document Upload Page",
    description:
      "Create a secure upload link for a specific client so diagnosis reports, referrals, and medical history attach to the correct record.",
    buttonLabel: "Create Link",
    emptyState: "Create a client first before sharing the document upload page.",
    helper:
      "Each upload link is client-specific. Families can upload supporting files without seeing any other records.",
    createdMessage: "Document upload link created.",
    copiedMessage: "Document upload link copied to clipboard.",
  },
};

export function ClientLinkDialog({
  clients,
  kind,
  open,
  onOpenChange,
  genericLinkPath,
  fixedClientId,
  fixedClientName,
}: ClientLinkDialogProps) {
  const supportsGeneric = kind === "intake" && Boolean(genericLinkPath) && !fixedClientId;
  const genericOptionValue = "__generic__";
  const [clientId, setClientId] = useState(
    fixedClientId || (supportsGeneric ? genericOptionValue : "")
  );
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isGenericSelection = supportsGeneric && clientId === genericOptionValue;

  const selectedClient = useMemo(
    () =>
      clients.find((client) => client.id === (fixedClientId || (isGenericSelection ? "" : clientId))) ||
      null,
    [clientId, clients, fixedClientId, isGenericSelection]
  );

  useEffect(() => {
    if (!open) {
      setClientId(fixedClientId || (supportsGeneric ? genericOptionValue : ""));
      setGeneratedUrl("");
      setCopied(false);
    }
  }, [fixedClientId, open, supportsGeneric]);

  const content = copyMap[kind];

  const handleGenerate = () => {
    if (isGenericSelection && genericLinkPath) {
      const genericUrl = `${window.location.origin}${genericLinkPath}`;
      setGeneratedUrl(genericUrl);
      void copyToClipboard(genericUrl).then((didCopy) => {
        setCopied(didCopy);
        toast.success(didCopy ? content.copiedMessage : content.createdMessage);
      });
      return;
    }

    const targetClientId = fixedClientId || clientId;
    if (!targetClientId) {
      toast.error("Choose a client first.");
      return;
    }

    startTransition(async () => {
      const result =
        kind === "intake"
          ? await createIntakeToken(targetClientId)
          : await createClientDocumentUploadToken(targetClientId);

      if (!result.success) {
        toast.error(result.error || "Failed to create share link.");
        return;
      }

      if (!result.data) {
        toast.error("Failed to create share link.");
        return;
      }

      setGeneratedUrl(result.data.url);
      const didCopy = await copyToClipboard(result.data.url);
      setCopied(didCopy);
      toast.success(didCopy ? content.copiedMessage : content.createdMessage);
    });
  };

  const handleCopy = async () => {
    if (!generatedUrl) return;
    const didCopy = await copyToClipboard(generatedUrl);
    if (!didCopy) {
      toast.error("Failed to copy link.");
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>
            {supportsGeneric && content.descriptionWithGeneric
              ? content.descriptionWithGeneric
              : content.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{fixedClientId ? "Client" : supportsGeneric ? "Link Type" : "Select Client"}</Label>
            {fixedClientId ? (
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm font-medium">
                {fixedClientName || selectedClient?.name || "Selected Client"}
              </div>
            ) : clients.length ? (
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder={supportsGeneric ? "Choose how to share this form" : "Choose a client"} />
                </SelectTrigger>
                <SelectContent>
                  {supportsGeneric ? (
                    <SelectItem value={genericOptionValue}>Generic reusable link</SelectItem>
                  ) : null}
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : supportsGeneric ? (
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm font-medium">
                Generic reusable link
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                {content.emptyState}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {isGenericSelection && content.genericHelper ? content.genericHelper : content.helper}
            </p>
          </div>

          {generatedUrl && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex items-start gap-2">
                <Link2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Share Link
                  </p>
                  {isGenericSelection ? (
                    <p className="mt-1 text-sm font-medium text-foreground">Generic reusable link</p>
                  ) : selectedClient?.name ? (
                    <p className="mt-1 text-sm font-medium text-foreground">{selectedClient.name}</p>
                  ) : null}
                  <p className="mt-1 break-all font-mono text-xs text-foreground">{generatedUrl}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {generatedUrl ? (
            <Button asChild type="button" variant="outline">
              <a href={generatedUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Link
              </a>
            </Button>
          ) : null}
          {generatedUrl ? (
            <Button type="button" variant="outline" onClick={handleCopy}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied" : "Copy Again"}
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={
              isPending ||
              (!fixedClientId && !clientId) ||
              (!fixedClientId && !supportsGeneric && !clients.length)
            }
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {content.buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

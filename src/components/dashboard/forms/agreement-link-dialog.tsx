"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Copy, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createAgreementLink, type AgreementPacketOption } from "@/lib/actions/agreements";
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

interface AgreementLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packets: AgreementPacketOption[];
  clients: { id: string; name: string }[];
  initialPacketId?: string | null;
  fixedClientId?: string | null;
  fixedClientName?: string | null;
}

export function AgreementLinkDialog({
  open,
  onOpenChange,
  packets,
  clients,
  initialPacketId,
  fixedClientId,
  fixedClientName,
}: AgreementLinkDialogProps) {
  const [packetId, setPacketId] = useState(initialPacketId || packets[0]?.id || "");
  const [clientId, setClientId] = useState(fixedClientId || "");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setGeneratedUrl("");
      setCopied(false);
      setPacketId(initialPacketId || packets[0]?.id || "");
      setClientId(fixedClientId || "");
    }
  }, [open, initialPacketId, packets, fixedClientId]);

  const selectedPacket = useMemo(
    () => packets.find((packet) => packet.id === packetId) || null,
    [packets, packetId]
  );

  const handleGenerate = () => {
    if (!packetId) {
      toast.error("Set up your agreement form first.");
      return;
    }

    startTransition(async () => {
      const result = await createAgreementLink({
        packet_id: packetId,
        client_id: fixedClientId || clientId || undefined,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to create share link.");
        return;
      }
      if (!result.data) {
        toast.error("Failed to create share link.");
        return;
      }

      setGeneratedUrl(result.data.url);
      try {
        await navigator.clipboard.writeText(result.data.url);
        setCopied(true);
        toast.success("Agreement link copied to clipboard.");
      } catch {
        toast.success("Agreement link created.");
      }
    });
  };

  const handleCopy = async () => {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Share Agreement Form</DialogTitle>
          <DialogDescription>
            Create a branded signing link for your agreement form. If you change the documents later, create a new link so families see the latest version.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {packets.length > 1 ? (
            <div className="space-y-2">
              <Label>Agreement form</Label>
              <Select value={packetId} onValueChange={setPacketId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an agreement form" />
                </SelectTrigger>
                <SelectContent>
                  {packets.map((packet) => (
                    <SelectItem key={packet.id} value={packet.id}>
                      {packet.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : selectedPacket ? (
            <div className="space-y-2">
              <Label>Agreement form</Label>
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm font-medium">
                {selectedPacket.title}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>{fixedClientId ? "Client" : "Assign to Client (Optional)"}</Label>
            {fixedClientId ? (
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm font-medium">
                {fixedClientName || "Selected Client"}
              </div>
            ) : (
              <Select value={clientId || "generic"} onValueChange={(value) => setClientId(value === "generic" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Create a generic reusable link" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generic">Generic reusable link</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              Assigned links prefill the client name and attach the signed agreement automatically. Generic links stay in the central list until you link them.
            </p>
            <p className="text-xs text-muted-foreground">
              Each link keeps the document set that was live when the link was created.
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
                  <p className="mt-1 break-all font-mono text-xs text-foreground">
                    {generatedUrl}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {generatedUrl && (
            <Button type="button" variant="outline" onClick={handleCopy}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied" : "Copy Again"}
            </Button>
          )}
          <Button type="button" onClick={handleGenerate} disabled={isPending || !packets.length}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

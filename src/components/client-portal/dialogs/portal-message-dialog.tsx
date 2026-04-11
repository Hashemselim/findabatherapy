"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { PortalMessageData } from "@/lib/actions/client-portal";
import { savePortalMessage } from "@/lib/actions/client-portal";
import { MESSAGE_TYPE_OPTIONS } from "../portal-constants";

interface PortalMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  message?: PortalMessageData;
  onSuccess?: () => void;
}

export function PortalMessageDialog({
  open,
  onOpenChange,
  clientId,
  message,
  onSuccess,
}: PortalMessageDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!message;

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [messageType, setMessageType] = useState("general_update");
  const [emailNotify, setEmailNotify] = useState(false);

  useEffect(() => {
    if (open) {
      setSubject(message?.subject ?? "");
      setBody(message?.body ?? "");
      setMessageType(message?.messageType ?? "general_update");
      setEmailNotify(message?.emailNotify ?? false);
    }
  }, [open, message]);

  const isValid = subject.trim().length > 0 && body.trim().length > 0;

  function handleSubmit() {
    startTransition(async () => {
      const result = await savePortalMessage({
        recordId: message?.id,
        clientId,
        subject: subject.trim(),
        body: body.trim(),
        messageType,
        audience: "client",
        emailNotify,
      });

      if (result.success) {
        toast.success(isEditing ? "Message updated" : "Message published");
        router.refresh();
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit message" : "Publish message"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="msg-subject">Subject</Label>
            <Input
              id="msg-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Message subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-body">Body</Label>
            <Textarea
              id="msg-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Message body"
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={messageType} onValueChange={setMessageType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESSAGE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="msg-email-notify">Send email notification</Label>
            <Switch
              id="msg-email-notify"
              checked={emailNotify}
              onCheckedChange={setEmailNotify}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button disabled={isPending || !isValid} onClick={handleSubmit}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Save" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

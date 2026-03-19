"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { bulkSendReferralEmails, sendReferralEmail, type ReferralTemplate } from "@/lib/actions/referrals";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ReferralSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ReferralTemplate[];
  sourceIds: string[];
  sourceName?: string;
}

export function ReferralSendDialog({
  open,
  onOpenChange,
  templates,
  sourceIds,
  sourceName,
}: ReferralSendDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [templateId, setTemplateId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const isBulk = sourceIds.length > 1;

  const defaultTemplate = useMemo(
    () => templates.find((template) => template.is_default) || templates[0] || null,
    [templates]
  );

  useEffect(() => {
    if (!open) return;
    const initialTemplate = defaultTemplate;
    setTemplateId(initialTemplate?.id || "");
    setSubject(initialTemplate?.subject || "");
    setBody(initialTemplate?.body || "");
  }, [defaultTemplate, open]);

  function handleTemplateChange(nextTemplateId: string) {
    setTemplateId(nextTemplateId);
    const template = templates.find((item) => item.id === nextTemplateId);
    if (!template) return;
    setSubject(template.subject);
    setBody(template.body);
  }

  function handleSend() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are required");
      return;
    }

    startTransition(async () => {
      const result = isBulk
        ? await bulkSendReferralEmails({
            sourceIds,
            templateId: templateId || null,
            subject,
            body,
            campaignName: `Referral outreach ${new Date().toLocaleDateString()}`,
          })
        : await sendReferralEmail({
            sourceId: sourceIds[0],
            templateId: templateId || null,
            subject,
            body,
          });

      if (!result.success) {
        toast.error(result.error || "Failed to send outreach");
        return;
      }

      toast.success(isBulk ? "Bulk outreach sent" : "Referral email sent");
      router.refresh();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {isBulk ? "Bulk Referral Outreach" : `Send Intro${sourceName ? ` to ${sourceName}` : ""}`}
          </DialogTitle>
          <DialogDescription>
            {isBulk
              ? `Review and send outreach to ${sourceIds.length} selected referral sources.`
              : "Open the default outreach template, edit it if needed, and send."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={(event) => setSubject(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={14}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Merge fields supported: <code>{"{{agency_name}}"}</code>, <code>{"{{contact_name}}"}</code>, <code>{"{{brochure_link}}"}</code>, <code>{"{{agency_email}}"}</code>.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isBulk ? "Send Bulk Outreach" : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

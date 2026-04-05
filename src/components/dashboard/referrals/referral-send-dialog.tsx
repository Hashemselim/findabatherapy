"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import {
  prepareReferralInboxDrafts,
  type ReferralInboxDraft,
  type ReferralInboxDraftSkip,
  type ReferralTemplate,
} from "@/lib/actions/referrals";
import {
  buildReferralComposeUrl,
  type ReferralInboxClient,
} from "@/lib/referrals/email-compose";
import { REFERRAL_INBOX_DRAFT_WINDOW_LIMIT } from "@/lib/referrals/email-policy";
import { isValidEmailAddress } from "@/components/dashboard/clients/send-communication-dialog.utils";
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
  actionOverrides?: {
    prepareDrafts?: typeof prepareReferralInboxDrafts;
  };
}

function summarizeSkipped(
  skipped: Array<{ reason: "do_not_contact" | "no_email" | "not_found" }>
) {
  if (skipped.length === 0) return null;

  const counts = skipped.reduce(
    (acc, item) => {
      acc[item.reason] += 1;
      return acc;
    },
    {
      do_not_contact: 0,
      no_email: 0,
      not_found: 0,
    }
  );

  const parts: string[] = [];
  if (counts.no_email > 0) parts.push(`${counts.no_email} without email`);
  if (counts.do_not_contact > 0) parts.push(`${counts.do_not_contact} marked do not contact`);
  if (counts.not_found > 0) parts.push(`${counts.not_found} unavailable`);
  return parts.join(", ");
}

function parseTestRecipientEmails(value: string) {
  return value
    .split(/[,\n;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ReferralSendDialog({
  open,
  onOpenChange,
  templates,
  sourceIds,
  sourceName,
  actionOverrides,
}: ReferralSendDialogProps) {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [testRecipientsInput, setTestRecipientsInput] = useState("");
  const [draftOffset, setDraftOffset] = useState(0);
  const [preparedDrafts, setPreparedDrafts] = useState<ReferralInboxDraft[]>([]);
  const [preparedSkipped, setPreparedSkipped] = useState<ReferralInboxDraftSkip[]>([]);
  const [draftPrepError, setDraftPrepError] = useState<string | null>(null);
  const [isPreparingDrafts, setIsPreparingDrafts] = useState(false);
  const prepRequestIdRef = useRef(0);

  const isBulk = sourceIds.length > 1;
  const isBusy = pendingAction !== null;

  const defaultTemplate = useMemo(
    () => templates.find((template) => template.is_default) || templates[0] || null,
    [templates]
  );
  const prepareDraftsAction = actionOverrides?.prepareDrafts ?? prepareReferralInboxDrafts;
  const parsedTestRecipients = useMemo(
    () => parseTestRecipientEmails(testRecipientsInput),
    [testRecipientsInput]
  );
  const invalidTestRecipient = useMemo(
    () => parsedTestRecipients.find((email) => !isValidEmailAddress(email)) || null,
    [parsedTestRecipients]
  );
  const batchSize = Math.min(preparedDrafts.length || sourceIds.length, REFERRAL_INBOX_DRAFT_WINDOW_LIMIT);
  const nextBatchEnd = Math.min(preparedDrafts.length || sourceIds.length, draftOffset + batchSize);

  useEffect(() => {
    if (!open) return;
    const initialTemplate = defaultTemplate;
    setTemplateId(initialTemplate?.id || "");
    setSubject(initialTemplate?.subject || "");
    setBody(initialTemplate?.body || "");
    setTestRecipientsInput("");
    setPendingAction(null);
    setDraftOffset(0);
    setPreparedDrafts([]);
    setPreparedSkipped([]);
    setDraftPrepError(null);
    setIsPreparingDrafts(false);
  }, [defaultTemplate, open]);

  useEffect(() => {
    if (!open) return;

    if (!subject.trim() || !body.trim() || sourceIds.length === 0 || invalidTestRecipient) {
      setPreparedDrafts([]);
      setPreparedSkipped([]);
      setDraftPrepError(null);
      setIsPreparingDrafts(false);
      return;
    }

    const requestId = prepRequestIdRef.current + 1;
    prepRequestIdRef.current = requestId;
    setIsPreparingDrafts(true);
    setDraftPrepError(null);

    const timeoutId = window.setTimeout(async () => {
      const result = await prepareDraftsAction({
        sourceIds,
        subject,
        body,
        testRecipientEmails: parsedTestRecipients,
      });

      if (prepRequestIdRef.current !== requestId) {
        return;
      }

      if (!result.success) {
        setPreparedDrafts([]);
        setPreparedSkipped([]);
        setDraftPrepError(result.error || "Failed to prepare inbox drafts");
        setIsPreparingDrafts(false);
        return;
      }

      if (!result.data) {
        setPreparedDrafts([]);
        setPreparedSkipped([]);
        setDraftPrepError("Failed to prepare inbox drafts");
        setIsPreparingDrafts(false);
        return;
      }

      setPreparedDrafts(result.data.drafts);
      setPreparedSkipped(result.data.skipped);
      setDraftPrepError(null);
      setIsPreparingDrafts(false);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    open,
    prepareDraftsAction,
    sourceIds,
    subject,
    body,
    parsedTestRecipients,
    invalidTestRecipient,
  ]);

  function handleTemplateChange(nextTemplateId: string) {
    setTemplateId(nextTemplateId);
    const template = templates.find((item) => item.id === nextTemplateId);
    if (!template) return;
    setSubject(template.subject);
    setBody(template.body);
    setDraftOffset(0);
  }

  function validateDraftInputs() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are required");
      return false;
    }

    if (sourceIds.length === 0) {
      toast.error("Choose at least one referral source");
      return false;
    }

    if (invalidTestRecipient) {
      toast.error(`Invalid test email: ${invalidTestRecipient}`);
      return false;
    }

    return true;
  }

  function handleInboxSend(client: ReferralInboxClient) {
    if (!validateDraftInputs()) return;
    if (isPreparingDrafts) {
      toast.info("Preparing drafts", {
        description: "Wait a moment for the personalized drafts to finish loading.",
      });
      return;
    }

    if (draftPrepError) {
      toast.error(draftPrepError);
      return;
    }

    const drafts = preparedDrafts;
    const skippedSummary = summarizeSkipped(preparedSkipped);
    const openLimit =
      client === "mailto"
        ? 1
        : Math.min(Math.max(0, drafts.length - draftOffset), REFERRAL_INBOX_DRAFT_WINDOW_LIMIT);

    setPendingAction(client);

    try {
      if (drafts.length === 0) {
        toast.error("No inbox drafts available", {
          description: skippedSummary || "These sources need a valid email before you can send.",
        });
        return;
      }

      const draftsToOpen =
        client === "mailto"
          ? drafts.slice(0, 1)
          : drafts.slice(draftOffset, draftOffset + openLimit);

      if (draftsToOpen.length === 0) {
        toast.info("All eligible drafts are already opened for this batch", {
          description: "Close and reopen the dialog to start from the first recipient again.",
        });
        return;
      }

      let blockedWindows = 0;

      if (client === "mailto") {
        window.location.href = buildReferralComposeUrl("mailto", draftsToOpen[0]);
      } else {
        draftsToOpen.forEach((draft) => {
          const url = buildReferralComposeUrl(client, draft);
          const draftWindow = window.open(url, "_blank", "noopener,noreferrer");

          if (!draftWindow) {
            blockedWindows += 1;
          }
        });

        if (blockedWindows > 0) {
          toast.error("Browser blocked some draft windows", {
            description: `Allow popups for this site, then try again. ${blockedWindows} draft${blockedWindows === 1 ? "" : "s"} did not open.`,
          });
        }
      }

      const successfulOpenCount =
        client === "mailto"
          ? draftsToOpen.length
          : Math.max(0, draftsToOpen.length - blockedWindows);

      if (successfulOpenCount === 0) {
        return;
      }

      const nextOffset = client === "mailto" ? 0 : draftOffset + successfulOpenCount;
      const remainingCount = Math.max(0, drafts.length - nextOffset);
      const descriptionParts: string[] = [];
      if (remainingCount > 0) {
        descriptionParts.push(
          `${remainingCount} more ${remainingCount === 1 ? "draft is" : "drafts are"} still available`
        );
      }
      if (parsedTestRecipients.length > 0) {
        descriptionParts.push(`testing override to ${parsedTestRecipients.join(", ")}`);
      }
      if (skippedSummary) {
        descriptionParts.push(skippedSummary);
      }

      const clientLabel = client === "mailto" ? "mail app" : client;
      toast.success(
        client === "mailto"
          ? "Mail app draft opened"
          : `Opened ${successfulOpenCount} ${clientLabel} draft${successfulOpenCount === 1 ? "" : "s"}`,
        {
          description: descriptionParts.join(" · ") || undefined,
        }
      );

      if (client === "mailto" || !isBulk || remainingCount === 0) {
        setDraftOffset(0);
        onOpenChange(false);
        return;
      }

      setDraftOffset(nextOffset);
    } finally {
      setPendingAction(null);
    }
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
              ? `Review the template, then open draft emails in the user's chosen inbox app for ${sourceIds.length} selected referral sources.`
              : "Review the template, then open a draft email in the user's chosen inbox app."}
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

          <div className="space-y-2">
            <Label htmlFor="referral-test-recipients">Test Draft Recipients (optional)</Label>
            <Input
              id="referral-test-recipients"
              value={testRecipientsInput}
              onChange={(event) => {
                setTestRecipientsInput(event.target.value);
                setDraftOffset(0);
              }}
              placeholder="you@example.com, second@example.com"
            />
            <p className="text-xs text-muted-foreground">
              Add your personal email addresses here to test safely. Drafts will still use the selected referral source content, but the To field will be overridden so no provider email is used.
            </p>
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-medium">Draft emails open in the user&apos;s chosen inbox client.</p>
            <p className="text-sm text-muted-foreground">
              We never send referral-network outreach from GoodABA. Gmail, Outlook, and Yahoo open prefilled web drafts. Single-send can also open the default mail app.
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={() => handleInboxSend("gmail")} disabled={isBusy || isPreparingDrafts}>
                {pendingAction === "gmail" ? <Loader2 className="animate-spin" /> : <ExternalLink />}
                {isBulk ? "Open Gmail Drafts" : "Open in Gmail"}
              </Button>
              <Button variant="outline" onClick={() => handleInboxSend("outlook")} disabled={isBusy || isPreparingDrafts}>
                {pendingAction === "outlook" ? <Loader2 className="animate-spin" /> : <ExternalLink />}
                {isBulk ? "Open Outlook Drafts" : "Open in Outlook"}
              </Button>
              <Button variant="outline" onClick={() => handleInboxSend("yahoo")} disabled={isBusy || isPreparingDrafts}>
                {pendingAction === "yahoo" ? <Loader2 className="animate-spin" /> : <ExternalLink />}
                {isBulk ? "Open Yahoo Drafts" : "Open in Yahoo"}
              </Button>
              {!isBulk ? (
                <Button variant="outline" onClick={() => handleInboxSend("mailto")} disabled={isBusy || isPreparingDrafts}>
                  {pendingAction === "mailto" ? <Loader2 className="animate-spin" /> : <Mail />}
                  Open in Mail App
                </Button>
              ) : (
                <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                  Mail app mode is single-send only. For bulk, use Gmail, Outlook, or Yahoo drafts.
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {isPreparingDrafts
                ? "Preparing personalized drafts..."
                : isBulk
                ? `Bulk opens up to ${REFERRAL_INBOX_DRAFT_WINDOW_LIMIT} drafts at once to avoid popup blocking.`
                : "Drafts use the merged recipient-specific subject and body you see above."}
            </p>
            {isBulk ? (
              <p className="text-xs text-muted-foreground">
                {draftOffset === 0
                  ? `The first batch will open up to ${nextBatchEnd} drafts.`
                  : `The next batch starts at draft ${draftOffset + 1}.`}
              </p>
            ) : null}
            {!isPreparingDrafts && !draftPrepError ? (
              <p className="text-xs text-muted-foreground">
                {preparedDrafts.length === 0
                  ? "No eligible email drafts are ready yet."
                  : `${preparedDrafts.length} draft${preparedDrafts.length === 1 ? "" : "s"} ready to open${preparedSkipped.length > 0 ? `, ${preparedSkipped.length} skipped` : ""}.`}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { Loader2, Mail, Plus, X } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DashboardStatusBadge,
  type DashboardTone,
} from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { PARENT_RELATIONSHIP_OPTIONS } from "@/lib/validations/clients";
import {
  getTemplates,
  populateMergeFields,
  sendCommunication,
  getAgencyBranding,
  getClientMergeFieldValues,
  type CommunicationTemplate,
} from "@/lib/actions/communications";
import type { AgencyBrandingData } from "@/lib/email/email-helpers";
import {
  EmailEditor,
  MERGE_FIELD_CATEGORIES,
  MERGE_FIELD_MAP,
  templateHtmlToMergeFieldHtml,
  mergeFieldHtmlToTemplate,
} from "./email-editor";
import {
  resolveCcEmails,
} from "./send-communication-dialog.utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIFECYCLE_STAGES: Record<
  string,
  { label: string; tone: DashboardTone }
> = {
  inquiry: { label: "Inquiry", tone: "info" },
  intake_pending: { label: "Intake Pending", tone: "premium" },
  waitlist: { label: "Waitlist", tone: "warning" },
  assessment: { label: "Assessment", tone: "warning" },
  active: { label: "Active", tone: "success" },
  discharged: { label: "Discharged", tone: "default" },
  any: { label: "General", tone: "default" },
};

const RELATIONSHIP_LABELS: Record<string, string> = Object.fromEntries(
  PARENT_RELATIONSHIP_OPTIONS.map((o) => [o.value, o.label])
);

/** Fields that require manual input — derived from merge field registry */
const MANUAL_FIELDS = MERGE_FIELD_CATEGORIES.flatMap((c) => c.fields).filter(
  (f) => f.manual
);
const MANUAL_FIELD_KEYS = MANUAL_FIELDS.map((f) => f.key);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Recipient {
  email: string;
  name: string;
  relationship: string;
  isPrimary: boolean;
}

interface SendCommunicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  recipients: Recipient[];
  currentStage?: string;
  onSuccess?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SendCommunicationDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  recipients,
  currentStage,
  onSuccess,
}: SendCommunicationDialogProps) {
  const [isPending, startTransition] = useTransition();

  // Data
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [branding, setBranding] = useState<AgencyBrandingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState("");
  const [showCcField, setShowCcField] = useState(false);
  const [manualFieldValues, setManualFieldValues] = useState<
    Record<string, string>
  >({});

  // Feedback
  const [fieldValues, setFieldValues] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Derived
  const validTemplates = useMemo(
    () => templates.filter((t) => t.slug.trim().length > 0),
    [templates]
  );

  const templatesByStage = useMemo(() => {
    const grouped: Record<string, CommunicationTemplate[]> = {};
    for (const template of validTemplates) {
      const stage = template.lifecycle_stage || "any";
      if (!grouped[stage]) grouped[stage] = [];
      grouped[stage].push(template);
    }
    return grouped;
  }, [validTemplates]);

  const orderedStages = useMemo(() => {
    const stageOrder = [
      "inquiry",
      "intake_pending",
      "waitlist",
      "assessment",
      "authorization",
      "active",
      "discharged",
      "any",
    ];
    const stages = Object.keys(templatesByStage);
    return stages.sort((a, b) => {
      if (a === currentStage) return -1;
      if (b === currentStage) return 1;
      return stageOrder.indexOf(a) - stageOrder.indexOf(b);
    });
  }, [templatesByStage, currentStage]);

  const selectedTemplate = validTemplates.find(
    (t) => t.slug === selectedTemplateSlug
  );

  // Detect which manual fields are present in the current body
  const activeManualFields = useMemo(() => {
    return MANUAL_FIELD_KEYS.filter(
      (key) => body.includes(`data-merge-field="${key}"`) || body.includes(`{${key}}`)
    );
  }, [body]);

  const fromLine = branding
    ? `${branding.agencyName} <noreply@goodaba.com>`
    : "Loading...";
  const replyToLine = branding?.contactEmail || "\u2014";

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Load templates + branding when dialog opens
  useEffect(() => {
    if (!open) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setSelectedTemplateSlug("");
    setSubject("");
    setBody("");
    setShowCcField(false);
    setCcEmails([]);
    setCcInput("");
    setManualFieldValues({});

    const primaryEmails = recipients
      .filter((r) => r.isPrimary)
      .map((r) => r.email);
    setSelectedEmails(
      primaryEmails.length > 0
        ? primaryEmails
        : recipients.length > 0
          ? [recipients[0].email]
          : []
    );

    Promise.all([getTemplates(), getAgencyBranding(), getClientMergeFieldValues(clientId)]).then(
      ([templatesResult, brandingResult, fieldValuesResult]) => {
        if (templatesResult.success && templatesResult.data) {
          setTemplates(templatesResult.data);
        } else {
          setError("Failed to load templates");
        }
        if (brandingResult.success && brandingResult.data) {
          setBranding(brandingResult.data);
        }
        if (fieldValuesResult.success && fieldValuesResult.data) {
          setFieldValues(fieldValuesResult.data);
        }
        setIsLoading(false);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clientId]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const toggleRecipient = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email)
        ? prev.filter((e) => e !== email)
        : [...prev, email]
    );
  };

  const handleTemplateSelect = (slug: string) => {
    setSelectedTemplateSlug(slug);
    setError(null);
    setSuccessMessage(null);
    setManualFieldValues({});

    if (slug === "custom") {
      setSubject("");
      setBody("");
      return;
    }

    const template = validTemplates.find((t) => t.slug === slug);
    if (!template) return;

    // Populate auto merge fields via server action, then convert to pill HTML
    startTransition(async () => {
      const [subjectResult, bodyResult] = await Promise.all([
        populateMergeFields(template.subject, clientId),
        populateMergeFields(template.body, clientId),
      ]);

      const populatedSubject =
        subjectResult.success && subjectResult.data
          ? subjectResult.data
          : template.subject;
      const populatedBody =
        bodyResult.success && bodyResult.data
          ? bodyResult.data
          : template.body;

      setSubject(populatedSubject);
      // Convert remaining {field} placeholders to merge-field pill HTML
      setBody(templateHtmlToMergeFieldHtml(populatedBody));
    });
  };

  const updateManualField = (key: string, value: string) => {
    setManualFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const commitCcInput = () => {
    const resolvedCc = resolveCcEmails(ccEmails, ccInput);
    if (resolvedCc.invalidInput) {
      setError("Invalid CC email address");
      return;
    }

    setCcEmails(resolvedCc.ccEmails);
    setCcInput("");
    setError(null);
  };

  const removeCcEmail = (email: string) => {
    setCcEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) {
      setError("Subject and body are required");
      return;
    }
    if (selectedEmails.length === 0) {
      setError("Please select at least one recipient");
      return;
    }

    const resolvedCc = resolveCcEmails(ccEmails, ccInput);
    if (resolvedCc.invalidInput) {
      setError("Invalid CC email address");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setCcEmails(resolvedCc.ccEmails);
    setCcInput("");

    startTransition(async () => {
      // Convert pill HTML back to {field_name} syntax for server processing
      let sendBody = mergeFieldHtmlToTemplate(body);

      // Replace manual fields with user-provided values
      for (const key of MANUAL_FIELD_KEYS) {
        const value = manualFieldValues[key]?.trim();
        if (value) {
          sendBody = sendBody.replace(
            new RegExp(`\\{${key}\\}`, "g"),
            value
          );
        }
      }

      const selectedRecipients = recipients.filter((r) =>
        selectedEmails.includes(r.email)
      );

      console.log("[SEND-DIALOG] Sending with CC:", resolvedCc.ccEmails);

      const results = await Promise.all(
        selectedRecipients.map((recipient) =>
          sendCommunication({
            clientId,
            templateSlug:
              selectedTemplateSlug === "custom"
                ? null
                : selectedTemplateSlug || null,
            subject: subject.trim(),
            body: sendBody.trim(),
            recipientEmail: recipient.email,
            recipientName: recipient.name || undefined,
            cc: resolvedCc.ccEmails.length > 0 ? resolvedCc.ccEmails : undefined,
          })
        )
      );

      const successes = results.filter((r) => r.success).length;
      const failures = results.filter((r) => !r.success);

      if (failures.length === 0) {
        setSuccessMessage(
          successes === 1
            ? "Email sent successfully!"
            : `Email sent to ${successes} recipients!`
        );
        setTimeout(() => {
          onOpenChange(false);
          onSuccess?.();
        }, 1500);
      } else if (successes > 0) {
        setError(
          `Sent to ${successes} recipient(s), but ${failures.length} failed: ${failures.map((f) => !f.success && f.error).join(", ")}`
        );
        onSuccess?.();
      } else {
        setError(
          failures[0] && !failures[0].success
            ? failures[0].error
            : "Failed to send email"
        );
      }
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Communication
          </DialogTitle>
          <DialogDescription>
            Send an email to {clientName}&apos;s parent/guardian
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-3">
          {/* Template Selector */}
          <div className="grid gap-1.5">
            <Label htmlFor="template" className="text-sm font-medium">
              Template
            </Label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <Select
                value={selectedTemplateSlug}
                onValueChange={handleTemplateSelect}
              >
                <SelectTrigger id="template">
                  <SelectValue placeholder="Choose a template or write custom..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="custom">
                    <span className="font-medium">Custom Email</span>
                  </SelectItem>
                  {orderedStages.map((stage) => {
                    const stageConfig = LIFECYCLE_STAGES[stage] || {
                      label: stage,
                      tone: "default" as DashboardTone,
                    };
                    return (
                      <SelectGroup key={stage}>
                        <SelectLabel className="flex items-center gap-2">
                          <DashboardStatusBadge
                            tone={stageConfig.tone}
                            className="px-1.5 py-0 text-xs"
                          >
                            {stageConfig.label}
                          </DashboardStatusBadge>
                          {stage === currentStage && (
                            <span className="text-xs text-muted-foreground">
                              (current)
                            </span>
                          )}
                        </SelectLabel>
                        {templatesByStage[stage]?.map((template) => (
                          <SelectItem
                            key={template.slug}
                            value={template.slug}
                          >
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* From / Reply-To / To */}
          <div className="grid grid-cols-[4.5rem_1fr] gap-y-2 items-start text-sm">
            <Label className="text-xs font-medium text-muted-foreground pt-0.5">From</Label>
            <span className="text-xs text-foreground truncate pt-0.5">{fromLine}</span>

            <Label className="text-xs font-medium text-muted-foreground pt-0.5">Reply-To</Label>
            <span className="text-xs text-foreground truncate pt-0.5">{replyToLine}</span>

            <Label className="text-xs font-medium text-muted-foreground pt-2">To</Label>
            <div className="bg-muted/40 rounded-md px-3 py-2 space-y-1.5">
              {recipients.map((recipient) => (
                <label
                  key={recipient.email}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedEmails.includes(recipient.email)}
                    onCheckedChange={() => toggleRecipient(recipient.email)}
                    disabled={isPending}
                  />
                  <div className="flex items-center gap-1.5 text-sm min-w-0">
                    <span className="font-medium truncate text-xs">
                      {recipient.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] shrink-0 px-1.5 py-0"
                    >
                      {RELATIONSHIP_LABELS[recipient.relationship] ||
                        recipient.relationship}
                    </Badge>
                    {recipient.isPrimary && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] shrink-0 px-1.5 py-0"
                      >
                        Primary
                      </Badge>
                    )}
                    <span className="text-muted-foreground truncate text-xs">
                      &lt;{recipient.email}&gt;
                    </span>
                  </div>
                </label>
              ))}
              {selectedEmails.length === 0 && (
                <p className="text-xs text-destructive">
                  Select at least one recipient
                </p>
              )}
            </div>

            {/* CC */}
            <Label className="text-xs font-medium text-muted-foreground pt-1">CC</Label>
            {!showCcField ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit h-6 text-xs text-muted-foreground"
                onClick={() => setShowCcField(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add CC
              </Button>
            ) : (
              <div className="space-y-1.5">
                {ccEmails.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {ccEmails.map((email) => (
                      <Badge
                        key={email}
                        variant="secondary"
                        className="gap-1 pr-1 text-xs"
                      >
                        {email}
                        <button
                          type="button"
                          onClick={() => removeCcEmail(email)}
                          className="rounded-full hover:bg-muted p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={ccInput}
                    onChange={(e) => setCcInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
                        e.preventDefault();
                        commitCcInput();
                      }
                    }}
                    onBlur={commitCcInput}
                    disabled={isPending}
                    className="flex-1 h-8 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={commitCcInput}
                    disabled={isPending || !ccInput.trim()}
                    className="h-8"
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="grid gap-1.5">
            <Label htmlFor="subject" className="text-sm font-medium">
              Subject
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line"
              disabled={isPending}
              className="h-9"
            />
          </div>

          {/* Manual Field Inputs (only when relevant fields are in the body) */}
          {activeManualFields.length > 0 && (
            <div className="grid gap-1.5">
              <Label className="text-sm font-medium">
                Fill in required fields
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {activeManualFields.map((key) => (
                  <div key={key}>
                    <Label
                      htmlFor={`manual-${key}`}
                      className="text-xs text-muted-foreground mb-1 block"
                    >
                      {MERGE_FIELD_MAP[key]?.label || key}
                    </Label>
                    <Input
                      id={`manual-${key}`}
                      value={manualFieldValues[key] || ""}
                      onChange={(e) => updateManualField(key, e.target.value)}
                      placeholder={MERGE_FIELD_MAP[key]?.label || key}
                      disabled={isPending}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Branded email body editor */}
          <div className="grid gap-1.5">
            <Label className="text-sm font-medium">Body</Label>
            <EmailEditor
              content={body}
              onChange={setBody}
              branding={branding}
              disabled={isPending}
              placeholder="Write your email here..."
              fieldValues={fieldValues}
            />
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 border border-emerald-200">
              {successMessage}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={
              isPending ||
              !subject.trim() ||
              !body.trim() ||
              selectedEmails.length === 0 ||
              !!successMessage
            }
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                {selectedEmails.length > 1
                  ? `Send to ${selectedEmails.length} Recipients`
                  : "Send Email"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

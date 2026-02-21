"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { Loader2, Mail, Eye } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import {
  getTemplates,
  populateMergeFields,
  sendCommunication,
  type CommunicationTemplate,
} from "@/lib/actions/communications";

// Lifecycle stage display config
const LIFECYCLE_STAGES: Record<string, { label: string; color: string }> = {
  inquiry: { label: "Inquiry", color: "bg-blue-100 text-blue-700" },
  intake_pending: { label: "Intake Pending", color: "bg-purple-100 text-purple-700" },
  waitlist: { label: "Waitlist", color: "bg-amber-100 text-amber-700" },
  assessment: { label: "Assessment", color: "bg-orange-100 text-orange-700" },
  active: { label: "Active", color: "bg-green-100 text-green-700" },
  discharged: { label: "Discharged", color: "bg-gray-100 text-gray-700" },
  any: { label: "General", color: "bg-slate-100 text-slate-700" },
};

// Relationship display labels
const RELATIONSHIP_LABELS: Record<string, string> = {
  mother: "Mother",
  father: "Father",
  stepmother: "Stepmother",
  stepfather: "Stepfather",
  guardian: "Guardian",
  grandparent: "Grandparent",
  other: "Other",
};

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
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [activeTab, setActiveTab] = useState<string>("edit");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

  // Group templates by lifecycle stage
  const templatesByStage = useMemo(() => {
    const grouped: Record<string, CommunicationTemplate[]> = {};
    for (const template of templates) {
      const stage = template.lifecycle_stage || "any";
      if (!grouped[stage]) grouped[stage] = [];
      grouped[stage].push(template);
    }
    return grouped;
  }, [templates]);

  // Order stages with current stage first
  const orderedStages = useMemo(() => {
    const stageOrder = ["inquiry", "intake_pending", "waitlist", "assessment", "authorization", "active", "discharged", "any"];
    const stages = Object.keys(templatesByStage);

    // Sort: current stage first, then by standard order
    return stages.sort((a, b) => {
      if (a === currentStage) return -1;
      if (b === currentStage) return 1;
      return stageOrder.indexOf(a) - stageOrder.indexOf(b);
    });
  }, [templatesByStage, currentStage]);

  // Load templates and reset state when dialog opens
  useEffect(() => {
    if (open) {
      setIsLoadingTemplates(true);
      setError(null);
      setSuccessMessage(null);
      setSelectedTemplateSlug("");
      setSubject("");
      setBody("");
      setActiveTab("edit");

      // Default to primary parent(s) selected
      const primaryEmails = recipients
        .filter((r) => r.isPrimary)
        .map((r) => r.email);
      setSelectedEmails(
        primaryEmails.length > 0 ? primaryEmails : recipients.length > 0 ? [recipients[0].email] : []
      );

      getTemplates().then((result) => {
        if (result.success && result.data) {
          setTemplates(result.data);
        } else {
          setError("Failed to load templates");
        }
        setIsLoadingTemplates(false);
      });
    }
  }, [open, recipients]);

  // Toggle recipient selection
  const toggleRecipient = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  // When template is selected, populate fields
  const handleTemplateSelect = (slug: string) => {
    setSelectedTemplateSlug(slug);
    setError(null);
    setSuccessMessage(null);

    if (slug === "custom") {
      setSubject("");
      setBody("");
      return;
    }

    const template = templates.find((t) => t.slug === slug);
    if (!template) return;

    // Populate merge fields in subject and body
    startTransition(async () => {
      const [subjectResult, bodyResult] = await Promise.all([
        populateMergeFields(template.subject, clientId),
        populateMergeFields(template.body, clientId),
      ]);

      if (subjectResult.success && subjectResult.data) {
        setSubject(subjectResult.data);
      } else {
        setSubject(template.subject);
      }

      if (bodyResult.success && bodyResult.data) {
        setBody(bodyResult.data);
      } else {
        setBody(template.body);
      }
    });
  };

  // Preview toggle
  const handlePreviewToggle = () => {
    if (activeTab === "edit") {
      setIsLoadingPreview(true);
      // Show raw HTML body as preview (styled)
      setPreviewHtml(body);
      setIsLoadingPreview(false);
      setActiveTab("preview");
    } else {
      setActiveTab("edit");
    }
  };

  // Send the communication to all selected recipients
  const handleSend = () => {
    if (!subject.trim() || !body.trim()) {
      setError("Subject and body are required");
      return;
    }

    if (selectedEmails.length === 0) {
      setError("Please select at least one recipient");
      return;
    }

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const selectedRecipients = recipients.filter((r) =>
        selectedEmails.includes(r.email)
      );

      const results = await Promise.all(
        selectedRecipients.map((recipient) =>
          sendCommunication({
            clientId,
            templateSlug: selectedTemplateSlug === "custom" ? null : selectedTemplateSlug || null,
            subject: subject.trim(),
            body: body.trim(),
            recipientEmail: recipient.email,
            recipientName: recipient.name || undefined,
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
        setError(failures[0] && !failures[0].success ? failures[0].error : "Failed to send email");
      }
    });
  };

  const selectedTemplate = templates.find((t) => t.slug === selectedTemplateSlug);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Communication
          </DialogTitle>
          <DialogDescription>
            Send an email to {clientName}&apos;s parent/guardian
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Template Selector */}
          <div className="grid gap-2">
            <Label htmlFor="template">Email Template</Label>
            {isLoadingTemplates ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading templates...
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
                      color: "bg-gray-100 text-gray-700",
                    };
                    return (
                      <SelectGroup key={stage}>
                        <SelectLabel className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={cn("text-xs px-1.5 py-0", stageConfig.color)}
                          >
                            {stageConfig.label}
                          </Badge>
                          {stage === currentStage && (
                            <span className="text-xs text-muted-foreground">(current)</span>
                          )}
                        </SelectLabel>
                        {templatesByStage[stage]?.map((template) => (
                          <SelectItem key={template.slug} value={template.slug}>
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

          {/* Merge Fields Info */}
          {selectedTemplate && selectedTemplate.merge_fields.length > 0 && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              <span className="font-medium">Merge fields:</span>{" "}
              {selectedTemplate.merge_fields.map((f) => `{${f}}`).join(", ")}
              <span className="block mt-1">
                Fields like {"{assessment_date}"}, {"{assessment_time}"}, and {"{assessment_location}"} need to be filled in manually.
              </span>
            </div>
          )}

          {/* Recipients */}
          <div className="grid gap-2">
            <Label>To</Label>
            <div className="bg-muted/50 rounded-md px-3 py-2 space-y-2">
              {recipients.map((recipient) => (
                <label
                  key={recipient.email}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedEmails.includes(recipient.email)}
                    onCheckedChange={() => toggleRecipient(recipient.email)}
                    disabled={isPending}
                  />
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <span className="font-medium truncate">{recipient.name}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {RELATIONSHIP_LABELS[recipient.relationship] || recipient.relationship}
                    </Badge>
                    {recipient.isPrimary && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Primary
                      </Badge>
                    )}
                    <span className="text-muted-foreground truncate">
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
          </div>

          {/* Subject */}
          <div className="grid gap-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line"
              disabled={isPending}
            />
          </div>

          {/* Body with Edit/Preview tabs */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="body">Body *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePreviewToggle}
                className="h-7 text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                {activeTab === "edit" ? "Preview" : "Edit"}
              </Button>
            </div>
            {activeTab === "edit" ? (
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Email body content (HTML supported)..."
                rows={12}
                className="font-mono text-sm"
                disabled={isPending}
              />
            ) : (
              <div className="border rounded-md p-4 min-h-[200px] max-h-[400px] overflow-y-auto bg-white">
                {isLoadingPreview ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading preview...
                  </div>
                ) : (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="text-sm text-green-700 bg-green-50 rounded-md px-3 py-2">
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
            disabled={isPending || !subject.trim() || !body.trim() || selectedEmails.length === 0 || !!successMessage}
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

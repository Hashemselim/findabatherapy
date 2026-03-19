"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { saveReferralTemplate, type ReferralImportJob, type ReferralTemplate } from "@/lib/actions/referrals";
import { REFERRAL_TEMPLATE_TYPE_OPTIONS } from "@/lib/validations/referrals";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function ReferralSettingsClient({
  templates,
  importJobs,
}: {
  templates: ReferralTemplate[];
  importJobs: ReferralImportJob[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [name, setName] = useState("");
  const [templateType, setTemplateType] = useState("custom");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    const template = templates.find((item) => item.id === selectedTemplateId) || templates[0];
    if (!template) return;
    setSelectedTemplateId(template.id);
    setName(template.name);
    setTemplateType(template.template_type);
    setSubject(template.subject);
    setBody(template.body);
    setIsDefault(template.is_default);
  }, [selectedTemplateId, templates]);

  function loadTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setName(template.name);
    setTemplateType(template.template_type);
    setSubject(template.subject);
    setBody(template.body);
    setIsDefault(template.is_default);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveReferralTemplate(
        {
          name,
          templateType: templateType as never,
          subject,
          body,
          isDefault,
        },
        selectedTemplateId || undefined
      );

      if (!result.success) {
        toast.error(result.error || "Failed to save template");
        return;
      }

      toast.success("Template saved");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Referral Email Templates</CardTitle>
          <CardDescription>
            Manage the outreach drafts that power single-send and bulk campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={selectedTemplateId} onValueChange={loadTemplate}>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={templateType} onValueChange={setTemplateType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REFERRAL_TEMPLATE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={(event) => setSubject(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={14} className="font-mono text-sm" />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Default template</p>
              <p className="text-sm text-muted-foreground">Used when staff click Send Intro.</p>
            </div>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </div>

          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Template
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Import Jobs</CardTitle>
          <CardDescription>Track discovery and enrichment runs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {importJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No import jobs yet.</p>
          ) : (
            importJobs.map((job) => (
              <div key={job.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{job.external_provider.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">{job.status}</p>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {job.discovered_count} found • {job.inserted_count} new • {job.updated_count} updated • {job.enriched_count} enriched
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(job.created_at).toLocaleString()}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

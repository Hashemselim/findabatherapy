"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Archive,
  ArchiveRestore,
  MailPlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  DashboardEmptyState,
  DashboardStatusBadge,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCard,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeader,
  DashboardTableRow,
  DashboardTabsList,
  DashboardTabsTrigger,
} from "@/components/dashboard/ui";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  archiveCommunicationTemplate,
  deleteCommunicationTemplate,
  getAgencyBranding,
  getCommunicationTemplates,
  getTemplateEditorFieldValues,
  saveCommunicationTemplate,
  unarchiveCommunicationTemplate,
  type CommunicationTemplate,
} from "@/lib/actions/communications";
import type { AgencyBrandingData } from "@/lib/email/email-helpers";
import {
  EmailEditor,
  mergeFieldHtmlToTemplate,
  templateHtmlToMergeFieldHtml,
} from "./email-editor";
import { TemplateSubjectField } from "./template-subject-field";
import { resolveCcEmails } from "./send-communication-dialog.utils";

type TemplateView = "active" | "archived";

const LIFECYCLE_OPTIONS = [
  { value: "inquiry", label: "Inquiry" },
  { value: "intake_pending", label: "Intake Pending" },
  { value: "waitlist", label: "Waitlist" },
  { value: "assessment", label: "Assessment" },
  { value: "authorization", label: "Authorization" },
  { value: "active", label: "Active" },
  { value: "discharged", label: "Discharged" },
  { value: "any", label: "General" },
];

interface TemplateFormState {
  templateId?: string;
  name: string;
  lifecycleStage: string;
  subject: string;
  body: string;
  cc: string[];
}

const EMPTY_FORM: TemplateFormState = {
  name: "",
  lifecycleStage: "any",
  subject: "",
  body: "",
  cc: [],
};

function createFormState(template?: CommunicationTemplate): TemplateFormState {
  if (!template) {
    return EMPTY_FORM;
  }

  return {
    templateId: template.id,
    name: template.name,
    lifecycleStage: template.lifecycle_stage || "any",
    subject: template.subject,
    body: template.body,
    cc: template.cc || [],
  };
}

function TemplateSourceBadge({ template }: { template: CommunicationTemplate }) {
  if (template.source === "custom") {
    return <DashboardStatusBadge tone="premium">Custom</DashboardStatusBadge>;
  }

  return <DashboardStatusBadge tone="default">Built-in</DashboardStatusBadge>;
}

export function CommunicationTemplatesManager() {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [branding, setBranding] = useState<AgencyBrandingData | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<TemplateView>("active");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<TemplateFormState>(EMPTY_FORM);
  const [ccInput, setCcInput] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CommunicationTemplate | null>(null);
  const [isPending, startTransition] = useTransition();
  const editorReady = !isLoading && !!branding && !!fieldValues;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [templatesResult, brandingResult, fieldValuesResult] = await Promise.all([
        getCommunicationTemplates({ archived: "all" }),
        getAgencyBranding(),
        getTemplateEditorFieldValues(),
      ]);

      if (templatesResult.success && templatesResult.data) {
        setTemplates(templatesResult.data);
      } else {
        toast.error("Failed to load communication templates");
      }

      if (brandingResult.success && brandingResult.data) {
        setBranding(brandingResult.data);
      }

      if (fieldValuesResult.success && fieldValuesResult.data) {
        setFieldValues(fieldValuesResult.data);
      } else {
        setFieldValues(null);
        toast.error("Failed to load template fields");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const visibleTemplates = useMemo(
    () =>
      templates.filter((template) =>
        view === "active" ? !template.is_archived : template.is_archived
      ),
    [templates, view]
  );

  const openCreateSheet = () => {
    setForm(EMPTY_FORM);
    setCcInput("");
    setSheetOpen(true);
  };

  const openEditSheet = (template: CommunicationTemplate) => {
    setForm(createFormState(template));
    setCcInput("");
    setSheetOpen(true);
  };

  const commitCcInput = () => {
    const result = resolveCcEmails(form.cc, ccInput);
    if (result.invalidInput) {
      toast.error("Invalid CC email address");
      return;
    }

    setForm((current) => ({ ...current, cc: result.ccEmails }));
    setCcInput("");
  };

  const removeCc = (email: string) => {
    setForm((current) => ({
      ...current,
      cc: current.cc.filter((item) => item !== email),
    }));
  };

  const saveTemplate = () => {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      toast.error("Name, subject, and body are required");
      return;
    }

    startTransition(async () => {
      const result = await saveCommunicationTemplate({
        templateId: form.templateId,
        name: form.name,
        lifecycleStage: form.lifecycleStage,
        subject: form.subject,
        body: form.body,
        cc: form.cc,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Template saved");
      setSheetOpen(false);
      void loadData();
    });
  };

  const archiveTemplate = (template: CommunicationTemplate) => {
    startTransition(async () => {
      const result = await archiveCommunicationTemplate(template.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Template archived");
      void loadData();
    });
  };

  const restoreTemplate = (template: CommunicationTemplate) => {
    startTransition(async () => {
      const result = await unarchiveCommunicationTemplate(template.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Template restored");
      void loadData();
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    startTransition(async () => {
      const result = await deleteCommunicationTemplate(deleteTarget.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Template deleted");
      setDeleteTarget(null);
      void loadData();
    });
  };

  return (
    <>
      <DashboardTableCard>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Templates</CardTitle>
            <CardDescription>
              Manage reusable email templates, variables, CC defaults, and archived items.
            </CardDescription>
          </div>
          <Button onClick={openCreateSheet} disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={view} onValueChange={(value) => setView(value as TemplateView)}>
            <DashboardTabsList>
              <DashboardTabsTrigger value="active">Active</DashboardTabsTrigger>
              <DashboardTabsTrigger value="archived">Archived</DashboardTabsTrigger>
            </DashboardTabsList>
          </Tabs>

          {visibleTemplates.length === 0 ? (
            <DashboardEmptyState
              icon={MailPlus}
              title={view === "active" ? "No templates yet" : "No archived templates"}
              description={
                view === "active"
                  ? "Create your first custom template or edit a built-in template."
                  : "Archived templates will appear here and stay hidden from send options."
              }
              className="border-0 shadow-none"
            />
          ) : (
            <DashboardTable>
              <DashboardTableHeader>
                <DashboardTableRow>
                  <DashboardTableHead className="pl-5 normal-case tracking-normal">Name</DashboardTableHead>
                  <DashboardTableHead className="normal-case tracking-normal">Type</DashboardTableHead>
                  <DashboardTableHead className="hidden normal-case tracking-normal md:table-cell">Lifecycle</DashboardTableHead>
                  <DashboardTableHead className="hidden normal-case tracking-normal lg:table-cell">Subject</DashboardTableHead>
                  <DashboardTableHead className="hidden normal-case tracking-normal sm:table-cell">Updated</DashboardTableHead>
                  <DashboardTableHead className="pr-5 text-right normal-case tracking-normal">Actions</DashboardTableHead>
                </DashboardTableRow>
              </DashboardTableHeader>
              <DashboardTableBody>
                {visibleTemplates.map((template) => (
                  <DashboardTableRow key={template.id}>
                    <DashboardTableCell className="pl-5">
                      <div className="space-y-1">
                        <p className="font-medium">{template.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {template.cc.length > 0 && (
                            <Badge variant="secondary">CC {template.cc.length}</Badge>
                          )}
                          {template.is_archived && (
                            <Badge variant="outline">Archived</Badge>
                          )}
                        </div>
                      </div>
                    </DashboardTableCell>
                    <DashboardTableCell>
                      <TemplateSourceBadge template={template} />
                    </DashboardTableCell>
                    <DashboardTableCell className="hidden md:table-cell text-muted-foreground">
                      {LIFECYCLE_OPTIONS.find((option) => option.value === template.lifecycle_stage)?.label || "General"}
                    </DashboardTableCell>
                    <DashboardTableCell className="hidden max-w-[320px] truncate lg:table-cell text-muted-foreground">
                      {template.subject}
                    </DashboardTableCell>
                    <DashboardTableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                      {new Date(template.updated_at).toLocaleDateString()}
                    </DashboardTableCell>
                    <DashboardTableCell className="pr-5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditSheet(template)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {template.is_archived ? (
                            <DropdownMenuItem onClick={() => restoreTemplate(template)}>
                              <ArchiveRestore className="h-4 w-4" />
                              Unarchive
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => archiveTemplate(template)}>
                              <Archive className="h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          {template.can_delete && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(template)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </DashboardTableCell>
                  </DashboardTableRow>
                ))}
              </DashboardTableBody>
            </DashboardTable>
          )}
        </CardContent>
      </DashboardTableCard>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-3xl">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>{form.templateId ? "Edit Template" : "New Template"}</SheetTitle>
            <SheetDescription>
              Customize the template name, subject, default CC recipients, and body.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Welcome to services"
                  disabled={isPending || !editorReady}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="template-stage">Lifecycle Stage</Label>
                <Select
                  value={form.lifecycleStage}
                  onValueChange={(value) => setForm((current) => ({ ...current, lifecycleStage: value }))}
                  disabled={isPending || !editorReady}
                >
                  <SelectTrigger id="template-stage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIFECYCLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <TemplateSubjectField
                id="template-subject"
                label="Subject"
                value={form.subject}
                onChange={(subject) => setForm((current) => ({ ...current, subject }))}
                disabled={isPending || !editorReady}
              />

              <div className="grid gap-2">
                <Label>Default CC</Label>
                {form.cc.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.cc.map((email) => (
                      <Badge key={email} variant="secondary" className="gap-1 pr-1">
                        {email}
                        <button
                          type="button"
                          className="rounded-full px-1 text-xs"
                          onClick={() => removeCc(email)}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={ccInput}
                    onChange={(event) => setCcInput(event.target.value)}
                    placeholder="email@example.com"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
                        event.preventDefault();
                        commitCcInput();
                      }
                    }}
                    onBlur={commitCcInput}
                    disabled={isPending || !editorReady}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={commitCcInput}
                    disabled={isPending || !editorReady}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Body</Label>
                <EmailEditor
                  content={templateHtmlToMergeFieldHtml(form.body)}
                  onChange={(body) =>
                    setForm((current) => ({
                      ...current,
                      body: mergeFieldHtmlToTemplate(body),
                    }))
                  }
                  branding={branding}
                  placeholder="Write your message..."
                  fieldValues={fieldValues}
                  disabled={isPending || !editorReady}
                />
              </div>

              <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                Built-in templates can be edited and archived. Custom templates can also be deleted permanently.
              </div>
            </div>
          </div>
          <SheetFooter className="border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTemplate} disabled={isPending || !editorReady}>
              <Save className="mr-2 h-4 w-4" />
              Save Template
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <strong>{deleteTarget?.name}</strong>. Built-in templates can only be archived, not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

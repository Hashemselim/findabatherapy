"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  archiveFormTemplate,
  createGenericFormLink,
  publishFormTemplate,
  restoreFormTemplate,
  updateFormTemplateDraft,
  type FormBuilderData,
} from "@/lib/actions/forms";
import { cn } from "@/lib/utils";
import {
  createEmptyFormQuestion,
  duplicateFormQuestion,
  FORM_QUESTION_TYPE_OPTIONS,
  type FormCondition,
  type FormQuestion,
  type FormQuestionOption,
  type FormQuestionType,
  formTemplateDraftSchema,
} from "@/lib/validations/forms";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function isTextLikeType(type: FormQuestionType) {
  return (
    type === "short_text" ||
    type === "long_text" ||
    type === "email" ||
    type === "phone" ||
    type === "number" ||
    type === "date"
  );
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function optionDisplayValue(option: FormQuestionOption) {
  return option.value?.trim() ? option.value.trim() : option.label;
}

function buildNewCondition(): FormCondition {
  return {
    id: createId("condition"),
    sourceQuestionId: "",
    operator: "equals",
    value: "",
  };
}

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    if (typeof document === "undefined") {
      return false;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  }
}

function rebaseToWindowOrigin(url: string) {
  if (typeof window === "undefined") {
    return url;
  }

  const parsedUrl = new URL(url, window.location.origin);
  parsedUrl.protocol = window.location.protocol;
  parsedUrl.host = window.location.host;
  return parsedUrl.toString();
}

function AutoSizingTextarea({
  value,
  className,
  ...props
}: ComponentProps<typeof Textarea>) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }

    element.style.height = "0px";
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);

  return (
    <Textarea
      {...props}
      ref={textareaRef}
      value={value}
      rows={1}
      className={cn("min-h-[52px] resize-none overflow-hidden", className)}
    />
  );
}

export function FormBuilder({
  data,
}: {
  data: FormBuilderData;
  listingSlug: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    title: data.title,
    description: data.description ?? "",
    questions: data.questions,
  });
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    data.questions[0]?.id ?? null,
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const loadedTemplateIdRef = useRef(data.id);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (loadedTemplateIdRef.current === data.id) {
      return;
    }

    loadedTemplateIdRef.current = data.id;
    setDraft({
      title: data.title,
      description: data.description ?? "",
      questions: data.questions,
    });
    setSelectedQuestionId((current) =>
      current && data.questions.some((question) => question.id === current)
        ? current
        : data.questions[0]?.id ?? null,
    );
  }, [data.description, data.id, data.questions, data.title]);

  const debouncedSave = useDebouncedCallback((nextDraft: typeof draft) => {
    const validatedDraft = formTemplateDraftSchema.safeParse({
      title: nextDraft.title.trim() || "Untitled form",
      description: nextDraft.description,
      questions: nextDraft.questions,
    });

    if (!validatedDraft.success) {
      setSaveState("idle");
      return;
    }

    setSaveState("saving");
    void updateFormTemplateDraft({
      templateId: data.id,
      title: validatedDraft.data.title,
      description: validatedDraft.data.description?.trim() || null,
      questions: validatedDraft.data.questions,
    }).then((result) => {
      if (!result.success) {
        setSaveState("error");
        toast.error(result.error || "Failed to save form.");
        return;
      }

      setSaveState("saved");
    });
  }, 700);

  useEffect(() => {
    if (
      draft.title === data.title &&
      draft.description === (data.description ?? "") &&
      JSON.stringify(draft.questions) === JSON.stringify(data.questions)
    ) {
      return;
    }

    debouncedSave(draft);
  }, [data.description, data.questions, data.title, debouncedSave, draft]);

  const updateDraft = (
    updater: (current: typeof draft) => typeof draft,
  ) => {
    setSaveState("idle");
    setDraft((current) => updater(current));
  };

  const updateQuestion = (
    questionId: string,
    updater: (question: FormQuestion) => FormQuestion,
  ) => {
    updateDraft((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.id === questionId ? updater(question) : question,
      ),
    }));
  };

  const handleQuestionTypeChange = (questionId: string, type: FormQuestionType) => {
    updateDraft((current) => ({
      ...current,
      questions: current.questions.map((question) => {
        if (question.id !== questionId) {
          return question;
        }

        const replacement = createEmptyFormQuestion(type);
        return {
          ...replacement,
          id: question.id,
          label: question.label,
          description: question.description,
          hint: question.hint,
          required: type === "static_text" ? false : question.required,
          conditions: question.conditions,
          placeholder:
            type === "static_text" || type === "matrix" || type === "file_upload"
              ? replacement.placeholder
              : question.placeholder,
        };
      }),
    }));
  };

  const addQuestion = (type: FormQuestionType, insertAtIndex = draft.questions.length) => {
    const question = createEmptyFormQuestion(type);
    updateDraft((current) => ({
      ...current,
      questions: [
        ...current.questions.slice(0, insertAtIndex),
        question,
        ...current.questions.slice(insertAtIndex),
      ],
    }));
    setSelectedQuestionId(question.id);
    requestAnimationFrame(() => {
      questionRefs.current[question.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const deleteQuestion = (questionId: string) => {
    let nextSelectedId: string | null = null;
    updateDraft((current) => {
      const questionIndex = current.questions.findIndex((question) => question.id === questionId);
      const remaining = current.questions.filter((question) => question.id !== questionId);
      nextSelectedId =
        remaining[questionIndex]?.id ?? remaining[questionIndex - 1]?.id ?? remaining[0]?.id ?? null;
      return {
        ...current,
        questions: remaining,
      };
    });

    setSelectedQuestionId((current) => (current === questionId ? nextSelectedId : current));
  };

  const duplicateQuestion = (questionId: string) => {
    updateDraft((current) => {
      const index = current.questions.findIndex((question) => question.id === questionId);
      if (index < 0) {
        return current;
      }

      const duplicate = duplicateFormQuestion(current.questions[index]);
      const nextQuestions = [...current.questions];
      nextQuestions.splice(index + 1, 0, duplicate);
      setSelectedQuestionId(duplicate.id);
      requestAnimationFrame(() => {
        questionRefs.current[duplicate.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return {
        ...current,
        questions: nextQuestions,
      };
    });
  };

  const moveQuestion = (questionId: string, direction: "up" | "down") => {
    updateDraft((current) => {
      const index = current.questions.findIndex((question) => question.id === questionId);
      if (index < 0) {
        return current;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.questions.length) {
        return current;
      }

      return {
        ...current,
        questions: moveItem(current.questions, index, targetIndex),
      };
    });
  };

  const handleCreateGenericLink = () => {
    startTransition(async () => {
      const result = await createGenericFormLink(data.id);
      if (!result.success || !result.data) {
        toast.error(result.success ? "Failed to create reusable link." : result.error);
        return;
      }

      const linkUrl = rebaseToWindowOrigin(result.data.url);
      const copied = await copyToClipboard(linkUrl);
      if (!copied) {
        toast.error("Link created, but clipboard copy was blocked.");
        return;
      }

      toast.success("Reusable form link copied.");
      router.refresh();
    });
  };

  const handlePublish = () => {
    startTransition(async () => {
      const result = await publishFormTemplate(data.id);
      if (!result.success || !result.data) {
        toast.error(result.success ? "Failed to publish form." : result.error);
        return;
      }

      toast.success(`Published version ${result.data.versionNumber}.`);
      router.refresh();
    });
  };

  const handleArchive = () => {
    startTransition(async () => {
      const result = await archiveFormTemplate(data.id);
      if (!result.success) {
        toast.error(result.error || "Failed to archive form.");
        return;
      }

      toast.success("Form archived.");
      router.refresh();
    });
  };

  const handleRestore = () => {
    startTransition(async () => {
      const result = await restoreFormTemplate(data.id);
      if (!result.success) {
        toast.error(result.error || "Failed to restore form.");
        return;
      }

      toast.success("Form restored.");
      router.refresh();
    });
  };

  const handleOpenGenericLink = () => {
    const popup =
      typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;

    startTransition(async () => {
      const result = await createGenericFormLink(data.id);
      if (!result.success || !result.data) {
        popup?.close();
        toast.error(result.success ? "Failed to create reusable link." : result.error);
        return;
      }

      const linkUrl = rebaseToWindowOrigin(result.data.url);
      if (popup) {
        popup.opener = null;
        popup.location.href = linkUrl;
        return;
      }

      window.location.assign(linkUrl);
    });
  };

  return (
    <div className="space-y-3">
      <DashboardPageHeader
        title="Form Builder"
        description="Build reusable client-facing forms with versioned publishing, branded completion pages, and task assignments."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/forms/custom">Back to forms</Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={data.status !== "published" || isPending}
          onClick={handleCreateGenericLink}
        >
          <Link2 className="h-4 w-4" />
          Copy generic link
        </Button>
        {data.status === "published" ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isPending}
            onClick={handleOpenGenericLink}
          >
            <ExternalLink className="h-4 w-4" />
            Open generic link
          </Button>
        ) : null}
        {data.status === "archived" ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isPending}
            onClick={handleRestore}
          >
            <ArchiveRestore className="h-4 w-4" />
            Restore form
          </Button>
        ) : (
          <Button
            variant={data.status === "published" ? "outline" : "default"}
            size="sm"
            className="gap-2"
            disabled={isPending}
            onClick={handlePublish}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {data.status === "published" ? "Publish new version" : "Publish form"}
          </Button>
        )}
      </DashboardPageHeader>

      <div className="space-y-3">
          <Card className="border-border/60 shadow-xs">
            <CardContent className="space-y-5 px-5 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Form setup</p>
                  <p className="text-sm text-muted-foreground">
                    Keep the provider-side structure simple and the family-side instructions clear.
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="mr-3 capitalize">{data.status}</span>
                  {saveState === "saving" ? "Saving changes…" : null}
                  {saveState === "saved" ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <Check className="h-4 w-4" />
                      Saved
                    </span>
                  ) : null}
                  {saveState === "error" ? "Save failed" : null}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="form-title">Form title</Label>
                  <Input
                    id="form-title"
                    value={draft.title}
                    onChange={(event) =>
                      updateDraft((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Parent check-in"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="form-description">Description</Label>
                  <Textarea
                    id="form-description"
                    value={draft.description}
                    onChange={(event) =>
                      updateDraft((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Tell families what this form is for and how long it should take."
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {data.recentLinks.length ? (
            <DashboardCard className="px-4 py-4">
              <p className="text-sm font-semibold text-foreground">Recent links</p>
              <div className="mt-3 space-y-2">
                {data.recentLinks.slice(0, 5).map((link) => (
                  <div
                    key={link.id}
                    className="rounded-xl border border-border/60 bg-card px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
                        {link.linkType === "generic" ? "Generic" : "Client-specific"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{link.status}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Created {new Date(link.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </DashboardCard>
          ) : null}

          {draft.questions.length ? (
            <div className="space-y-4">
              {draft.questions.map((question, index) => (
                <div key={question.id} className="space-y-4">
                  <div
                    ref={(node) => {
                      questionRefs.current[question.id] = node;
                    }}
                  >
                    <QuestionEditor
                      question={question}
                      questionNumber={index + 1}
                      sourceQuestions={draft.questions.slice(0, index)}
                      isActive={selectedQuestionId === question.id}
                      onFocus={() => setSelectedQuestionId(question.id)}
                      canMoveUp={index > 0}
                      canMoveDown={index < draft.questions.length - 1}
                      onMoveUp={() => moveQuestion(question.id, "up")}
                      onMoveDown={() => moveQuestion(question.id, "down")}
                      onChange={(updater) => updateQuestion(question.id, updater)}
                      onTypeChange={(type) => handleQuestionTypeChange(question.id, type)}
                      onDuplicate={() => duplicateQuestion(question.id)}
                      onDelete={() => deleteQuestion(question.id)}
                    />
                  </div>
                  <InsertQuestionDivider
                    onAdd={(type) => addQuestion(type, index + 1)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <Card className="border-border/60 shadow-xs">
              <CardContent className="py-16 text-center">
                <p className="text-base font-semibold text-foreground">No questions yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add your first question to start building the form.
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="mt-5 gap-2">
                      <Plus className="h-4 w-4" />
                      Add question
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-64">
                    {FORM_QUESTION_TYPE_OPTIONS.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => addQuestion(option.value)}
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          )}

          <DashboardCard className="px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Lifecycle controls</p>
                <p className="text-sm text-muted-foreground">
                  Archive forms to move them out of the active list. Restore them anytime.
                </p>
              </div>
              {data.status === "archived" ? (
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={isPending}
                  onClick={handleRestore}
                >
                  <ArchiveRestore className="h-4 w-4" />
                  Restore form
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={isPending}
                  onClick={handleArchive}
                >
                  <Archive className="h-4 w-4" />
                  Archive form
                </Button>
              )}
            </div>
          </DashboardCard>
      </div>
    </div>
  );
}

function QuestionEditor({
  question,
  questionNumber,
  sourceQuestions,
  isActive,
  onFocus,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onChange,
  onTypeChange,
  onDuplicate,
  onDelete,
}: {
  question: FormQuestion;
  questionNumber: number;
  sourceQuestions: FormQuestion[];
  isActive: boolean;
  onFocus: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChange: (updater: (question: FormQuestion) => FormQuestion) => void;
  onTypeChange: (type: FormQuestionType) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const hasAdvancedFields =
    question.type === "short_text" ||
    question.type === "long_text" ||
    question.type === "email" ||
    question.type === "phone" ||
    question.type === "number" ||
    question.type === "date" ||
    question.type === "file_upload" ||
    question.conditions.length > 0 ||
    sourceQuestions.length > 0 ||
    Boolean(question.hint?.trim()) ||
    Boolean(question.placeholder?.trim()) ||
    question.minLength !== null ||
    question.minLength !== undefined ||
    question.maxLength !== null ||
    question.maxLength !== undefined ||
    question.minNumber !== null ||
    question.minNumber !== undefined ||
    question.maxNumber !== null ||
    question.maxNumber !== undefined ||
    question.allowMultipleFiles ||
    Boolean(question.acceptedFileTypes.length) ||
    Boolean(question.maxFiles);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const updateOptionList = (
    key: "options" | "matrixRows" | "matrixColumns",
    updater: (items: FormQuestionOption[]) => FormQuestionOption[],
  ) => {
    onChange((current) => ({
      ...current,
      [key]: updater(current[key]),
    }));
  };

  const renderConditionValueEditor = (
    condition: FormCondition,
    conditionIndex: number,
  ) => {
    const sourceQuestion = sourceQuestions.find(
      (source) => source.id === condition.sourceQuestionId,
    );

    if (!sourceQuestion || condition.operator === "is_empty" || condition.operator === "is_not_empty") {
      return null;
    }

    if (sourceQuestion.type === "yes_no") {
      return (
        <Select
          value={String(condition.value ?? "true")}
          onValueChange={(value) =>
            onChange((current) => ({
              ...current,
              conditions: current.conditions.map((entry, index) =>
                index === conditionIndex
                  ? { ...entry, value: value === "true" }
                  : entry,
              ),
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Expected answer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (
      sourceQuestion.type === "single_select" ||
      sourceQuestion.type === "multi_select"
    ) {
      return (
        <Select
          value={String(condition.value ?? "")}
          onValueChange={(value) =>
            onChange((current) => ({
              ...current,
              conditions: current.conditions.map((entry, index) =>
                index === conditionIndex
                  ? { ...entry, value }
                  : entry,
              ),
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Expected option" />
          </SelectTrigger>
          <SelectContent>
            {sourceQuestion.options.map((option) => (
              <SelectItem key={option.id} value={optionDisplayValue(option)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        value={String(condition.value ?? "")}
        onChange={(event) =>
          onChange((current) => ({
            ...current,
            conditions: current.conditions.map((entry, index) =>
              index === conditionIndex
                ? { ...entry, value: event.target.value }
                : entry,
            ),
          }))
        }
        placeholder="Expected answer"
      />
    );
  };

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/60 shadow-xs transition-colors",
        isActive ? "border-primary/50" : null,
      )}
      onClick={onFocus}
    >
      <CardContent className="p-0">
        <div className="border-b border-border/60 bg-muted/20 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              className={cn(
                "grid flex-1 items-center gap-3",
                question.type === "static_text"
                  ? "sm:grid-cols-[minmax(120px,auto)_220px]"
                  : "sm:grid-cols-[minmax(120px,auto)_220px_132px]",
              )}
            >
              <div className="min-w-[120px]">
                <p className="text-sm font-semibold text-foreground">Question {questionNumber}</p>
              </div>
              <div className="w-full sm:max-w-[220px]">
                <Select
                  value={question.type}
                  onValueChange={(value) => onTypeChange(value as FormQuestionType)}
                >
                  <SelectTrigger aria-label="Question type" className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORM_QUESTION_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {question.type !== "static_text" ? (
                <div className="flex h-10 w-full items-center justify-between rounded-md border border-border/60 bg-background px-2.5 sm:w-[132px]">
                  <span className="text-sm text-muted-foreground">Required</span>
                  <Switch
                    aria-label="Required"
                    checked={question.required}
                    onCheckedChange={(checked) =>
                      onChange((current) => ({ ...current, required: checked }))
                    }
                  />
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 lg:ml-4 lg:flex-nowrap">
              <Button
                variant="outline"
                size="icon"
                className="bg-background"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                aria-label="Move question up"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="bg-background"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                aria-label="Move question down"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="gap-2 bg-background" onClick={onDuplicate}>
                <Copy className="h-4 w-4" />
                Duplicate
              </Button>
              <Button variant="outline" size="sm" className="gap-2 bg-background" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-5 px-5 py-5">
          <div className="space-y-2">
            <Label htmlFor={`label-${question.id}`}>Question</Label>
            <AutoSizingTextarea
              id={`label-${question.id}`}
              value={question.label ?? ""}
              onChange={(event) =>
                onChange((current) => ({ ...current, label: event.target.value }))
              }
              placeholder="Enter the question"
            />
          </div>

          {question.type === "static_text" ? (
            <div className="space-y-2">
              <Label htmlFor={`static-${question.id}`}>Instruction content</Label>
              <Textarea
                id={`static-${question.id}`}
                value={question.staticContent ?? ""}
                onChange={(event) =>
                  onChange((current) => ({ ...current, staticContent: event.target.value }))
                }
                rows={6}
                placeholder="Add instructions, expectations, or context."
              />
            </div>
          ) : null}

          {(question.type === "single_select" || question.type === "multi_select") ? (
            <OptionListEditor
              label="Options"
              items={question.options}
              onChange={(items) => updateOptionList("options", () => items)}
            />
          ) : null}

          {question.type === "matrix" ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <OptionListEditor
                label="Rows"
                items={question.matrixRows}
                onChange={(items) => updateOptionList("matrixRows", () => items)}
              />
              <OptionListEditor
                label="Columns"
                items={question.matrixColumns}
                onChange={(items) => updateOptionList("matrixColumns", () => items)}
              />
            </div>
          ) : null}

          {hasAdvancedFields ? (
            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <div className="border-t border-border/60 pt-1">
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto px-0 text-sm font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
                  >
                    {isAdvancedOpen ? (
                      <ChevronDown className="mr-2 h-4 w-4" />
                    ) : (
                      <ChevronRight className="mr-2 h-4 w-4" />
                    )}
                    Advanced options
                  </Button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent className="space-y-5 pt-2">
                <div className="space-y-2">
                  <Label htmlFor={`description-${question.id}`}>Help text</Label>
                  <Textarea
                    id={`description-${question.id}`}
                    value={question.description ?? ""}
                    onChange={(event) =>
                      onChange((current) => ({ ...current, description: event.target.value }))
                    }
                    rows={3}
                    placeholder="Add short context so the family knows exactly what you need."
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`hint-${question.id}`}>Hint</Label>
                    <Input
                      id={`hint-${question.id}`}
                      value={question.hint ?? ""}
                      onChange={(event) =>
                        onChange((current) => ({ ...current, hint: event.target.value }))
                      }
                      placeholder="Optional helper text"
                    />
                  </div>

                  {isTextLikeType(question.type) ? (
                    <div className="space-y-2">
                      <Label htmlFor={`placeholder-${question.id}`}>Placeholder</Label>
                      <Input
                        id={`placeholder-${question.id}`}
                        value={question.placeholder ?? ""}
                        onChange={(event) =>
                          onChange((current) => ({ ...current, placeholder: event.target.value }))
                        }
                        placeholder="Optional placeholder"
                      />
                    </div>
                  ) : null}
                </div>

                {(question.type === "short_text" ||
                  question.type === "long_text" ||
                  question.type === "email" ||
                  question.type === "phone") ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Minimum length</Label>
                      <Input
                        type="number"
                        value={question.minLength ?? ""}
                        onChange={(event) =>
                          onChange((current) => ({
                            ...current,
                            minLength: event.target.value ? Number(event.target.value) : null,
                          }))
                        }
                        placeholder="Optional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Maximum length</Label>
                      <Input
                        type="number"
                        value={question.maxLength ?? ""}
                        onChange={(event) =>
                          onChange((current) => ({
                            ...current,
                            maxLength: event.target.value ? Number(event.target.value) : null,
                          }))
                        }
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                ) : null}

                {question.type === "number" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Minimum value</Label>
                      <Input
                        type="number"
                        value={question.minNumber ?? ""}
                        onChange={(event) =>
                          onChange((current) => ({
                            ...current,
                            minNumber: event.target.value ? Number(event.target.value) : null,
                          }))
                        }
                        placeholder="Optional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Maximum value</Label>
                      <Input
                        type="number"
                        value={question.maxNumber ?? ""}
                        onChange={(event) =>
                          onChange((current) => ({
                            ...current,
                            maxNumber: event.target.value ? Number(event.target.value) : null,
                          }))
                        }
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                ) : null}

                {question.type === "file_upload" ? (
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/10 px-4 py-3">
                      <p className="text-sm font-medium text-foreground">Allow multiple files</p>
                      <Switch
                        checked={question.allowMultipleFiles}
                        onCheckedChange={(checked) =>
                          onChange((current) => ({
                            ...current,
                            allowMultipleFiles: checked,
                            maxFiles: checked ? current.maxFiles ?? 3 : 1,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Maximum files</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={question.maxFiles ?? ""}
                          onChange={(event) =>
                            onChange((current) => ({
                              ...current,
                              maxFiles: event.target.value ? Number(event.target.value) : null,
                            }))
                          }
                          placeholder="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Accepted MIME types</Label>
                        <Input
                          value={(question.acceptedFileTypes ?? []).join(", ")}
                          onChange={(event) =>
                            onChange((current) => ({
                              ...current,
                              acceptedFileTypes: event.target.value
                                .split(",")
                                .map((entry) => entry.trim())
                                .filter(Boolean),
                            }))
                          }
                          placeholder="application/pdf, image/jpeg"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">Conditional visibility</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={!sourceQuestions.length}
                      onClick={() =>
                        onChange((current) => ({
                          ...current,
                          conditions: [...current.conditions, buildNewCondition()],
                        }))
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Add rule
                    </Button>
                  </div>

                  {question.conditions.length ? (
                    <div className="space-y-3">
                      {question.conditions.map((condition, index) => (
                        <div
                          key={condition.id}
                          className="grid gap-3 rounded-xl border border-border/60 bg-card p-3 lg:grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)_auto]"
                        >
                          <Select
                            value={condition.sourceQuestionId}
                            onValueChange={(value) =>
                              onChange((current) => ({
                                ...current,
                                conditions: current.conditions.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, sourceQuestionId: value }
                                    : entry,
                                ),
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a previous question" />
                            </SelectTrigger>
                            <SelectContent>
                              {sourceQuestions.map((source) => (
                                <SelectItem key={source.id} value={source.id}>
                                  {source.label || "Untitled question"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={condition.operator}
                            onValueChange={(value) =>
                              onChange((current) => ({
                                ...current,
                                conditions: current.conditions.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? {
                                        ...entry,
                                        operator: value as FormCondition["operator"],
                                        value:
                                          value === "is_empty" || value === "is_not_empty"
                                            ? null
                                            : entry.value,
                                      }
                                    : entry,
                                ),
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equals">Equals</SelectItem>
                              <SelectItem value="not_equals">Does not equal</SelectItem>
                              <SelectItem value="includes">Includes</SelectItem>
                              <SelectItem value="not_includes">Does not include</SelectItem>
                              <SelectItem value="is_empty">Is empty</SelectItem>
                              <SelectItem value="is_not_empty">Is not empty</SelectItem>
                            </SelectContent>
                          </Select>

                          <div>{renderConditionValueEditor(condition, index)}</div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              onChange((current) => ({
                                ...current,
                                conditions: current.conditions.filter((entry) => entry.id !== condition.id),
                              }))
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {sourceQuestions.length
                        ? "No rules yet."
                        : "Add an earlier question to use conditional visibility."}
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function InsertQuestionDivider({
  onAdd,
}: {
  onAdd: (type: FormQuestionType) => void;
}) {
  return (
    <div className="relative py-1">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border/60" />
      <div className="relative flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add question
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-64">
            {FORM_QUESTION_TYPE_OPTIONS.map((option) => (
              <DropdownMenuItem key={option.value} onClick={() => onAdd(option.value)}>
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function OptionListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: FormQuestionOption[];
  onChange: (items: FormQuestionOption[]) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">
            Keep labels clear and short so families can answer quickly.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() =>
            onChange([
              ...items,
              { id: createId("option"), label: `Option ${items.length + 1}`, value: "", hint: "" },
            ])
          }
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="grid gap-3 rounded-xl border border-border/60 bg-card p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <Input
              value={item.label}
              onChange={(event) =>
                onChange(
                  items.map((entry) =>
                    entry.id === item.id ? { ...entry, label: event.target.value } : entry,
                  ),
                )
              }
              placeholder="Label"
            />
            <Input
              value={item.value ?? ""}
              onChange={(event) =>
                onChange(
                  items.map((entry) =>
                    entry.id === item.id ? { ...entry, value: event.target.value } : entry,
                  ),
                )
              }
              placeholder="Stored value (optional)"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(items.filter((entry) => entry.id !== item.id))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

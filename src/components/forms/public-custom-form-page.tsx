"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Loader2,
  Save,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  autosavePublicFormDraft,
  generatePublicFormUploadUrl,
  registerPublicFormUpload,
  submitPublicForm,
  type PublicFormPageData,
} from "@/lib/actions/forms";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { getContrastingTextColor, getSolidBrandButtonStyles } from "@/lib/utils/brand-color";
import {
  evaluateFormQuestionVisibility,
  isQuestionAnswered,
  type FormAnswerValue,
  type FormAnswers,
  type FormFileAnswer,
  type FormQuestion,
} from "@/lib/validations/forms";
import { BrandedLogo } from "@/components/branded/branded-logo";
import { SignaturePad } from "@/components/forms/signature-pad";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

function getLighterShade(hexColor: string, opacity = 0.1) {
  return `${hexColor}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

function optionValue(label: string, value?: string) {
  return value?.trim() ? value.trim() : label;
}

function brandColorFromData(data: PublicFormPageData) {
  const rawValue = data.workspace.branding.background_color;
  return typeof rawValue === "string" && rawValue.trim().length > 0
    ? rawValue
    : "#2563eb";
}

function showPoweredBy(data: PublicFormPageData) {
  const rawValue = data.workspace.branding.show_powered_by;
  return typeof rawValue === "boolean" ? rawValue : true;
}

function answerToFileList(value: FormAnswerValue | undefined): FormFileAnswer[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(
      (entry): entry is FormFileAnswer =>
        Boolean(entry && typeof entry === "object" && "fileId" in entry),
    );
  }

  if (typeof value === "object" && "fileId" in value) {
    return [value as FormFileAnswer];
  }

  return [];
}

function VisibleQuestion({
  question,
  value,
  providerSlug,
  formSlug,
  disabled,
  onChange,
}: {
  question: FormQuestion;
  value: FormAnswerValue | undefined;
  providerSlug: string;
  formSlug: string;
  disabled: boolean;
  onChange: (value: FormAnswerValue | undefined) => void;
}) {
  const [isUploading, startUploadTransition] = useTransition();
  const selectedFiles = answerToFileList(value);
  const fieldId = `question-input-${question.id}`;
  const labelId = `question-label-${question.id}`;

  const uploadFiles = (files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    const selected = Array.from(files);
    startUploadTransition(async () => {
      const uploadUrlResult = await generatePublicFormUploadUrl({
        providerSlug,
        formSlug,
      });

      if (!uploadUrlResult.success || !uploadUrlResult.data) {
        toast.error(uploadUrlResult.success ? "Failed to prepare upload." : uploadUrlResult.error);
        return;
      }

      const uploadedAnswers: FormFileAnswer[] = [];

      for (const file of selected) {
        const uploadResponse = await fetch(uploadUrlResult.data.url, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });

        if (!uploadResponse.ok) {
          toast.error(`Failed to upload ${file.name}.`);
          return;
        }

        const uploadPayload = (await uploadResponse.json()) as { storageId?: string };
        if (!uploadPayload.storageId) {
          toast.error(`Failed to upload ${file.name}.`);
          return;
        }

        const registerResult = await registerPublicFormUpload({
          providerSlug,
          formSlug,
          storageId: uploadPayload.storageId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          byteSize: file.size,
        });

        if (!registerResult.success || !registerResult.data) {
          toast.error(registerResult.success ? `Failed to save ${file.name}.` : registerResult.error);
          return;
        }

        uploadedAnswers.push(registerResult.data);
      }

      const nextFiles = question.allowMultipleFiles
        ? [...selectedFiles, ...uploadedAnswers].slice(0, question.maxFiles ?? 10)
        : uploadedAnswers.slice(0, 1);

      onChange(question.allowMultipleFiles ? nextFiles : nextFiles[0]);
      toast.success(
        uploadedAnswers.length === 1 ? "File uploaded." : `${uploadedAnswers.length} files uploaded.`,
      );
    });
  };

  const removeFile = (fileId: string) => {
    const remaining = selectedFiles.filter((file) => file.fileId !== fileId);
    if (question.allowMultipleFiles) {
      onChange(remaining);
    } else {
      onChange(undefined);
    }
  };

  const fieldLabel = (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Label
          id={labelId}
          htmlFor={
            question.type === "short_text" ||
            question.type === "long_text" ||
            question.type === "email" ||
            question.type === "phone" ||
            question.type === "number" ||
            question.type === "date"
              ? fieldId
              : undefined
          }
          className="text-base font-semibold text-foreground"
        >
          {question.label || "Untitled question"}
        </Label>
        {question.required ? (
          <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px]">
            Required
          </Badge>
        ) : null}
      </div>
      {question.description ? (
        <p className="text-sm text-muted-foreground">{question.description}</p>
      ) : null}
      {question.hint ? (
        <p className="text-xs text-muted-foreground">{question.hint}</p>
      ) : null}
    </div>
  );

  switch (question.type) {
    case "static_text":
      return (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-5 py-4">
          <div className="space-y-2">
            {question.label ? (
              <p className="text-base font-semibold text-foreground">{question.label}</p>
            ) : null}
            <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {question.staticContent || question.description}
            </p>
          </div>
        </div>
      );

    case "long_text":
      return (
        <div className="space-y-3">
          {fieldLabel}
          <Textarea
            id={fieldId}
            aria-labelledby={labelId}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
            placeholder={question.placeholder || ""}
            rows={6}
            disabled={disabled}
          />
        </div>
      );

    case "email":
    case "phone":
    case "short_text":
    case "number":
    case "date":
      return (
        <div className="space-y-3">
          {fieldLabel}
          <Input
            id={fieldId}
            aria-labelledby={labelId}
            type={
              question.type === "email"
                ? "email"
                : question.type === "phone"
                  ? "tel"
                  : question.type === "number"
                    ? "number"
                    : question.type === "date"
                      ? "date"
                      : "text"
            }
            value={
              typeof value === "number"
                ? String(value)
                : typeof value === "string"
                  ? value
                  : ""
            }
            min={question.minNumber ?? undefined}
            max={question.maxNumber ?? undefined}
            minLength={question.minLength ?? undefined}
            maxLength={question.maxLength ?? undefined}
            onChange={(event) =>
              onChange(
                question.type === "number"
                  ? (event.target.value ? Number(event.target.value) : undefined)
                  : event.target.value,
              )
            }
            placeholder={question.placeholder || ""}
            disabled={disabled}
          />
        </div>
      );

    case "single_select":
      return (
        <div className="space-y-3">
          {fieldLabel}
          <Select
            value={typeof value === "string" ? value : ""}
            onValueChange={(nextValue) => onChange(nextValue)}
            disabled={disabled}
          >
            <SelectTrigger id={fieldId} aria-labelledby={labelId}>
              <SelectValue placeholder="Choose an option" />
            </SelectTrigger>
            <SelectContent>
              {question.options.map((option) => (
                <SelectItem key={option.id} value={optionValue(option.label, option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "multi_select": {
      const selectedValues = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-3">
          {fieldLabel}
          <div className="space-y-2">
            {question.options.map((option) => {
              const currentValue = optionValue(option.label, option.value);
              const checked = selectedValues.includes(currentValue);
              return (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 hover:border-primary/40"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(nextChecked) => {
                      const nextValues = nextChecked
                        ? [...selectedValues, currentValue]
                        : selectedValues.filter((entry) => entry !== currentValue);
                      onChange(nextValues as string[]);
                    }}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{option.label}</p>
                    {option.hint ? (
                      <p className="mt-1 text-xs text-muted-foreground">{option.hint}</p>
                    ) : null}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    case "yes_no":
      return (
        <div className="space-y-3">
          {fieldLabel}
          <RadioGroup
            aria-labelledby={labelId}
            value={typeof value === "boolean" ? String(value) : ""}
            onValueChange={(nextValue) => onChange(nextValue === "true")}
            className="grid gap-3 sm:grid-cols-2"
            disabled={disabled}
          >
            {[
              { label: "Yes", value: "true" },
              { label: "No", value: "false" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-4 hover:border-primary/40"
              >
                <RadioGroupItem value={option.value} />
                <span className="text-sm font-medium text-foreground">{option.label}</span>
              </label>
            ))}
          </RadioGroup>
        </div>
      );

    case "file_upload":
      return (
        <div className="space-y-3">
          {fieldLabel}
          <div className="rounded-2xl border border-border/60 bg-card px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Upload file{question.allowMultipleFiles ? "s" : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {question.acceptedFileTypes.length
                    ? `Accepted: ${question.acceptedFileTypes.join(", ")}`
                    : "Most common file formats are supported."}
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/60 bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40">
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isUploading ? "Uploading…" : "Choose file"}
                <input
                  type="file"
                  className="hidden"
                  multiple={question.allowMultipleFiles}
                  accept={question.acceptedFileTypes.join(",")}
                  disabled={disabled || isUploading}
                  onChange={(event) => uploadFiles(event.target.files)}
                />
              </label>
            </div>

            {selectedFiles.length ? (
              <div className="mt-4 space-y-2">
                {selectedFiles.map((file) => (
                  <div
                    key={file.fileId}
                    className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{file.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.mimeType} • {Math.max(1, Math.round(file.byteSize / 1024))} KB
                      </p>
                    </div>
                    {!disabled ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.fileId)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      );

    case "signature":
    case "initials":
      return (
        <div className="space-y-3">
          {fieldLabel}
          <div aria-labelledby={labelId}>
            <SignaturePad
              value={typeof value === "string" ? value : ""}
              onChange={(nextValue) => onChange(nextValue)}
              disabled={disabled}
            />
          </div>
        </div>
      );

    case "matrix": {
      const selectedValues =
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, string>)
          : {};

      return (
        <div className="space-y-3">
          {fieldLabel}
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <div className="hidden grid-cols-[minmax(0,1.4fr)_repeat(auto-fit,minmax(120px,1fr))] bg-muted/30 px-4 py-3 text-sm font-medium text-muted-foreground sm:grid">
              <div />
              {question.matrixColumns.map((column) => (
                <div key={column.id} className="text-center">
                  {column.label}
                </div>
              ))}
            </div>
            <div className="divide-y divide-border/60 bg-white">
              {question.matrixRows.map((row) => (
                <div
                  key={row.id}
                  className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,3fr)] sm:items-center"
                >
                  <div className="text-sm font-medium text-foreground">{row.label}</div>
                  <RadioGroup
                    aria-labelledby={labelId}
                    value={selectedValues[row.id] ?? ""}
                    onValueChange={(nextValue) =>
                      onChange({
                        ...selectedValues,
                        [row.id]: nextValue,
                      })
                    }
                    className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
                    disabled={disabled}
                  >
                    {question.matrixColumns.map((column) => {
                      const currentValue = optionValue(column.label, column.value);
                      return (
                        <label
                          key={column.id}
                          className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm hover:border-primary/40"
                        >
                          <RadioGroupItem value={currentValue} />
                          <span>{column.label}</span>
                        </label>
                      );
                    })}
                  </RadioGroup>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

export function PublicCustomFormPage({
  data,
}: {
  data: PublicFormPageData;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<FormAnswers>(data.draftAnswers);
  const [responderName, setResponderName] = useState("");
  const [responderEmail, setResponderEmail] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setAnswers(data.draftAnswers);
  }, [data.draftAnswers]);

  const brandColor = brandColorFromData(data);
  const contrastColor = getContrastingTextColor(brandColor);
  const visibleQuestions = useMemo(
    () =>
      data.version.questions.filter((question) =>
        evaluateFormQuestionVisibility(question, answers),
      ),
    [answers, data.version.questions],
  );

  const debouncedAutosave = useDebouncedCallback((nextAnswers: FormAnswers) => {
    setSaveState("saving");
    void autosavePublicFormDraft({
      providerSlug: data.providerSlug,
      formSlug: data.template.slug,
      answers: nextAnswers,
    }).then((result) => {
      if (!result.success) {
        setSaveState("error");
        return;
      }

      setSaveState("saved");
    });
  }, 700);

  useEffect(() => {
    if (JSON.stringify(answers) === JSON.stringify(data.draftAnswers)) {
      return;
    }

    debouncedAutosave(answers);
  }, [answers, data.draftAnswers, debouncedAutosave]);

  const updateAnswer = (questionId: string, value: FormAnswerValue | undefined) => {
    setSaveState("idle");
    setAnswers((current) => {
      const next = { ...current };
      if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
        delete next[questionId];
      } else {
        next[questionId] = value;
      }
      return next;
    });
  };

  const handleSubmit = () => {
    setSubmitError(null);

    const missingRequiredQuestion = visibleQuestions.find(
      (question) =>
        question.type !== "static_text" &&
        question.required &&
        !isQuestionAnswered(answers[question.id]),
    );

    if (missingRequiredQuestion) {
      setSubmitError("Please complete every required question before submitting.");
      return;
    }

    startTransition(async () => {
      const result = await submitPublicForm({
        providerSlug: data.providerSlug,
        formSlug: data.template.slug,
        answers,
        responderName: data.link.type === "generic" ? responderName || null : null,
        responderEmail: data.link.type === "generic" ? responderEmail || null : null,
      });

      if (!result.success || !result.data) {
        setSubmitError(result.success ? "Failed to submit form." : result.error);
        return;
      }

      const submittedUrl = new URL(
        `/forms/${data.providerSlug}/${data.template.slug}/submitted`,
        window.location.origin,
      );
      if (new URLSearchParams(window.location.search).get("portal") === "1") {
        submittedUrl.searchParams.set("portal", "1");
      }
      router.replace(`${submittedUrl.pathname}${submittedUrl.search}`);
    });
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 52%, ${brandColor}bb 100%)`,
      }}
    >
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
          <div
            className="px-6 py-8 text-center sm:px-8 sm:py-12"
            style={{ backgroundColor: getLighterShade(brandColor, 0.08) }}
          >
            <div className="mx-auto mb-6">
              <BrandedLogo
                logoUrl={data.listing.logoUrl}
                agencyName={data.workspace.agencyName}
                brandColor={brandColor}
                variant="hero"
              />
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                {data.template.title}
              </h1>
              <div
                className="mx-auto h-0.5 w-12 rounded-full"
                style={{ backgroundColor: getLighterShade(brandColor, 0.3) }}
              />
              {data.template.description ? (
                <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
                  {data.template.description}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {data.link.clientName ? (
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    Assigned to {data.link.clientName}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    Shared form
                  </Badge>
                )}
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Version {data.version.versionNumber}
                </Badge>
              </div>
            </div>
          </div>

          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <div className="space-y-8">
              {data.link.type === "generic" ? (
                <div className="grid gap-4 rounded-2xl border border-border/60 bg-muted/20 px-5 py-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="responder-name">Your name</Label>
                    <Input
                      id="responder-name"
                      value={responderName}
                      onChange={(event) => setResponderName(event.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responder-email">Your email</Label>
                    <Input
                      id="responder-email"
                      type="email"
                      value={responderEmail}
                      onChange={(event) => setResponderEmail(event.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              ) : null}

              {visibleQuestions.map((question) => (
                <div key={question.id} className="rounded-2xl border border-border/60 bg-card px-5 py-5">
                  <VisibleQuestion
                    question={question}
                    value={answers[question.id]}
                    providerSlug={data.providerSlug}
                    formSlug={data.template.slug}
                    disabled={isPending}
                    onChange={(value) => updateAnswer(question.id, value)}
                  />
                </div>
              ))}

              {submitError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {submitError}
                </div>
              ) : null}

              <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-muted/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saveState === "saving"
                    ? "Saving your progress…"
                    : saveState === "saved"
                      ? "Progress saved automatically"
                      : saveState === "error"
                        ? "Autosave paused. Keep going and submit when ready."
                        : "Answers save automatically while you work"}
                </div>
                <Button
                  type="button"
                  className="gap-2"
                  style={getSolidBrandButtonStyles(brandColor)}
                  disabled={isPending}
                  onClick={handleSubmit}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Submit form
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div
            className="px-6 py-4 sm:px-8"
            style={{ backgroundColor: getLighterShade(brandColor, 0.05) }}
          >
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
              <div className="flex items-center gap-2">
                <BrandedLogo
                  logoUrl={data.listing.logoUrl}
                  agencyName={data.workspace.agencyName}
                  brandColor={brandColor}
                  variant="footer"
                  className="mx-0"
                />
                <span className="text-sm font-medium text-foreground">
                  {data.workspace.agencyName}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} {data.workspace.agencyName}. All rights reserved.
              </p>
            </div>
          </div>
        </div>

        {showPoweredBy(data) ? (
          <div className="mt-6 text-center">
            <Link
              href="https://www.goodaba.com"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              style={{ color: brandColor }}
            >
              Powered by GoodABA
            </Link>
          </div>
        ) : (
          <div className="mt-6 text-center">
            <Link
              href="https://www.goodaba.com"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-xs font-medium backdrop-blur-xs transition-colors hover:bg-white/30"
              style={{ color: contrastColor }}
            >
              Powered by GoodABA
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { format } from "date-fns";
import { CheckCircle2, Download, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  type FormAnswerValue,
  type FormAnswers,
  type FormDefinition,
  type FormFileAnswer,
  type FormQuestion,
} from "@/lib/validations/forms";

function getOptionLabel(
  question: FormQuestion,
  value: string | number | boolean | null | undefined,
) {
  if (value === null || value === undefined) {
    return null;
  }

  const stringValue = String(value);
  return (
    question.options.find(
      (option) =>
        (option.value?.trim() ? option.value.trim() : option.label) === stringValue,
    )?.label ?? stringValue
  );
}

function isFileAnswer(value: unknown): value is FormFileAnswer {
  return Boolean(
    value &&
      typeof value === "object" &&
      "fileId" in value &&
      "fileName" in value,
  );
}

function toFileAnswers(value: FormAnswerValue | undefined): FormFileAnswer[] {
  if (!value) {
    return [];
  }

  if (isFileAnswer(value)) {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter(isFileAnswer);
  }

  return [];
}

function formatPrimitiveValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

function renderMatrixAnswer(question: FormQuestion, value: FormAnswerValue | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return <p className="text-sm text-muted-foreground">No response</p>;
  }

  const responseMap = value as Record<string, string | number | boolean | null>;

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] bg-muted/40 text-xs font-medium text-muted-foreground">
        <div className="px-3 py-2">Row</div>
        <div className="px-3 py-2">Response</div>
      </div>
      {question.matrixRows.map((row) => {
        const selected = responseMap[row.id];
        const columnLabel =
          question.matrixColumns.find(
            (column) =>
              (column.value?.trim() ? column.value.trim() : column.label) ===
              String(selected ?? ""),
          )?.label ?? formatPrimitiveValue(selected);

        return (
          <div
            key={row.id}
            className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] border-t border-border/60 bg-white text-sm"
          >
            <div className="px-3 py-2 font-medium text-foreground">{row.label}</div>
            <div className="px-3 py-2 text-muted-foreground">
              {columnLabel ?? "No response"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderAnswerValue(
  question: FormQuestion,
  value: FormAnswerValue | undefined,
  onOpenFile?: (fileId: string) => Promise<void> | void,
) {
  if (question.type === "static_text") {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        {question.staticContent || question.description || "Instruction block"}
      </div>
    );
  }

  if (question.type === "signature" || question.type === "initials") {
    if (typeof value !== "string" || !value) {
      return <p className="text-sm text-muted-foreground">No response</p>;
    }

    return (
      <div className="overflow-hidden rounded-xl border border-border/60 bg-white">
        <Image
          src={value}
          alt={question.type === "signature" ? "Signature" : "Initials"}
          width={800}
          height={320}
          unoptimized
          className="h-44 w-full object-contain"
        />
      </div>
    );
  }

  if (question.type === "file_upload") {
    const files = toFileAnswers(value);
    if (!files.length) {
      return <p className="text-sm text-muted-foreground">No files uploaded</p>;
    }

    return (
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.fileId}
            className="flex flex-col gap-3 rounded-xl border border-border/60 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <p className="truncate text-sm font-medium text-foreground">{file.fileName}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {file.mimeType} • {Math.max(1, Math.round(file.byteSize / 1024))} KB
              </p>
            </div>
            {onOpenFile ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => void onOpenFile(file.fileId)}
              >
                <Download className="h-4 w-4" />
                Open file
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  if (question.type === "matrix") {
    return renderMatrixAnswer(question, value);
  }

  if (Array.isArray(value)) {
    const displayValues = value as Array<string | number | boolean>;
    if (!value.length) {
      return <p className="text-sm text-muted-foreground">No response</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {displayValues.map((entry) => (
          <Badge key={String(entry)} variant="secondary" className="rounded-full px-3 py-1">
            {question.type === "multi_select"
              ? getOptionLabel(question, entry) ?? String(entry)
              : String(entry)}
          </Badge>
        ))}
      </div>
    );
  }

  if (question.type === "single_select") {
    const label = getOptionLabel(question, value as string | null | undefined);
    return <p className="text-sm text-foreground">{label ?? "No response"}</p>;
  }

  if (question.type === "date" && typeof value === "string" && value) {
    const date = new Date(value);
    return (
      <p className="text-sm text-foreground">
        {Number.isNaN(date.getTime()) ? value : format(date, "MMMM d, yyyy")}
      </p>
    );
  }

  if (typeof value === "object" && value && !Array.isArray(value)) {
    return (
      <div className="space-y-2">
        {Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => (
          <div key={key} className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
            <span className="font-medium text-foreground">{key}</span>
            <span className="ml-2 text-muted-foreground">
              {formatPrimitiveValue(nestedValue as string | number | boolean | null | undefined) ?? "No response"}
            </span>
          </div>
        ))}
      </div>
    );
  }

  const primitive = formatPrimitiveValue(
    value as string | number | boolean | null | undefined,
  );
  return <p className="whitespace-pre-wrap text-sm text-foreground">{primitive ?? "No response"}</p>;
}

export function FormAnswerReview({
  questions,
  answers,
  onOpenFile,
  emptyLabel = "No answers submitted yet.",
}: {
  questions: FormDefinition;
  answers: FormAnswers;
  onOpenFile?: (fileId: string) => Promise<void> | void;
  emptyLabel?: string;
}) {
  const answerableQuestions = questions.filter((question) => question.type !== "static_text");

  if (!questions.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <Card key={question.id} className="border-border/60 shadow-xs">
          <CardContent className="space-y-4 px-5 py-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {question.type !== "static_text" ? (
                  <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs">
                    Question {answerableQuestions.findIndex((entry) => entry.id === question.id) + 1 || index + 1}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs">
                    Instructions
                  </Badge>
                )}
                {question.required && question.type !== "static_text" ? (
                  <Badge className="rounded-full px-2.5 py-0.5 text-xs">Required</Badge>
                ) : null}
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {question.label || "Untitled question"}
              </h3>
              {question.description ? (
                <p className="text-sm text-muted-foreground">{question.description}</p>
              ) : null}
              {question.hint && question.type !== "static_text" ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {question.hint}
                </div>
              ) : null}
            </div>
            {renderAnswerValue(question, answers[question.id], onOpenFile)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

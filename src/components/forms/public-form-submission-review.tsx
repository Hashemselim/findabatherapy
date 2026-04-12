"use client";

import { toast } from "sonner";

import { getPublicFormFileUrl } from "@/lib/actions/forms";
import { FormAnswerReview } from "@/components/forms/form-answer-review";
import type { FormAnswers, FormDefinition } from "@/lib/validations/forms";

export function PublicFormSubmissionReview({
  providerSlug,
  formSlug,
  questions,
  answers,
}: {
  providerSlug: string;
  formSlug: string;
  questions: FormDefinition;
  answers: FormAnswers;
}) {
  const handleOpenFile = async (fileId: string) => {
    const result = await getPublicFormFileUrl({
      providerSlug,
      formSlug,
      fileId,
    });

    if (!result.success || !result.data) {
      toast.error(result.success ? "Failed to open file." : result.error);
      return;
    }

    window.open(result.data.url, "_blank", "noopener,noreferrer");
  };

  return (
    <FormAnswerReview
      questions={questions}
      answers={answers}
      onOpenFile={handleOpenFile}
    />
  );
}

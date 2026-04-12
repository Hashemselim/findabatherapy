import { z } from "zod";

export const FORM_TEMPLATE_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

export const FORM_REVIEW_STATE_OPTIONS = [
  { value: "submitted", label: "Submitted" },
  { value: "reviewed", label: "Reviewed" },
  { value: "flagged", label: "Flagged" },
  { value: "archived", label: "Archived" },
] as const;

export const FORM_LINK_TYPE_OPTIONS = [
  { value: "generic", label: "Generic link" },
  { value: "client_specific", label: "Client-specific link" },
] as const;

export const FORM_QUESTION_TYPE_OPTIONS = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "single_select", label: "Single select" },
  { value: "multi_select", label: "Multi-select" },
  { value: "yes_no", label: "Yes / No" },
  { value: "file_upload", label: "File upload" },
  { value: "signature", label: "Signature" },
  { value: "initials", label: "Initials" },
  { value: "static_text", label: "Static text" },
  { value: "matrix", label: "Matrix / Rating" },
] as const;

export const formTemplateStatusSchema = z.enum(["draft", "published", "archived"]);
export const formReviewStateSchema = z.enum(["submitted", "reviewed", "flagged", "archived"]);
export const formLinkTypeSchema = z.enum(["generic", "client_specific"]);
export const formQuestionTypeSchema = z.enum([
  "short_text",
  "long_text",
  "email",
  "phone",
  "number",
  "date",
  "single_select",
  "multi_select",
  "yes_no",
  "file_upload",
  "signature",
  "initials",
  "static_text",
  "matrix",
]);

export const formConditionOperatorSchema = z.enum([
  "equals",
  "not_equals",
  "includes",
  "not_includes",
  "is_empty",
  "is_not_empty",
]);

export const formOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(200),
  value: z.string().max(200).optional().or(z.literal("")),
  hint: z.string().max(500).optional().or(z.literal("")),
});

export const formFileAnswerSchema = z.object({
  fileId: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(200),
  byteSize: z.number().nonnegative(),
});

export const formConditionSchema = z.object({
  id: z.string().min(1),
  sourceQuestionId: z.string().min(1),
  operator: formConditionOperatorSchema,
  value: z
    .union([
      z.string(),
      z.boolean(),
      z.number(),
      z.array(z.string()),
      z.array(z.boolean()),
      z.array(z.number()),
      z.null(),
    ])
    .optional(),
});

export const formQuestionSchema = z.object({
  id: z.string().min(1),
  type: formQuestionTypeSchema,
  label: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  hint: z.string().max(500).optional().or(z.literal("")),
  required: z.boolean().default(false),
  placeholder: z.string().max(200).optional().or(z.literal("")),
  options: z.array(formOptionSchema).default([]),
  conditions: z.array(formConditionSchema).default([]),
  staticContent: z.string().max(10000).optional().or(z.literal("")),
  acceptedFileTypes: z.array(z.string().max(100)).default([]),
  allowMultipleFiles: z.boolean().default(false),
  maxFiles: z.number().int().min(1).max(10).nullable().optional(),
  minNumber: z.number().nullable().optional(),
  maxNumber: z.number().nullable().optional(),
  minLength: z.number().int().min(0).nullable().optional(),
  maxLength: z.number().int().min(1).nullable().optional(),
  matrixRows: z.array(formOptionSchema).default([]),
  matrixColumns: z.array(formOptionSchema).default([]),
});

export const formDefinitionSchema = z.array(formQuestionSchema);

const formAnswerPrimitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const formAnswerMapSchema = z.record(z.string(), formAnswerPrimitiveSchema);

export const formAnswerValueSchema = z.union([
  formAnswerPrimitiveSchema,
  z.array(z.string()),
  z.array(z.number()),
  z.array(z.boolean()),
  formFileAnswerSchema,
  z.array(formFileAnswerSchema),
  formAnswerMapSchema,
]);

export const formAnswersSchema = z.record(z.string(), formAnswerValueSchema);

export const formTemplateDraftSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(4000).optional().or(z.literal("")),
  questions: formDefinitionSchema,
});

export type FormTemplateStatus = z.infer<typeof formTemplateStatusSchema>;
export type FormReviewState = z.infer<typeof formReviewStateSchema>;
export type FormLinkType = z.infer<typeof formLinkTypeSchema>;
export type FormQuestionType = z.infer<typeof formQuestionTypeSchema>;
export type FormQuestionOption = z.infer<typeof formOptionSchema>;
export type FormCondition = z.infer<typeof formConditionSchema>;
export type FormQuestion = z.infer<typeof formQuestionSchema>;
export type FormDefinition = z.infer<typeof formDefinitionSchema>;
export type FormFileAnswer = z.infer<typeof formFileAnswerSchema>;
export type FormAnswerValue = z.infer<typeof formAnswerValueSchema>;
export type FormAnswers = z.infer<typeof formAnswersSchema>;
export type FormTemplateDraft = z.infer<typeof formTemplateDraftSchema>;

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyFormQuestion(type: FormQuestionType = "short_text"): FormQuestion {
  if (type === "static_text") {
    return {
      id: createId("question"),
      type,
      label: "",
      description: "",
      hint: "",
      required: false,
      placeholder: "",
      options: [],
      conditions: [],
      staticContent: "Add instructions or context for families here.",
      acceptedFileTypes: [],
      allowMultipleFiles: false,
      maxFiles: null,
      minNumber: null,
      maxNumber: null,
      minLength: null,
      maxLength: null,
      matrixRows: [],
      matrixColumns: [],
    };
  }

  if (type === "single_select" || type === "multi_select") {
    return {
      id: createId("question"),
      type,
      label: "",
      description: "",
      hint: "",
      required: false,
      placeholder: "",
      options: [
        { id: createId("option"), label: "Option 1", value: "", hint: "" },
        { id: createId("option"), label: "Option 2", value: "", hint: "" },
      ],
      conditions: [],
      staticContent: "",
      acceptedFileTypes: [],
      allowMultipleFiles: false,
      maxFiles: null,
      minNumber: null,
      maxNumber: null,
      minLength: null,
      maxLength: null,
      matrixRows: [],
      matrixColumns: [],
    };
  }

  if (type === "matrix") {
    return {
      id: createId("question"),
      type,
      label: "",
      description: "",
      hint: "",
      required: false,
      placeholder: "",
      options: [],
      conditions: [],
      staticContent: "",
      acceptedFileTypes: [],
      allowMultipleFiles: false,
      maxFiles: null,
      minNumber: null,
      maxNumber: null,
      minLength: null,
      maxLength: null,
      matrixRows: [
        { id: createId("row"), label: "Communication", value: "", hint: "" },
        { id: createId("row"), label: "Behavior", value: "", hint: "" },
      ],
      matrixColumns: [
        { id: createId("column"), label: "Needs support", value: "1", hint: "" },
        { id: createId("column"), label: "Doing well", value: "5", hint: "" },
      ],
    };
  }

  if (type === "file_upload") {
    return {
      id: createId("question"),
      type,
      label: "",
      description: "",
      hint: "",
      required: false,
      placeholder: "",
      options: [],
      conditions: [],
      staticContent: "",
      acceptedFileTypes: ["application/pdf", "image/png", "image/jpeg"],
      allowMultipleFiles: false,
      maxFiles: 1,
      minNumber: null,
      maxNumber: null,
      minLength: null,
      maxLength: null,
      matrixRows: [],
      matrixColumns: [],
    };
  }

  return {
    id: createId("question"),
    type,
    label: "",
    description: "",
    hint: "",
    required: false,
    placeholder: "",
    options: [],
    conditions: [],
    staticContent: "",
    acceptedFileTypes: [],
    allowMultipleFiles: false,
    maxFiles: null,
    minNumber: type === "number" ? null : null,
    maxNumber: type === "number" ? null : null,
    minLength: null,
    maxLength: null,
    matrixRows: [],
    matrixColumns: [],
  };
}

export function duplicateFormQuestion(question: FormQuestion): FormQuestion {
  const duplicated = {
    ...question,
    id: createId("question"),
    options: question.options.map((option) => ({ ...option, id: createId("option") })),
    conditions: question.conditions.map((condition) => ({ ...condition, id: createId("condition") })),
    matrixRows: question.matrixRows.map((row) => ({ ...row, id: createId("row") })),
    matrixColumns: question.matrixColumns.map((column) => ({
      ...column,
      id: createId("column"),
    })),
  };

  return duplicated;
}

export function parseFormDefinitionJson(value: string | null | undefined): FormDefinition {
  if (!value) {
    return [];
  }

  try {
    return formDefinitionSchema.parse(JSON.parse(value));
  } catch {
    return [];
  }
}

export function parseFormAnswersJson(value: string | null | undefined): FormAnswers {
  if (!value) {
    return {};
  }

  try {
    return formAnswersSchema.parse(JSON.parse(value));
  } catch {
    return {};
  }
}

export function stringifyFormDefinition(questions: FormDefinition) {
  return JSON.stringify(formDefinitionSchema.parse(questions));
}

export function stringifyFormAnswers(answers: FormAnswers) {
  return JSON.stringify(formAnswersSchema.parse(answers));
}

function normalizeConditionComparisonValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

export function isQuestionAnswered(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((entry) => isQuestionAnswered(entry));
  }

  return true;
}

export function evaluateFormQuestionVisibility(
  question: FormQuestion,
  answers: FormAnswers,
): boolean {
  if (!question.conditions.length) {
    return true;
  }

  return question.conditions.every((condition) => {
    const answer = answers[condition.sourceQuestionId];
    const normalizedAnswer = normalizeConditionComparisonValue(answer);
    const expected = normalizeConditionComparisonValue(condition.value);

    switch (condition.operator) {
      case "equals":
        return normalizedAnswer === expected;
      case "not_equals":
        return normalizedAnswer !== expected;
      case "includes":
        if (Array.isArray(answer)) {
          const answerValues = answer as unknown[];
          return Array.isArray(condition.value)
            ? condition.value.every((entry) => answerValues.some((value) => value === entry))
            : answerValues.some((value) => value === condition.value);
        }
        return typeof answer === "string" && typeof condition.value === "string"
          ? answer.includes(condition.value)
          : false;
      case "not_includes":
        if (Array.isArray(answer)) {
          const answerValues = answer as unknown[];
          return Array.isArray(condition.value)
            ? condition.value.every((entry) => !answerValues.some((value) => value === entry))
            : !answerValues.some((value) => value === condition.value);
        }
        return typeof answer === "string" && typeof condition.value === "string"
          ? !answer.includes(condition.value)
          : true;
      case "is_empty":
        return !isQuestionAnswered(answer);
      case "is_not_empty":
        return isQuestionAnswered(answer);
      default:
        return true;
    }
  });
}

export function getVisibleFormQuestions(
  questions: FormDefinition,
  answers: FormAnswers,
) {
  return questions.filter((question) => evaluateFormQuestionVisibility(question, answers));
}

import { describe, expect, it } from "vitest";

import {
  createEmptyFormQuestion,
  evaluateFormQuestionVisibility,
  getVisibleFormQuestions,
  type FormDefinition,
} from "@/lib/validations/forms";

describe("forms validation helpers", () => {
  it("creates question defaults for selectable and file-upload types", () => {
    const selectQuestion = createEmptyFormQuestion("single_select");
    const fileQuestion = createEmptyFormQuestion("file_upload");

    expect(selectQuestion.options).toHaveLength(2);
    expect(fileQuestion.acceptedFileTypes).toContain("application/pdf");
    expect(fileQuestion.maxFiles).toBe(1);
  });

  it("evaluates conditional visibility for yes/no and multi-select answers", () => {
    const definition: FormDefinition = [
      {
        ...createEmptyFormQuestion("yes_no"),
        id: "q1",
        label: "Has diagnosis?",
      },
      {
        ...createEmptyFormQuestion("short_text"),
        id: "q2",
        label: "Diagnosis details",
        conditions: [
          {
            id: "c1",
            sourceQuestionId: "q1",
            operator: "equals",
            value: true,
          },
        ],
      },
      {
        ...createEmptyFormQuestion("multi_select"),
        id: "q3",
        label: "Service settings",
        options: [
          { id: "o1", label: "Home", value: "home", hint: "" },
          { id: "o2", label: "Clinic", value: "clinic", hint: "" },
        ],
      },
      {
        ...createEmptyFormQuestion("short_text"),
        id: "q4",
        label: "Clinic notes",
        conditions: [
          {
            id: "c2",
            sourceQuestionId: "q3",
            operator: "includes",
            value: "clinic",
          },
        ],
      },
    ];

    expect(
      evaluateFormQuestionVisibility(definition[1], { q1: false }),
    ).toBe(false);
    expect(
      evaluateFormQuestionVisibility(definition[1], { q1: true }),
    ).toBe(true);

    expect(
      getVisibleFormQuestions(definition, { q1: true, q3: ["home"] }).map((question) => question.id),
    ).toEqual(["q1", "q2", "q3"]);

    expect(
      getVisibleFormQuestions(definition, { q1: true, q3: ["home", "clinic"] }).map((question) => question.id),
    ).toEqual(["q1", "q2", "q3", "q4"]);
  });
});

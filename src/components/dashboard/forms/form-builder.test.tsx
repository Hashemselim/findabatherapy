import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const formActionMocks = vi.hoisted(() => ({
  updateFormTemplateDraft: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: formActionMocks.toastError,
    success: vi.fn(),
  },
}));

vi.mock("@/lib/actions/forms", () => ({
  archiveFormTemplate: vi.fn(),
  createGenericFormLink: vi.fn(),
  publishFormTemplate: vi.fn(),
  updateFormTemplateDraft: formActionMocks.updateFormTemplateDraft,
}));

import { FormBuilder } from "@/components/dashboard/forms/form-builder";
import type { FormBuilderData } from "@/lib/actions/forms";
import type { FormQuestion } from "@/lib/validations/forms";

function buildData(): FormBuilderData {
  return {
    id: "template_1",
    slug: "medical-history",
    title: "Medical History",
    description: "",
    status: "draft",
    questions: [],
    latestPublishedVersionId: null,
    latestVersionNumber: null,
    publishedAt: null,
    versions: [],
    recentLinks: [],
  };
}

function buildSingleSelectQuestion(): FormQuestion {
  return {
    id: "question_1",
    type: "single_select",
    label: "Select one",
    description: "",
    hint: "",
    required: false,
    placeholder: "",
    options: [
      { id: "option_1", label: "Option 1", value: "", hint: "" },
      { id: "option_2", label: "Option 2", value: "", hint: "" },
      { id: "option_3", label: "Option 3", value: "", hint: "" },
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

describe("FormBuilder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    formActionMocks.updateFormTemplateDraft.mockReset();
    formActionMocks.updateFormTemplateDraft.mockResolvedValue({ success: true });
    formActionMocks.toastError.mockReset();
  });

  it("keeps the form description draft when stale builder props rerender", async () => {
    const { rerender } = render(<FormBuilder data={buildData()} listingSlug={null} />);

    const descriptionField = screen.getByLabelText("Description");
    fireEvent.change(descriptionField, {
      target: { value: "Medical history form for new client intake." },
    });

    expect(descriptionField).toHaveValue("Medical history form for new client intake.");

    rerender(<FormBuilder data={{ ...buildData(), questions: [] }} listingSlug={null} />);

    expect(screen.getByLabelText("Description")).toHaveValue(
      "Medical history form for new client intake.",
    );

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(formActionMocks.updateFormTemplateDraft).toHaveBeenCalledWith({
      templateId: "template_1",
      title: "Medical History",
      description: "Medical history form for new client intake.",
      questions: [],
    });
  });

  it("does not toast on transient invalid select option edits and saves special characters once valid", async () => {
    render(
      <FormBuilder
        data={{ ...buildData(), questions: [buildSingleSelectQuestion()] }}
        listingSlug={null}
      />,
    );

    const optionInputs = screen.getAllByPlaceholderText("Label");
    const thirdOptionInput = optionInputs[2];

    fireEvent.change(thirdOptionInput, {
      target: { value: "" },
    });

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(formActionMocks.updateFormTemplateDraft).not.toHaveBeenCalled();
    expect(formActionMocks.toastError).not.toHaveBeenCalled();

    fireEvent.change(thirdOptionInput, {
      target: { value: "Café & résumé / niño" },
    });

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(formActionMocks.updateFormTemplateDraft).toHaveBeenCalledWith({
      templateId: "template_1",
      title: "Medical History",
      description: null,
      questions: [
        expect.objectContaining({
          id: "question_1",
          options: [
            expect.objectContaining({ id: "option_1", label: "Option 1" }),
            expect.objectContaining({ id: "option_2", label: "Option 2" }),
            expect.objectContaining({ id: "option_3", label: "Café & résumé / niño" }),
          ],
        }),
      ],
    });
  });
});

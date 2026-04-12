import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class Resend {
    emails = {
      send: sendMock,
    };
  },
}));

async function loadFormsEmailModule() {
  vi.resetModules();
  return import("@/lib/email/forms");
}

describe("forms email delivery", () => {
  const originalEnv = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM_PARENT: process.env.EMAIL_FROM_PARENT,
    EMAIL_FROM_GOODABA: process.env.EMAIL_FROM_GOODABA,
    EMAIL_FROM: process.env.EMAIL_FROM,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM_PARENT = "GoodABA Forms <forms@goodaba.com>";
    process.env.EMAIL_FROM_GOODABA = "";
    process.env.EMAIL_FROM = "";
    sendMock.mockResolvedValue({ data: { id: "email_123" }, error: null });
  });

  it("sends the client assignment email with the expected GoodABA payload", async () => {
    const { sendClientFormAssignmentEmail } = await loadFormsEmailModule();

    const result = await sendClientFormAssignmentEmail({
      to: "family@example.com",
      familyName: "Rivera",
      childName: "Nora Rivera",
      agencyName: "Foundations Autism",
      formTitle: "ABA History",
      dueDate: "2026-05-10",
      accessUrl: "https://www.goodaba.com/forms/foundations-autism/aba-history/access?token=test-token",
    });

    expect(result).toEqual({ success: true });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "GoodABA <forms@goodaba.com>",
        to: "family@example.com",
        subject: "Foundations Autism assigned ABA History",
        replyTo: "support@goodaba.com",
        headers: {
          "X-GoodABA-Category": "client-form-assignment",
        },
        html: expect.stringContaining("https://www.goodaba.com/forms/foundations-autism/aba-history/access?token=test-token"),
      }),
    );

    const html = sendMock.mock.calls[0]?.[0]?.html as string;
    expect(html).toContain("Hi Rivera,");
    expect(html).toContain("A new form is ready");
    expect(html).toContain("ABA History");
    expect(html).toContain("Due:");
    expect(html).toContain("Open Form");
    expect(html).toContain("support@goodaba.com");
    expect(html).not.toContain("findabatherapy.org");
  });

  it("sends the provider submission email with the expected review link", async () => {
    const { sendProviderFormSubmissionEmail } = await loadFormsEmailModule();

    const result = await sendProviderFormSubmissionEmail({
      to: "provider@example.com",
      agencyName: "Foundations Autism",
      formTitle: "ABA History",
      clientName: "Nora Rivera",
      responderName: null,
      submissionUrl: "https://www.goodaba.com/dashboard/forms/custom?tab=submissions&submissionId=sub_123",
    });

    expect(result).toEqual({ success: true });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "GoodABA <forms@goodaba.com>",
        to: "provider@example.com",
        subject: "ABA History was submitted",
        replyTo: "support@goodaba.com",
        headers: {
          "X-GoodABA-Category": "provider-form-submission",
        },
        html: expect.stringContaining("https://www.goodaba.com/dashboard/forms/custom?tab=submissions&submissionId=sub_123"),
      }),
    );

    const html = sendMock.mock.calls[0]?.[0]?.html as string;
    expect(html).toContain("A form submission is ready to review");
    expect(html).toContain("Nora Rivera");
    expect(html).toContain("Review Submission");
    expect(html).not.toContain("findabatherapy.org");
  });

  it("returns a clear disabled-email result when Resend is not configured", async () => {
    process.env.RESEND_API_KEY = "";
    const { sendClientFormAssignmentEmail } = await loadFormsEmailModule();

    const result = await sendClientFormAssignmentEmail({
      to: "family@example.com",
      childName: "Nora Rivera",
      agencyName: "Foundations Autism",
      formTitle: "ABA History",
      accessUrl: "https://www.goodaba.com/forms/foundations-autism/aba-history/access?token=test-token",
    });

    expect(result).toEqual({
      success: false,
      error: "Email delivery is not configured",
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns the provider-side delivery error when Resend rejects the send", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "quota exceeded" },
    });
    const { sendProviderFormSubmissionEmail } = await loadFormsEmailModule();

    const result = await sendProviderFormSubmissionEmail({
      to: "provider@example.com",
      agencyName: "Foundations Autism",
      formTitle: "ABA History",
      clientName: "Nora Rivera",
      submissionUrl: "https://www.goodaba.com/dashboard/forms/custom?tab=submissions&submissionId=sub_123",
    });

    expect(result).toEqual({
      success: false,
      error: "quota exceeded",
    });
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = originalEnv.RESEND_API_KEY;
    process.env.EMAIL_FROM_PARENT = originalEnv.EMAIL_FROM_PARENT;
    process.env.EMAIL_FROM_GOODABA = originalEnv.EMAIL_FROM_GOODABA;
    process.env.EMAIL_FROM = originalEnv.EMAIL_FROM;
  });
});

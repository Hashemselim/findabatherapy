"use server";

import { Resend } from "resend";

import { getFormattedFromEmail, getSupportEmail } from "@/lib/utils/domains";

let resend: Resend | null = null;

function getResendClient() {
  if (resend) return resend;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }

  resend = new Resend(apiKey);
  return resend;
}

function button(href: string, label: string) {
  return `
    <p style="margin: 24px 0;">
      <a href="${href}" style="display: inline-block; padding: 12px 20px; border-radius: 999px; background: #0866FF; color: #ffffff; text-decoration: none; font-weight: 600;">
        ${label}
      </a>
    </p>
  `.trim();
}

export async function sendClientFormAssignmentEmail(params: {
  to: string;
  familyName?: string | null;
  childName: string;
  agencyName: string;
  formTitle: string;
  dueDate?: string | null;
  accessUrl: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const client = getResendClient();
  if (!client) {
    return { success: false, error: "Email delivery is not configured" };
  }

  const greeting = params.familyName ? `Hi ${params.familyName},` : "Hello,";
  const supportEmail = getSupportEmail("goodaba");
  const dueLabel = params.dueDate
    ? new Date(params.dueDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.65;">
      <p style="margin: 0 0 16px;">${greeting}</p>
      <h1 style="font-size: 24px; margin: 0 0 12px;">A new form is ready</h1>
      <p style="margin: 0 0 16px;">
        ${params.agencyName} assigned a new form for <strong>${params.childName}</strong>.
      </p>
      <p style="margin: 0 0 16px;">
        Form: <strong>${params.formTitle}</strong>${dueLabel ? `<br />Due: <strong>${dueLabel}</strong>` : ""}
      </p>
      <p style="margin: 0 0 16px;">
        Open the link below to complete the form. Your answers save as you go, so you can come back later without starting over.
      </p>
      ${button(params.accessUrl, "Open Form")}
      <p style="margin: 24px 0 0; color: #475569; font-size: 14px;">
        Questions? Contact <a href="mailto:${supportEmail}" style="color: #0866FF;">${supportEmail}</a>.
      </p>
      <p style="margin: 8px 0 0; color: #94a3b8; font-size: 12px;">
        If the button does not work, copy and paste this link into your browser: ${params.accessUrl}
      </p>
    </div>
  `.trim();

  const result = await client.emails.send({
    from: getFormattedFromEmail("goodaba"),
    to: params.to,
    subject: `${params.agencyName} assigned ${params.formTitle}`,
    html,
    replyTo: supportEmail,
    headers: {
      "X-GoodABA-Category": "client-form-assignment",
    },
  });

  if (result.error) {
    return { success: false, error: result.error.message };
  }

  return { success: true };
}

export async function sendProviderFormSubmissionEmail(params: {
  to: string;
  agencyName: string;
  formTitle: string;
  clientName?: string | null;
  responderName?: string | null;
  submissionUrl: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const client = getResendClient();
  if (!client) {
    return { success: false, error: "Email delivery is not configured" };
  }

  const supportEmail = getSupportEmail("goodaba");
  const subject = `${params.formTitle} was submitted`;
  const responderLabel = params.clientName || params.responderName || "A family";

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.65;">
      <p style="margin: 0 0 16px;">Hello,</p>
      <h1 style="font-size: 24px; margin: 0 0 12px;">A form submission is ready to review</h1>
      <p style="margin: 0 0 16px;">
        <strong>${responderLabel}</strong> submitted <strong>${params.formTitle}</strong> for ${params.agencyName}.
      </p>
      <p style="margin: 0 0 16px;">
        Open the submission in GoodABA to review answers, uploaded files, and signature fields.
      </p>
      ${button(params.submissionUrl, "Review Submission")}
      <p style="margin: 24px 0 0; color: #475569; font-size: 14px;">
        Questions? Contact <a href="mailto:${supportEmail}" style="color: #0866FF;">${supportEmail}</a>.
      </p>
    </div>
  `.trim();

  const result = await client.emails.send({
    from: getFormattedFromEmail("goodaba"),
    to: params.to,
    subject,
    html,
    replyTo: supportEmail,
    headers: {
      "X-GoodABA-Category": "provider-form-submission",
    },
  });

  if (result.error) {
    return { success: false, error: result.error.message };
  }

  return { success: true };
}

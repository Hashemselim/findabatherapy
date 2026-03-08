"use server";

import { Resend } from "resend";

import { buildBrandUrl, getFormattedFromEmail, getSupportEmail } from "@/lib/utils/domains";

let resend: Resend | null = null;

function getResendClient() {
  if (resend) return resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  resend = new Resend(apiKey);
  return resend;
}

export async function sendWorkspaceInvitationEmail(params: {
  to: string;
  workspaceName: string;
  inviterName?: string | null;
  role: "owner" | "admin" | "member";
  acceptUrl: string;
  expiresAt: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const client = getResendClient();
  const supportEmail = getSupportEmail("goodaba");

  const subject = `Join ${params.workspaceName} on GoodABA`;
  const expiresLabel = new Date(params.expiresAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h1 style="font-size: 24px; margin-bottom: 12px;">You’ve been invited to ${params.workspaceName}</h1>
      <p style="margin: 0 0 16px;">
        ${params.inviterName ? `${params.inviterName} invited you` : "You were invited"} to join the GoodABA workspace for <strong>${params.workspaceName}</strong> as an <strong>${params.role}</strong>.
      </p>
      <p style="margin: 0 0 24px;">
        Accept the invitation by ${expiresLabel}. You’ll use your own sign-in and share the same workspace data.
      </p>
      <p style="margin: 24px 0;">
        <a href="${params.acceptUrl}" style="display: inline-block; padding: 12px 20px; border-radius: 999px; background: #2563eb; color: #fff; text-decoration: none; font-weight: 600;">
          Accept Invitation
        </a>
      </p>
      <p style="margin: 24px 0 0; color: #475569; font-size: 14px;">
        Questions? Contact <a href="mailto:${supportEmail}" style="color: #2563eb;">${supportEmail}</a>.
      </p>
      <p style="margin: 8px 0 0; color: #94a3b8; font-size: 12px;">
        If the button doesn’t work, copy and paste this link: ${params.acceptUrl}
      </p>
    </div>
  `.trim();

  if (!client) {
    return { success: false, error: "Email delivery is not configured" };
  }

  const result = await client.emails.send({
    from: getFormattedFromEmail("goodaba"),
    to: params.to,
    subject,
    html,
    replyTo: supportEmail,
    headers: {
      "X-GoodABA-Category": "workspace-invitation",
      "X-GoodABA-Workspace-Url": buildBrandUrl("goodaba", "/dashboard/settings/users"),
    },
  });

  if (result.error) {
    return { success: false, error: result.error.message };
  }

  return { success: true };
}

"use server";

import { Resend } from "resend";

import { getFormattedFromEmail, getSupportEmail } from "@/lib/utils/domains";

let resend: Resend | null = null;

function getResendClient() {
  if (resend) return resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  resend = new Resend(apiKey);
  return resend;
}

export async function sendClientPortalInviteEmail(params: {
  to: string;
  guardianName?: string | null;
  childName: string;
  agencyName: string;
  accessUrl: string;
  expiresAt: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const client = getResendClient();
  if (!client) {
    return { success: false, error: "Email delivery is not configured" };
  }

  const supportEmail = getSupportEmail("goodaba");
  const expiresLabel = new Date(params.expiresAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const greeting = params.guardianName ? `Hi ${params.guardianName},` : "Hello,";
  const subject = `${params.agencyName} invited you to your family portal`;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <p style="margin: 0 0 16px;">${greeting}</p>
      <h1 style="font-size: 24px; margin: 0 0 12px;">Your family portal is ready</h1>
      <p style="margin: 0 0 16px;">
        ${params.agencyName} invited you to use the GoodABA family portal for <strong>${params.childName}</strong>.
      </p>
      <p style="margin: 0 0 24px;">
        Sign in to review tasks, upload documents, read provider updates, and keep family information current.
        After your first sign-in, you can return anytime from GoodABA using the same email address.
        This invitation link will be available through ${expiresLabel}.
      </p>
      <p style="margin: 24px 0;">
        <a href="${params.accessUrl}" style="display: inline-block; padding: 12px 20px; border-radius: 999px; background: #0866FF; color: #fff; text-decoration: none; font-weight: 600;">
          Open Family Portal
        </a>
      </p>
      <p style="margin: 24px 0 0; color: #475569; font-size: 14px;">
        Questions? Contact <a href="mailto:${supportEmail}" style="color: #0866FF;">${supportEmail}</a>.
      </p>
      <p style="margin: 8px 0 0; color: #94a3b8; font-size: 12px;">
        If the button doesn’t work, copy and paste this link: ${params.accessUrl}
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
      "X-GoodABA-Category": "client-portal-invitation",
    },
  });

  if (result.error) {
    return { success: false, error: result.error.message };
  }

  return { success: true };
}

export async function sendClientPortalMagicLinkEmail(params: {
  to: string;
  guardianName?: string | null;
  childName: string;
  agencyName: string;
  signInUrl: string;
  signInPageUrl: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const client = getResendClient();
  if (!client) {
    return { success: false, error: "Email delivery is not configured" };
  }

  const supportEmail = getSupportEmail("goodaba");
  const greeting = params.guardianName ? `Hi ${params.guardianName},` : "Hello,";
  const subject = `${params.agencyName} sent your family portal sign-in link`;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <p style="margin: 0 0 16px;">${greeting}</p>
      <h1 style="font-size: 24px; margin: 0 0 12px;">Sign in to your family portal</h1>
      <p style="margin: 0 0 16px;">
        ${params.agencyName} sent you a secure sign-in link for <strong>${params.childName}</strong>.
      </p>
      <p style="margin: 0 0 24px;">
        Use the button below to sign in and open your GoodABA family portal. After that, you can come back anytime from GoodABA or from your provider&apos;s portal sign-in page using the same email address.
      </p>
      <p style="margin: 24px 0;">
        <a href="${params.signInUrl}" style="display: inline-block; padding: 12px 20px; border-radius: 999px; background: #0866FF; color: #fff; text-decoration: none; font-weight: 600;">
          Sign In to Family Portal
        </a>
      </p>
      <p style="margin: 24px 0 0; color: #475569; font-size: 14px;">
        Need a new link later? Use your provider&apos;s sign-in page: <a href="${params.signInPageUrl}" style="color: #0866FF;">${params.signInPageUrl}</a>
      </p>
      <p style="margin: 12px 0 0; color: #475569; font-size: 14px;">
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
      "X-GoodABA-Category": "client-portal-magic-link",
    },
  });

  if (result.error) {
    return { success: false, error: result.error.message };
  }

  return { success: true };
}

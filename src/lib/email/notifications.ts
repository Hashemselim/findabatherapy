/**
 * Email notifications using Resend
 *
 * If RESEND_API_KEY is not configured, emails are logged but not sent.
 * This allows the app to function in development without email setup.
 */

import { Resend } from "resend";

// Lazy initialization - only create client when needed
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (resend) return resend;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }

  resend = new Resend(apiKey);
  return resend;
}

function getFromEmail(): string {
  return process.env.EMAIL_FROM || "onboarding@resend.dev";
}

export interface InquiryNotificationParams {
  to: string;
  providerName: string;
  familyName: string;
  familyEmail: string;
  familyPhone?: string | null;
  childAge?: string | null;
  message: string;
  locationLabel?: string | null;
}

export interface PaymentFailureNotificationParams {
  to: string;
  providerName: string;
  invoiceId: string;
  amountDue: number;
  currency: string;
  attemptCount: number;
}

export interface SubscriptionConfirmationParams {
  to: string;
  providerName: string;
  planTier: string;
}

/**
 * Send email notification to provider when a new inquiry is submitted
 */
export async function sendProviderInquiryNotification(
  params: InquiryNotificationParams
): Promise<{ success: boolean; error?: string }> {
  const client = getResendClient();

  if (!client) {
    console.log("[EMAIL] Resend not configured - would send inquiry notification:", {
      to: params.to,
      provider: params.providerName,
      from: params.familyName,
      location: params.locationLabel || "General inquiry",
    });
    return { success: true };
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const { error } = await client.emails.send({
      from: getFromEmail(),
      to: params.to,
      subject: `New inquiry from ${params.familyName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">New Inquiry Received</h2>

          <p style="color: #475569;">Hello ${params.providerName},</p>

          <p style="color: #475569;">You have received a new inquiry${params.locationLabel ? ` for <strong>${params.locationLabel}</strong>` : ""}.</p>

          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <h3 style="color: #1e293b; margin: 0 0 12px 0;">Contact Details</h3>
            <p style="color: #475569; margin: 4px 0;"><strong>Name:</strong> ${params.familyName}</p>
            <p style="color: #475569; margin: 4px 0;"><strong>Email:</strong> <a href="mailto:${params.familyEmail}">${params.familyEmail}</a></p>
            ${params.familyPhone ? `<p style="color: #475569; margin: 4px 0;"><strong>Phone:</strong> ${params.familyPhone}</p>` : ""}
            ${params.childAge ? `<p style="color: #475569; margin: 4px 0;"><strong>Child's Age:</strong> ${params.childAge}</p>` : ""}
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <h3 style="color: #1e293b; margin: 0 0 12px 0;">Message</h3>
            <p style="color: #475569; white-space: pre-wrap;">${params.message}</p>
          </div>

          <a href="${siteUrl}/dashboard/inbox"
             style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            View in Dashboard
          </a>

          <p style="color: #94a3b8; font-size: 14px; margin-top: 32px;">
            This email was sent by FindABATherapy. Please do not reply directly to this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[EMAIL] Failed to send inquiry notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[EMAIL] Error sending inquiry notification:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Send email notification to provider when their payment fails
 */
export async function sendPaymentFailureNotification(
  params: PaymentFailureNotificationParams
): Promise<{ success: boolean; error?: string }> {
  const client = getResendClient();

  if (!client) {
    console.log("[EMAIL] Resend not configured - would send payment failure notification:", {
      to: params.to,
      provider: params.providerName,
      invoiceId: params.invoiceId,
      amount: `${(params.amountDue / 100).toFixed(2)} ${params.currency.toUpperCase()}`,
      attempt: params.attemptCount,
    });
    return { success: true };
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const formattedAmount = `$${(params.amountDue / 100).toFixed(2)} ${params.currency.toUpperCase()}`;

    const { error } = await client.emails.send({
      from: getFromEmail(),
      to: params.to,
      subject: "Action Required: Payment Failed",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Payment Failed</h2>

          <p style="color: #475569;">Hello ${params.providerName},</p>

          <p style="color: #475569;">
            We were unable to process your payment of <strong>${formattedAmount}</strong>.
            ${params.attemptCount > 1 ? `This is attempt ${params.attemptCount}.` : ""}
          </p>

          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #991b1b; margin: 0;">
              <strong>Important:</strong> If payment continues to fail, your listing may be suspended and hidden from search results.
            </p>
          </div>

          <p style="color: #475569;">Please update your payment method to continue your subscription:</p>

          <a href="${siteUrl}/dashboard/billing"
             style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            Update Payment Method
          </a>

          <p style="color: #475569; margin-top: 24px;">
            If you believe this is an error or need assistance, please contact our support team.
          </p>

          <p style="color: #94a3b8; font-size: 14px; margin-top: 32px;">
            Invoice ID: ${params.invoiceId}<br>
            This email was sent by FindABATherapy.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[EMAIL] Failed to send payment failure notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[EMAIL] Error sending payment failure notification:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Send email confirmation when subscription is created/upgraded
 */
export async function sendSubscriptionConfirmation(
  params: SubscriptionConfirmationParams
): Promise<{ success: boolean; error?: string }> {
  const client = getResendClient();

  if (!client) {
    console.log("[EMAIL] Resend not configured - would send subscription confirmation:", {
      to: params.to,
      provider: params.providerName,
      plan: params.planTier,
    });
    return { success: true };
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const planName = params.planTier.charAt(0).toUpperCase() + params.planTier.slice(1);

    const { error } = await client.emails.send({
      from: getFromEmail(),
      to: params.to,
      subject: `Welcome to FindABATherapy ${planName}!`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Welcome to ${planName}!</h2>

          <p style="color: #475569;">Hello ${params.providerName},</p>

          <p style="color: #475569;">
            Thank you for subscribing to FindABATherapy <strong>${planName}</strong>!
            Your account has been upgraded and all features are now available.
          </p>

          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <h3 style="color: #065f46; margin: 0 0 12px 0;">What's included in ${planName}:</h3>
            <ul style="color: #047857; margin: 0; padding-left: 20px;">
              ${params.planTier === "pro" ? `
                <li>Priority search placement</li>
                <li>Up to 5 locations</li>
                <li>Direct contact form & inbox</li>
                <li>Photo gallery (up to 10)</li>
                <li>Video embed</li>
                <li>Verified badge</li>
              ` : `
                <li>Priority search placement</li>
                <li>Unlimited locations</li>
                <li>Direct contact form & inbox</li>
                <li>Photo gallery (up to 10)</li>
                <li>Video embed</li>
                <li>Verified badge</li>
                <li>Featured homepage placement</li>
              `}
            </ul>
          </div>

          <a href="${siteUrl}/dashboard"
             style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            Go to Dashboard
          </a>

          <p style="color: #94a3b8; font-size: 14px; margin-top: 32px;">
            This email was sent by FindABATherapy.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[EMAIL] Failed to send subscription confirmation:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[EMAIL] Error sending subscription confirmation:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

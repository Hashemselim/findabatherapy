/**
 * Email notifications using Resend
 *
 * If RESEND_API_KEY is not configured, emails are logged but not sent.
 * This allows the app to function in development without email setup.
 */

import { Resend } from "resend";
import { STRIPE_PLANS } from "@/lib/stripe/config";

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

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

// Brand colors
const BRAND = {
  primary: "#5788FF",      // Blue
  accent: "#FFD700",       // Yellow/Gold
  success: "#059669",      // Green
  error: "#dc2626",        // Red
  warning: "#f59e0b",      // Amber
  textDark: "#1e293b",     // Slate 800
  textMedium: "#475569",   // Slate 600
  textLight: "#94a3b8",    // Slate 400
  bgLight: "#f8fafc",      // Slate 50
  bgWhite: "#ffffff",
  border: "#e2e8f0",       // Slate 200
};

/**
 * Branded email wrapper template
 */
function emailWrapper(content: string, options?: { preheader?: string }): string {
  const siteUrl = getSiteUrl();
  // Use Supabase storage for logo (publicly accessible, works in email clients)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ltihdvlduohufwcfwops.supabase.co";
  const logoUrl = `${supabaseUrl}/storage/v1/object/public/listing-logos/brand/logo-full-background-70.png`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Find ABA Therapy</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  ${options?.preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${options.preheader}</div>` : ""}

  <!-- Outer container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <!-- Email container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%;">

          <!-- Header with logo - brand blue background -->
          <tr>
            <td style="background-color: ${BRAND.primary}; border-radius: 12px 12px 0 0; padding: 20px 32px; text-align: center;">
              <img src="${logoUrl}" alt="Find ABA Therapy" width="300" style="display: block; margin: 0 auto; max-width: 300px; height: auto; border-radius: 6px;">
            </td>
          </tr>

          <!-- Main content area -->
          <tr>
            <td style="background-color: ${BRAND.bgWhite}; padding: 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${BRAND.bgLight}; border-radius: 0 0 12px 12px; padding: 24px 40px; border-top: 1px solid ${BRAND.border};">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <a href="${siteUrl}" style="color: ${BRAND.primary}; text-decoration: none; font-weight: 600; font-size: 14px;">Visit FindABATherapy.org</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="color: ${BRAND.textLight}; font-size: 12px; line-height: 1.5;">
                    <p style="margin: 0 0 8px 0;">Find ABA Therapy helps families connect with trusted ABA therapy providers.</p>
                    <p style="margin: 0;">Questions? Contact us at <a href="mailto:support@findabatherapy.org" style="color: ${BRAND.primary}; text-decoration: none;">support@findabatherapy.org</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Legal footer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%;">
          <tr>
            <td align="center" style="padding: 24px 20px; color: ${BRAND.textLight}; font-size: 11px; line-height: 1.5;">
              <p style="margin: 0;">© ${new Date().getFullYear()} Find ABA Therapy. All rights reserved.</p>
              <p style="margin: 8px 0 0 0;">
                <a href="${siteUrl}/legal/privacy" style="color: ${BRAND.textLight}; text-decoration: underline;">Privacy Policy</a>
                &nbsp;•&nbsp;
                <a href="${siteUrl}/legal/terms" style="color: ${BRAND.textLight}; text-decoration: underline;">Terms of Service</a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Primary CTA button component
 */
function primaryButton(text: string, href: string, color: string = BRAND.primary): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
      <tr>
        <td style="border-radius: 8px; background-color: ${color};">
          <a href="${href}" target="_blank" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `.trim();
}

/**
 * Info card/box component
 */
function infoCard(title: string, content: string, bgColor: string = BRAND.bgLight, borderColor: string = BRAND.border): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td style="background-color: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 20px;">
          ${title ? `<h3 style="color: ${BRAND.textDark}; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">${title}</h3>` : ""}
          ${content}
        </td>
      </tr>
    </table>
  `.trim();
}

/**
 * Alert/warning box component
 */
function alertBox(content: string, type: "success" | "error" | "warning" | "info" = "info"): string {
  const colors = {
    success: { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
    error: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
    warning: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
    info: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
  };
  const c = colors[type];

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td style="background-color: ${c.bg}; border: 1px solid ${c.border}; border-radius: 8px; padding: 16px;">
          <p style="color: ${c.text}; margin: 0; font-size: 14px; line-height: 1.5;">${content}</p>
        </td>
      </tr>
    </table>
  `.trim();
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

export interface FeedbackNotificationParams {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  category: string;
  rating?: number | null;
  message: string;
  pageUrl?: string | null;
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
    const siteUrl = getSiteUrl();

    const contactDetails = `
      <p style="color: ${BRAND.textMedium}; margin: 8px 0; font-size: 14px;">
        <strong style="color: ${BRAND.textDark};">Name:</strong> ${params.familyName}
      </p>
      <p style="color: ${BRAND.textMedium}; margin: 8px 0; font-size: 14px;">
        <strong style="color: ${BRAND.textDark};">Email:</strong>
        <a href="mailto:${params.familyEmail}" style="color: ${BRAND.primary}; text-decoration: none;">${params.familyEmail}</a>
      </p>
      ${params.familyPhone ? `
        <p style="color: ${BRAND.textMedium}; margin: 8px 0; font-size: 14px;">
          <strong style="color: ${BRAND.textDark};">Phone:</strong>
          <a href="tel:${params.familyPhone}" style="color: ${BRAND.primary}; text-decoration: none;">${params.familyPhone}</a>
        </p>
      ` : ""}
      ${params.childAge ? `
        <p style="color: ${BRAND.textMedium}; margin: 8px 0; font-size: 14px;">
          <strong style="color: ${BRAND.textDark};">Child's Age:</strong> ${params.childAge}
        </p>
      ` : ""}
    `.trim();

    const content = `
      <h1 style="color: ${BRAND.textDark}; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
        New Inquiry Received
      </h1>
      <p style="color: ${BRAND.accent}; font-size: 14px; font-weight: 600; margin: 0 0 24px 0; text-transform: uppercase; letter-spacing: 0.5px;">
        A family is interested in your services
      </p>

      <p style="color: ${BRAND.textMedium}; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
        Hello <strong style="color: ${BRAND.textDark};">${params.providerName}</strong>,
      </p>

      <p style="color: ${BRAND.textMedium}; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        Great news! You have received a new inquiry${params.locationLabel ? ` for <strong style="color: ${BRAND.textDark};">${params.locationLabel}</strong>` : ""}.
      </p>

      ${infoCard("Contact Information", contactDetails)}

      ${infoCard("Message", `<p style="color: ${BRAND.textMedium}; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${params.message}</p>`)}

      ${alertBox("<strong>Tip:</strong> Responding quickly to inquiries increases your chances of connecting with families. We recommend responding within 24 hours.", "info")}

      ${primaryButton("View in Dashboard", `${siteUrl}/dashboard/inbox`)}

      <p style="color: ${BRAND.textLight}; font-size: 13px; margin-top: 24px;">
        You can also reply directly to this family by emailing them at
        <a href="mailto:${params.familyEmail}" style="color: ${BRAND.primary}; text-decoration: none;">${params.familyEmail}</a>.
      </p>
    `.trim();

    const { error } = await client.emails.send({
      from: getFromEmail(),
      to: params.to,
      subject: `New inquiry from ${params.familyName}`,
      html: emailWrapper(content, { preheader: `${params.familyName} is interested in your ABA therapy services` }),
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
    const siteUrl = getSiteUrl();
    const formattedAmount = `$${(params.amountDue / 100).toFixed(2)} ${params.currency.toUpperCase()}`;

    const content = `
      <h1 style="color: ${BRAND.error}; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
        Payment Failed
      </h1>
      <p style="color: ${BRAND.textLight}; font-size: 14px; font-weight: 500; margin: 0 0 24px 0;">
        Action required to keep your listing active
      </p>

      <p style="color: ${BRAND.textMedium}; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
        Hello <strong style="color: ${BRAND.textDark};">${params.providerName}</strong>,
      </p>

      <p style="color: ${BRAND.textMedium}; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        We were unable to process your payment of <strong style="color: ${BRAND.textDark};">${formattedAmount}</strong>.
        ${params.attemptCount > 1 ? `<span style="color: ${BRAND.warning};">This is attempt ${params.attemptCount}.</span>` : ""}
      </p>

      ${alertBox("<strong>Important:</strong> If payment continues to fail, your listing may be suspended and hidden from search results. Families won't be able to find your services.", "error")}

      ${infoCard("Payment Details", `
        <p style="color: ${BRAND.textMedium}; margin: 8px 0; font-size: 14px;">
          <strong style="color: ${BRAND.textDark};">Amount Due:</strong> ${formattedAmount}
        </p>
        <p style="color: ${BRAND.textMedium}; margin: 8px 0; font-size: 14px;">
          <strong style="color: ${BRAND.textDark};">Invoice ID:</strong> <code style="background: ${BRAND.bgLight}; padding: 2px 6px; border-radius: 4px; font-size: 13px;">${params.invoiceId}</code>
        </p>
        <p style="color: ${BRAND.textMedium}; margin: 8px 0; font-size: 14px;">
          <strong style="color: ${BRAND.textDark};">Attempt:</strong> ${params.attemptCount}
        </p>
      `)}

      <p style="color: ${BRAND.textMedium}; font-size: 15px; line-height: 1.6; margin: 24px 0;">
        Please update your payment method to continue your subscription and keep your listing visible to families:
      </p>

      ${primaryButton("Update Payment Method", `${siteUrl}/dashboard/billing`, BRAND.error)}

      <p style="color: ${BRAND.textLight}; font-size: 13px; margin-top: 24px;">
        If you believe this is an error or need assistance, please contact our support team at
        <a href="mailto:support@findabatherapy.org" style="color: ${BRAND.primary}; text-decoration: none;">support@findabatherapy.org</a>.
      </p>
    `.trim();

    const { error } = await client.emails.send({
      from: getFromEmail(),
      to: params.to,
      subject: "Action Required: Payment Failed",
      html: emailWrapper(content, { preheader: "Your payment could not be processed. Action required." }),
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
    const siteUrl = getSiteUrl();

    // Get plan details from config - dynamically shows correct features for Pro vs Enterprise
    const planKey = params.planTier.toLowerCase() as "pro" | "enterprise";
    const plan = STRIPE_PLANS[planKey];
    const planName = plan?.name || params.planTier.charAt(0).toUpperCase() + params.planTier.slice(1);
    const featureList = plan?.features || [];

    const featuresHtml = featureList
      .map(
        (feature) => `
          <tr>
            <td style="padding: 8px 0; color: ${BRAND.success}; font-size: 14px;">
              <span style="display: inline-block; width: 20px; text-align: center; margin-right: 8px;">✓</span>
              <span style="color: ${BRAND.textMedium};">${feature}</span>
            </td>
          </tr>
        `
      )
      .join("");

    const content = `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 32px;">
        <tr>
          <td align="center">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td align="center" valign="middle" width="64" height="64" style="background-color: ${BRAND.success}; border-radius: 32px; margin-bottom: 16px;">
                  <span style="color: white; font-size: 28px; line-height: 1;">✓</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top: 16px;">
            <h1 style="color: ${BRAND.textDark}; font-size: 28px; font-weight: 700; margin: 0 0 8px 0;">
              Welcome to ${planName}!
            </h1>
            <p style="color: ${BRAND.accent}; font-size: 14px; font-weight: 600; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
              Your subscription is now active
            </p>
          </td>
        </tr>
      </table>

      <p style="color: ${BRAND.textMedium}; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
        Hello <strong style="color: ${BRAND.textDark};">${params.providerName}</strong>,
      </p>

      <p style="color: ${BRAND.textMedium}; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        Thank you for subscribing to Find ABA Therapy <strong style="color: ${BRAND.primary};">${planName}</strong>!
        Your account has been upgraded and all features are now available.
      </p>

      ${alertBox("Your listing is now visible to families searching for ABA therapy providers. Start by completing your profile to maximize visibility.", "success")}

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0; background-color: ${BRAND.bgLight}; border: 1px solid ${BRAND.border}; border-radius: 8px;">
        <tr>
          <td style="padding: 20px;">
            <h3 style="color: ${BRAND.textDark}; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">
              What's included in your ${planName} plan:
            </h3>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              ${featuresHtml}
            </table>
          </td>
        </tr>
      </table>

      <div style="text-align: center;">
        ${primaryButton("Go to Dashboard", `${siteUrl}/dashboard`, BRAND.success)}
      </div>

      <p style="color: ${BRAND.textLight}; font-size: 13px; margin-top: 32px; text-align: center;">
        Need help getting started? Visit our
        <a href="${siteUrl}/help" style="color: ${BRAND.primary}; text-decoration: none;">help center</a>
        or contact us at
        <a href="mailto:support@findabatherapy.org" style="color: ${BRAND.primary}; text-decoration: none;">support@findabatherapy.org</a>.
      </p>
    `.trim();

    const { error } = await client.emails.send({
      from: getFromEmail(),
      to: params.to,
      subject: `Welcome to Find ABA Therapy ${planName}!`,
      html: emailWrapper(content, { preheader: `Your ${planName} subscription is now active. Start connecting with families today!` }),
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

const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  feature_request: "Feature Request",
  bug_report: "Something is Broken",
  general_feedback: "General Feedback",
  question: "Question",
  compliment: "Compliment",
};

const FEEDBACK_CATEGORY_COLORS: Record<string, string> = {
  feature_request: "#8b5cf6", // Purple
  bug_report: "#dc2626",      // Red
  general_feedback: "#3b82f6", // Blue
  question: "#f59e0b",         // Amber
  compliment: "#059669",       // Green
};

/**
 * Send email notification to support when new feedback is submitted
 */
export async function sendFeedbackNotification(
  params: FeedbackNotificationParams
): Promise<{ success: boolean; error?: string }> {
  const client = getResendClient();
  const supportEmail = "support@findabatherapy.com";

  if (!client) {
    console.log("[EMAIL] Resend not configured - would send feedback notification:", {
      from: params.name,
      email: params.email,
      category: params.category,
      rating: params.rating,
    });
    return { success: true };
  }

  try {
    const siteUrl = getSiteUrl();
    const categoryLabel = FEEDBACK_CATEGORY_LABELS[params.category] || params.category;
    const categoryColor = FEEDBACK_CATEGORY_COLORS[params.category] || BRAND.primary;

    // Generate star rating display with visual stars
    const ratingDisplay = params.rating
      ? `<span style="color: ${BRAND.accent}; font-size: 16px; letter-spacing: 2px;">${"★".repeat(params.rating)}${"☆".repeat(5 - params.rating)}</span> <span style="color: ${BRAND.textLight};">(${params.rating}/5)</span>`
      : `<span style="color: ${BRAND.textLight};">Not provided</span>`;

    const content = `
      <h1 style="color: ${BRAND.textDark}; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
        New Feedback Received
      </h1>
      <p style="margin: 0 0 24px 0;">
        <span style="display: inline-block; background: ${categoryColor}; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
          ${categoryLabel}
        </span>
      </p>

      ${infoCard("Submitter Details", `
        <p style="color: ${BRAND.textMedium}; margin: 8px 0; font-size: 14px;">
          <strong style="color: ${BRAND.textDark};">Name:</strong> ${params.name}
        </p>
        <p style="color: ${BRAND.textMedium}; margin: 8px 0; font-size: 14px;">
          <strong style="color: ${BRAND.textDark};">Email:</strong>
          <a href="mailto:${params.email}" style="color: ${BRAND.primary}; text-decoration: none;">${params.email}</a>
        </p>
        ${params.phone ? `
          <p style="color: ${BRAND.textMedium}; margin: 8px 0; font-size: 14px;">
            <strong style="color: ${BRAND.textDark};">Phone:</strong> ${params.phone}
          </p>
        ` : ""}
        ${params.company ? `
          <p style="color: ${BRAND.textMedium}; margin: 8px 0; font-size: 14px;">
            <strong style="color: ${BRAND.textDark};">Company:</strong> ${params.company}
          </p>
        ` : ""}
      `)}

      ${infoCard("Feedback Details", `
        <p style="color: ${BRAND.textMedium}; margin: 8px 0; font-size: 14px;">
          <strong style="color: ${BRAND.textDark};">Category:</strong>
          <span style="color: ${categoryColor}; font-weight: 500;">${categoryLabel}</span>
        </p>
        <p style="color: ${BRAND.textMedium}; margin: 8px 0; font-size: 14px;">
          <strong style="color: ${BRAND.textDark};">Rating:</strong> ${ratingDisplay}
        </p>
        ${params.pageUrl ? `
          <p style="color: ${BRAND.textMedium}; margin: 8px 0; font-size: 14px;">
            <strong style="color: ${BRAND.textDark};">Page URL:</strong>
            <a href="${params.pageUrl}" style="color: ${BRAND.primary}; text-decoration: none; font-size: 13px;">${params.pageUrl}</a>
          </p>
        ` : ""}
      `)}

      ${infoCard("Message", `
        <p style="color: ${BRAND.textMedium}; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${params.message}</p>
      `)}

      ${primaryButton("View in Admin Dashboard", `${siteUrl}/admin/feedback`)}

      <p style="color: ${BRAND.textLight}; font-size: 13px; margin-top: 24px;">
        Reply directly to <a href="mailto:${params.email}" style="color: ${BRAND.primary}; text-decoration: none;">${params.email}</a> to respond to this feedback.
      </p>
    `.trim();

    const { error } = await client.emails.send({
      from: getFromEmail(),
      to: supportEmail,
      subject: `[${categoryLabel}] New Feedback from ${params.name}`,
      html: emailWrapper(content, { preheader: `${params.name} submitted ${categoryLabel.toLowerCase()}: "${params.message.substring(0, 60)}..."` }),
    });

    if (error) {
      console.error("[EMAIL] Failed to send feedback notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[EMAIL] Error sending feedback notification:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Send a test email to verify the email templates are working
 */
export async function sendTestEmail(
  to: string,
  type: "inquiry" | "payment_failure" | "subscription" | "subscription_enterprise" | "feedback" = "inquiry"
): Promise<{ success: boolean; error?: string }> {
  const testData = {
    inquiry: () =>
      sendProviderInquiryNotification({
        to,
        providerName: "Test Provider",
        familyName: "John Smith",
        familyEmail: "john.smith@example.com",
        familyPhone: "(555) 123-4567",
        childAge: "5 years old",
        message:
          "Hello, I am looking for ABA therapy services for my son. He was recently diagnosed and we're exploring options in our area. We're particularly interested in in-home therapy sessions. Could you please let me know your availability and the process to get started?\n\nThank you!",
        locationLabel: "Downtown Austin Center",
      }),
    payment_failure: () =>
      sendPaymentFailureNotification({
        to,
        providerName: "Test Provider",
        invoiceId: "inv_test_123456789",
        amountDue: 9900,
        currency: "usd",
        attemptCount: 2,
      }),
    subscription: () =>
      sendSubscriptionConfirmation({
        to,
        providerName: "Test Provider",
        planTier: "pro",
      }),
    subscription_enterprise: () =>
      sendSubscriptionConfirmation({
        to,
        providerName: "Test Provider",
        planTier: "enterprise",
      }),
    feedback: () =>
      sendFeedbackNotification({
        name: "Jane Doe",
        email: "jane.doe@example.com",
        phone: "(555) 987-6543",
        company: "ABC Therapy Services",
        category: "feature_request",
        rating: 4,
        message:
          "I love the platform! It would be great if you could add a feature to schedule consultations directly through the contact form. This would save time for both families and providers.",
        pageUrl: "https://findabatherapy.org/provider/abc-therapy",
      }),
  };

  return testData[type]();
}

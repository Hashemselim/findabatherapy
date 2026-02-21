/**
 * Shared email template helpers
 *
 * These helpers are used by both the system notification emails (notifications.ts)
 * and the agency communication emails (communications server actions).
 */

import {
  getSiteUrl as getSafeUrl,
} from "@/lib/utils/domains";

// Brand colors (shared with notifications.ts)
const BRAND = {
  primary: "#5788FF",
  accent: "#FFD700",
  success: "#059669",
  error: "#dc2626",
  warning: "#f59e0b",
  textDark: "#1e293b",
  textMedium: "#475569",
  textLight: "#94a3b8",
  bgLight: "#f8fafc",
  bgWhite: "#ffffff",
  border: "#e2e8f0",
};

/**
 * Branded email wrapper template
 * Wraps HTML content in a branded email layout with header, footer, and legal text.
 */
export function emailWrapper(content: string, options?: { preheader?: string }): string {
  const siteUrl = getSafeUrl();
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
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} Find ABA Therapy. All rights reserved.</p>
              <p style="margin: 8px 0 0 0;">
                <a href="${siteUrl}/legal/privacy" style="color: ${BRAND.textLight}; text-decoration: underline;">Privacy Policy</a>
                &nbsp;&bull;&nbsp;
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

// --- Agency-branded email helpers ---

export interface AgencyBrandingData {
  agencyName: string;
  contactEmail: string;
  logoUrl: string | null;
  brandColor: string;
  website: string | null;
  phone: string | null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

/**
 * Agency-branded email wrapper template.
 * Used for agency-to-client communications (templates, custom messages).
 * Shows the agency's logo, name, and brand color instead of Find ABA Therapy branding.
 */
export function agencyEmailWrapper(
  content: string,
  agency: AgencyBrandingData,
  options?: { preheader?: string }
): string {
  const siteUrl = getSafeUrl();
  const name = escapeHtml(agency.agencyName);
  const textColor = getContrastColor(agency.brandColor);

  const headerContent = agency.logoUrl
    ? `<img src="${agency.logoUrl}" alt="${name}" width="90" style="display: block; margin: 0 auto 12px; max-width: 90px; height: auto; border-radius: 6px;">
       <p style="margin: 0; font-size: 18px; font-weight: 700; color: ${textColor};">${name}</p>`
    : `<p style="margin: 0; font-size: 24px; font-weight: 700; color: ${textColor};">${name}</p>`;

  const footerLines: string[] = [];
  if (agency.contactEmail) {
    footerLines.push(
      `<a href="mailto:${escapeHtml(agency.contactEmail)}" style="color: ${agency.brandColor}; text-decoration: none;">${escapeHtml(agency.contactEmail)}</a>`
    );
  }
  if (agency.phone) {
    footerLines.push(escapeHtml(agency.phone));
  }
  if (agency.website) {
    const href = agency.website.startsWith("http") ? agency.website : `https://${agency.website}`;
    footerLines.push(
      `<a href="${href}" style="color: ${agency.brandColor}; text-decoration: none;">${escapeHtml(agency.website)}</a>`
    );
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${name}</title>
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

          <!-- Header with agency branding -->
          <tr>
            <td style="background-color: ${agency.brandColor}; border-radius: 12px 12px 0 0; padding: 24px 32px; text-align: center;">
              ${headerContent}
            </td>
          </tr>

          <!-- Main content area -->
          <tr>
            <td style="background-color: ${BRAND.bgWhite}; padding: 40px;">
              ${content}
            </td>
          </tr>

          <!-- Agency footer -->
          <tr>
            <td style="background-color: ${BRAND.bgLight}; border-radius: 0 0 12px 12px; padding: 24px 40px; border-top: 1px solid ${BRAND.border};">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <p style="margin: 0; font-weight: 600; font-size: 14px; color: ${BRAND.textDark};">${name}</p>
                  </td>
                </tr>
                ${footerLines.length > 0 ? `
                <tr>
                  <td align="center" style="color: ${BRAND.textMedium}; font-size: 13px; line-height: 1.8;">
                    ${footerLines.join(" &nbsp;&bull;&nbsp; ")}
                  </td>
                </tr>` : ""}
              </table>
            </td>
          </tr>

        </table>

        <!-- Powered by + legal footer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%;">
          <tr>
            <td align="center" style="padding: 24px 20px; color: ${BRAND.textLight}; font-size: 11px; line-height: 1.5;">
              <p style="margin: 0;">Powered by <a href="${siteUrl}" style="color: ${BRAND.textLight}; text-decoration: underline;">Find ABA Therapy</a></p>
              <p style="margin: 8px 0 0 0;">
                <a href="${siteUrl}/legal/privacy" style="color: ${BRAND.textLight}; text-decoration: underline;">Privacy Policy</a>
                &nbsp;&bull;&nbsp;
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

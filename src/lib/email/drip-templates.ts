/**
 * Email drip sequence templates for free users
 *
 * 5-email nurture series sent over 14 days to encourage free users to Go Live.
 * Uses the shared emailWrapper() for consistent GoodABA branding.
 */

import { emailWrapper } from "./email-helpers";
import { getSiteUrl as getSafeUrl } from "@/lib/utils/domains";

interface DripEmailTemplate {
  subject: string;
  preheader: string;
  html: string;
}

const BRAND = {
  primary: "#0866FF",
  success: "#059669",
  textDark: "#1e293b",
  textMedium: "#475569",
  textLight: "#94a3b8",
};

function goLiveCta(siteUrl: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding: 24px 0 8px;">
          <a href="${siteUrl}/dashboard/billing"
             style="display: inline-block; background-color: ${BRAND.primary}; color: #ffffff; font-weight: 600; font-size: 16px; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
            Go Live Now
          </a>
        </td>
      </tr>
    </table>`;
}

/**
 * Day 0 — Welcome email
 */
function welcomeEmail(agencyName: string): DripEmailTemplate {
  const siteUrl = getSafeUrl();
  const content = `
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: ${BRAND.textDark};">
      Welcome to GoodABA, ${agencyName}!
    </h1>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: ${BRAND.textMedium};">
      Your branded pages are ready to preview. You&rsquo;ve already set up your agency profile,
      and your listing is taking shape on Find ABA Therapy.
    </p>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: ${BRAND.textMedium};">
      Right now you&rsquo;re in <strong>Preview Mode</strong> &mdash; your pages look great, but they&rsquo;re
      not yet visible to families searching for ABA services. When you&rsquo;re ready, Go Live to publish
      your listing and start receiving inquiries.
    </p>
    <p style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: ${BRAND.textMedium};">
      Here&rsquo;s what you can do next:
    </p>
    <ul style="margin: 0 0 16px; padding-left: 20px; font-size: 15px; line-height: 1.8; color: ${BRAND.textMedium};">
      <li>Preview your branded agency page</li>
      <li>Add your logo, photos, and service details</li>
      <li>Go Live to get discovered by families</li>
    </ul>
    ${goLiveCta(siteUrl)}
  `;

  return {
    subject: "Welcome! Your branded pages are ready to preview",
    preheader: "Your GoodABA profile is set up. Preview your pages now.",
    html: emailWrapper(content, {
      preheader: "Your GoodABA profile is set up. Preview your pages now.",
      brandContext: "goodaba",
    }),
  };
}

/**
 * Day 2 — Feature highlight: embeddable contact form
 */
function featureHighlightEmail(agencyName: string): DripEmailTemplate {
  const siteUrl = getSafeUrl();
  const content = `
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: ${BRAND.textDark};">
      Did you know? Your contact form works anywhere
    </h1>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: ${BRAND.textMedium};">
      Hi ${agencyName},
    </p>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: ${BRAND.textMedium};">
      Your Find ABA Therapy listing includes a professional inquiry form that families can use to
      reach you directly. Once you Go Live, this form becomes active and every inquiry lands
      in your dashboard for easy follow-up.
    </p>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: ${BRAND.textMedium};">
      With Pro, you also unlock:
    </p>
    <ul style="margin: 0 0 16px; padding-left: 20px; font-size: 15px; line-height: 1.8; color: ${BRAND.textMedium};">
      <li><strong>Client CRM</strong> &mdash; manage inquiries, track statuses, and never lose a lead</li>
      <li><strong>Communication templates</strong> &mdash; respond to families in one click</li>
      <li><strong>Pipeline dashboard</strong> &mdash; see your intake funnel at a glance</li>
    </ul>
    ${goLiveCta(siteUrl)}
  `;

  return {
    subject: "Your contact form can be activated with one click",
    preheader: "Go Live to start receiving inquiries from families searching for ABA therapy.",
    html: emailWrapper(content, {
      preheader: "Go Live to start receiving inquiries from families searching for ABA therapy.",
      brandContext: "goodaba",
    }),
  };
}

/**
 * Day 5 — Social proof / directory listing
 */
function socialProofEmail(agencyName: string): DripEmailTemplate {
  const siteUrl = getSafeUrl();
  const content = `
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: ${BRAND.textDark};">
      Families are searching. Are you visible?
    </h1>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: ${BRAND.textMedium};">
      Hi ${agencyName},
    </p>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: ${BRAND.textMedium};">
      Your Find ABA Therapy listing is built and ready. Parents in your area are actively
      searching for ABA providers &mdash; but right now, they can&rsquo;t find you because
      your listing is still in preview mode.
    </p>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: ${BRAND.textMedium};">
      Agencies that Go Live within their first week see the most engagement. Your listing
      already looks professional &mdash; all it takes is one click to publish it.
    </p>

    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 0 0 16px;">
      <p style="margin: 0; font-size: 14px; color: ${BRAND.success}; font-weight: 600;">
        When you Go Live, families can:
      </p>
      <ul style="margin: 8px 0 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #166534;">
        <li>Find your agency in search results</li>
        <li>View your branded profile page</li>
        <li>Submit inquiries directly to you</li>
      </ul>
    </div>
    ${goLiveCta(siteUrl)}
  `;

  return {
    subject: `${agencyName}, parents are looking for ABA providers near you`,
    preheader: "Your listing is ready. Go Live so families can find and contact you.",
    html: emailWrapper(content, {
      preheader: "Your listing is ready. Go Live so families can find and contact you.",
      brandContext: "goodaba",
    }),
  };
}

/**
 * Day 10 — Before/after comparison
 */
function beforeAfterEmail(agencyName: string): DripEmailTemplate {
  const siteUrl = getSafeUrl();
  const content = `
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: ${BRAND.textDark};">
      Preview vs. Live &mdash; here&rsquo;s the difference
    </h1>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: ${BRAND.textMedium};">
      Hi ${agencyName},
    </p>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: ${BRAND.textMedium};">
      Your pages look great in preview mode, but here&rsquo;s what changes when you Go Live:
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td width="48%" style="vertical-align: top;">
          <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px;">
            <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Preview Mode</p>
            <ul style="margin: 0; padding-left: 16px; font-size: 13px; line-height: 1.8; color: #92400e;">
              <li>Pages visible only to you</li>
              <li>Demo data in dashboard</li>
              <li>Contact form disabled</li>
              <li>Not in search results</li>
            </ul>
          </div>
        </td>
        <td width="4%"></td>
        <td width="48%" style="vertical-align: top;">
          <div style="background-color: #ecfdf5; border-radius: 8px; padding: 16px;">
            <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 0.5px;">Live with Pro</p>
            <ul style="margin: 0; padding-left: 16px; font-size: 13px; line-height: 1.8; color: #065f46;">
              <li>Published on the directory</li>
              <li>Real client CRM data</li>
              <li>Active contact form</li>
              <li>Discoverable by families</li>
            </ul>
          </div>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: ${BRAND.textMedium};">
      Everything you&rsquo;ve built is ready. One click to make it real.
    </p>
    ${goLiveCta(siteUrl)}
  `;

  return {
    subject: "Preview vs. Live: see what you're missing",
    preheader: "Your listing is ready. Here's what changes when you Go Live.",
    html: emailWrapper(content, {
      preheader: "Your listing is ready. Here's what changes when you Go Live.",
      brandContext: "goodaba",
    }),
  };
}

/**
 * Day 14 — Urgency nudge
 */
function urgencyNudgeEmail(agencyName: string): DripEmailTemplate {
  const siteUrl = getSafeUrl();
  const content = `
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: ${BRAND.textDark};">
      Still in preview mode?
    </h1>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: ${BRAND.textMedium};">
      Hi ${agencyName},
    </p>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: ${BRAND.textMedium};">
      It&rsquo;s been two weeks since you signed up, and your listing is still in preview mode.
      Most agencies go live within their first week &mdash; and they start receiving inquiries
      almost immediately.
    </p>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: ${BRAND.textMedium};">
      Every day your listing isn&rsquo;t live is a day families can&rsquo;t find you. Your profile
      is already set up &mdash; going live takes less than a minute.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 0 0 16px;">
      <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: ${BRAND.textDark};">
        Quick reminder &mdash; Pro includes:
      </p>
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${BRAND.textMedium};">
        Published directory listing &bull; Client CRM &bull; Communication templates &bull; Pipeline dashboard &bull; Branded pages
      </p>
    </div>

    ${goLiveCta(siteUrl)}

    <p style="margin: 16px 0 0; font-size: 13px; line-height: 1.5; color: ${BRAND.textLight}; text-align: center;">
      This is the last email in our welcome series. You can always Go Live from your
      <a href="${siteUrl}/dashboard/billing" style="color: ${BRAND.primary}; text-decoration: none;">dashboard</a>.
    </p>
  `;

  return {
    subject: "Most agencies go live within their first week",
    preheader: "Your listing is ready and waiting. Go Live to start receiving inquiries.",
    html: emailWrapper(content, {
      preheader: "Your listing is ready and waiting. Go Live to start receiving inquiries.",
      brandContext: "goodaba",
    }),
  };
}

// ============================================================================
// Drip sequence configuration
// ============================================================================

export interface DripStep {
  step: number;
  dayOffset: number;
  getTemplate: (agencyName: string) => DripEmailTemplate;
}

export const DRIP_SEQUENCE: DripStep[] = [
  { step: 1, dayOffset: 0, getTemplate: welcomeEmail },
  { step: 2, dayOffset: 2, getTemplate: featureHighlightEmail },
  { step: 3, dayOffset: 5, getTemplate: socialProofEmail },
  { step: 4, dayOffset: 10, getTemplate: beforeAfterEmail },
  { step: 5, dayOffset: 14, getTemplate: urgencyNudgeEmail },
];

/** Total number of drip steps */
export const DRIP_TOTAL_STEPS = DRIP_SEQUENCE.length;

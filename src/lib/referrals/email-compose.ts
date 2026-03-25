export type ReferralInboxClient = "gmail" | "outlook" | "yahoo" | "mailto";

export interface ReferralInboxDraft {
  sourceId: string;
  sourceName: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
}

function encode(value: string) {
  return encodeURIComponent(value);
}

export function buildReferralComposeUrl(
  client: ReferralInboxClient,
  draft: ReferralInboxDraft
) {
  const to = encode(draft.recipientEmail);
  const subject = encode(draft.subject);
  const body = encode(draft.body);

  switch (client) {
    case "gmail":
      return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
    case "outlook":
      return `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${subject}&body=${body}`;
    case "yahoo":
      return `https://compose.mail.yahoo.com/?to=${to}&subject=${subject}&body=${body}`;
    case "mailto":
      return `mailto:${draft.recipientEmail}?subject=${subject}&body=${body}`;
    default:
      return `mailto:${draft.recipientEmail}?subject=${subject}&body=${body}`;
  }
}

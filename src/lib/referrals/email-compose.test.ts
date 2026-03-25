import { describe, expect, it } from "vitest";

import {
  buildReferralComposeUrl,
  type ReferralInboxDraft,
} from "@/lib/referrals/email-compose";

const draft: ReferralInboxDraft = {
  sourceId: "source-1",
  sourceName: "Bright Steps Pediatrics",
  recipientEmail: "office@example.com",
  recipientName: "Dr. Lopez",
  subject: "Referral partnership with Bright Path ABA",
  body: "Hi Dr. Lopez,\n\nWe'd love to connect.",
};

describe("buildReferralComposeUrl", () => {
  it("builds a Gmail compose url", () => {
    expect(buildReferralComposeUrl("gmail", draft)).toBe(
      "https://mail.google.com/mail/?view=cm&fs=1&to=office%40example.com&su=Referral%20partnership%20with%20Bright%20Path%20ABA&body=Hi%20Dr.%20Lopez%2C%0A%0AWe'd%20love%20to%20connect."
    );
  });

  it("builds an Outlook compose url", () => {
    expect(buildReferralComposeUrl("outlook", draft)).toBe(
      "https://outlook.live.com/mail/0/deeplink/compose?to=office%40example.com&subject=Referral%20partnership%20with%20Bright%20Path%20ABA&body=Hi%20Dr.%20Lopez%2C%0A%0AWe'd%20love%20to%20connect."
    );
  });

  it("builds a mailto url", () => {
    expect(buildReferralComposeUrl("mailto", draft)).toBe(
      "mailto:office@example.com?subject=Referral%20partnership%20with%20Bright%20Path%20ABA&body=Hi%20Dr.%20Lopez%2C%0A%0AWe'd%20love%20to%20connect."
    );
  });
});

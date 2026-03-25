import { describe, expect, it } from "vitest";

import {
  filterPublicProfiles,
  isInternalTestEmail,
  isPublicProfileVisible,
} from "@/lib/public-visibility";

describe("public visibility rules", () => {
  it("detects the internal test email domain", () => {
    expect(isInternalTestEmail("e2e-test@test.findabatherapy.com")).toBe(true);
    expect(isInternalTestEmail("real@agency.com")).toBe(false);
  });

  it("hides test-domain profiles from public surfaces", () => {
    expect(
      isPublicProfileVisible({
        contact_email: "real@agency.com",
        is_seeded: false,
      })
    ).toBe(true);

    expect(
      isPublicProfileVisible({
        contact_email: "e2e-test@test.findabatherapy.com",
        is_seeded: false,
      })
    ).toBe(false);

    expect(
      isPublicProfileVisible({
        contact_email: "real@agency.com",
        is_seeded: true,
      })
    ).toBe(true);
  });

  it("filters hidden profiles from row collections", () => {
    const rows = [
      { id: "visible", profile: { contact_email: "hello@agency.com", is_seeded: false } },
      { id: "test", profile: { contact_email: "qa@test.findabatherapy.com", is_seeded: false } },
      { id: "seeded", profile: { contact_email: "hello@agency.com", is_seeded: true } },
    ];

    expect(filterPublicProfiles(rows, (row) => row.profile)).toEqual([
      rows[0],
      rows[2],
    ]);
  });
});

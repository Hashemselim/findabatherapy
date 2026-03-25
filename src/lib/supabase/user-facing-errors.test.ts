import { describe, expect, it } from "vitest";

import {
  isInternalDatabaseError,
  toUserFacingSupabaseError,
} from "@/lib/supabase/user-facing-errors";

describe("user-facing Supabase errors", () => {
  it("treats RLS failures as internal database errors", () => {
    expect(
      isInternalDatabaseError({
        code: "42501",
        message: 'new row violates row-level security policy for table "profiles"',
      })
    ).toBe(true);
  });

  it("returns the fallback for internal database errors", () => {
    expect(
      toUserFacingSupabaseError({
        action: "TEST:rls",
        error: {
          code: "42501",
          message: 'new row violates row-level security policy for table "profiles"',
        },
        fallback: "We could not save your changes. Please try again.",
      })
    ).toBe("We could not save your changes. Please try again.");
  });

  it("preserves non-internal messages", () => {
    expect(
      toUserFacingSupabaseError({
        action: "TEST:user-message",
        error: {
          message: "Maximum of 3 locations reached",
        },
        fallback: "Fallback message",
      })
    ).toBe("Maximum of 3 locations reached");
  });
});

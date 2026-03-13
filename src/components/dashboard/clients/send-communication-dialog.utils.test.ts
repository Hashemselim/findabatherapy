import { describe, expect, it } from "vitest";

import {
  resolveCcEmails,
} from "./send-communication-dialog.utils";

describe("resolveCcEmails", () => {
  it("includes a typed cc email even if it has not been added yet", () => {
    expect(resolveCcEmails([], "cc@example.com")).toEqual({
      ccEmails: ["cc@example.com"],
    });
  });

  it("ignores duplicate cc emails case-insensitively", () => {
    expect(resolveCcEmails(["CC@example.com"], "cc@example.com")).toEqual({
      ccEmails: ["CC@example.com"],
    });
  });

  it("returns the invalid input when the pending cc email is malformed", () => {
    expect(resolveCcEmails([], "not-an-email")).toEqual({
      ccEmails: [],
      invalidInput: "not-an-email",
    });
  });
});

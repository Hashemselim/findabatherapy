import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: (handler: unknown) => handler,
  createRouteMatcher: () => () => false,
}));

vi.mock("@/lib/onboarding-preview", () => ({
  isDevOnboardingPreviewEnabled: () => false,
}));

vi.mock("@/lib/platform/config", () => ({
  isClerkAuthEnabled: () => true,
}));

vi.mock("@/lib/utils/domains", () => ({
  domains: {
    goodaba: {
      domains: ["www.goodaba.com", "goodaba.com"],
      legacyDomains: ["www.behaviorwork.com", "behaviorwork.com"],
      production: "https://www.goodaba.com",
    },
    jobs: {
      legacyDomains: ["www.findabajobs.org", "findabajobs.org"],
    },
    therapy: {
      production: "https://www.findabatherapy.org",
    },
  },
  isGoodabaAppPath: () => false,
}));

import { shouldBypassClerkMiddleware } from "@/middleware";

describe("shouldBypassClerkMiddleware", () => {
  it("only bypasses explicit ingest endpoints", () => {
    expect(shouldBypassClerkMiddleware("/ingest")).toBe(true);
    expect(shouldBypassClerkMiddleware("/ingest/events")).toBe(true);
  });

  it("keeps Clerk middleware active on public signed-out pages", () => {
    expect(shouldBypassClerkMiddleware("/")).toBe(false);
    expect(shouldBypassClerkMiddleware("/search")).toBe(false);
    expect(shouldBypassClerkMiddleware("/jobs/search")).toBe(false);
    expect(shouldBypassClerkMiddleware("/api/auth/profile")).toBe(false);
    expect(shouldBypassClerkMiddleware("/provider/p/example-provider")).toBe(false);
  });

  it("keeps Clerk middleware active on auth, dashboard, and portal routes", () => {
    expect(shouldBypassClerkMiddleware("/auth/sign-in")).toBe(false);
    expect(shouldBypassClerkMiddleware("/dashboard/clients/pipeline")).toBe(false);
    expect(shouldBypassClerkMiddleware("/portal/test-slug")).toBe(false);
  });
});

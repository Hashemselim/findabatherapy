import { afterEach, describe, expect, it, vi } from "vitest";

import { getBrandFromPath, getRequestOrigin, isGoodabaAppPath } from "@/lib/utils/domains";

describe("domain path helpers", () => {
  it("treats localhost root as the GoodABA app surface", () => {
    expect(isGoodabaAppPath("/")).toBe(true);
    expect(getBrandFromPath("/")).toBe("goodaba");
  });

  it("keeps therapy discovery routes on the therapy brand", () => {
    expect(isGoodabaAppPath("/search")).toBe(false);
    expect(getBrandFromPath("/search")).toBe("therapy");
    expect(getBrandFromPath("/learn")).toBe("therapy");
  });

  it("treats provider platform routes as GoodABA", () => {
    expect(isGoodabaAppPath("/auth/sign-in")).toBe(true);
    expect(isGoodabaAppPath("/dashboard/clients/pipeline")).toBe(true);
    expect(isGoodabaAppPath("/provider/acme/resources")).toBe(true);
    expect(getBrandFromPath("/dashboard")).toBe("goodaba");
  });
});

describe("getRequestOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("preserves localhost ports when building an origin from host headers", () => {
    const origin = getRequestOrigin(
      {
        get(name: string) {
          if (name === "host") return "localhost:3000";
          return null;
        },
      },
      "goodaba",
    );

    expect(origin).toBe("http://localhost:3000");
  });

  it("preserves localhost origins during production-mode local runs", () => {
    vi.stubEnv("NODE_ENV", "production");

    const origin = getRequestOrigin(
      {
        get(name: string) {
          if (name === "origin") return "http://localhost:3000";
          return null;
        },
      },
      "goodaba",
    );

    expect(origin).toBe("http://localhost:3000");
  });
});

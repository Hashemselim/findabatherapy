import { describe, expect, it } from "vitest";

import { getBrandFromPath, isGoodabaAppPath } from "@/lib/utils/domains";

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

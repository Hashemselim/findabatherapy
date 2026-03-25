import { describe, expect, it } from "vitest";

import { mainNavItems, sectionNav } from "./nav-config";

describe("dashboard nav config", () => {
  it("keeps communications inside the ABA Toolkit after social posts", () => {
    expect(mainNavItems.some((item) => item.href === "/dashboard/clients/communications")).toBe(false);

    const toolkitSection = sectionNav.find((section) => section.id === "toolkit");
    expect(toolkitSection).toBeDefined();

    const toolkitHrefs = toolkitSection?.items.map((item) => item.href) ?? [];
    expect(toolkitHrefs).toContain("/dashboard/clients/communications");
    expect(toolkitHrefs.indexOf("/dashboard/clients/communications")).toBe(
      toolkitHrefs.indexOf("/dashboard/social") + 1
    );
  });

  it("shows brand style under company and hides analytics from navigation", () => {
    const companySection = sectionNav.find((section) => section.id === "company");
    expect(companySection).toBeDefined();

    const companyHrefs = companySection?.items.map((item) => item.href) ?? [];
    expect(companyHrefs).toContain("/dashboard/branding");
    expect(companyHrefs).not.toContain("/dashboard/settings/analytics");
  });
});

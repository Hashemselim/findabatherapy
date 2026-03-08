import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATED_FILES = [
  "src/app/(dashboard)/dashboard/analytics/page.tsx",
  "src/app/(dashboard)/dashboard/account/page.tsx",
  "src/app/(dashboard)/dashboard/clients/pipeline/page.tsx",
  "src/app/(dashboard)/dashboard/clients/communications/page.tsx",
  "src/app/(dashboard)/dashboard/company/page.tsx",
  "src/app/(dashboard)/dashboard/employees/page.tsx",
  "src/app/(dashboard)/dashboard/forms/agency/page.tsx",
  "src/app/(dashboard)/dashboard/forms/contact/page.tsx",
  "src/app/(dashboard)/dashboard/forms/resources/page.tsx",
  "src/app/(dashboard)/dashboard/forms/website/page.tsx",
  "src/app/(dashboard)/dashboard/jobs/page.tsx",
  "src/app/(dashboard)/dashboard/jobs/new/page.tsx",
  "src/app/(dashboard)/dashboard/locations/page.tsx",
  "src/app/(dashboard)/dashboard/media/page.tsx",
  "src/app/(dashboard)/dashboard/page.tsx",
  "src/app/(dashboard)/dashboard/resources/employees/page.tsx",
  "src/app/(dashboard)/dashboard/upgrade/page.tsx",
  "src/components/dashboard/analytics-metric-card.tsx",
  "src/components/dashboard/contact-form-card.tsx",
  "src/components/dashboard/dashboard-page-header.tsx",
  "src/components/dashboard/dashboard-shell.tsx",
  "src/components/dashboard/dashboard-sidebar.tsx",
  "src/components/dashboard/dashboard-topbar.tsx",
  "src/components/dashboard/listing-status-card.tsx",
  "src/components/dashboard/location-analytics-row.tsx",
  "src/components/dashboard/locations-header-wrapper.tsx",
  "src/components/dashboard/mini-sparkline.tsx",
  "src/components/dashboard/onboarding-gate.tsx",
  "src/components/dashboard/overview/analytics-preview.tsx",
  "src/components/dashboard/overview/featured-upsell.tsx",
  "src/components/dashboard/overview/onboarding-checklist.tsx",
  "src/components/dashboard/overview/quick-stats.tsx",
  "src/components/dashboard/overview/upgrade-section.tsx",
  "src/components/dashboard/resources/client-resources-share-card.tsx",
  "src/components/dashboard/ui.tsx",
  "src/components/dashboard/video-embed-form.tsx",
  "src/components/dashboard/jobs/careers-page-share-card.tsx",
];

describe("provider dashboard design system guardrails", () => {
  it("avoids hardcoded hex colors in migrated dashboard surfaces", () => {
    const hexColorPattern = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;

    const offenders = MIGRATED_FILES.flatMap((filePath) => {
      const contents = readFileSync(join(process.cwd(), filePath), "utf8");
      const matches = contents.match(hexColorPattern);

      return matches ? [`${filePath}: ${matches.join(", ")}`] : [];
    });

    expect(offenders).toEqual([]);
  });
});

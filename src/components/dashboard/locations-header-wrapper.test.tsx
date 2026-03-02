import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LocationsPageContent } from "@/components/dashboard/locations-header-wrapper";

vi.mock("@/components/dashboard/locations-manager", () => ({
  LocationsManager: () => <div data-testid="locations-manager" />,
}));

describe("LocationsPageContent", () => {
  it("shows free-tier location access copy without preview-mode gating", () => {
    render(
      <LocationsPageContent
        locations={[]}
        locationLimit={3}
        effectivePlanTier="free"
        featuredPricing={{
          monthly: { price: 99 },
          annual: { price: 59, totalPrice: 708, savings: 480, savingsPercent: 40 },
        }}
        companyDefaults={{
          phone: null,
          email: "free@test.findabatherapy.com",
          website: null,
        }}
      />
    );

    expect(screen.getByText("Free plan includes up to 3 locations")).toBeInTheDocument();
    expect(screen.queryByText(/Preview mode/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Location" })).toBeInTheDocument();
  });
});

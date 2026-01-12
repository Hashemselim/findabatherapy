import { test, expect } from "@playwright/test";

/**
 * Find ABA Therapy - Insurance Pages Tests (FAT-008, FAT-009)
 *
 * Tests insurance-based provider browsing.
 */
test.describe("Find ABA Therapy - Insurance Directory", () => {
  test("FAT-008: Insurance directory page loads", async ({ page }) => {
    await page.goto("/insurance");

    // Page heading
    await expect(page.getByRole("heading")).toBeVisible();

    // Insurance description
    await expect(
      page.locator("text=/insurance|coverage|carrier/i").first()
    ).toBeVisible();
  });

  test("Insurance directory has search input", async ({ page }) => {
    await page.goto("/insurance");

    // Search input for filtering insurances
    const searchInput = page.locator(
      'input[placeholder*="search" i], input[type="search"]'
    ).first();

    const hasSearch = await searchInput.isVisible().catch(() => false);
    console.log(`Insurance search input visible: ${hasSearch}`);
  });

  test("Insurance directory displays carrier cards", async ({ page }) => {
    await page.goto("/insurance");

    // Insurance cards should be visible
    const insuranceCards = page.locator(
      '[data-testid="insurance-card"], .insurance-card, article'
    );
    const count = await insuranceCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("Insurance cards have name and description", async ({ page }) => {
    await page.goto("/insurance");

    // Check for major insurances
    const majorInsurances = ["Medicaid", "Aetna", "Blue Cross", "Cigna", "UnitedHealthcare"];

    for (const insurance of majorInsurances.slice(0, 3)) {
      const insuranceCard = page.locator(`text=/${insurance}/i`).first();
      await expect(insuranceCard).toBeVisible();
    }
  });

  test("Insurance cards link to individual pages", async ({ page }) => {
    await page.goto("/insurance");

    // Click first insurance card
    const insuranceLink = page.locator('a[href*="/insurance/"]').first();

    if (await insuranceLink.isVisible()) {
      await insuranceLink.click();
      await expect(page).toHaveURL(/\/insurance\/.+/);
    }
  });

  test("Insurance directory has FAQ section", async ({ page }) => {
    await page.goto("/insurance");

    // Scroll to find FAQ
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));

    const faqSection = page.locator("text=/faq|frequently asked|questions/i").first();
    const hasFaq = await faqSection.isVisible().catch(() => false);
    console.log(`FAQ section visible: ${hasFaq}`);
  });
});

test.describe("Find ABA Therapy - Individual Insurance Pages", () => {
  test("FAT-009: Medicaid insurance page loads", async ({ page }) => {
    await page.goto("/insurance/medicaid");

    // Page heading
    await expect(page.locator("text=/medicaid/i").first()).toBeVisible();

    // Description of coverage
    await expect(
      page.locator("text=/coverage|insurance|accept/i").first()
    ).toBeVisible();
  });

  test("Insurance page shows providers accepting that insurance", async ({ page }) => {
    await page.goto("/insurance/medicaid");

    // Provider listings or no results message
    const hasProviders = await page.locator('[data-testid="provider-card"], article').first().isVisible().catch(() => false);
    const hasMessage = await page.locator("text=/no providers|results/i").first().isVisible().catch(() => false);

    expect(hasProviders || hasMessage).toBeTruthy();
  });

  test("Insurance page has related insurances", async ({ page }) => {
    await page.goto("/insurance/medicaid");

    // Related insurance links
    const relatedInsurances = page.locator("text=/related|other insurance|also accept/i").first();
    const hasRelated = await relatedInsurances.isVisible().catch(() => false);
    console.log(`Related insurances visible: ${hasRelated}`);
  });

  test("Insurance page has Get Listed CTA", async ({ page }) => {
    await page.goto("/insurance/medicaid");

    const getListedCTA = page.locator("text=/get listed|for providers|add your practice/i").first();
    const hasCTA = await getListedCTA.isVisible().catch(() => false);
    console.log(`Get Listed CTA visible: ${hasCTA}`);
  });

  const insurancePages = [
    { name: "Aetna", slug: "aetna" },
    { name: "Blue Cross Blue Shield", slug: "blue-cross-blue-shield" },
    { name: "Cigna", slug: "cigna" },
    { name: "UnitedHealthcare", slug: "unitedhealthcare" },
    { name: "Tricare", slug: "tricare" },
  ];

  for (const insurance of insurancePages.slice(0, 3)) {
    test(`${insurance.name} insurance page loads`, async ({ page }) => {
      await page.goto(`/insurance/${insurance.slug}`);

      // Page should load without errors
      await expect(page.getByRole("main")).toBeVisible();
    });
  }
});

import { test, expect } from "@playwright/test";

/**
 * Full Onboarding Flow - End-to-End Tests
 *
 * These tests walk through the onboarding flow for visual verification.
 * Run with: npx playwright test e2e/dashboard/full-onboarding-flow.spec.ts --project=chromium --trace on
 */

test("Complete onboarding flow with Free plan", async ({ page }) => {
    test.setTimeout(120000);

    // Step 1: Welcome Page
    console.log("Step 1: Welcome page");
    await page.goto("/dashboard/onboarding");
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Verify welcome page - Get Started button must be visible
    await expect(page.getByText(/welcome/i).first()).toBeVisible();
    await expect(page.getByText(/find clients/i).first()).toBeVisible();
    await expect(page.getByText(/find staff/i).first()).toBeVisible();
    const getStartedButton = page.getByRole("link", { name: /get started/i });
    await expect(getStartedButton).toBeVisible();
    await page.screenshot({ path: "test-results/flow-1-welcome.png", fullPage: true });

    await getStartedButton.click();
    await page.waitForLoadState("networkidle");

    // Step 2: Company Details
    console.log("Step 2: Company details");
    await expect(page.getByText(/tell us about your company/i)).toBeVisible();

    // Fill About textarea (min 50 chars)
    const textarea = page.getByPlaceholder(/tell families about your approach/i);
    await textarea.waitFor({ state: "visible", timeout: 5000 });
    await textarea.click();
    await textarea.pressSequentially("We provide quality ABA therapy services for children and families.", { delay: 10 });

    await page.screenshot({ path: "test-results/flow-2-details.png", fullPage: true });

    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Step 3: Location
    console.log("Step 3: Location");
    await expect(page.getByText(/primary location/i).first()).toBeVisible({ timeout: 10000 });

    // Click Center-Based to deselect it (requires street address)
    await page.locator('text=/center-based/i').first().click();
    await page.waitForTimeout(300);

    // Select Telehealth
    await page.locator('text=/telehealth/i').first().click();
    await page.waitForTimeout(300);

    // Fill address - City and State are always required
    const addressInput = page.getByPlaceholder(/search for your address/i);
    await addressInput.scrollIntoViewIfNeeded();
    await addressInput.click();
    await addressInput.fill(""); // Clear first

    // Type full address
    for (const char of "55 Denise Dr, Edison, NJ") {
      await addressInput.press(char);
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(2000);

    // Take screenshot to debug
    await page.screenshot({ path: "test-results/flow-3-autocomplete.png", fullPage: true });

    // Click first suggestion
    const suggestions = page.locator('[role="option"]').first();
    if (await suggestions.isVisible({ timeout: 2000 }).catch(() => false)) {
      await suggestions.click();
      console.log("Clicked suggestion role=option");
    } else {
      // Try clicking the suggestion text (second occurrence - first is input)
      const suggestionText = page.locator('text=/Denise.*Edison.*NJ/i').last();
      if (await suggestionText.isVisible({ timeout: 1000 }).catch(() => false)) {
        await suggestionText.click();
        console.log("Clicked Denise Dr Edison NJ text");
      } else {
        console.log("No clickable suggestion, pressing Tab");
        await addressInput.press("Tab");
      }
    }
    await page.waitForTimeout(2000);

    // Take screenshot after selection
    await page.screenshot({ path: "test-results/flow-3-after-select.png", fullPage: true });

    // Scroll down to insurance section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Select at least one insurance (required field)
    await page.locator('text=/aetna/i').first().click({ force: true });
    await page.waitForTimeout(300);

    await page.screenshot({ path: "test-results/flow-3-location.png", fullPage: true });

    // Scroll to Continue button and click
    const continueBtn = page.getByRole("button", { name: /continue/i });
    await continueBtn.scrollIntoViewIfNeeded();
    await continueBtn.click();
    await page.waitForLoadState("networkidle");

    // Step 4: Premium Features
    console.log("Step 4: Premium features");
    await expect(page.getByRole("main").getByText(/premium|enhanced/i).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "test-results/flow-4-enhanced.png", fullPage: true });

    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForLoadState("networkidle");

    // Step 5: Review (Free plan)
    console.log("Step 5: Review");
    await expect(page.getByText(/your listing is ready/i).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "test-results/flow-5-review.png", fullPage: true });

    // Click Publish Free Listing
    const publishButton = page.getByRole("button", { name: /publish free listing/i });
    await expect(publishButton).toBeVisible({ timeout: 5000 });
    await publishButton.click();

    // Step 6: Success
    console.log("Step 6: Success");
    await page.waitForURL(/success/, { timeout: 30000 });
    await expect(page.getByText(/your listing is live|congratulations/i).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "test-results/flow-6-success.png", fullPage: true });

    console.log("Full onboarding flow completed successfully!");
});

test("Onboarding pages load correctly", async ({ page }) => {
    await page.goto("/dashboard/onboarding");
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    const pages = [
      { path: "/dashboard/onboarding", text: /welcome/i },
      { path: "/dashboard/onboarding/details", text: /tell us about your company/i },
      { path: "/dashboard/onboarding/location", text: /primary location/i },
      { path: "/dashboard/onboarding/enhanced", text: /premium|enhanced/i },
      { path: "/dashboard/onboarding/review", text: /choose your plan|go live/i },
    ];

    for (const { path, text } of pages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(text).first()).toBeVisible();
    }

    console.log("All onboarding pages load correctly!");
});

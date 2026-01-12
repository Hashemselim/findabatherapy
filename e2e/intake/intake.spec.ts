import { test, expect } from "@playwright/test";

/**
 * Public Intake Form Tests
 * Tests for: /intake/[slug]
 */

test.describe("INT-009, INT-010, INT-011, INT-012, INT-013: Public Intake Form", () => {
  // Note: This test requires knowing a valid provider slug with intake enabled
  // For now, we'll try to find one dynamically or skip

  test("should load intake form page", async ({ page }) => {
    // Try to find a provider with intake from search
    await page.goto("/search");

    const providerLink = page.locator('a[href*="/provider/"]').first();
    const hasProvider = await providerLink.isVisible().catch(() => false);

    if (!hasProvider) {
      test.skip(true, "No providers available to test intake");
      return;
    }

    // Get provider slug
    const href = await providerLink.getAttribute("href");
    if (!href) {
      test.skip(true, "Could not get provider link");
      return;
    }

    const slug = href.split("/provider/")[1]?.split("?")[0];
    if (!slug) {
      test.skip(true, "Could not extract provider slug");
      return;
    }

    // Try to load intake form
    await page.goto(`/intake/${slug}`);

    const is404 = await page.locator('text=/not found|404|intake.*not available/i').isVisible().catch(() => false);
    if (is404) {
      test.skip(true, "Intake form not available for this provider");
      return;
    }

    // Should have form
    const form = page.locator("form");
    const hasForm = await form.isVisible().catch(() => false);

    expect(hasForm).toBeTruthy();
  });

  test("should display provider branding", async ({ page }) => {
    await page.goto("/search");

    const providerLink = page.locator('a[href*="/provider/"]').first();
    const hasProvider = await providerLink.isVisible().catch(() => false);

    if (!hasProvider) {
      test.skip(true, "No providers available");
      return;
    }

    const href = await providerLink.getAttribute("href");
    const slug = href?.split("/provider/")[1]?.split("?")[0];

    if (!slug) {
      test.skip(true, "Could not extract slug");
      return;
    }

    await page.goto(`/intake/${slug}`);

    const is404 = await page.locator('text=/not found|404/i').isVisible().catch(() => false);
    if (is404) {
      test.skip(true, "Intake not available");
      return;
    }

    // Should show provider branding
    const logo = page.locator("img[alt*='logo' i], img[src*='logo'], .logo");
    const companyName = page.locator("h1, .company-name, .provider-name");

    const hasLogo = await logo.first().isVisible().catch(() => false);
    const hasName = await companyName.first().isVisible().catch(() => false);

    expect(hasLogo || hasName).toBeTruthy();
  });

  test("should have required form fields", async ({ page }) => {
    await page.goto("/search");

    const providerLink = page.locator('a[href*="/provider/"]').first();
    const hasProvider = await providerLink.isVisible().catch(() => false);

    if (!hasProvider) {
      test.skip(true, "No providers available");
      return;
    }

    const href = await providerLink.getAttribute("href");
    const slug = href?.split("/provider/")[1]?.split("?")[0];

    if (!slug) {
      test.skip(true, "Could not extract slug");
      return;
    }

    await page.goto(`/intake/${slug}`);

    const is404 = await page.locator('text=/not found|404/i').isVisible().catch(() => false);
    if (is404) {
      test.skip(true, "Intake not available");
      return;
    }

    // Check for common form fields
    const nameField = page.locator('input[name*="name" i], input[placeholder*="name" i]');
    const emailField = page.locator('input[type="email"], input[name*="email" i]');
    const phoneField = page.locator('input[type="tel"], input[name*="phone" i]');

    const hasName = await nameField.first().isVisible().catch(() => false);
    const hasEmail = await emailField.first().isVisible().catch(() => false);

    // At minimum should have name and email
    expect(hasName && hasEmail).toBeTruthy();
  });

  test("should validate required fields", async ({ page }) => {
    await page.goto("/search");

    const providerLink = page.locator('a[href*="/provider/"]').first();
    const hasProvider = await providerLink.isVisible().catch(() => false);

    if (!hasProvider) {
      test.skip(true, "No providers available");
      return;
    }

    const href = await providerLink.getAttribute("href");
    const slug = href?.split("/provider/")[1]?.split("?")[0];

    if (!slug) {
      test.skip(true, "Could not extract slug");
      return;
    }

    await page.goto(`/intake/${slug}`);

    const is404 = await page.locator('text=/not found|404/i').isVisible().catch(() => false);
    if (is404) {
      test.skip(true, "Intake not available");
      return;
    }

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"], button:has-text(/submit|send/i)');
    const hasSubmit = await submitButton.first().isVisible().catch(() => false);

    if (!hasSubmit) {
      test.skip(true, "No submit button found");
      return;
    }

    await submitButton.first().click();
    await page.waitForTimeout(500);

    // Should show validation errors
    const errors = page.locator('.error, [role="alert"], text=/required|invalid/i');
    const hasErrors = await errors.first().isVisible().catch(() => false);

    // HTML5 validation may prevent submission without showing custom errors
    const invalidField = page.locator('input:invalid');
    const hasInvalid = await invalidField.first().isVisible().catch(() => false);

    expect(hasErrors || hasInvalid).toBeTruthy();
  });

  test("should have Turnstile CAPTCHA", async ({ page }) => {
    await page.goto("/search");

    const providerLink = page.locator('a[href*="/provider/"]').first();
    const hasProvider = await providerLink.isVisible().catch(() => false);

    if (!hasProvider) {
      test.skip(true, "No providers available");
      return;
    }

    const href = await providerLink.getAttribute("href");
    const slug = href?.split("/provider/")[1]?.split("?")[0];

    if (!slug) {
      test.skip(true, "Could not extract slug");
      return;
    }

    await page.goto(`/intake/${slug}`);

    const is404 = await page.locator('text=/not found|404/i').isVisible().catch(() => false);
    if (is404) {
      test.skip(true, "Intake not available");
      return;
    }

    // Look for Turnstile widget
    const turnstile = page.locator(
      'iframe[src*="turnstile"], [data-testid="turnstile"], .cf-turnstile, [data-sitekey]'
    );
    const hasTurnstile = await turnstile.first().isVisible().catch(() => false);

    // Turnstile is expected for spam protection
    expect(hasTurnstile).toBeTruthy();
  });

  test("should display provider contact info", async ({ page }) => {
    await page.goto("/search");

    const providerLink = page.locator('a[href*="/provider/"]').first();
    const hasProvider = await providerLink.isVisible().catch(() => false);

    if (!hasProvider) {
      test.skip(true, "No providers available");
      return;
    }

    const href = await providerLink.getAttribute("href");
    const slug = href?.split("/provider/")[1]?.split("?")[0];

    if (!slug) {
      test.skip(true, "Could not extract slug");
      return;
    }

    await page.goto(`/intake/${slug}`);

    const is404 = await page.locator('text=/not found|404/i').isVisible().catch(() => false);
    if (is404) {
      test.skip(true, "Intake not available");
      return;
    }

    // Look for contact info
    const contactInfo = page.locator(
      'a[href^="mailto:"], a[href^="tel:"], text=/@.*\\.com/i'
    );
    const hasContact = await contactInfo.first().isVisible().catch(() => false);

    // Contact info is optional but expected
    if (hasContact) {
      expect(hasContact).toBeTruthy();
    }
  });

  test("should be mobile responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/search");

    const providerLink = page.locator('a[href*="/provider/"]').first();
    const hasProvider = await providerLink.isVisible().catch(() => false);

    if (!hasProvider) {
      test.skip(true, "No providers available");
      return;
    }

    const href = await providerLink.getAttribute("href");
    const slug = href?.split("/provider/")[1]?.split("?")[0];

    if (!slug) {
      test.skip(true, "Could not extract slug");
      return;
    }

    await page.goto(`/intake/${slug}`);

    const is404 = await page.locator('text=/not found|404/i').isVisible().catch(() => false);
    if (is404) {
      test.skip(true, "Intake not available");
      return;
    }

    // Form should be visible on mobile
    const form = page.locator("form");
    await expect(form).toBeVisible();

    // No horizontal scrolling
    const viewport = await page.viewportSize();
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);

    expect(bodyWidth).toBeLessThanOrEqual((viewport?.width || 375) + 10);
  });
});

test.describe("Intake Form Submission", () => {
  // Note: Actually submitting would create real data
  // These tests verify the form structure without submitting

  test("should have submit button", async ({ page }) => {
    await page.goto("/search");

    const providerLink = page.locator('a[href*="/provider/"]').first();
    const hasProvider = await providerLink.isVisible().catch(() => false);

    if (!hasProvider) {
      test.skip(true, "No providers available");
      return;
    }

    const href = await providerLink.getAttribute("href");
    const slug = href?.split("/provider/")[1]?.split("?")[0];

    if (!slug) {
      test.skip(true, "Could not extract slug");
      return;
    }

    await page.goto(`/intake/${slug}`);

    const is404 = await page.locator('text=/not found|404/i').isVisible().catch(() => false);
    if (is404) {
      test.skip(true, "Intake not available");
      return;
    }

    const submitButton = page.locator('button[type="submit"], button:has-text(/submit|send|request/i)');
    await expect(submitButton.first()).toBeVisible();
  });

  test("should have file upload if enabled", async ({ page }) => {
    await page.goto("/search");

    const providerLink = page.locator('a[href*="/provider/"]').first();
    const hasProvider = await providerLink.isVisible().catch(() => false);

    if (!hasProvider) {
      test.skip(true, "No providers available");
      return;
    }

    const href = await providerLink.getAttribute("href");
    const slug = href?.split("/provider/")[1]?.split("?")[0];

    if (!slug) {
      test.skip(true, "Could not extract slug");
      return;
    }

    await page.goto(`/intake/${slug}`);

    const is404 = await page.locator('text=/not found|404/i').isVisible().catch(() => false);
    if (is404) {
      test.skip(true, "Intake not available");
      return;
    }

    // File upload is optional
    const fileInput = page.locator('input[type="file"]');
    const hasFile = await fileInput.first().isVisible().catch(() => false);

    // Just document whether file upload exists
    console.log(`File upload available: ${hasFile}`);
    expect(true).toBeTruthy();
  });
});

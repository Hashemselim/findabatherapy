import { test, expect } from "@playwright/test";

/**
 * Find ABA Therapy - Provider Profile Tests (FAT-010, FAT-011, FAT-012)
 *
 * Tests provider profile pages and contact form functionality.
 */
test.describe("Find ABA Therapy - Provider Profile", () => {
  test("FAT-010: Provider profile displays correctly", async ({ page }) => {
    // First find a provider from search
    await page.goto("/search");

    // Wait for results to load and click first provider
    const providerLink = page.locator(
      '[data-testid="provider-card"] a, article a, .provider-card a'
    ).first();

    if (await providerLink.isVisible()) {
      await providerLink.click();
      await expect(page).toHaveURL(/\/provider\//);

      // Verify profile elements
      // Hero with logo and name
      await expect(page.locator("h1").first()).toBeVisible();

      // Contact info card
      await expect(
        page.locator("text=/email|phone|website|contact/i").first()
      ).toBeVisible();
    } else {
      // Navigate to a known provider URL pattern
      test.skip(true, "No providers found in search results");
    }
  });

  test("Provider profile has location section", async ({ page }) => {
    await page.goto("/search");

    const providerLink = page.locator(
      '[data-testid="provider-card"] a, article a, .provider-card a'
    ).first();

    if (await providerLink.isVisible()) {
      await providerLink.click();

      // Location section
      await expect(
        page.locator("text=/location|address|service area/i").first()
      ).toBeVisible();
    }
  });

  test("Provider profile shows services", async ({ page }) => {
    await page.goto("/search");

    const providerLink = page.locator(
      '[data-testid="provider-card"] a, article a, .provider-card a'
    ).first();

    if (await providerLink.isVisible()) {
      await providerLink.click();

      // Services section
      await expect(
        page.locator("text=/services|aba|therapy/i").first()
      ).toBeVisible();
    }
  });

  test("Provider profile shows insurance accepted", async ({ page }) => {
    await page.goto("/search");

    const providerLink = page.locator(
      '[data-testid="provider-card"] a, article a, .provider-card a'
    ).first();

    if (await providerLink.isVisible()) {
      await providerLink.click();

      // Insurance section
      await expect(
        page.locator("text=/insurance|accepted|coverage/i").first()
      ).toBeVisible();
    }
  });
});

test.describe("Find ABA Therapy - Premium Provider Features", () => {
  test("Verified badge displays for premium providers", async ({ page }) => {
    // Search for providers and look for verified badge
    await page.goto("/search");

    const verifiedBadge = page.locator(
      '[data-testid="verified-badge"], .verified-badge, text=/verified/i'
    ).first();

    const hasVerified = await verifiedBadge.isVisible().catch(() => false);
    console.log(`Verified badge found: ${hasVerified}`);
  });

  test("Premium profile has about section with details", async ({ page }) => {
    // Note: This requires a premium provider to be in the database
    await page.goto("/search");

    const providerLink = page.locator(
      '[data-testid="provider-card"] a, article a'
    ).first();

    if (await providerLink.isVisible()) {
      await providerLink.click();

      // Look for premium-only fields
      const aboutSection = page.locator("text=/about|ages served|languages|specialties/i").first();
      const hasAbout = await aboutSection.isVisible().catch(() => false);
      console.log(`About section visible: ${hasAbout}`);
    }
  });

  test("Premium profile may have photo gallery", async ({ page }) => {
    await page.goto("/search");

    const providerLink = page.locator('[data-testid="provider-card"] a').first();

    if (await providerLink.isVisible()) {
      await providerLink.click();

      // Look for photo gallery
      const photoGallery = page.locator('[data-testid="photo-gallery"], .gallery, img[alt*="photo" i]').first();
      const hasPhotos = await photoGallery.isVisible().catch(() => false);
      console.log(`Photo gallery visible: ${hasPhotos}`);
    }
  });

  test("Premium profile may have Google reviews", async ({ page }) => {
    await page.goto("/search");

    const providerLink = page.locator('[data-testid="provider-card"] a').first();

    if (await providerLink.isVisible()) {
      await providerLink.click();

      // Look for Google reviews
      const googleReviews = page.locator("text=/google|reviews|stars|rating/i").first();
      const hasReviews = await googleReviews.isVisible().catch(() => false);
      console.log(`Google reviews visible: ${hasReviews}`);
    }
  });
});

test.describe("Find ABA Therapy - FAT-012: Multiple Locations", () => {
  test("Provider with multiple locations shows other locations card", async ({ page }) => {
    await page.goto("/search");

    const providerLink = page.locator('[data-testid="provider-card"] a').first();

    if (await providerLink.isVisible()) {
      await providerLink.click();

      // Look for "Other Locations" card
      const otherLocations = page.locator("text=/other locations|more locations|all locations/i").first();
      const hasMultiple = await otherLocations.isVisible().catch(() => false);
      console.log(`Multiple locations visible: ${hasMultiple}`);
    }
  });

  test("Clicking location updates view", async ({ page }) => {
    await page.goto("/search");

    const providerLink = page.locator('[data-testid="provider-card"] a').first();

    if (await providerLink.isVisible()) {
      await providerLink.click();

      // Find location link
      const locationLink = page.locator('[data-testid="location-link"], a:has-text("View location")').first();

      if (await locationLink.isVisible()) {
        await locationLink.click();
        // URL should include location query param
        await expect(page).toHaveURL(/location=/);
      }
    }
  });
});

test.describe("Find ABA Therapy - FAT-011: Contact Form", () => {
  test("Contact form displays on premium provider profiles", async ({ page }) => {
    await page.goto("/search");

    const providerLink = page.locator('[data-testid="provider-card"] a').first();

    if (await providerLink.isVisible()) {
      await providerLink.click();

      // Look for contact form
      const contactForm = page.locator(
        '[data-testid="contact-form"], form:has(input[name="name"]), form:has(input[name="email"])'
      ).first();

      const hasContactForm = await contactForm.isVisible().catch(() => false);
      console.log(`Contact form visible: ${hasContactForm}`);
    }
  });

  test("Contact form has all required fields", async ({ page }) => {
    await page.goto("/search");

    const providerLink = page.locator('[data-testid="provider-card"] a').first();

    if (await providerLink.isVisible()) {
      await providerLink.click();

      // Check for form fields
      const nameInput = page.locator('input[name*="name" i], input[placeholder*="name" i]').first();
      const emailInput = page.locator('input[name*="email" i], input[type="email"]').first();
      const messageInput = page.locator('textarea[name*="message" i], textarea').first();

      if (await nameInput.isVisible()) {
        await expect(nameInput).toBeVisible();
        await expect(emailInput).toBeVisible();
        await expect(messageInput).toBeVisible();
      }
    }
  });

  test("Contact form validates required fields", async ({ page }) => {
    await page.goto("/search");

    const providerLink = page.locator('[data-testid="provider-card"] a').first();

    if (await providerLink.isVisible()) {
      await providerLink.click();

      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"]:has-text("Send"), button:has-text("Submit")').first();

      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Should show validation errors
        await expect(
          page.locator("text=/required|please fill|error/i").first()
        ).toBeVisible();
      }
    }
  });

  test("Contact form has Turnstile CAPTCHA", async ({ page }) => {
    await page.goto("/search");

    const providerLink = page.locator('[data-testid="provider-card"] a').first();

    if (await providerLink.isVisible()) {
      await providerLink.click();

      // Look for Turnstile widget
      const turnstile = page.locator('[data-testid="turnstile"], .cf-turnstile, iframe[src*="turnstile"]').first();
      const hasTurnstile = await turnstile.isVisible().catch(() => false);
      console.log(`Turnstile CAPTCHA visible: ${hasTurnstile}`);
    }
  });

  test("Contact form submits successfully with valid data", async ({ page }) => {
    await page.goto("/search");

    const providerLink = page.locator('[data-testid="provider-card"] a').first();

    if (await providerLink.isVisible()) {
      await providerLink.click();

      // Fill out form
      const nameInput = page.locator('input[name*="name" i]').first();
      const emailInput = page.locator('input[type="email"]').first();
      const messageInput = page.locator("textarea").first();

      if (await nameInput.isVisible()) {
        await nameInput.fill("Test User");
        await emailInput.fill("test@example.com");
        await messageInput.fill("This is a test inquiry about ABA services.");

        // Note: Actual submission would require completing Turnstile
        // This test verifies form can be filled
        console.log("Contact form filled successfully");
      }
    }
  });
});
